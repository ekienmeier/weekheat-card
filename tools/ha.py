"""Small Home Assistant client for development: REST and WebSocket, standard library only.

Reads the HA base URL from ~/.config/weekheat/url (e.g. http://homeassistant.local:8123) and a
long-lived access token from ~/.config/weekheat/token. Plain http/ws only (a LAN instance).

Usage as a module:  from ha import HA; ha = HA(); ha.rest("GET", "config"); ha.ws({"type": "ping"})
Usage as a command: python3 tools/ha.py ws '{"type": "blueprint/list", "domain": "script"}'
                    python3 tools/ha.py rest GET states/sun.sun
"""

import base64
import json
import os
import socket
import struct
import sys
import urllib.parse
import urllib.request
from pathlib import Path

CONFIG = Path.home() / ".config" / "weekheat"


class HAError(RuntimeError):
    """An error answer from Home Assistant."""


class HA:
    """REST calls and one WebSocket connection (opened on first use)."""

    def __init__(self, url: str | None = None, token: str | None = None):
        self.url = (url or (CONFIG / "url").read_text().strip()).rstrip("/")
        self.token = token or (CONFIG / "token").read_text().strip()
        self._sock = None
        self._id = 0

    # REST

    def rest(self, method: str, path: str, body=None, timeout: float = 30):
        """`method` /api/`path` with a JSON body; the decoded JSON answer (or text)."""
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"{self.url}/api/{path}", data=data, method=method, headers={
            "Authorization": f"Bearer {self.token}", "Content-Type": "application/json"})
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
        r = self.rest("POST", f"services/{domain}/{service}" + ("?return_response" if response else ""), data)
        return r["service_response"] if response else r

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
        u = urllib.parse.urlparse(self.url)
        self._sock = socket.create_connection((u.hostname, u.port or 80), timeout=timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        self._sock.sendall((f"GET /api/websocket HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\n"
                            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
                            "Sec-WebSocket-Version: 13\r\n\r\n").encode())
        head = b""
        while b"\r\n\r\n" not in head:
            head += self._sock.recv(1)
        if b" 101 " not in head.split(b"\r\n")[0]:
            raise HAError(f"websocket upgrade failed: {head[:200]!r}")
        if self._recv().get("type") != "auth_required":
            raise HAError("no auth_required")
        self._send({"type": "auth", "access_token": self.token})
        if self._recv().get("type") != "auth_ok":
            raise HAError("websocket auth failed")

    def _send(self, obj: dict):
        payload = json.dumps(obj).encode()
        n = len(payload)
        head = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else
                                bytes([0x80 | 126]) + struct.pack(">H", n) if n < 65536 else
                                bytes([0x80 | 127]) + struct.pack(">Q", n))
        mask = os.urandom(4)
        self._sock.sendall(head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))

    def _recv(self) -> dict:
        data = b""
        while True:
            b0, b1 = self._read(2)
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._read(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._read(8))[0]
            chunk = self._read(n)
            op = b0 & 0x0F
            if op == 0x9:  # ping: answer with pong
                self._sock.sendall(bytes([0x8A, 0x80 | len(chunk)]) + b"\0\0\0\0" + chunk)
                continue
            if op == 0x8:
                raise HAError("websocket closed")
            data += chunk
            if b0 & 0x80:
                return json.loads(data)

    def _read(self, n: int) -> bytes:
        buf = b""
        while len(buf) < n:
            part = self._sock.recv(n - len(buf))
            if not part:
                raise HAError("websocket connection lost")
            buf += part
        return buf


if __name__ == "__main__":
    ha = HA()
    if sys.argv[1] == "ws":
        print(json.dumps(ha.ws(json.loads(sys.argv[2])), indent=2, ensure_ascii=False))
    else:
        body = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
        print(json.dumps(ha.rest(sys.argv[2], sys.argv[3], body), indent=2, ensure_ascii=False))
