# Suman Bhandari — Portfolio & Live GitHub Hub

> **Data Analytics Student & Associate Data Engineer**  
> 📍 Henderson, Auckland, New Zealand  
> 🎓 Master of Applied Technologies (Computing – Data Analytics), Unitec Institute of Technology  
> 💼 Status: **Student • Open to Work** (Student Roles, Internships, Part-Time & Graduate Opportunities)  
> 📱 Mobile / SMS: **+64 22 051 2513** (`022 051 2513`)  
> ✉️ Email: **bhsuman11@gmail.com**  
> 🔗 [LinkedIn](https://www.linkedin.com/in/suman-bhandari-ab4394279/) | [GitHub](https://github.com/bhsuman)

---

## Key Features

1. **Live GitHub Synchronization**:
   - Automatically fetches live repositories, commit dates, languages, and public repo counts from `https://api.github.com/users/bhsuman/repos`.
   - Any new repository created or updated on GitHub automatically displays on the portfolio and updates the Q&A Assistant's context.
   - Includes a `.github/workflows/deploy.yml` GitHub Actions workflow so every push to `main` deploys live to GitHub Pages automatically.

2. **Clean White & Blue Editorial Design**:
   - Crisp white (`#ffffff`), cool slate (`#f8fafc`), and royal blue (`#1d4ed8`) palette designed to look authentic, readable, and human-crafted.

3. **Strictly Guardrailed & Token-Limited Q&A Assistant**:
   - **Portfolio-Only Filter**: Blocks off-topic prompts, code generation requests, essays, jokes, and prompt injections before consuming any tokens.
   - **Hard Token Caps**: Locked to **80 output tokens max** per response, **140 characters max** per input question, and **400 tokens / 6 questions max per visitor per day** (persisted in `localStorage` with a 5-second cooldown).

4. **Multi-Channel Visitor Notifications**:
   - **Email Alerts (`bhsuman11@gmail.com`)**: Dispatched via FormSubmit AJAX whenever a visitor asks a question or submits the contact form.
   - **Instant Mobile Push (`ntfy.sh`)**: CORS-safe push notification sent to [`https://ntfy.sh/suman-portfolio-nz-220512513`](https://ntfy.sh/suman-portfolio-nz-220512513).
   - **Live Visitor Log & Test Button**: Click **"Alert Setup & Logs"** in the top bar to view recent visitor inquiries or send a test notification.

---

## Running Locally

```powershell
python server.py
```

Open **[http://localhost:8000](http://localhost:8000)** in your browser.
