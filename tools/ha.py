"""Small Home Assistant client for development: REST and WebSocket, standard library only.

Reads the HA base URL from ~/.config/weekheat/url (e.g. http://homeassistant.local:8123) and a
long-lived access token from ~/.config/weekheat/token. Plain http/ws only (a LAN instance).

Usage as a module:  from ha import HA
                    ha = HA(); ha.rest("GET", "config"); ha.ws({"type": "get_config"})
Usage as a command: python3 tools/ha.py ws '{"type": "blueprint/list", "domain": "script"}'
                    python3 tools/ha.py rest GET states/sun.sun
"""

import base64
import json
import os
import socket
import struct
import argparse
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

CONFIG = Path.home() / ".config" / "weekheat"


class HAError(RuntimeError):
    """An error answer from Home Assistant."""


class HA:
    """REST calls and one WebSocket connection (opened on first use)."""

    def __init__(self, url: str | None = None, token: str | None = None):
        """Connect to `url` with `token`; by default both come from ~/.config/weekheat/."""
        self.url = (url or (CONFIG / "url").read_text().strip()).rstrip("/")
        self.token = token or (CONFIG / "token").read_text().strip()
        self._sock = None
        self._id = 0

    # REST

    def rest(self, method: str, path: str, body=None, timeout: float = 30):
        """Call `method` /api/`path` with a JSON body; return the decoded JSON answer (or text)."""
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"{self.url}/api/{path}",
            data=data,
            method=method,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                text = r.read().decode()
        except urllib.error.HTTPError as e:
            raise HAError(f"{method} {path}: {e.code} {e.read().decode()[:500]}") from None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text

    def call(self, domain: str, service: str, data: dict, response: bool = False):
        """Call a service; with `response`, return its service_response."""
        query = "?return_response" if response else ""
        answer = self.rest("POST", f"services/{domain}/{service}{query}", data)
        return answer["service_response"] if answer and response else answer

    def template(self, tpl: str) -> str:
        """Render a template on the server."""
        return self.rest("POST", "template", {"template": tpl})

    # WebSocket

    def ws(self, msg: dict, timeout: float = 30):
        """Send one command and return its result; raise HAError on failure."""
        if self._sock is None:
            self._connect(timeout)
        self._id += 1
        self._send({**msg, "id": self._id})
        while True:
            answer = self._recv()
            if answer.get("id") == self._id and answer.get("type") == "result":
                if not answer.get("success"):
                    raise HAError(f"{msg.get('type')}: {answer.get('error')}")
                return answer.get("result")

    def _connect(self, timeout: float):
        """Open the WebSocket and log in."""
        u = urllib.parse.urlparse(self.url)
        self._sock = socket.create_connection((u.hostname, u.port or 80), timeout=timeout)
        self._upgrade(u.netloc)
        if self._recv().get("type") != "auth_required":
            raise HAError("no auth_required")
        self._send({"type": "auth", "access_token": self.token})
        if self._recv().get("type") != "auth_ok":
            raise HAError("websocket auth failed")

    def _upgrade(self, host: str):
        """Turn the connection into a WebSocket (the HTTP upgrade handshake)."""
        key = base64.b64encode(os.urandom(16)).decode()
        request = (
            f"GET /api/websocket HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self._sock.sendall(request.encode())
        head = b""
        while b"\r\n\r\n" not in head:
            head += self._sock.recv(1)
        if b" 101 " not in head.split(b"\r\n")[0]:
            raise HAError(f"websocket upgrade failed: {head[:200]!r}")

    def _send(self, obj: dict):
        payload = json.dumps(obj).encode()
        n = len(payload)
        head = bytes([0x81]) + (
            bytes([0x80 | n])
            if n < 126
            else bytes([0x80 | 126]) + struct.pack(">H", n)
            if n < 65536
            else bytes([0x80 | 127]) + struct.pack(">Q", n)
        )
        mask = os.urandom(4)
        self._sock.sendall(head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

    def _recv(self) -> dict:
        """Read one message (it may come in several frames), answering pings on the way."""
        data = b""
        while True:
            final, op, chunk = self._frame()
            if op == 0x9:  # ping: answer with pong
                self._sock.sendall(bytes([0x8A, 0x80 | len(chunk)]) + b"\0\0\0\0" + chunk)
                continue
            if op == 0x8:
                raise HAError("websocket closed")
            data += chunk
            if final:
                return json.loads(data)

    def _frame(self) -> tuple[bool, int, bytes]:
        """Read one frame: whether it ends the message, its opcode, and its payload."""
        b0, b1 = self._read(2)
        n = b1 & 0x7F
        if n == 126:
            n = struct.unpack(">H", self._read(2))[0]
        elif n == 127:
            n = struct.unpack(">Q", self._read(8))[0]
        return bool(b0 & 0x80), b0 & 0x0F, self._read(n)

    def _read(self, n: int) -> bytes:
        """Read exactly n bytes."""
        buf = b""
        while len(buf) < n:
            part = self._sock.recv(n - len(buf))
            if not part:
                raise HAError("websocket connection lost")
            buf += part
        return buf


def parser() -> argparse.ArgumentParser:
    """Build the command line's parser: a WebSocket command, or a REST call."""
    top = argparse.ArgumentParser(description="A small Home Assistant client for development.")
    kinds = top.add_subparsers(dest="kind", required=True)
    ws = kinds.add_parser("ws", help="send a WebSocket command")
    ws.add_argument("message", help='the command as JSON, e.g. \'{"type": "get_config"}\'')
    rest = kinds.add_parser("rest", help="call the REST API")
    rest.add_argument("method", help="GET, POST, …")
    rest.add_argument("path", help="the path after /api/, e.g. states/sun.sun")
    rest.add_argument("body", nargs="?", help="a JSON body")
    return top


def main():
    """Send one WebSocket command or REST call given on the command line; print the answer."""
    args = parser().parse_args()
    ha = HA()
    if args.kind == "ws":
        answer = ha.ws(json.loads(args.message))
    else:
        answer = ha.rest(args.method, args.path, json.loads(args.body) if args.body else None)
    print(json.dumps(answer, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
