"""
Suman Bhandari - Security-Hardened Portfolio Server & Private Notification Relay
Henderson, Auckland, New Zealand
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import subprocess
import hashlib
import time
import os
from datetime import datetime

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(DIRECTORY, "chat_notifications.json")

# Strict Whitelist of Publicly Servable Files (Blocks .git, .env, server.py, chat_notifications.json, etc.)
ALLOWED_PUBLIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app.js": "app.js",
    "/portfolio-data.js": "portfolio-data.js",
    "/assets/suman-bhandari.jpg": "assets/suman-bhandari.jpg",
}

# Default Owner PIN SHA-256 hash (PIN: "2513" with salt "suman_portfolio_v1:" -> can be overridden via PORTFOLIO_OWNER_PIN_HASH env var)
DEFAULT_PIN_SALT = "suman_portfolio_v1:"
DEFAULT_OWNER_PIN_HASH = os.environ.get(
    "PORTFOLIO_OWNER_PIN_HASH",
    hashlib.sha256((DEFAULT_PIN_SALT + "2513").encode("utf-8")).hexdigest()
)

# Private Notification Topic (kept server-side; can be overridden via NTFY_TOPIC env var)
PRIVATE_NTFY_TOPIC = os.environ.get("PORTFOLIO_NTFY_TOPIC", "suman-portfolio-nz-220512513")

# Rate Limiting State (IP -> list of request timestamps)
IP_RATE_LIMITS = {}
MAX_REQUESTS_PER_WINDOW = 6
RATE_WINDOW_SECONDS = 600  # 10 minutes
MAX_POST_BODY_BYTES = 2048  # 2 KB strict ceiling


def is_rate_limited(client_ip):
    now = time.time()
    timestamps = IP_RATE_LIMITS.get(client_ip, [])
    timestamps = [t for t in timestamps if now - t < RATE_WINDOW_SECONDS]
    if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
        IP_RATE_LIMITS[client_ip] = timestamps
        return True
    timestamps.append(now)
    IP_RATE_LIMITS[client_ip] = timestamps
    return False


def is_localhost(client_ip):
    return client_ip in ("127.0.0.1", "::1", "localhost")


def verify_owner_header(headers):
    provided_pin = headers.get("X-Owner-Pin", "")
    if not provided_pin:
        return False
    computed = hashlib.sha256((DEFAULT_PIN_SALT + provided_pin).encode("utf-8")).hexdigest()
    return computed == DEFAULT_OWNER_PIN_HASH


def load_notifications():
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_notification(entry):
    items = load_notifications()
    items.insert(0, entry)
    items = items[:100]
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)
    except Exception:
        pass


class SecurePortfolioHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "PortfolioServer"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Add strict security headers to every response
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        self.send_header("X-XSS-Protection", "1; mode=block")
        super().end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        client_ip = self.client_address[0]

        # Owner-Only Protected Endpoint: Visitor Logs (Localhost + PIN required)
        if parsed_path == "/api/notifications":
            if not is_localhost(client_ip) or not verify_owner_header(self.headers):
                self.send_error_json(403, "Forbidden: Owner authentication on localhost required.")
                return
            self.send_json(200, {"notifications": load_notifications()})
            return

        # Owner-Only Protected Endpoint: Git Pull (Localhost + PIN required)
        if parsed_path == "/api/github-pull":
            if not is_localhost(client_ip) or not verify_owner_header(self.headers):
                self.send_error_json(403, "Forbidden: Owner authentication on localhost required.")
                return
            try:
                res = subprocess.run(
                    ["git", "pull", "origin", "main"],
                    cwd=DIRECTORY,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                self.send_json(200, {"status": "ok", "output": (res.stdout or res.stderr).strip()})
            except Exception as ex:
                self.send_json(200, {"status": "error", "error": str(ex)})
            return

        # Strict File Whitelist Check: Block access to .git, .env, server.py, chat_notifications.json, etc.
        if parsed_path not in ALLOWED_PUBLIC_FILES:
            self.send_error_json(403, "Forbidden: Resource is not publicly accessible.")
            return

        # Serve only the whitelisted static file
        self.path = "/" + ALLOWED_PUBLIC_FILES[parsed_path]
        return super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        client_ip = self.client_address[0]

        if parsed_path == "/api/notify-sms":
            # 1. Enforce IP Rate Limit
            if is_rate_limited(client_ip):
                self.send_error_json(429, "Too many requests. Please try again later.")
                return

            # 2. Enforce strict payload size cap (2 KB max)
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0 or content_length > MAX_POST_BODY_BYTES:
                self.send_error_json(413, "Payload size invalid or exceeds security limit.")
                return

            post_body = self.rfile.read(content_length)

            try:
                data = json.loads(post_body.decode("utf-8"))
                text = str(data.get("text", "")).strip()[:200]
                reply = str(data.get("reply", "")).strip()[:280]
                source = str(data.get("source", "AI Chat Assistant")).strip()[:50]
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                if not text:
                    self.send_error_json(400, "Empty inquiry text.")
                    return

                entry = {
                    "timestamp": timestamp,
                    "source": source,
                    "question": text,
                    "reply": reply
                }
                save_notification(entry)

                print("\n" + "=" * 65)
                print(f"[VISITOR ALERT - {source}]")
                print(f"Timestamp: {timestamp}")
                print(f"Question:  {text}")
                if reply:
                    print(f"AI Reply:  {reply}")
                print("=" * 65 + "\n")

                # Dispatch server-side push alert
                try:
                    ntfy_url = (
                        f"https://ntfy.sh/{PRIVATE_NTFY_TOPIC}"
                        f"?title={urllib.parse.quote('Portfolio ' + source)}&priority=high&tags=bell"
                    )
                    msg_body = f"Visitor Inquiry ({timestamp}):\n{text}\n\nReply: {reply}"
                    req = urllib.request.Request(
                        ntfy_url,
                        data=msg_body.encode("utf-8"),
                        method="POST"
                    )
                    urllib.request.urlopen(req, timeout=4)
                except Exception:
                    pass

                self.send_json(200, {"status": "ok", "received_at": timestamp})
                return
            except Exception:
                self.send_error_json(400, "Invalid request format.")
                return

        self.send_error_json(404, "Endpoint not found.")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "http://localhost:8000")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Owner-Pin")
        self.end_headers()

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def send_error_json(self, status_code, message):
        self.send_json(status_code, {"error": message})


def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SecurePortfolioHandler) as httpd:
        print("\n" + "=" * 65)
        print("  SUMAN BHANDARI - SECURITY-HARDENED PORTFOLIO SERVER")
        print("  Public Whitelist: index.html, styles.css, app.js, portfolio-data.js")
        print("  Private Logs:     Restricted to localhost + Owner PIN")
        print("=" * 65)
        print(f"  -> Live URL: http://localhost:{PORT}")
        print("=" * 65 + "\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")


if __name__ == "__main__":
    main()
