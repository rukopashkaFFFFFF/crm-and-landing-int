import http.server
import os

class UTF8HTTPHandler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        mime = super().guess_type(path)
        if mime == "text/html":
            return "text/html; charset=utf-8"
        if mime and mime.startswith("text/"):
            return f"{mime}; charset=utf-8"
        return mime

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5500))
    server = http.server.HTTPServer(("0.0.0.0", port), UTF8HTTPHandler)
    print(f"Serving on http://localhost:{port}")
    server.serve_forever()
