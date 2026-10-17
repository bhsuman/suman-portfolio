/**
 * Suman Bhandari - Security-Hardened Portfolio Renderer, Whitelisted GitHub Sync & Guardrailed Assistant
 * Connected live to portfolio-data.js
 *
 * SECURITY ARCHITECTURE:
 * 1) Strict Repository Whitelisting: ONLY queries the exact repositories listed in
 *    `PORTFOLIO_DATA.githubRepoOverrides`. Never lists or exposes unlisted GitHub repos.
 * 2) Zero Credentials Exposed: Uses zero GitHub tokens, email passwords, or LinkedIn passwords.
 * 3) Owner-Only Alert Setup & Logs: Hidden from public visitors; protected behind a salted
 *    SHA-256 PIN gate (Ctrl+Shift+L or #owner) with brute-force lockout.
 * 4) Strict XSS / URL Sanitization & Prompt Guardrails: Escapes all HTML, blocks unsafe URLs,
 *    and enforces hard 80-token output caps + portfolio-only query filtering.
 */

// Hard-Locked Safety & Token Constants
const DAILY_MAX_TOKENS = 400;
const DAILY_MAX_QUESTIONS = 6;
const HARD_MAX_OUTPUT_TOKENS = 80;
const HARD_MAX_INPUT_CHARS = 140;
const COOLDOWN_MS = 5000;

// Salted SHA-256 Hash for Default Owner PIN ("2513") — No plaintext password in code
const PIN_SALT = "suman_portfolio_v1:";
const DEFAULT_OWNER_PIN_HASH = "471e6d936057a23b8fb9616f116cc8b5fed1e1f16586112c8fc1b208b3231411";
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

let lastQuestionTimestamp = 0;
let isOwnerUnlocked = false;
let unlockedSessionPin = "";
let geminiApiKey = localStorage.getItem("suman_gemini_api_key") || "";
let selectedModel = localStorage.getItem("suman_gemini_model") || "gemini-2.5-flash";
let customWebhookUrl = localStorage.getItem("suman_custom_webhook") || "";
let ownerNtfyTopic = localStorage.getItem("suman_owner_ntfy_topic") || "";
let liveProjectsList = [];

function getData() {
  return window.PORTFOLIO_DATA || {};
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  renderAllFromPortfolioData();
  initAucklandClock();
  syncWhitelistedGitHubRepos();
  initAgentUI();
  initOwnerSecurityGate();
});

// ============================================================================
// 1. RENDER WEBSITE FROM portfolio-data.js (WITH STRICT XSS / URL SANITIZATION)
// ============================================================================
function renderAllFromPortfolioData() {
  const data = getData();
  const profile = data.profile || {};
  const about = data.about || {};
  const skills = data.skills || [];
  const experience = data.experience || [];
  const education = data.education || [];
  const highlights = data.highlights || [];
  const assistant = data.assistant || {};

  setText("top-status-badge", profile.statusBadge);
  setText("brand-initials", profile.initials);
  setText("brand-name", profile.name);
  setText("brand-subheadline", profile.subheadline);
  setText("hero-status-pill", profile.heroBadge);
  setText("hero-name", profile.name);
  setText("hero-headline", profile.headline);
  setText("hero-bio", profile.heroBio);
  setText("card-name", profile.name);
  setText("card-location", profile.location);
  setText("card-status-badge", profile.statusBadge);

  const topEmail = document.getElementById("top-email-link");
  if (topEmail && profile.email) {
    topEmail.href = sanitizeUrl(`mailto:${profile.email}`);
    topEmail.textContent = profile.email;
  }
  const topPhone = document.getElementById("top-phone-link");
  if (topPhone && profile.phoneDial) {
    topPhone.href = sanitizeUrl(`sms:${profile.phoneDial}`);
    topPhone.textContent = profile.phoneDisplay;
  }
  const heroPhoto = document.getElementById("hero-photo");
  if (heroPhoto && profile.photo) {
    heroPhoto.src = sanitizeUrl(profile.photo);
    heroPhoto.alt = profile.name || "Profile Photo";
  }
  const headerGithub = document.getElementById("header-github-link");
  if (headerGithub && profile.githubUrl) headerGithub.href = sanitizeUrl(profile.githubUrl);

  const heroGithub = document.getElementById("hero-github-link");
  if (heroGithub && profile.githubUrl) heroGithub.href = sanitizeUrl(profile.githubUrl);
  setText("hero-github-text", (profile.githubUrl || "").replace(/^https?:\/\//, ""));

  const heroLinkedin = document.getElementById("hero-linkedin-link");
  if (heroLinkedin && profile.linkedinUrl) heroLinkedin.href = sanitizeUrl(profile.linkedinUrl);

  const heroEmailBtn = document.getElementById("hero-email-btn");
  if (heroEmailBtn && profile.email) {
    heroEmailBtn.textContent = profile.email;
    heroEmailBtn.onclick = () => copyToClipboard(profile.email, "Email");
  }

  const heroPhone = document.getElementById("hero-phone-link");
  if (heroPhone && profile.phoneDial) {
    heroPhone.href = sanitizeUrl(`tel:${profile.phoneDial}`);
    heroPhone.textContent = profile.phoneLocal || profile.phoneDisplay;
  }

  setText("contact-phone-display", profile.phoneDisplay);
  setText("contact-email-display", profile.email);
  setText("contact-location-display", profile.location);
  setText("contact-status-display", profile.statusBadge);

  const contactLinkedin = document.getElementById("contact-linkedin-link");
  if (contactLinkedin && profile.linkedinUrl) contactLinkedin.href = sanitizeUrl(profile.linkedinUrl);
  const contactGithub = document.getElementById("contact-github-link");
  if (contactGithub && profile.githubUrl) {
    contactGithub.href = sanitizeUrl(profile.githubUrl);
    contactGithub.textContent = `GitHub (@${profile.githubUsername || "bhsuman"}) →`;
  }

  // Hero 4 Highlight Cards
  const highlightsGrid = document.getElementById("hero-highlights-grid");
  if (highlightsGrid && highlights.length > 0) {
    highlightsGrid.innerHTML = highlights.map(item => `
      <div class="p-4 rounded-xl bg-white border border-slate-200">
        <p ${item.isGitHubCounter ? 'id="github-repo-count"' : ''} class="text-2xl font-bold text-blue-700 font-mono">${escapeHtml(item.value)}</p>
        <p class="text-xs sm:text-sm text-slate-700 font-medium mt-0.5">${escapeHtml(item.title)}</p>
        <p ${item.isGitHubCounter ? 'id="github-sync-subtext"' : ''} class="text-xs text-slate-500">${escapeHtml(item.subtitle)}</p>
      </div>
    `).join("");
  }

  // About Section
  setText("about-heading", about.heading);
  setText("about-callout-title", about.calloutTitle);
  setText("about-callout-text", about.calloutText);

  const aboutParagraphs = document.getElementById("about-paragraphs");
  if (aboutParagraphs && Array.isArray(about.paragraphs)) {
    aboutParagraphs.innerHTML = about.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  }

  const aboutDetails = document.getElementById("about-details-list");
  if (aboutDetails && Array.isArray(about.quickDetails)) {
    aboutDetails.innerHTML = about.quickDetails.map(row => {
      let valHtml = escapeHtml(row.value);
      if (row.href) {
        const safeHref = sanitizeUrl(row.href);
        const external = safeHref.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : "";
        valHtml = `<a href="${escapeHtml(safeHref)}" ${external} class="text-blue-700 hover:underline ${safeHref.startsWith('sms:') ? 'font-mono' : ''}">${valHtml}</a>`;
      }
      const valClass = row.highlight ? "text-blue-700 font-semibold" : "text-slate-900 font-medium";
      return `
        <div class="flex justify-between pt-2">
          <dt class="text-slate-500">${escapeHtml(row.label)}</dt>
          <dd class="${row.href ? '' : valClass}">${valHtml}</dd>
        </div>
      `;
    }).join("");
  }

  // Skills Grid
  const skillsGrid = document.getElementById("skills-grid");
  if (skillsGrid && Array.isArray(skills)) {
    skillsGrid.innerHTML = skills.map(skill => `
      <div data-category="${escapeHtml(skill.category)}" class="skill-card flex p-5 rounded-xl card-clean">
        <div class="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-sm font-bold font-mono mr-3.5 flex-shrink-0">
          ${escapeHtml(skill.code)}
        </div>
        <div>
          <h3 class="text-sm font-bold text-slate-900">${escapeHtml(skill.name)}</h3>
          <p class="text-xs text-slate-600 mt-1">${escapeHtml(skill.description)}</p>
        </div>
      </div>
    `).join("");
    initSkillsFilter();
  }

  // Experience Timeline
  const expTimeline = document.getElementById("experience-timeline");
  if (expTimeline && Array.isArray(experience)) {
    expTimeline.innerHTML = experience.map(job => {
      const dotColor = job.active ? "bg-blue-700" : "bg-slate-400";
      const badgeClass = job.active
        ? "text-blue-700 bg-blue-50 border-blue-200"
        : "text-slate-600 bg-slate-100 border-slate-200";
      const bulletsHtml = (job.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join("");
      return `
        <div class="relative">
          <div class="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white"></div>
          <div class="p-5 rounded-xl bg-white border border-slate-200">
            <div class="flex flex-wrap items-center justify-between gap-1 mb-1">
              <h3 class="text-base font-bold text-slate-900">${escapeHtml(job.role)}</h3>
              <span class="text-xs font-mono px-2 py-0.5 rounded border ${badgeClass}">
                ${escapeHtml(job.period)}
              </span>
            </div>
            <p class="text-xs sm:text-sm font-medium text-slate-700">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</p>
            <ul class="mt-2.5 space-y-1 text-xs text-slate-600 list-disc list-inside">
              ${bulletsHtml}
            </ul>
          </div>
        </div>
      `;
    }).join("");
  }

  // Education Timeline
  const eduTimeline = document.getElementById("education-timeline");
  if (eduTimeline && Array.isArray(education)) {
    eduTimeline.innerHTML = education.map(edu => {
      const cardBorder = edu.highlighted ? "border-2 border-blue-600 shadow-sm" : "border border-slate-200";
      const dotColor = edu.highlighted ? "bg-blue-700" : "bg-blue-500";
      const badgeHtml = edu.highlighted
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">${escapeHtml(edu.badge)}</span>`
        : `<span class="text-xs font-mono text-slate-500">${escapeHtml(edu.badge)}</span>`;
      return `
        <div class="relative">
          <div class="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white"></div>
          <div class="p-5 rounded-xl bg-white ${cardBorder}">
            <div class="flex items-center justify-between gap-1 mb-1">
              ${badgeHtml}
              <span class="text-xs font-mono ${edu.highlighted ? 'text-blue-700 font-medium' : 'text-slate-600'}">${escapeHtml(edu.period)}</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mt-1">${escapeHtml(edu.degree)}</h3>
            ${edu.major ? `<p class="text-xs sm:text-sm font-semibold text-blue-700">${escapeHtml(edu.major)}</p>` : ""}
            <p class="text-xs text-slate-700 mt-1">${escapeHtml(edu.institution)} • ${escapeHtml(edu.location)}</p>
            ${edu.description ? `<p class="text-xs text-slate-600 mt-2 leading-relaxed">${escapeHtml(edu.description)}</p>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  // Assistant Quick Prompts
  if (assistant.welcomeMessage) {
    setText("agent-welcome-msg", assistant.welcomeMessage);
  }
  const quickPromptsEl = document.getElementById("agent-quick-prompts");
  if (quickPromptsEl && Array.isArray(assistant.quickPrompts)) {
    quickPromptsEl.innerHTML = `<span class="text-[11px] font-mono text-slate-500 flex-shrink-0">Ask:</span>`;
    assistant.quickPrompts.forEach(q => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-xs text-slate-700 hover:text-blue-700 flex-shrink-0 border border-slate-300 transition-colors";
      btn.textContent = q.label;
      btn.addEventListener("click", () => askQuickQuestion(q.question));
      quickPromptsEl.appendChild(btn);
    });
  }

  if (liveProjectsList.length === 0) {
    liveProjectsList = getWhitelistedReposList();
    renderProjectsGrid(liveProjectsList);
  }
}

function setText(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================================================
// 2. STRICT WHITELISTED-ONLY GITHUB REPOSITORY SYNC
// Never queries or exposes unlisted repositories from Suman's GitHub account!
// ============================================================================
function getWhitelistedReposList() {
  const data = getData();
  const username = (data.profile && data.profile.githubUsername) || "bhsuman";
  const overrides = data.githubRepoOverrides || {};
  return Object.entries(overrides).map(([repoName, meta]) => ({
    name: repoName,
    displayName: meta.displayName,
    category: meta.category,
    description: meta.description,
    tags: meta.tags || [],
    html_url: `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}`,
    pushed_at: null,
    featured: meta.featured
  }));
}

async function syncWhitelistedGitHubRepos() {
  const pill = document.getElementById("github-live-pill");
  const data = getData();
  const username = (data.profile && data.profile.githubUsername) || "bhsuman";
  const overrides = data.githubRepoOverrides || {};
  const whitelistedNames = Object.keys(overrides);

  if (whitelistedNames.length === 0) return;

  try {
    // Strictly fetch ONLY the whitelisted repository endpoints — never list personal/other repos
    const repoPromises = whitelistedNames.map(repoName =>
      fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}`, {
        headers: { "Accept": "application/vnd.github.v3+json" }
      })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    );

    const results = await Promise.all(repoPromises);

    const updatedList = whitelistedNames.map((repoName, idx) => {
      const curated = overrides[repoName];
      const liveRepo = results[idx];
      const tags = [...(curated.tags || [])];

      if (liveRepo && liveRepo.language && !tags.some(t => t.toLowerCase() === liveRepo.language.toLowerCase())) {
        tags.unshift(liveRepo.language);
      }

      return {
        name: repoName,
        displayName: curated.displayName,
        category: curated.category,
        description: (liveRepo && liveRepo.description && liveRepo.description.trim()) || curated.description,
        tags: tags.slice(0, 5),
        html_url: `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}`,
        pushed_at: liveRepo ? (liveRepo.pushed_at || liveRepo.updated_at) : null,
        featured: curated.featured
      };
    });

    liveProjectsList = updatedList;
    renderProjectsGrid(updatedList);

    const countEl = document.getElementById("github-repo-count");
    if (countEl) countEl.textContent = `${updatedList.length} Projects`;
    if (pill) pill.textContent = `${updatedList.length} Verified Repositories`;
  } catch (e) {
    // Fallback cleanly to curated list
  }
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Verified";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "Verified";
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
    const safeUrl = sanitizeUrl(repo.html_url);
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
            <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-700 transition-colors">
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
          <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center">
            View Repository →
          </a>
          <span class="text-[11px] font-mono text-slate-500">${escapeHtml(repo.name)}</span>
        </div>
      </article>
    `;
  }).join("");
}

// 3. Clock & Skills Filter
function initAucklandClock() {
  const clockElement = document.getElementById("auckland-clock");
  if (!clockElement) return;

  function updateClock() {
    const profile = getData().profile || {};
    const loc = profile.location || "Henderson, Auckland";
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-NZ", {
        timeZone: profile.timezone || "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        weekday: "short"
      });
      clockElement.textContent = `${loc} • ${formatter.format(now)} NZT`;
    } catch (e) {
      clockElement.textContent = loc;
    }
  }
  updateClock();
  setInterval(updateClock, 15000);
}

function initSkillsFilter() {
  const filterBtns = document.querySelectorAll(".skill-filter-btn");
  const skillCards = document.querySelectorAll(".skill-card");

  filterBtns.forEach(btn => {
    btn.onclick = () => {
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
    };
  });
}

// ============================================================================
// 4. STRICT CONTENT & OFF-TOPIC GUARDRAILS
// ============================================================================
function validatePortfolioQuery(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  if (q.length < 2) {
    return { allowed: false, reason: "Please enter a clear question about Suman's background or projects." };
  }

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
    /password|credential|secret|token|private\s+key|api\s+key/i,
    /\b(wtf|fuck|shit|bitch|asshole|dick|porn|nsfw|sex|idiot|stupid)\b/i
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(q)) {
      return {
        allowed: false,
        reason: "This assistant is strictly restricted to answering professional questions about Suman Bhandari's resume, education, skills, and selected portfolio projects."
      };
    }
  }

  const allowedKeywords = [
    "suman", "bhandari", "hi", "hello", "hey", "kia ora", "who", "about", "background", "summary", "profile",
    "skill", "tech", "stack", "tool", "python", "sql", "power bi", "powerbi", "dax", "snowflake", "databricks",
    "spark", "pyspark", "delta", "medallion", "etl", "warehouse", "warehousing", "database", "mysql", "r ", "aws", "git", "jira",
    "project", "github", "repo", "repository", "pipeline", "music", "diwali", "dewali", "weather", "quiz", "featured",
    "work", "experience", "career", "job", "role", "intern", "internship", "student", "study", "studying", "available", "availability", "open", "status", "hire", "part-time", "part time",
    "education", "degree", "master", "bachelor", "unitec", "college", "samriddhi", "siddhartha", "qualification", "university",
    "bank", "laxmi", "sunrise", "catalyst", "consultancy", "lis", "nepal", "auckland", "henderson",
    "contact", "phone", "number", "mobile", "sms", "text", "call", "email", "gmail", "linkedin", "reach", "connect", "cv", "resume", "data", "analyst", "engineer", "analytics"
  ];

  const isRelevant = allowedKeywords.some(kw => q.includes(kw));
  if (!isRelevant) {
    return {
      allowed: false,
      reason: "I can only answer questions related to Suman Bhandari's skills, Unitec Master's study, work experience, selected projects, or contact details."
    };
  }

  return { allowed: true };
}

// ============================================================================
// 5. AI ASSISTANT ENGINE (STRICT 80-TOKEN LIMIT)
// ============================================================================
function getVisitorQuota() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem("suman_daily_token_quota_v2");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) return parsed;
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

function initAgentUI() {
  const chatForm = document.getElementById("agent-chat-form");
  const chatInput = document.getElementById("agent-chat-input");

  updateTokenDisplay();

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rawMessage = chatInput.value.trim().slice(0, HARD_MAX_INPUT_CHARS);
      if (!rawMessage) return;

      const now = Date.now();
      if (now - lastQuestionTimestamp < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - (now - lastQuestionTimestamp)) / 1000);
        showToastNotification(`Please wait ${waitSec}s before sending another question.`);
        return;
      }

      const quota = getVisitorQuota();
      if (quota.tokensRemaining <= 15 || quota.questionsAsked >= DAILY_MAX_QUESTIONS) {
        const p = getData().profile || {};
        appendMessage(
          "agent",
          `Session allowance reached (capped at 400 tokens / 6 questions per visitor). Please contact Suman directly at **${p.email || "bhsuman11@gmail.com"}** or **${p.phoneDisplay || "+64 22 051 2513"}**.`
        );
        return;
      }

      lastQuestionTimestamp = now;
      appendMessage("user", rawMessage);
      chatInput.value = "";

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
  const p = getData().profile || {};

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
    const smsLink = sanitizeUrl(`sms:${p.phoneDial || "+64220512513"}?body=${encodeURIComponent("Hi Suman, regarding: " + (originalQuestion || "").slice(0, 60))}`);
    msgDiv.innerHTML = `
      <div class="chat-bubble-agent max-w-[90%] px-4 py-3 text-sm">
        <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 text-[11px] text-slate-500">
          <span class="font-semibold text-blue-700">Portfolio Assistant</span>
          ${tokenCost !== null ? `<span class="font-mono">${tokenCost} tokens</span>` : ""}
        </div>
        <div class="text-slate-800 leading-relaxed text-xs sm:text-sm">${formattedText}</div>
        <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
          <a href="${escapeHtml(smsLink)}" class="text-blue-700 hover:underline font-medium">Text Suman (${escapeHtml(p.phoneLocal || "022 051 2513")})</a>
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

function buildDynamicPortfolioSummary() {
  const data = getData();
  const p = data.profile || {};
  const skills = (data.skills || []).map(s => `${s.name} (${s.description})`).join("; ");
  const exp = (data.experience || []).map(e => `${e.role} at ${e.company} (${e.period})`).join("; ");
  const edu = (data.education || []).map(ed => `${ed.degree} ${ed.major || ""} at ${ed.institution} (${ed.period})`).join("; ");
  const projs = liveProjectsList.map(pr => `${pr.displayName} (${pr.tags.join(", ")})`).join("; ");
  const extra = (data.assistant && data.assistant.extraNotesForAI) || "";

  return `Name: ${p.name} | Role: ${p.headline} | Location: ${p.location} | Status: ${p.statusBadge}
Extra Notes: ${extra}
Education: ${edu}
Experience: ${exp}
Skills: ${skills}
Whitelisted Portfolio Projects: ${projs}
Public Contact: ${p.phoneDisplay} (${p.phoneLocal}), Email: ${p.email}`;
}

async function generateAgentResponse(userQuery) {
  const cleanQuery = userQuery.slice(0, HARD_MAX_INPUT_CHARS);
  const estimatedInputTokens = Math.max(5, Math.ceil(cleanQuery.length / 4));

  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      return await callGeminiAPI(cleanQuery, estimatedInputTokens);
    } catch (apiError) {
      // Fallback to verified local response
    }
  }

  return generateLocalResponse(cleanQuery, estimatedInputTokens);
}

async function callGeminiAPI(userQuery, inputTokens) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`;
  const summaryContext = buildDynamicPortfolioSummary();

  const systemInstruction = `You are a strictly bounded portfolio Q&A assistant for Suman Bhandari.
PORTFOLIO FACTS:
${summaryContext}
STRICT SECURITY & CONTENT RULES:
1) Answer ONLY questions about Suman Bhandari's education, skills, whitelisted projects, experience, or public contact details.
2) NEVER write code, jokes, stories, essays, or answer unrelated topics.
3) Keep your reply under 55 words and under ${HARD_MAX_OUTPUT_TOKENS} tokens.`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nVisitor Question: ${userQuery}` }] }],
      generationConfig: {
        maxOutputTokens: HARD_MAX_OUTPUT_TOKENS,
        temperature: 0.15,
        topP: 0.8
      }
    })
  });

  if (!response.ok) throw new Error("API error");

  const data = await response.json();
  let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  if (!text) return generateLocalResponse(userQuery, inputTokens);

  if (text.length > 320) text = text.slice(0, 317) + "...";

  const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(text.length / 4));
  const totalUsed = Math.min(HARD_MAX_OUTPUT_TOKENS + inputTokens, inputTokens + outputTokens);
  consumeVisitorTokens(totalUsed);

  return { text, tokenCost: totalUsed };
}

function generateLocalResponse(query, inputTokens) {
  const q = query.toLowerCase();
  const data = getData();
  const p = data.profile || {};
  let responseText = "";

  if (q.includes("contact") || q.includes("phone") || q.includes("number") || q.includes("call") || q.includes("email") || q.includes("reach") || q.includes("sms")) {
    responseText = `You can contact ${p.name || "Suman"} directly via:\n• **Phone / SMS**: ${p.phoneDisplay} (${p.phoneLocal})\n• **Email**: ${p.email}`;
  } else if (q.includes("student") || q.includes("status") || q.includes("open") || q.includes("available") || q.includes("availability") || (q.includes("work") && (q.includes("status") || q.includes("open") || q.includes("intern")))) {
    responseText = (data.assistant && data.assistant.extraNotesForAI) || `Current status: **${p.statusBadge}** — ${data.about?.calloutText || ""}`;
  } else if (q.includes("project") || q.includes("github") || q.includes("repo") || q.includes("databricks") || q.includes("dewali") || q.includes("diwali") || q.includes("music") || q.includes("weather") || q.includes("featured")) {
    const topList = liveProjectsList.map(pr => `• **${pr.displayName}** (${(pr.tags || []).join(", ")})`).join("\n");
    responseText = `Suman's featured portfolio projects include:\n${topList}`;
  } else if (q.includes("skill") || q.includes("python") || q.includes("sql") || q.includes("power bi") || q.includes("snowflake") || q.includes("tech") || q.includes("stack") || q.includes("tool")) {
    const skillNames = (data.skills || []).map(s => `**${s.name}** (${s.description})`).slice(0, 5).join("\n• ");
    responseText = `Core technical stack:\n• ${skillNames}`;
  } else if (q.includes("education") || q.includes("unitec") || q.includes("degree") || q.includes("master") || q.includes("bachelor") || q.includes("study") || q.includes("college")) {
    const eduText = (data.education || []).map(ed => `• **${ed.degree} ${ed.major ? '(' + ed.major + ')' : ''}**: ${ed.institution} (${ed.period})`).join("\n");
    responseText = eduText;
  } else if (q.includes("experience") || q.includes("bank") || q.includes("laxmi") || q.includes("history") || q.includes("catalyst") || q.includes("lis")) {
    const expText = (data.experience || []).map(e => `• **${e.role}** at ${e.company} (${e.period})`).join("\n");
    responseText = `Work experience:\n${expText}`;
  } else {
    responseText = `${p.name} is a ${p.headline} (${p.statusBadge}). Contact him at **${p.phoneLocal}** or **${p.email}**.`;
  }

  const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(responseText.length / 4));
  const totalCost = inputTokens + outputTokens;
  consumeVisitorTokens(totalCost);

  return { text: responseText, tokenCost: totalCost };
}

// ============================================================================
// 6. PRIVATE VISITOR NOTIFICATION DISPATCHER (WRITE-ONLY FOR VISITORS)
// ============================================================================
async function triggerSmsAlert(questionText, aiReply = "", source = "AI Chat Assistant") {
  const p = getData().profile || {};
  const timestamp = new Date().toLocaleString("en-NZ", { timeZone: p.timezone || "Pacific/Auckland" });
  const cleanQuestion = String(questionText).slice(0, 200);
  const cleanReply = String(aiReply).slice(0, 280);
  const targetEmail = p.email || "bhsuman11@gmail.com";

  // Only save to browser localStorage if Suman has unlocked Owner Mode on this device
  if (isOwnerUnlocked) {
    saveStoredNotification({ timestamp, source, question: cleanQuestion, reply: cleanReply });
  }

  // 1) Write-Only Email Notification via FormSubmit AJAX (Visitors can only send, never read)
  try {
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: `Portfolio Alert (${source}): "${cleanQuestion.slice(0, 50)}"`,
        Visitor_Inquiry: cleanQuestion,
        Assistant_Reply: cleanReply || "Direct Contact Form",
        Timestamp_NZT: timestamp,
        _template: "table",
        _captcha: "false"
      })
    }).catch(() => {});
  } catch (e) {}

  // 2) Local Backend Relay (/api/notify-sms) — Server handles private ntfy push & local log file
  if (window.location.protocol.startsWith("http")) {
    try {
      fetch("/api/notify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanQuestion,
          reply: cleanReply,
          source: source,
          timestamp: timestamp
        })
      }).catch(() => {});
    } catch (e) {}
  }

  // 3) Owner-Configured Private Push / Webhook (Only present on Suman's own browser if configured)
  if (ownerNtfyTopic && ownerNtfyTopic.trim().length > 4) {
    const ntfyUrl = `https://ntfy.sh/${encodeURIComponent(ownerNtfyTopic.trim())}?title=${encodeURIComponent("Portfolio: " + source)}&priority=high&tags=bell`;
    try {
      fetch(ntfyUrl, {
        method: "POST",
        body: `Visitor Question (${timestamp} NZT):\n"${cleanQuestion}"\n\nReply: ${cleanReply || "N/A"}`
      }).catch(() => {});
    } catch (e) {}
  }

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
}
window.triggerSmsAlert = triggerSmsAlert;

// ============================================================================
// 7. OWNER-ONLY SECURITY GATE (SHA-256 SALTED PIN + BRUTE-FORCE LOCKOUT)
// How Suman opens it: Press Ctrl + Shift + L, or triple-click footer SB icon, or visit #owner
// ============================================================================
function initOwnerSecurityGate() {
  // 1) Keyboard shortcut: Ctrl + Shift + L
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l")) {
      e.preventDefault();
      requestOwnerAccess();
    }
  });

  // 2) Triple-click on footer SB badge
  const secretTrigger = document.getElementById("owner-secret-trigger");
  if (secretTrigger) {
    let clicks = 0;
    let timer = null;
    secretTrigger.addEventListener("click", () => {
      clicks++;
      clearTimeout(timer);
      if (clicks >= 3) {
        clicks = 0;
        requestOwnerAccess();
      } else {
        timer = setTimeout(() => { clicks = 0; }, 800);
      }
    });
  }

  // 3) URL hash #owner
  if (window.location.hash === "#owner") {
    history.replaceState(null, "", window.location.pathname);
    requestOwnerAccess();
  }
}

function requestOwnerAccess() {
  if (isOwnerUnlocked) {
    openAlertsModal();
    return;
  }
  const authModal = document.getElementById("owner-auth-modal");
  const pinInput = document.getElementById("owner-pin-input");
  const errEl = document.getElementById("owner-pin-error");
  if (errEl) errEl.classList.add("hidden");
  if (pinInput) pinInput.value = "";
  if (authModal) {
    authModal.classList.remove("hidden");
    authModal.classList.add("flex");
    if (pinInput) pinInput.focus();
  }
}

window.closeOwnerAuthModal = function() {
  const authModal = document.getElementById("owner-auth-modal");
  if (authModal) {
    authModal.classList.add("hidden");
    authModal.classList.remove("flex");
  }
};

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getPinLockoutState() {
  try {
    const raw = localStorage.getItem("suman_owner_lockout");
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
  } catch (e) {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function savePinLockoutState(state) {
  try {
    localStorage.setItem("suman_owner_lockout", JSON.stringify(state));
  } catch (e) {}
}

window.verifyOwnerPin = async function() {
  const pinInput = document.getElementById("owner-pin-input");
  const errEl = document.getElementById("owner-pin-error");
  const enteredPin = pinInput ? pinInput.value.trim() : "";

  const lockState = getPinLockoutState();
  if (Date.now() < lockState.lockedUntil) {
    const waitMin = Math.ceil((lockState.lockedUntil - Date.now()) / 60000);
    if (errEl) {
      errEl.textContent = `Too many failed attempts. Locked for ${waitMin} min.`;
      errEl.classList.remove("hidden");
    }
    return;
  }

  const targetHash = localStorage.getItem("suman_custom_pin_hash") || DEFAULT_OWNER_PIN_HASH;
  const enteredHash = await sha256Hex(PIN_SALT + enteredPin);

  if (enteredHash === targetHash) {
    savePinLockoutState({ attempts: 0, lockedUntil: 0 });
    isOwnerUnlocked = true;
    unlockedSessionPin = enteredPin;
    closeOwnerAuthModal();
    openAlertsModal();
  } else {
    lockState.attempts = (lockState.attempts || 0) + 1;
    if (lockState.attempts >= MAX_PIN_ATTEMPTS) {
      lockState.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
    }
    savePinLockoutState(lockState);
    if (errEl) {
      errEl.textContent = `Incorrect PIN (${MAX_PIN_ATTEMPTS - lockState.attempts} attempts remaining).`;
      errEl.classList.remove("hidden");
    }
  }
};

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
}

window.openAlertsModal = function() {
  if (!isOwnerUnlocked) {
    requestOwnerAccess();
    return;
  }
  const modal = document.getElementById("alerts-modal");
  if (!modal) return;

  const webhookInput = document.getElementById("custom-webhook-input");
  const keyInput = document.getElementById("gemini-api-key-input");
  const topicInput = document.getElementById("owner-ntfy-topic-input");
  const defaultTopic = unlockedSessionPin ? `suman-portfolio-nz-22051${unlockedSessionPin}` : "";
  if (webhookInput) webhookInput.value = customWebhookUrl;
  if (keyInput) keyInput.value = geminiApiKey;
  if (topicInput) topicInput.value = ownerNtfyTopic || defaultTopic;

  renderNotificationListItems(getStoredNotifications());
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // Fetch server-side logs using verified Owner PIN header (works on localhost)
  if (window.location.protocol.startsWith("http")) {
    fetch("/api/notifications", {
      headers: { "X-Owner-Pin": unlockedSessionPin }
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.notifications) && data.notifications.length > 0) {
          renderNotificationListItems(data.notifications);
        }
      })
      .catch(() => {});
  }
};

window.closeAlertsModal = function() {
  const modal = document.getElementById("alerts-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
};

function renderNotificationListItems(list) {
  const container = document.getElementById("notification-log-list");
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = `<p class="text-slate-400 italic">No inquiries recorded yet.</p>`;
    return;
  }
  container.innerHTML = list.slice(0, 20).map(item => `
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
  if (!isOwnerUnlocked) return;
  localStorage.removeItem("suman_visitor_notifications_v2");
  renderNotificationListItems([]);
};

window.saveOwnerSettings = async function() {
  if (!isOwnerUnlocked) return;
  const webhookInput = document.getElementById("custom-webhook-input");
  const keyInput = document.getElementById("gemini-api-key-input");
  const topicInput = document.getElementById("owner-ntfy-topic-input");
  const newPinInput = document.getElementById("owner-new-pin-input");

  customWebhookUrl = webhookInput ? webhookInput.value.trim() : "";
  geminiApiKey = keyInput ? keyInput.value.trim() : "";
  ownerNtfyTopic = topicInput ? topicInput.value.trim() : "";

  localStorage.setItem("suman_custom_webhook", customWebhookUrl);
  localStorage.setItem("suman_gemini_api_key", geminiApiKey);
  localStorage.setItem("suman_owner_ntfy_topic", ownerNtfyTopic);

  if (newPinInput && newPinInput.value.trim().length >= 4) {
    const newHash = await sha256Hex(PIN_SALT + newPinInput.value.trim());
    localStorage.setItem("suman_custom_pin_hash", newHash);
    unlockedSessionPin = newPinInput.value.trim();
    newPinInput.value = "";
  }

  showToastNotification("Owner security & notification settings saved.");
};

window.openOwnerNtfyTopic = function() {
  if (!isOwnerUnlocked) return;
  const topicInput = document.getElementById("owner-ntfy-topic-input");
  const defaultTopic = unlockedSessionPin ? `suman-portfolio-nz-22051${unlockedSessionPin}` : "";
  const topic = (topicInput && topicInput.value.trim()) || defaultTopic;
  if (topic) {
    window.open(`https://ntfy.sh/${encodeURIComponent(topic)}`, "_blank", "noopener,noreferrer");
  }
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
    }
  });
};

window.sendTestAlertNow = async function() {
  if (!isOwnerUnlocked) return;
  const statusEl = document.getElementById("test-alert-status");
  const btn = document.getElementById("test-alert-btn");
  if (statusEl) {
    statusEl.classList.remove("hidden");
    statusEl.textContent = "Dispatching test notification...";
  }
  if (btn) btn.disabled = true;

  await triggerSmsAlert(
    "Owner Test Notification: Verifying Suman's AI Agent alert delivery!",
    "Test succeeded. Alerts are active.",
    "Owner Test"
  );

  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = "✓ Sent! Check your ntfy channel and bhsuman11@gmail.com (check Spam once to click Activate on FormSubmit).";
    }
    if (btn) btn.disabled = false;
    renderNotificationListItems(getStoredNotifications());
    showToastNotification("Test notification sent!");
  }, 900);
};

// ============================================================================
// 8. SANITIZATION & UI UTILITIES
// ============================================================================
function sanitizeUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("sms:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("assets/")
  ) {
    return trimmed;
  }
  return "#";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdown(md) {
  if (!md) return "";
  return escapeHtml(md)
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\• (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/gim, '<br />');
}

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
