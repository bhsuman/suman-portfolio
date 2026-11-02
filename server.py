"""
Suman Bhandari - Security-Hardened Portfolio Server, AI Proxy & Private Notification Relay
Henderson, Auckland, New Zealand
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import urllib.error
import hashlib
import hmac
import threading
import time
import os
import re
from datetime import datetime

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(DIRECTORY, "chat_notifications.json")


def load_dotenv_file():
    """Load key=value pairs from local .env file if present without external dependencies."""
    env_path = os.path.join(DIRECTORY, ".env")
    if not os.path.isfile(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass


load_dotenv_file()

PORT = int(os.environ.get("PORT", "8000"))
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", f"http://localhost:{PORT}")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Strict Whitelist of Publicly Servable Files (Blocks .git, .env, server.py, chat_notifications.json, etc.)
ALLOWED_PUBLIC_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app.js": "app.js",
    "/portfolio-data.js": "portfolio-data.js",
    "/assets/suman-bhandari.jpg": "assets/suman-bhandari.jpg",
}

# Salted SHA-256 hash for Owner PIN verification (can be overridden via PORTFOLIO_OWNER_PIN_HASH env var)
DEFAULT_PIN_SALT = "suman_portfolio_v1:"
DEFAULT_OWNER_PIN_HASH = os.environ.get(
    "PORTFOLIO_OWNER_PIN_HASH",
    hashlib.sha256((DEFAULT_PIN_SALT + "2513").encode("utf-8")).hexdigest()
)

# Private Notification Topic (strictly configured via environment variable; never exposed to client)
PRIVATE_NTFY_TOPIC = os.environ.get("PORTFOLIO_NTFY_TOPIC", "").strip()

# Rate Limiting & Concurrency Controls
RATE_LOCK = threading.Lock()
CHAT_CONCURRENCY_SEMAPHORE = threading.BoundedSemaphore(4)
IP_NOTIFY_LIMITS = {}
IP_CHAT_LIMITS = {}
IP_CONTACT_LIMITS = {}

MAX_NOTIFY_REQUESTS_PER_WINDOW = 8
MAX_CHAT_REQUESTS_PER_WINDOW = 20
MAX_CONTACT_REQUESTS_PER_WINDOW = 5
RATE_WINDOW_SECONDS = 600  # 10 minutes
MAX_NOTIFY_BODY_BYTES = 2048  # 2 KB strict ceiling
MAX_CHAT_BODY_BYTES = 6144    # 6 KB strict ceiling
MAX_CONTACT_BODY_BYTES = 4096 # 4 KB strict ceiling
MAX_QUERY_CHARS = 300

EMAIL_OR_PHONE_REGEX = re.compile(
    r"^([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|[\+\d][\d\s\-\(\)]{6,22})$"
)

# Server-Side Prompt-Injection & Abuse Patterns
SERVER_BLOCKED_PATTERNS = [
    re.compile(r"ignore\s+(all|previous|above|prior|system)", re.I),
    re.compile(r"system\s*prompt|developer\s*mode|jailbreak|dan\s*mode", re.I),
    re.compile(r"act\s+as|pretend\s+to\s+be|roleplay", re.I),
    re.compile(r"write\s+(a|an|me)\s+(poem|essay|story|song|joke|script|recipe|malware|exploit)", re.I),
    re.compile(r"(api[_\s]*key|private[_\s]*key|secret|password|credential|\.env)", re.I),
]

SERVER_SYSTEM_INSTRUCTION = """You are Suman AI, the official Portfolio & Technical Assistant for Suman Bhandari.
Use ONLY the verified facts below:
- Name: Suman Bhandari (Master of Applied Technologies – Computing / Data Analytics student at Unitec Institute of Technology, Auckland, NZ; Student • Open to Work).
- Bachelor's: B.Sc. in Computer Science & Information Technology (B.Sc. CSIT, 4-Year Honours, 2018–2023) at Samriddhi College (Tribhuvan University).
- Commercial Experience (2+ years):
  1) Trainee Assistant - ICT at Laxmi Sunrise Bank Limited (Feb 2026 – Jun 2026, Kathmandu): Core IT banking operations, system uptime, database connectivity troubleshooting, financial data security compliance.
  2) Associate Data Engineer at Development Catalyst Consultancy Pvt. Ltd (Jan 2024 – Jan 2026, Kathmandu): Python (Pandas, NumPy) & advanced SQL ETL pipelines, schema validation, relational data marts, and BI dashboards.
  3) Data Engineer Trainee at LIS Nepal Pvt. Ltd (Jul 2023 – Oct 2023, Lalitpur): Snowflake Cloud Data Warehousing, Kimball Star Schema dimensional modeling, Python ETL ingestion, and SQL query tuning.
- Verified Public GitHub Projects (https://github.com/bhsuman):
  1) Cloud Data Warehousing & Credit Risk Analytics Pipeline (big-data-warehousing-pipeline): Completed project processing LendingClub financial loan records using Databricks, PySpark, Delta Lake (Bronze/Silver/Gold Medallion architecture), Silver-layer data quality rules, Gold-layer Kimball Star Schema, and Power BI credit risk dashboards.
  2) Residential Property Price Prediction & BI (Residential-Property-Price-Prediction-BI): Completed project combining Python (Scikit-Learn) supervised regression models, property feature engineering, and interactive Power BI valuation analytics.
  3) Music Genre Classification ML Portal (Music): Completed project extracting acoustic/spectrogram features (MFCCs, spectral centroid, chroma) from the GTZAN dataset, training Scikit-Learn multi-class classifiers, and serving predictions via a Django web interface.
  4) Retail Festive Sales & Customer Analytics (Data-Analysis-Dewali): Completed Python exploratory data analysis (Pandas, NumPy, Seaborn, Matplotlib) identifying high-value customer demographics, regional segments, and product categories.
- Contact: Email bhsuman11@gmail.com | Phone/SMS +64 22 051 2513 | LinkedIn https://www.linkedin.com/in/suman-bhandari-ab4394279/ | GitHub https://github.com/bhsuman

RULES:
- Provide a direct, well-structured answer first before offering additional technical detail.
- Never invent employers, metrics, certifications, or unpublished benchmark numbers. If a detail is not in the portfolio, state clearly that it is not documented in the public portfolio.
- Keep responses concise (under 220 words), formatted with clean Markdown bullet points and bold headings."""


def check_rate_limit(bucket_dict, client_ip, max_requests):
    now = time.time()
    with RATE_LOCK:
        timestamps = bucket_dict.get(client_ip, [])
        timestamps = [t for t in timestamps if now - t < RATE_WINDOW_SECONDS]
        if len(timestamps) >= max_requests:
            bucket_dict[client_ip] = timestamps
            return True
        timestamps.append(now)
        bucket_dict[client_ip] = timestamps
        return False


def is_localhost(client_ip):
    return client_ip in ("127.0.0.1", "::1", "localhost")


def verify_owner_header(headers):
    provided_pin = headers.get("X-Owner-Pin", "")
    if not provided_pin or len(provided_pin) > 64:
        return False
    computed = hashlib.sha256((DEFAULT_PIN_SALT + provided_pin).encode("utf-8")).hexdigest()
    return hmac.compare_digest(computed, DEFAULT_OWNER_PIN_HASH)


def load_notifications():
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
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

    def log_message(self, format_str, *args):
        # Sanitize server access logs so query strings or sensitive headers are never printed
        safe_path = urllib.parse.urlparse(self.path).path
        print(f"[{self.log_date_time_string()}] {self.command} {safe_path}")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.github.com https://formsubmit.co; "
            "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://formsubmit.co;"
        )
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

        # Strict File Whitelist Check: Block access to .git, .env, server.py, chat_notifications.json, etc.
        if parsed_path not in ALLOWED_PUBLIC_FILES:
            self.send_error_json(403, "Forbidden: Resource is not publicly accessible.")
            return

        self.path = "/" + ALLOWED_PUBLIC_FILES[parsed_path]
        return super().do_GET()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path).path
        client_ip = self.client_address[0]

        if parsed_path == "/api/chat":
            self.handle_chat_endpoint(client_ip)
            return

        if parsed_path == "/api/contact":
            self.handle_contact_endpoint(client_ip)
            return

        if parsed_path == "/api/notify-sms":
            self.handle_notify_endpoint(client_ip)
            return

        self.send_error_json(404, "Endpoint not found.")

    def handle_chat_endpoint(self, client_ip):
        if check_rate_limit(IP_CHAT_LIMITS, client_ip, MAX_CHAT_REQUESTS_PER_WINDOW):
            self.send_error_json(429, "Rate limit reached. Please wait a few minutes before sending more questions.")
            return

        content_type = self.headers.get("Content-Type", "")
        if "application/json" not in content_type.lower():
            self.send_error_json(415, "Unsupported Media Type: application/json required.")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error_json(400, "Invalid Content-Length header.")
            return

        if content_length <= 0 or content_length > MAX_CHAT_BODY_BYTES:
            self.send_error_json(413, "Request payload size is invalid or exceeds the 6 KB limit.")
            return

        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self.send_error_json(400, "Malformed JSON payload.")
            return

        if not isinstance(payload, dict):
            self.send_error_json(400, "Invalid request structure.")
            return

        message = payload.get("message", "")
        history = payload.get("history", [])
        if not isinstance(message, str) or not isinstance(history, list):
            self.send_error_json(400, "Invalid field types in request.")
            return

        clean_message = message.strip()
        if len(clean_message) < 2 or len(clean_message) > MAX_QUERY_CHARS:
            self.send_error_json(400, f"Message must be between 2 and {MAX_QUERY_CHARS} characters.")
            return

        for pattern in SERVER_BLOCKED_PATTERNS:
            if pattern.search(clean_message):
                self.send_json(200, {
                    "status": "ok",
                    "reply": "I'm Suman AI, and I focus exclusively on Suman Bhandari's verified portfolio projects, technical skills, academic background, and professional experience."
                })
                return

        # If no server-side Gemini API key is configured, instruct client to use verified deterministic engine
        if not GEMINI_API_KEY:
            self.send_json(200, {"status": "local_fallback"})
            return

        if not CHAT_CONCURRENCY_SEMAPHORE.acquire(blocking=False):
            self.send_error_json(503, "Assistant is busy handling other requests. Please try again in a moment.")
            return

        try:
            contents = []
            for turn in history[-4:]:
                if isinstance(turn, dict):
                    role = "user" if turn.get("role") == "user" else "model"
                    text = str(turn.get("text", "")).strip()[:500]
                    if text:
                        contents.append({"role": role, "parts": [{"text": text}]})

            contents.append({
                "role": "user",
                "parts": [{"text": f"{SERVER_SYSTEM_INSTRUCTION}\n\nVisitor Question: {clean_message}"}]
            })

            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{urllib.parse.quote(GEMINI_MODEL)}:generateContent?key={urllib.parse.quote(GEMINI_API_KEY)}"
            )
            req_body = json.dumps({
                "contents": contents,
                "generationConfig": {
                    "maxOutputTokens": 420,
                    "temperature": 0.2,
                    "topP": 0.85
                }
            }).encode("utf-8")

            req = urllib.request.Request(
                endpoint,
                data=req_body,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                candidate_text = (
                    resp_data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )
                if not candidate_text:
                    self.send_json(200, {"status": "local_fallback"})
                    return
                self.send_json(200, {"status": "ok", "reply": candidate_text[:1500]})
        except Exception:
            # Never expose internal stack traces or provider errors
            self.send_json(200, {"status": "local_fallback"})
        finally:
            CHAT_CONCURRENCY_SEMAPHORE.release()

    def handle_contact_endpoint(self, client_ip):
        if check_rate_limit(IP_CONTACT_LIMITS, client_ip, MAX_CONTACT_REQUESTS_PER_WINDOW):
            self.send_error_json(429, "Too many contact submissions. Please wait a few minutes or email bhsuman11@gmail.com directly.")
            return

        content_type = self.headers.get("Content-Type", "")
        if "application/json" not in content_type.lower():
            self.send_error_json(415, "Unsupported Media Type: application/json required.")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error_json(400, "Invalid Content-Length header.")
            return

        if content_length <= 0 or content_length > MAX_CONTACT_BODY_BYTES:
            self.send_error_json(413, "Payload size invalid or exceeds the 4 KB limit.")
            return

        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            self.send_error_json(400, "Malformed JSON payload.")
            return

        if not isinstance(payload, dict):
            self.send_error_json(400, "Invalid request object.")
            return

        # Honeypot spam check: if hidden 'website' field is filled, reject
        honeypot = str(payload.get("website", "")).strip()
        if honeypot:
            self.send_error_json(400, "Spam check failed.")
            return

        def sanitize_text(val, max_len):
            cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f<>]", "", str(val or "")).strip()
            return cleaned[:max_len]

        name = sanitize_text(payload.get("name", ""), 80)
        contact = sanitize_text(payload.get("contact", ""), 120)
        subject = sanitize_text(payload.get("subject", ""), 120) or "Portfolio Inquiry"
        message = sanitize_text(payload.get("message", ""), 1500)

        if len(name) < 2:
            self.send_error_json(400, "Please enter your name (at least 2 characters).")
            return
        if not EMAIL_OR_PHONE_REGEX.match(contact):
            self.send_error_json(400, "Please enter a valid email address or phone number.")
            return
        if len(message) < 10:
            self.send_error_json(400, "Please enter a message of at least 10 characters.")
            return

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        summary_question = f"[{subject}] From {name} ({contact}): {message}"
        entry = {
            "timestamp": timestamp,
            "source": "Contact Form",
            "question": summary_question[:400],
            "reply": "Direct Contact Form Submission"
        }
        save_notification(entry)

        if PRIVATE_NTFY_TOPIC:
            try:
                ntfy_url = (
                    f"https://ntfy.sh/{urllib.parse.quote(PRIVATE_NTFY_TOPIC)}"
                    f"?title={urllib.parse.quote('Portfolio Contact Form')}&priority=high&tags=email"
                )
                req = urllib.request.Request(
                    ntfy_url,
                    data=summary_question.encode("utf-8"),
                    method="POST"
                )
                urllib.request.urlopen(req, timeout=4)
            except Exception:
                pass

        self.send_json(200, {"status": "ok", "received_at": timestamp})

    def handle_notify_endpoint(self, client_ip):
        if check_rate_limit(IP_NOTIFY_LIMITS, client_ip, MAX_NOTIFY_REQUESTS_PER_WINDOW):
            self.send_error_json(429, "Too many requests. Please try again later.")
            return

        content_type = self.headers.get("Content-Type", "")
        if "application/json" not in content_type.lower():
            self.send_error_json(415, "Unsupported Media Type: application/json required.")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error_json(400, "Invalid Content-Length header.")
            return

        if content_length <= 0 or content_length > MAX_NOTIFY_BODY_BYTES:
            self.send_error_json(413, "Payload size invalid or exceeds security limit.")
            return

        post_body = self.rfile.read(content_length)

        try:
            data = json.loads(post_body.decode("utf-8"))
            if not isinstance(data, dict):
                self.send_error_json(400, "Invalid JSON object.")
                return

            text = str(data.get("text", "")).strip()[:200]
            reply = str(data.get("reply", "")).strip()[:280]
            source = str(data.get("source", "Suman AI")).strip()[:50]
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

            if PRIVATE_NTFY_TOPIC:
                try:
                    ntfy_url = (
                        f"https://ntfy.sh/{urllib.parse.quote(PRIVATE_NTFY_TOPIC)}"
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
        except Exception:
            self.send_error_json(400, "Invalid request format.")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Owner-Pin")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
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
        print("  AI Proxy:         POST /api/chat (Server-side key only)")
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
