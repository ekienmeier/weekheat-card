"""Serve weekheat-card.js for development (with CORS, no caching), so a Home Assistant dashboard
resource can point at it. Usage: python3 tools/serve.py <bind address> [port]. Serves only the card."""
import http.server
import sys
from pathlib import Path

CARD = Path(__file__).resolve().parent.parent / "weekheat-card.js"


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] != "/weekheat-card.js":
            self.send_error(404)
            return
        body = CARD.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/javascript; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


http.server.ThreadingHTTPServer((sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 8765), Handler).serve_forever()
