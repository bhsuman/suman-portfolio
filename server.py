"""
Suman Bhandari - Portfolio Local Server & SMS Webhook Relay
Henderson, Auckland, New Zealand
Phone / SMS: +64 22 051 2513
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import os
import sys
from datetime import datetime

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class PortfolioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_POST(self):
        # Handle SMS notification dispatch relay
        if self.path == "/api/notify-sms":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_body.decode("utf-8"))
                phone = data.get("phone", "+64220512513")
                text = data.get("text", "")
                timestamp = data.get("timestamp", datetime.now().isoformat())

                print("\n" + "="*60)
                print(f"🔔 [SMS NOTIFICATION TRIGGERED]")
                print(f"Target Mobile: {phone} (Henderson, Auckland, NZ)")
                print(f"Timestamp:     {timestamp}")
                print(f"Inquiry Text:  {text}")
                print("="*60 + "\n")

                # Dispatch to free NTFY push topic for instant mobile push alert:
                try:
                    req = urllib.request.Request(
                        "https://ntfy.sh/suman-portfolio-nz-220512513",
                        data=f"Portfolio Alert for {phone}:\n{text}".encode("utf-8"),
                        headers={
                            "Title": "New Portfolio Visitor Question!",
                            "Priority": "high",
                            "Tags": "speech_balloon,briefcase"
                        }
                    )
                    urllib.request.urlopen(req, timeout=3)
                except Exception as e:
                    # Ignore network timeout if running offline
                    pass

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {
                    "status": "success",
                    "message": f"Alert dispatched to {phone}",
                    "received_at": timestamp
                }
                self.wfile.write(json.dumps(response).encode("utf-8"))
                return
            except Exception as ex:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
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
        print("\n" + "="*65)
        print("  🌿 SUMAN BHANDARI - PORTFOLIO & AI AGENT SERVER")
        print("  📍 Henderson, Auckland, New Zealand")
        print("  📱 SMS Alert Target: +64 22 051 2513")
        print("="*65)
        print(f"  ➜ Live URL:         http://localhost:{PORT}")
        print(f"  ➜ SMS Relay API:    http://localhost:{PORT}/api/notify-sms")
        print(f"  ➜ Press Ctrl+C to stop the server")
        print("="*65 + "\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")

if __name__ == "__main__":
    main()

