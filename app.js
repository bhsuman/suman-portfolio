/**
 * Suman Bhandari - Portfolio, Live GitHub Sync, Guardrailed AI Assistant & Notification Hub
 * Location: Henderson, Auckland, New Zealand
 * Status: Master's Student • Open to Work
 */

const GITHUB_USERNAME = "bhsuman";

// Curated metadata fallback / enrichment for known repositories
const CURATED_REPO_DETAILS = {
  "big-data-warehousing-pipeline": {
    displayName: "Big Data Warehousing & BI Pipeline",
    category: "Data Engineering",
    description: "Cloud data warehousing and BI pipeline implementing Medallion Architecture (Bronze/Silver/Gold) and dimensional star-schema modeling using Databricks, PySpark, Delta Lake, and Power BI.",
    tags: ["Databricks", "PySpark", "Delta Lake", "Power BI", "SQL"],
    featured: true
  },
  "Music": {
    displayName: "Music Genre Classification Portal",
    category: "Machine Learning",
    description: "Web portal that extracts acoustic features and classifies audio files into genres using Python, Django, and Matplotlib on the GTZAN dataset.",
    tags: ["Python", "Django", "Matplotlib", "GTZAN"],
    featured: true
  },
  "Data-Analysis-Dewali": {
    displayName: "Diwali Festive Sales Analysis",
    category: "Data Analysis",
    description: "Exploratory data analysis inspecting consumer demographics, product categories, and purchasing patterns to identify high-revenue retail segments.",
    tags: ["Python", "Pandas", "Seaborn", "Jupyter"],
    featured: true
  },
  "Data-Analysis-Weather": {
    displayName: "Atmospheric Weather Trends Analysis",
    category: "Data Analysis",
    description: "Cleaned and evaluated multi-variable meteorological readings to analyze humidity shifts, precipitation, and temperature trends.",
    tags: ["Python", "Pandas", "Matplotlib", "Jupyter"],
    featured: true
  },
  "QuizGame": {
    displayName: "Interactive Quiz Game Engine",
    category: "Python Programming",
    description: "Modular Python application implementing custom scoring rules, control flow, and category-based question workflows.",
    tags: ["Python", "OOP", "Logic Design"],
    featured: false
  },
  "suman-portfolio": {
    displayName: "Personal Portfolio & Live GitHub Hub",
    category: "Web & AI",
    description: "Personal data analytics portfolio featuring live GitHub repository synchronization, strict token-bounded Q&A assistant, and real-time visitor notifications.",
    tags: ["JavaScript", "HTML5", "Tailwind CSS", "Python"],
    featured: false
  }
};

const SUMAN_INFO = {
  name: "Suman Bhandari",
  title: "Data Analytics Student & Associate Data Engineer",
  status: "Master's Student • Open to Work (Student / Internship / Part-Time / Graduate Roles)",
  location: "Henderson, Auckland",
  phone: "+64 22 051 2513",
  phoneLocal: "022 051 2513",
  email: "bhsuman11@gmail.com",
  linkedin: "https://www.linkedin.com/in/suman-bhandari-ab4394279/",
  github: "https://github.com/bhsuman",
  educationCurrent: "Master of Applied Technologies (Computing – Data Analytics), Unitec Institute of Technology, Auckland (Jul 2026 – Present)",
  bachelor: "B.Sc. in Computer Science and Information Technology (CSIT), Samriddhi College, Nepal (Oct 2018 – Dec 2023)",
  projects: Object.keys(CURATED_REPO_DETAILS).map(repoKey => ({
    name: CURATED_REPO_DETAILS[repoKey].displayName,
    repo: repoKey,
    tech: CURATED_REPO_DETAILS[repoKey].tags.join(", "),
    description: CURATED_REPO_DETAILS[repoKey].description,
    url: `https://github.com/${GITHUB_USERNAME}/${repoKey}`
  }))
};

// Hard-Locked Safety & Token Constants (Visitors CANNOT override these)
const DAILY_MAX_TOKENS = 400;
const DAILY_MAX_QUESTIONS = 6;
const HARD_MAX_OUTPUT_TOKENS = 80;
const HARD_MAX_INPUT_CHARS = 140;
const COOLDOWN_MS = 5000;

let lastQuestionTimestamp = 0;
let geminiApiKey = localStorage.getItem("suman_gemini_api_key") || "";
let selectedModel = localStorage.getItem("suman_gemini_model") || "gemini-2.5-flash";
let customWebhookUrl = localStorage.getItem("suman_custom_webhook") || "";

// Load or Initialize Persistent Daily Visitor Quota
function getVisitorQuota() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem("suman_daily_token_quota_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch (e) {}
  const fresh = { date: today, tokensRemaining: DAILY_MAX_TOKENS, questionsAsked: 0 };
  saveVisitorQuota(fresh);
  return fresh;
}

function saveVisitorQuota(quota) {
  try {
    localStorage.setItem("suman_daily_token_quota_v2", JSON.stringify(quota));
  } catch (e) {}
}

// Load or Save Notification History
function getStoredNotifications() {
  try {
    const raw = localStorage.getItem("suman_visitor_notifications_v2");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredNotification(item) {
  const list = getStoredNotifications();
  list.unshift(item);
  if (list.length > 30) list.pop();
  try {
    localStorage.setItem("suman_visitor_notifications_v2", JSON.stringify(list));
  } catch (e) {}
  updateAlertBadgeAndList();
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initAucklandClock();
  initSkillsFilter();
  renderProjectsGrid(getInitialFallbackRepos());
  syncGitHubData(false);
  // Auto-refresh GitHub data every 5 minutes
  setInterval(() => syncGitHubData(false), 5 * 60 * 1000);
  initAgentUI();
  initKeySettings();
  initAlertsModal();
  updateAlertBadgeAndList();
});

// 1. Auckland Real-Time Clock
function initAucklandClock() {
  const clockElement = document.getElementById("auckland-clock");
  if (!clockElement) return;

  function updateClock() {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-NZ", {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        weekday: "short"
      });
      clockElement.textContent = `Henderson, Auckland • ${formatter.format(now)} NZT`;
    } catch (e) {
      clockElement.textContent = "Henderson, Auckland";
    }
  }
  updateClock();
  setInterval(updateClock, 15000);
}

// 2. Skills Filter
function initSkillsFilter() {
  const filterBtns = document.querySelectorAll(".skill-filter-btn");
  const skillCards = document.querySelectorAll(".skill-card");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => {
        b.classList.remove("bg-blue-700", "text-white", "border-blue-700");
        b.classList.add("bg-white", "text-slate-700", "border-slate-300");
      });
      btn.classList.add("bg-blue-700", "text-white", "border-blue-700");
      btn.classList.remove("bg-white", "text-slate-700", "border-slate-300");

      const category = btn.getAttribute("data-category");
      skillCards.forEach(card => {
        if (category === "all" || card.getAttribute("data-category") === category) {
          card.classList.remove("hidden");
          card.classList.add("flex");
        } else {
          card.classList.add("hidden");
          card.classList.remove("flex");
        }
      });
    });
  });
}

// 3. LIVE GITHUB SYNCHRONIZATION
function getInitialFallbackRepos() {
  return Object.entries(CURATED_REPO_DETAILS).map(([repoName, meta]) => ({
    name: repoName,
    displayName: meta.displayName,
    category: meta.category,
    description: meta.description,
    tags: meta.tags,
    html_url: `https://github.com/${GITHUB_USERNAME}/${repoName}`,
    pushed_at: null,
    stargazers_count: 0,
    language: meta.tags[0] || "Python",
    featured: meta.featured
  }));
}

async function syncGitHubData(manualTrigger = false) {
  const pill = document.getElementById("github-live-pill");
  const countEl = document.getElementById("github-repo-count");
  const subtextEl = document.getElementById("github-sync-subtext");
  const refreshIcon = document.getElementById("github-refresh-icon");

  if (pill) pill.textContent = "Syncing with GitHub...";
  if (refreshIcon && manualTrigger) refreshIcon.classList.add("animate-spin");

  try {
    // Also trigger local server git pull if running via server.py
    if (manualTrigger && window.location.protocol.startsWith("http")) {
      fetch("/api/github-pull").catch(() => {});
    }

    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
        headers: { "Accept": "application/vnd.github.v3+json" }
      }),
      fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=50`, {
        headers: { "Accept": "application/vnd.github.v3+json" }
      })
    ]);

    if (!reposRes.ok) throw new Error(`GitHub API HTTP ${reposRes.status}`);

    const userData = userRes.ok ? await userRes.json() : null;
    const reposData = await reposRes.json();

    if (Array.isArray(reposData) && reposData.length > 0) {
      // Map live GitHub repositories and merge with curated descriptions where helpful
      const processedRepos = reposData
        .filter(r => !r.fork && r.name.toLowerCase() !== GITHUB_USERNAME.toLowerCase())
        .map(repo => {
          const curated = CURATED_REPO_DETAILS[repo.name];
          const liveDesc = repo.description ? repo.description.trim() : "";
          const tags = [];
          if (repo.language) tags.push(repo.language);
          if (Array.isArray(repo.topics) && repo.topics.length > 0) {
            repo.topics.slice(0, 4).forEach(t => {
              if (!tags.includes(t)) tags.push(t);
            });
          }
          if (curated && curated.tags) {
            curated.tags.forEach(t => {
              if (!tags.some(existing => existing.toLowerCase() === t.toLowerCase())) {
                tags.push(t);
              }
            });
          }

          return {
            name: repo.name,
            displayName: curated ? curated.displayName : formatRepoTitle(repo.name),
            category: curated ? curated.category : (repo.language || "Repository"),
            description: liveDesc || (curated ? curated.description : `Public ${repo.language || "software"} repository maintained by Suman Bhandari on GitHub.`),
            tags: tags.slice(0, 5),
            html_url: repo.html_url,
            pushed_at: repo.pushed_at || repo.updated_at,
            stargazers_count: repo.stargazers_count || 0,
            language: repo.language || (curated ? curated.tags[0] : "Code"),
            featured: curated ? curated.featured : true
          };
        });

      // Sort: featured & most recently pushed first
      processedRepos.sort((a, b) => {
        const dateA = a.pushed_at ? new Date(a.pushed_at).getTime() : 0;
        const dateB = b.pushed_at ? new Date(b.pushed_at).getTime() : 0;
        return dateB - dateA;
      });

      renderProjectsGrid(processedRepos);

      // Update AI Assistant's live project knowledge
      SUMAN_INFO.projects = processedRepos.map(p => ({
        name: p.displayName,
        repo: p.name,
        tech: p.tags.join(", "),
        description: p.description,
        updated: formatRelativeTime(p.pushed_at),
        url: p.html_url
      }));

      const totalCount = (userData && typeof userData.public_repos === "number")
        ? userData.public_repos
        : processedRepos.length;

      if (countEl) countEl.textContent = `${totalCount} Repos`;
      const syncTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (subtextEl) subtextEl.textContent = `Live from GitHub (${syncTime})`;
      if (pill) pill.textContent = `Live • ${totalCount} public repos`;

      if (manualTrigger) {
        showToastNotification(`Synced ${processedRepos.length} repositories live from github.com/${GITHUB_USERNAME}`);
      }
    }
  } catch (err) {
    if (pill) pill.textContent = "GitHub Synced";
    if (countEl && countEl.textContent === "Live Sync") countEl.textContent = `${SUMAN_INFO.projects.length}+ Repos`;
  } finally {
    if (refreshIcon) refreshIcon.classList.remove("animate-spin");
  }
}
window.syncGitHubData = syncGitHubData;

function formatRepoTitle(rawName) {
  return rawName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Active";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "Active";
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 30) return `Updated ${diffDays}d ago`;
  return `Updated ${date.toLocaleDateString("en-NZ", { month: "short", year: "numeric" })}`;
}

function renderProjectsGrid(repos) {
  const grid = document.getElementById("github-projects-grid");
  if (!grid) return;

  grid.innerHTML = repos.map(repo => {
    const updatedLabel = formatRelativeTime(repo.pushed_at);
    const tagsHtml = (repo.tags || []).map(tag =>
      `<span class="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">${escapeHtml(tag)}</span>`
    ).join("");

    return `
      <article class="rounded-xl card-clean p-6 flex flex-col justify-between">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-medium">
              ${escapeHtml(repo.category)}
            </span>
            <span class="text-[11px] font-mono text-slate-500">
              ${escapeHtml(updatedLabel)}
            </span>
          </div>

          <h3 class="text-lg font-bold text-slate-900">
            <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-700 transition-colors">
              ${escapeHtml(repo.displayName)}
            </a>
          </h3>

          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            ${escapeHtml(repo.description)}
          </p>

          <div class="flex flex-wrap gap-1.5 pt-1">
            ${tagsHtml}
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 mt-5 flex items-center justify-between">
          <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center">
            View on GitHub →
          </a>
          <span class="text-[11px] font-mono text-slate-500">${escapeHtml(repo.name)}</span>
        </div>
      </article>
    `;
  }).join("");
}

// 4. STRICT CONTENT & OFF-TOPIC GUARDRAILS ("Don't generate anything stupid")
function validatePortfolioQuery(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  if (q.length < 2) {
    return { allowed: false, reason: "Please enter a clear question about Suman's background or projects." };
  }

  // Block prompt injection, jailbreaks, or off-topic generation tasks
  const blockedPatterns = [
    /ignore\s+(all|previous|above|prior)/i,
    /system\s*prompt/i,
    /act\s+as|pretend\s+to\s+be|roleplay/i,
    /write\s+(a|an|me)\s+(poem|essay|story|song|joke|script|blog|recipe|email|letter|code|program)/i,
    /generate\s+(code|image|story|poem|joke|essay|malware|virus)/i,
    /solve\s+this|calculate|math|homework|leetcode|hackerrank/i,
    /bypass|jailbreak|dan\s+mode|developer\s+mode/i,
    /tell\s+me\s+a\s+joke|funny|riddle/i,
    /who\s+is\s+(the\s+president|prime\s+minister|elon|trump|biden)/i,
    /\b(wtf|fuck|shit|bitch|asshole|dick|porn|nsfw|sex|idiot|stupid)\b/i
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(q)) {
      return {
        allowed: false,
        reason: "This assistant is strictly restricted to answering professional questions about Suman Bhandari's resume, education, skills, and GitHub projects."
      };
    }
  }

  // Require at least one portfolio/greeting keyword so random unrelated prompts are blocked
  const allowedKeywords = [
    "suman", "bhandari", "hi", "hello", "hey", "kia ora", "who", "about", "background", "summary", "profile",
    "skill", "tech", "stack", "tool", "python", "sql", "power bi", "powerbi", "dax", "snowflake", "databricks",
    "spark", "pyspark", "delta", "medallion", "etl", "warehouse", "warehousing", "database", "mysql", "r ", "aws", "git", "jira",
    "project", "github", "repo", "repository", "pipeline", "music", "diwali", "dewali", "weather", "quiz", "ecommerce",
    "work", "experience", "career", "job", "role", "intern", "internship", "student", "study", "studying", "available", "availability", "open", "status", "hire", "part-time", "part time",
    "education", "degree", "master", "bachelor", "unitec", "college", "samriddhi", "siddhartha", "qualification", "university",
    "bank", "laxmi", "sunrise", "catalyst", "consultancy", "lis", "nepal", "auckland", "henderson",
    "contact", "phone", "number", "mobile", "sms", "text", "call", "email", "gmail", "linkedin", "reach", "connect", "cv", "resume", "data", "analyst", "engineer", "analytics"
  ];

  const isRelevant = allowedKeywords.some(kw => q.includes(kw));
  if (!isRelevant) {
    return {
      allowed: false,
      reason: "I can only answer questions related to Suman Bhandari's skills, Unitec Master's study, work experience, GitHub projects, or contact details."
    };
  }

  return { allowed: true };
}

// 5. AI ASSISTANT UI & STRICT TOKEN ENGINE
function initAgentUI() {
  const chatForm = document.getElementById("agent-chat-form");
  const chatInput = document.getElementById("agent-chat-input");

  updateTokenDisplay();

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rawMessage = chatInput.value.trim().slice(0, HARD_MAX_INPUT_CHARS);
      if (!rawMessage) return;

      // Cooldown check
      const now = Date.now();
      if (now - lastQuestionTimestamp < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - (now - lastQuestionTimestamp)) / 1000);
        showToastNotification(`Please wait ${waitSec}s before sending another question.`);
        return;
      }

      // Daily visitor quota check
      const quota = getVisitorQuota();
      if (quota.tokensRemaining <= 15 || quota.questionsAsked >= DAILY_MAX_QUESTIONS) {
        appendMessage(
          "agent",
          "Daily token limit reached (capped at 400 tokens / 6 questions per visitor to prevent abuse). Please contact Suman directly at **bhsuman11@gmail.com** or **+64 22 051 2513**."
        );
        return;
      }

      lastQuestionTimestamp = now;
      appendMessage("user", rawMessage);
      chatInput.value = "";

      // Validate query against off-topic / stupid generation filter BEFORE using tokens
      const validation = validatePortfolioQuery(rawMessage);
      if (!validation.allowed) {
        appendMessage("agent", validation.reason, 0, rawMessage);
        triggerSmsAlert(`[Filtered Off-Topic Prompt]: ${rawMessage}`, validation.reason, "AI Assistant (Filtered)");
        return;
      }

      chatInput.disabled = true;
      const typingId = showTypingIndicator();

      try {
        const response = await generateAgentResponse(rawMessage);
        removeTypingIndicator(typingId);
        appendMessage("agent", response.text, response.tokenCost, rawMessage);

        // Notify Suman with both the visitor's question and the AI's reply
        triggerSmsAlert(rawMessage, response.text, "AI Chat Assistant");
      } catch (err) {
        removeTypingIndicator(typingId);
        const fallback = generateLocalResponse(rawMessage, Math.ceil(rawMessage.length / 4));
        appendMessage("agent", fallback.text, fallback.tokenCost, rawMessage);
        triggerSmsAlert(rawMessage, fallback.text, "AI Chat Assistant");
      } finally {
        chatInput.disabled = false;
        chatInput.focus();
      }
    });
  }
}

function updateTokenDisplay() {
  const quota = getVisitorQuota();
  const tokenMeter = document.getElementById("agent-token-meter");
  const tokenBar = document.getElementById("agent-token-bar");
  if (tokenMeter) {
    tokenMeter.textContent = `${quota.tokensRemaining} / ${DAILY_MAX_TOKENS} tokens`;
  }
  if (tokenBar) {
    const pct = Math.max(0, Math.min(100, (quota.tokensRemaining / DAILY_MAX_TOKENS) * 100));
    tokenBar.style.width = `${pct}%`;
    tokenBar.className = pct < 25
      ? "token-bar-fill h-full bg-red-600 rounded-full"
      : "token-bar-fill h-full bg-blue-600 rounded-full";
  }
}

function consumeVisitorTokens(amount) {
  const quota = getVisitorQuota();
  quota.tokensRemaining = Math.max(0, quota.tokensRemaining - amount);
  quota.questionsAsked = (quota.questionsAsked || 0) + 1;
  saveVisitorQuota(quota);
  updateTokenDisplay();
}

function appendMessage(sender, text, tokenCost = null, originalQuestion = "") {
  const container = document.getElementById("agent-messages");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;

  if (sender === "user") {
    msgDiv.innerHTML = `
      <div class="chat-bubble-user max-w-[85%] px-3.5 py-2.5 text-sm shadow-xs">
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  } else {
    const formattedText = renderMarkdown(text);
    const smsLink = `sms:+64220512513?body=${encodeURIComponent("Hi Suman, regarding: " + (originalQuestion || "").slice(0, 60))}`;
    msgDiv.innerHTML = `
      <div class="chat-bubble-agent max-w-[90%] px-4 py-3 text-sm">
        <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 text-[11px] text-slate-500">
          <span class="font-semibold text-blue-700">Portfolio Assistant</span>
          ${tokenCost !== null ? `<span class="font-mono">${tokenCost} tokens</span>` : ""}
        </div>
        <div class="text-slate-800 leading-relaxed text-xs sm:text-sm">${formattedText}</div>
        <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
          <a href="${smsLink}" class="text-blue-700 hover:underline font-medium">Text Suman (022 051 2513)</a>
          <span class="text-slate-400">✓ Suman notified</span>
        </div>
      </div>
    `;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById("agent-messages");
  if (!container) return null;
  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "flex justify-start";
  div.innerHTML = `
    <div class="chat-bubble-agent px-3.5 py-2 text-xs text-slate-500 font-mono">
      Checking Suman's portfolio...
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

// 6. MULTI-CHANNEL VISITOR NOTIFICATION SYSTEM (Email + CORS-Safe Phone Push + Local Log + Browser Alert)
async function triggerSmsAlert(questionText, aiReply = "", source = "AI Chat Assistant") {
  const timestamp = new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" });
  const cleanQuestion = String(questionText).slice(0, 200);
  const cleanReply = String(aiReply).slice(0, 280);

  // 1) Save to browser log & update UI badge immediately
  saveStoredNotification({
    timestamp,
    source,
    question: cleanQuestion,
    reply: cleanReply
  });

  // 2) Native Browser Notification if granted
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`New Portfolio ${source}`, {
        body: cleanQuestion,
        icon: "assets/suman-bhandari.jpg"
      });
    } catch (e) {}
  }

  // 3) CORS-Safe NTFY Push Notification (No custom headers -> No CORS preflight block!)
  const ntfyUrl = `https://ntfy.sh/suman-portfolio-nz-220512513?title=${encodeURIComponent("Portfolio: " + source)}&priority=high&tags=bell`;
  const pushBody = `Visitor Question (${timestamp} NZT):\n"${cleanQuestion}"\n\nReply: ${cleanReply || "N/A"}`;
  try {
    fetch(ntfyUrl, {
      method: "POST",
      body: pushBody
    }).catch(() => {});
  } catch (e) {}

  // 4) Automatic Email Notification to bhsuman11@gmail.com via FormSubmit AJAX
  try {
    fetch("https://formsubmit.co/ajax/bhsuman11@gmail.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        _subject: `Portfolio Alert (${source}): "${cleanQuestion.slice(0, 50)}"`,
        Visitor_Inquiry: cleanQuestion,
        Assistant_Reply: cleanReply || "Direct Contact Form",
        Timestamp_NZT: timestamp,
        Portfolio_Source: window.location.href,
        _template: "table",
        _captcha: "false"
      })
    }).catch(() => {});
  } catch (e) {}

  // 5) Custom Webhook (Discord / Slack / etc.) if configured by Suman
  if (customWebhookUrl && customWebhookUrl.startsWith("https://")) {
    try {
      fetch(customWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🔔 **Portfolio Inquiry (${source})**\n**Question:** ${cleanQuestion}\n**Time:** ${timestamp}`,
          text: `Portfolio Inquiry (${source}): ${cleanQuestion} (${timestamp})`
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // 6) Local Python Server Relay (/api/notify-sms) when running server.py
  try {
    fetch("/api/notify-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+64220512513",
        email: "bhsuman11@gmail.com",
        text: cleanQuestion,
        reply: cleanReply,
        source: source,
        webhookUrl: customWebhookUrl,
        timestamp: timestamp
      })
    }).catch(() => {});
  } catch (e) {}
}
window.triggerSmsAlert = triggerSmsAlert;

// 7. TOKEN-BOUNDED GEMINI + VERIFIED LOCAL RESPONSE GENERATOR
async function generateAgentResponse(userQuery) {
  const cleanQuery = userQuery.slice(0, HARD_MAX_INPUT_CHARS);
  const estimatedInputTokens = Math.max(5, Math.ceil(cleanQuery.length / 4));

  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      return await callGeminiAPI(cleanQuery, estimatedInputTokens);
    } catch (apiError) {
      console.warn("Gemini API fallback to local verified knowledge:", apiError);
    }
  }

  return generateLocalResponse(cleanQuery, estimatedInputTokens);
}

async function callGeminiAPI(userQuery, inputTokens) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`;

  const projectSummaries = SUMAN_INFO.projects
    .slice(0, 6)
    .map(p => `${p.name} (${p.repo}): ${p.tech}`)
    .join("; ");

  const systemInstruction = `You are a strictly bounded portfolio Q&A assistant for Suman Bhandari.
FACTS:
- Name: Suman Bhandari (based in Henderson, Auckland)
- Current Status: Master's Student • Open to Work (seeking student roles, internships, part-time, and graduate data roles). Do NOT mention Australia or NZ-wide open work visa claims.
- Current Education: Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology (Jul 2026 – Present).
- Bachelor's: B.Sc. CSIT, Samriddhi College, Nepal (2018 – 2023).
- Work Experience:
  1) Trainee Assistant - ICT at Laxmi Sunrise Bank (Feb 2026 – Jun 2026)
  2) Associate Data Engineer at Development Catalyst Consultancy (Jan 2024 – Jan 2026)
  3) Data Engineer Trainee at LIS Nepal (Jul 2023 – Oct 2023)
- Skills: Python, SQL, R, Power BI, Snowflake, Databricks Delta Lake, SQL Server, MySQL, ETL, Git, AWS Basics.
- Live GitHub Projects (github.com/bhsuman): ${projectSummaries}.
- Contact: +64 22 051 2513 (022 051 2513), bhsuman11@gmail.com.
STRICT RULES:
1) Answer ONLY questions about Suman Bhandari's education, skills, projects, experience, or contact details.
2) NEVER write code, jokes, stories, essays, or answer unrelated topics.
3) Keep your reply under 55 words and under ${HARD_MAX_OUTPUT_TOKENS} tokens.`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemInstruction}\n\nVisitor Question: ${userQuery}` }]
      }
    ],
    generationConfig: {
      maxOutputTokens: HARD_MAX_OUTPUT_TOKENS,
      temperature: 0.15,
      topP: 0.8
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error("Gemini API call failed");
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.trim();
  if (!text) {
    return generateLocalResponse(userQuery, inputTokens);
  }

  // Enforce hard character ceiling even on API output
  if (text.length > 320) {
    text = text.slice(0, 317) + "...";
  }

  const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(text.length / 4));
  const totalUsed = Math.min(HARD_MAX_OUTPUT_TOKENS + inputTokens, inputTokens + outputTokens);
  consumeVisitorTokens(totalUsed);

  return { text, tokenCost: totalUsed };
}

function generateLocalResponse(query, inputTokens) {
  const q = query.toLowerCase();
  let responseText = "";

  if (q.includes("contact") || q.includes("phone") || q.includes("number") || q.includes("call") || q.includes("email") || q.includes("reach") || q.includes("sms")) {
    responseText = "You can contact Suman directly via:\n• **Phone / SMS**: +64 22 051 2513 (022 051 2513)\n• **Email**: bhsuman11@gmail.com\n• **GitHub**: github.com/bhsuman";
  } else if (q.includes("student") || q.includes("status") || q.includes("open") || q.includes("available") || q.includes("availability") || q.includes("work") && (q.includes("status") || q.includes("open") || q.includes("intern"))) {
    responseText = "Suman is currently a **Master's Student** (Computing – Data Analytics) at Unitec Institute of Technology and is **Open to Work** for student roles, internships, part-time positions, and graduate data opportunities.";
  } else if (q.includes("project") || q.includes("github") || q.includes("repo") || q.includes("databricks") || q.includes("dewali") || q.includes("diwali") || q.includes("music") || q.includes("weather")) {
    const topList = SUMAN_INFO.projects.slice(0, 4).map(p => `• **${p.name}** (${p.tech})`).join("\n");
    responseText = `Suman's live GitHub repositories (github.com/bhsuman) include:\n${topList}`;
  } else if (q.includes("skill") || q.includes("python") || q.includes("sql") || q.includes("power bi") || q.includes("snowflake") || q.includes("tech") || q.includes("stack") || q.includes("tool")) {
    responseText = "Suman's core stack:\n• **Languages & BI**: SQL, Python (Pandas, PySpark), R, Power BI (DAX)\n• **Data Engineering**: Snowflake, Databricks Delta Lake, Medallion Architecture, SQL Server, MySQL, Git.";
  } else if (q.includes("education") || q.includes("unitec") || q.includes("degree") || q.includes("master") || q.includes("bachelor") || q.includes("study") || q.includes("college")) {
    responseText = "• **Master of Applied Technologies (Data Analytics)**: Unitec Institute of Technology (Jul 2026 – Present)\n• **B.Sc. CSIT**: Samriddhi College (2018 – 2023).";
  } else if (q.includes("experience") || q.includes("bank") || q.includes("laxmi") || q.includes("history") || q.includes("catalyst") || q.includes("lis")) {
    responseText = "Suman has 2+ years of experience:\n• **Trainee Assistant - ICT** at Laxmi Sunrise Bank (2026)\n• **Associate Data Engineer** at Development Catalyst Consultancy (2024–2026)\n• **Data Engineer Trainee** at LIS Nepal (2023).";
  } else {
    responseText = "Suman Bhandari is a Master's Student in Data Analytics at Unitec and former Associate Data Engineer skilled in SQL, Python, Power BI, Snowflake, and Databricks. He is open to student and data roles — contact him at **022 051 2513** or **bhsuman11@gmail.com**.";
  }

  const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(responseText.length / 4));
  const totalCost = inputTokens + outputTokens;
  consumeVisitorTokens(totalCost);

  return { text: responseText, tokenCost: totalCost };
}

// 8. ALERTS & NOTIFICATION LOG MODAL
function initAlertsModal() {
  const openBtn = document.getElementById("open-alerts-btn");
  const webhookInput = document.getElementById("custom-webhook-input");
  if (webhookInput) webhookInput.value = customWebhookUrl;
  if (openBtn) {
    openBtn.addEventListener("click", openAlertsModal);
  }
}

window.openAlertsModal = function() {
  const modal = document.getElementById("alerts-modal");
  if (!modal) return;
  updateAlertBadgeAndList();
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Also fetch server-side logs if server.py is running
  fetch("/api/notifications")
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && Array.isArray(data.notifications) && data.notifications.length > 0) {
        renderNotificationListItems(data.notifications);
      }
    })
    .catch(() => {});
};

window.closeAlertsModal = function() {
  const modal = document.getElementById("alerts-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
};

function updateAlertBadgeAndList() {
  const list = getStoredNotifications();
  const badge = document.getElementById("alert-count-badge");
  if (badge) badge.textContent = String(list.length);
  renderNotificationListItems(list);
}

function renderNotificationListItems(list) {
  const container = document.getElementById("notification-log-list");
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = `<p class="text-slate-400 italic">No inquiries recorded yet.</p>`;
    return;
  }
  container.innerHTML = list.slice(0, 15).map(item => `
    <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
      <div class="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span class="font-semibold text-blue-700">${escapeHtml(item.source || "Inquiry")}</span>
        <span>${escapeHtml(item.timestamp || "")}</span>
      </div>
      <p class="text-slate-900 font-medium">${escapeHtml(item.question || "")}</p>
      ${item.reply ? `<p class="text-[11px] text-slate-500">Reply: ${escapeHtml(item.reply)}</p>` : ""}
    </div>
  `).join("");
}

window.clearNotificationHistory = function() {
  localStorage.removeItem("suman_visitor_notifications_v2");
  updateAlertBadgeAndList();
};

window.saveCustomWebhook = function() {
  const input = document.getElementById("custom-webhook-input");
  customWebhookUrl = input ? input.value.trim() : "";
  localStorage.setItem("suman_custom_webhook", customWebhookUrl);
  showToastNotification("Webhook URL saved!");
};

window.enableBrowserNotifications = function() {
  if (!("Notification" in window)) {
    alert("Browser notifications are not supported on this device.");
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === "granted") {
      new Notification("Notifications Enabled!", {
        body: "You will now receive browser alerts when visitors ask questions."
      });
      showToastNotification("Browser notifications enabled!");
    } else {
      alert("Notification permission was not granted.");
    }
  });
};

window.sendTestAlertNow = async function() {
  const statusEl = document.getElementById("test-alert-status");
  const btn = document.getElementById("test-alert-btn");
  if (statusEl) {
    statusEl.classList.remove("hidden");
    statusEl.textContent = "Dispatching test notification to ntfy.sh & bhsuman11@gmail.com...";
  }
  if (btn) btn.disabled = true;

  await triggerSmsAlert(
    "Test Notification: Checking Suman's AI Agent alert delivery!",
    "Test succeeded. Alerts are active.",
    "Manual Test"
  );

  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = "✓ Sent! 1) Check ntfy.sh/suman-portfolio-nz-220512513 for instant push, and 2) Check bhsuman11@gmail.com (including Spam once to click Activate on FormSubmit).";
    }
    if (btn) btn.disabled = false;
    showToastNotification("Test notification sent to Phone Push & Email!");
  }, 900);
};

// 9. OWNER API SETTINGS MODAL
function initKeySettings() {
  const modal = document.getElementById("settings-modal");
  const openBtn = document.getElementById("open-settings-btn");
  const closeBtn = document.getElementById("close-settings-btn");
  const saveBtn = document.getElementById("save-settings-btn");
  const keyInput = document.getElementById("gemini-api-key-input");
  const modelSelect = document.getElementById("gemini-model-select");

  if (!modal) return;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (keyInput) keyInput.value = geminiApiKey;
      if (modelSelect) modelSelect.value = selectedModel;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      geminiApiKey = keyInput ? keyInput.value.trim() : "";
      selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
      localStorage.setItem("suman_gemini_api_key", geminiApiKey);
      localStorage.setItem("suman_gemini_model", selectedModel);
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      showToastNotification("Assistant configuration saved.");
    });
  }
}

// 10. UTILITIES
function showToastNotification(message) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-5 right-5 z-50 bg-blue-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium transition-all duration-300 translate-y-4 opacity-0";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-4", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
  }, 30);

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-4", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.askQuickQuestion = function(question) {
  const chatInput = document.getElementById("agent-chat-input");
  const chatForm = document.getElementById("agent-chat-form");
  if (chatInput && chatForm) {
    chatInput.value = question;
    chatForm.dispatchEvent(new Event("submit"));
  }
};

window.copyToClipboard = function(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToastNotification(`Copied ${label}: ${text}`);
  }).catch(() => {
    showToastNotification(`${label}: ${text}`);
  });
};

function renderMarkdown(md) {
  if (!md) return "";
  return md
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\• (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/gim, '<br />');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
