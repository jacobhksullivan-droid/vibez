# Local preview server that disables browser caching, so edits show up on reload.
import http.server, functools, os
import urllib.request
# /api/live is a Netlify function; locally we forward it to the deployed site (override with LIVE_PROXY=<url>)
LIVE = os.environ.get("LIVE_PROXY", "https://seb-jacob-epic-camper.netlify.app")
class NoCache(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/api/"):
            try:
                body = urllib.request.urlopen(urllib.request.Request(LIVE + self.path, headers={"User-Agent": "devserver"}), timeout=30).read()
                self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(body)
            except Exception as e:
                self.send_error(502, str(e))
            return
        super().do_GET()
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
import sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) > 1: root = os.path.join(root, sys.argv[1])          # optional folder, e.g. deploy/epic-camper
port = int(sys.argv[2]) if len(sys.argv) > 2 else 8765
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(NoCache, directory=root)).serve_forever()
