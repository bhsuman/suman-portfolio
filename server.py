"""
Suman Bhandari - Portfolio Local Server, GitHub Auto-Sync & Notification Relay
Henderson, Auckland, New Zealand
Phone / SMS: +64 22 051 2513 | Email: bhsuman11@gmail.com
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import subprocess
import os
import sys
from datetime import datetime

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(DIRECTORY, "chat_notifications.json")


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
    items = items[:100]  # Keep latest 100
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)
    except Exception:
        pass


class PortfolioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/notifications"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"notifications": load_notifications()}).encode("utf-8"))
            return

        if self.path.startswith("/api/github-pull"):
            try:
                res = subprocess.run(
                    ["git", "pull", "origin", "main"],
                    cwd=DIRECTORY,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "ok",
                    "output": (res.stdout or res.stderr).strip()
                }).encode("utf-8"))
            except Exception as ex:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "error": str(ex)}).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/notify-sms":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)

            try:
                data = json.loads(post_body.decode("utf-8"))
                phone = data.get("phone", "+64220512513")
                email = data.get("email", "bhsuman11@gmail.com")
                text = str(data.get("text", ""))[:200]
                reply = str(data.get("reply", ""))[:300]
                source = data.get("source", "AI Chat Assistant")
                webhook_url = data.get("webhookUrl", "")
                timestamp = data.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

                entry = {
                    "timestamp": timestamp,
                    "source": source,
                    "question": text,
                    "reply": reply,
                    "phone": phone,
                    "email": email
                }
                save_notification(entry)

                print("\n" + "=" * 65)
                print(f"[VISITOR ALERT - {source}]")
                print(f"Timestamp: {timestamp}")
                print(f"Question:  {text}")
                if reply:
                    print(f"AI Reply:  {reply}")
                print("=" * 65 + "\n")

                dispatched_channels = ["local_log"]

                # 1. Push to NTFY topic (instant phone/browser push notification)
                try:
                    ntfy_url = "https://ntfy.sh/suman-portfolio-nz-220512513?title=" + urllib.parse.quote(f"Portfolio {source}") + "&priority=high&tags=bell"
                    msg_body = f"Visitor Inquiry ({timestamp}):\n{text}"
                    req = urllib.request.Request(
                        ntfy_url,
                        data=msg_body.encode("utf-8"),
                        method="POST"
                    )
                    urllib.request.urlopen(req, timeout=4)
                    dispatched_channels.append("ntfy_push")
                except Exception:
                    pass

                # 2. Custom Webhook (Discord / Slack / Telegram / Make) if provided
                if webhook_url and webhook_url.startswith("https://"):
                    try:
                        payload = json.dumps({
                            "content": f"🔔 **Portfolio Alert ({source})**\n**Inquiry:** {text}\n**Time:** {timestamp}",
                            "text": f"Portfolio Alert ({source}): {text} ({timestamp})"
                        }).encode("utf-8")
                        wreq = urllib.request.Request(
                            webhook_url,
                            data=payload,
                            headers={"Content-Type": "application/json", "User-Agent": "SumanPortfolio/1.0"},
                            method="POST"
                        )
                        urllib.request.urlopen(wreq, timeout=4)
                        dispatched_channels.append("custom_webhook")
                    except Exception:
                        pass

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {
                    "status": "success",
                    "channels": dispatched_channels,
                    "received_at": timestamp
                }
                self.wfile.write(json.dumps(response).encode("utf-8"))
                return
            except Exception as ex:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(ex)}).encode("utf-8"))
                return

        return super().do_POST()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PortfolioHandler) as httpd:
        print("\n" + "=" * 65)
        print("  SUMAN BHANDARI - PORTFOLIO & LIVE GITHUB SERVER")
        print("  Location: Henderson, Auckland, New Zealand")
        print("  Alerts:   +64 22 051 2513 | bhsuman11@gmail.com")
        print("=" * 65)
        print(f"  -> Live URL:          http://localhost:{PORT}")
        print(f"  -> Notification Log:  http://localhost:{PORT}/api/notifications")
        print(f"  -> Press Ctrl+C to stop the server")
        print("=" * 65 + "\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")


if __name__ == "__main__":
    main()
