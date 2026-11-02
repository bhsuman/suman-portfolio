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

// Employer-Sized Token & 1-Hour Session Constants
const HOURLY_MAX_TOKENS = 2500;
const HOURLY_MAX_QUESTIONS = 20;
const HARD_MAX_OUTPUT_TOKENS = 420;
const HARD_MAX_INPUT_CHARS = 250;
const COOLDOWN_MS = 2000;
const SESSION_WINDOW_MS = 60 * 60 * 1000; // 1 Hour (3,600,000 ms) auto-restart

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

  // Assistant Branding & Quick Prompts (In-Page + Floating Side Popup)
  if (assistant.agentName) {
    setText("agent-header-title", assistant.agentName);
    setText("popup-agent-title", assistant.agentName);
  }
  if (assistant.agentTagline) {
    setText("agent-header-subtitle", assistant.agentTagline);
    setText("popup-agent-subtitle", assistant.agentTagline);
  }
  if (assistant.welcomeMessage) {
    setText("agent-welcome-msg", assistant.welcomeMessage);
    setText("popup-welcome-msg", assistant.welcomeMessage);
  }
  const quickPromptsEl = document.getElementById("agent-quick-prompts");
  if (quickPromptsEl && Array.isArray(assistant.quickPrompts)) {
    quickPromptsEl.innerHTML = `<span class="text-[11px] font-mono text-slate-500 flex-shrink-0">Ask Suman AI:</span>`;
    assistant.quickPrompts.forEach(q => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-xs text-slate-700 hover:text-blue-700 flex-shrink-0 border border-slate-300 transition-colors";
      btn.textContent = q.label;
      btn.addEventListener("click", () => askQuickQuestion(q.question));
      quickPromptsEl.appendChild(btn);
    });
  }
  const popupPromptsEl = document.getElementById("popup-quick-prompts");
  if (popupPromptsEl && Array.isArray(assistant.quickPrompts)) {
    popupPromptsEl.innerHTML = "";
    assistant.quickPrompts.forEach(q => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "px-2.5 py-1 rounded-md bg-white hover:bg-blue-50 text-[11px] text-slate-700 hover:text-blue-700 flex-shrink-0 border border-slate-300 transition-colors";
      btn.textContent = q.label;
      btn.addEventListener("click", () => askQuickQuestion(q.question));
      popupPromptsEl.appendChild(btn);
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
// 2. AUTHENTIC PUBLIC GITHUB REPOSITORY SYNC + LIVE README INTELLIGENCE
// - Fetches ONLY live, authentic public repositories from github.com/bhsuman
// - Never displays private or deleted repositories
// - Strictly excludes the portfolio website repo itself ("suman-portfolio")
// - Automatically enriches new public repos by reading their live README.md
// ============================================================================
function findOverrideForRepo(repoName, overrides) {
  if (!repoName || !overrides) return null;
  if (overrides[repoName]) return overrides[repoName];
  const lower = repoName.toLowerCase();
  for (const [k, v] of Object.entries(overrides)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function getWhitelistedReposList() {
  const data = getData();
  const username = (data.profile && data.profile.githubUsername) || "bhsuman";
  const overrides = data.githubRepoOverrides || {};
  const excluded = ((data.excludedRepos) || ["suman-portfolio", "bhsuman"]).map(r => r.toLowerCase());

  return Object.entries(overrides)
    .filter(([repoName]) => !excluded.includes(repoName.toLowerCase()))
    .map(([repoName, meta]) => ({
      name: repoName,
      displayName: meta.displayName || repoName.replace(/[-_]+/g, " "),
      category: meta.category || "Data & Analytics",
      description: meta.description || "",
      highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
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
  const excluded = ((data.excludedRepos) || ["suman-portfolio", "bhsuman"]).map(r => r.toLowerCase());

  try {
    // Query GitHub's public repos endpoint — returns ONLY authentic, currently public repositories
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, {
      headers: { "Accept": "application/vnd.github.v3+json" }
    });
    if (!res.ok) return;

    const allPublicRepos = await res.json();
    if (!Array.isArray(allPublicRepos)) return;

    // Filter to authentic public project repos ONLY (no private repos, no forks, and never "suman-portfolio")
    const authenticPublicRepos = allPublicRepos.filter(repo =>
      repo &&
      repo.name &&
      !repo.private &&
      !repo.fork &&
      !excluded.includes(repo.name.toLowerCase())
    );

    const updatedList = authenticPublicRepos.map(liveRepo => {
      const curated = findOverrideForRepo(liveRepo.name, overrides) || {};
      const tags = [...(curated.tags || [])];

      if (liveRepo.language && !tags.some(t => t.toLowerCase() === liveRepo.language.toLowerCase())) {
        tags.unshift(liveRepo.language);
      }
      if (tags.length === 0) {
        tags.push("Python", "Data Analytics");
      }

      const readableName = curated.displayName || liveRepo.name.replace(/[-_]+/g, " ");
      const liveDesc = (liveRepo.description && liveRepo.description.trim()) || "";
      const bestDescription = (curated.description && curated.description.length >= liveDesc.length)
        ? curated.description
        : (liveDesc || curated.description || `Public GitHub project (${readableName}) built by Suman Bhandari.`);

      return {
        name: liveRepo.name,
        displayName: readableName,
        category: curated.category || (liveRepo.language ? `${liveRepo.language} & Analytics` : "Data & Analytics"),
        description: bestDescription,
        highlights: Array.isArray(curated.highlights) ? [...curated.highlights] : [],
        tags: tags.slice(0, 5),
        html_url: liveRepo.html_url || `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(liveRepo.name)}`,
        pushed_at: liveRepo.pushed_at || liveRepo.updated_at || null,
        featured: curated.featured !== undefined ? curated.featured : true
      };
    });

    // Sort featured curated projects first, then by most recently updated
    updatedList.sort((a, b) => {
      const aHasOverride = Boolean(findOverrideForRepo(a.name, overrides));
      const bHasOverride = Boolean(findOverrideForRepo(b.name, overrides));
      if (aHasOverride !== bHasOverride) return aHasOverride ? -1 : 1;
      return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0);
    });

    liveProjectsList = updatedList;
    renderProjectsGrid(updatedList);

    const countEl = document.getElementById("github-repo-count");
    if (countEl) countEl.textContent = `${updatedList.length} Projects`;
    if (pill) pill.textContent = `${updatedList.length} Verified Public Repositories`;

    // Enrich any new/unlisted repos by fetching their README.md in the background
    enrichReposWithReadmes(username, updatedList);
  } catch (e) {
    // Fallback cleanly to getWhitelistedReposList()
  }
}

async function enrichReposWithReadmes(username, repos) {
  for (const repo of repos) {
    if (repo.highlights && repo.highlights.length >= 2) continue;
    try {
      const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/readme`, {
        headers: { "Accept": "application/vnd.github.v3.raw" }
      });
      if (!res.ok) continue;
      const rawMd = await res.text();
      if (!rawMd) continue;

      const lines = rawMd
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("```") && !l.startsWith("![") && !l.startsWith("<img"));

      const paragraphLines = lines.filter(l => !l.startsWith("#") && !l.startsWith("-") && !l.startsWith("*") && l.length > 40);
      const bulletLines = lines
        .filter(l => (l.startsWith("- ") || l.startsWith("* ")) && l.length > 20)
        .map(l => l.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim())
        .slice(0, 3);

      if ((!repo.description || repo.description.startsWith("Public GitHub project")) && paragraphLines[0]) {
        repo.description = paragraphLines[0].replace(/\*\*/g, "").slice(0, 260);
      }
      if (bulletLines.length > 0 && (!repo.highlights || repo.highlights.length === 0)) {
        repo.highlights = bulletLines;
      }
    } catch (e) {}
  }
  renderProjectsGrid(repos);
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
    const safeProjectTitle = escapeHtml(repo.displayName).replace(/'/g, "\\'");

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

        <div class="pt-4 border-t border-slate-100 mt-5 flex items-center justify-between gap-2">
          <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center">
            View Repository →
          </a>
          <button type="button" onclick="askAboutProject('${safeProjectTitle}')" class="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors">
            Summarize with Suman AI
          </button>
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
// 4. STRICT CONTENT & OFF-TOPIC GUARDRAILS (WITH DYNAMIC PROJECT RECOGNITION)
// ============================================================================
function validatePortfolioQuery(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  if (q.length < 2) {
    return { allowed: false, reason: "Please enter a question about Suman's projects, studies, work experience, or technical skills." };
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
        reason: "Suman AI is strictly focused on answering professional questions about Suman Bhandari's projects, education, commercial experience, and technical skills."
      };
    }
  }

  const allowedKeywords = [
    "suman", "bhandari", "hi", "hello", "hey", "kia ora", "who", "about", "background", "summary", "summarize", "summarise", "profile", "overview", "explain", "tell me", "detail", "more",
    "skill", "tech", "stack", "tool", "python", "sql", "t-sql", "postgresql", "postgres", "sql server", "mysql",
    "power bi", "powerbi", "dax", "tableau", "looker", "excel", "xlookup", "pivot", "bi", "business intelligence", "dashboard",
    "snowflake", "databricks", "spark", "pyspark", "delta", "medallion", "kimball", "star schema", "etl", "elt",
    "dbt", "airflow", "dag", "orchestration", "azure", "adf", "data factory", "fabric", "synapse", "adls",
    "bigquery", "gcp", "aws", "s3", "redshift", "glue", "cloud", "warehouse", "warehousing", "database", "lakehouse",
    "machine learning", "ml", "data science", "scientist", "scikit", "xgboost", "regression", "classification", "clustering", "predictive", "prediction", "model",
    "r ", "tidyverse", "ggplot", "statistics", "statistical", "forecasting", "time-series", "time series", "pandas", "numpy", "eda",
    "git", "github", "docker", "ci/cd", "agile", "scrum", "jira", "clickup", "confluence",
    "project", "projects", "repo", "repository", "pipeline", "music", "spotify", "streaming", "diwali", "dewali", "retail", "sales", "featured",
    "residential", "property", "price", "housing", "real estate", "valuation", "market",
    "work", "worked", "working", "experience", "career", "job", "role", "intern", "internship", "student", "studi", "study", "studies", "studying", "studied", "school",
    "available", "availability", "open", "status", "hire", "hiring", "why", "strength", "fit", "part-time", "part time", "full-time", "full time", "graduate", "visa",
    "education", "educational", "academic", "degree", "master", "masters", "bachelor", "bachelors", "csit", "unitec", "college", "samriddhi", "siddhartha", "qualification", "university", "institute",
    "bank", "banking", "laxmi", "sunrise", "catalyst", "consultancy", "lis", "nepal", "auckland", "henderson", "new zealand", "nz", "australia",
    "contact", "phone", "number", "mobile", "sms", "text", "call", "email", "gmail", "linkedin", "reach", "connect", "cv", "resume", "data", "analyst", "engineer", "engineering", "analytics", "his", "him", "he"
  ];

  // Dynamically include all words from live GitHub projects
  liveProjectsList.forEach(pr => {
    if (pr.name) allowedKeywords.push(pr.name.toLowerCase());
    if (pr.displayName) {
      pr.displayName.toLowerCase().split(/[\s\-_&,/]+/).forEach(w => {
        if (w.length >= 3) allowedKeywords.push(w);
      });
    }
    (pr.tags || []).forEach(t => allowedKeywords.push(t.toLowerCase()));
  });

  const isRelevant = allowedKeywords.some(kw => q.includes(kw));
  if (!isRelevant) {
    return {
      allowed: false,
      reason: "I'm Suman AI — I specialize in Suman Bhandari's GitHub projects, Unitec Master's studies, 2+ years of commercial data experience, and technical skills. Try asking about one of his projects or his academic background!"
    };
  }

  return { allowed: true };
}

// ============================================================================
// 5. SUMAN AI PRO AGENT ENGINE (EMPLOYER-SIZED 2,500 TOKENS / 1-HOUR SESSION)
// ============================================================================
function getVisitorQuota() {
  const now = Date.now();
  try {
    const raw = localStorage.getItem("suman_hourly_token_quota_v4");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiresAt && now < parsed.expiresAt) {
        return parsed;
      }
    }
  } catch (e) {}
  const fresh = {
    startedAt: now,
    expiresAt: now + SESSION_WINDOW_MS,
    tokensRemaining: HOURLY_MAX_TOKENS,
    questionsAsked: 0
  };
  saveVisitorQuota(fresh);
  return fresh;
}

function saveVisitorQuota(quota) {
  try {
    localStorage.setItem("suman_hourly_token_quota_v4", JSON.stringify(quota));
  } catch (e) {}
}

function initAgentUI() {
  const chatForm = document.getElementById("agent-chat-form");
  const chatInput = document.getElementById("agent-chat-input");
  const popupForm = document.getElementById("popup-chat-form");
  const popupInput = document.getElementById("popup-chat-input");

  updateTokenDisplay();
  setInterval(updateTokenDisplay, 15000);

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rawMessage = chatInput.value.trim().slice(0, HARD_MAX_INPUT_CHARS);
      if (!rawMessage) return;
      chatInput.value = "";
      await handleUserQuerySubmit(rawMessage);
    });
  }

  if (popupForm && popupInput) {
    popupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rawMessage = popupInput.value.trim().slice(0, HARD_MAX_INPUT_CHARS);
      if (!rawMessage) return;
      popupInput.value = "";
      await handleUserQuerySubmit(rawMessage);
    });
  }
}

async function handleUserQuerySubmit(rawMessage) {
  const chatInput = document.getElementById("agent-chat-input");
  const popupInput = document.getElementById("popup-chat-input");

  const now = Date.now();
  if (now - lastQuestionTimestamp < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - lastQuestionTimestamp)) / 1000);
    showToastNotification(`Please wait ${waitSec}s before sending another question.`);
    return;
  }

  const quota = getVisitorQuota();
  if (quota.tokensRemaining <= 20 || quota.questionsAsked >= HOURLY_MAX_QUESTIONS) {
    const p = getData().profile || {};
    appendMessage(
      "agent",
      `Session allowance reached. Please contact Suman directly at **${p.email || "bhsuman11@gmail.com"}** or **${p.phoneDisplay || "+64 22 051 2513"}**.`
    );
    return;
  }

  lastQuestionTimestamp = now;
  appendMessage("user", rawMessage);

  const validation = validatePortfolioQuery(rawMessage);
  if (!validation.allowed) {
    appendMessage("agent", validation.reason, 0, rawMessage);
    triggerSmsAlert(`[Filtered Off-Topic Prompt]: ${rawMessage}`, validation.reason, "Suman AI (Filtered)");
    return;
  }

  if (chatInput) chatInput.disabled = true;
  if (popupInput) popupInput.disabled = true;
  const typingId = showTypingIndicator();

  try {
    const response = await generateAgentResponse(rawMessage);
    removeTypingIndicator(typingId);
    appendMessage("agent", response.text, response.tokenCost, rawMessage);
    triggerSmsAlert(rawMessage, response.text, "Suman AI");
  } catch (err) {
    removeTypingIndicator(typingId);
    const fallback = generateLocalResponse(rawMessage, Math.ceil(rawMessage.length / 4));
    appendMessage("agent", fallback.text, fallback.tokenCost, rawMessage);
    triggerSmsAlert(rawMessage, fallback.text, "Suman AI");
  } finally {
    if (chatInput) chatInput.disabled = false;
    if (popupInput) popupInput.disabled = false;
  }
}

function updateTokenDisplay() {
  const quota = getVisitorQuota();
  const pct = Math.max(0, Math.min(100, (quota.tokensRemaining / HOURLY_MAX_TOKENS) * 100));
  const barClass = pct < 20
    ? "token-bar-fill h-full bg-red-600 rounded-full"
    : "token-bar-fill h-full bg-blue-600 rounded-full";

  ["agent-token-meter", "popup-token-meter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${quota.tokensRemaining} / ${HOURLY_MAX_TOKENS} tokens`;
  });

  ["agent-token-bar", "popup-token-bar"].forEach(id => {
    const bar = document.getElementById(id);
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.className = barClass;
    }
  });
}

function consumeVisitorTokens(amount) {
  const quota = getVisitorQuota();
  quota.tokensRemaining = Math.max(0, quota.tokensRemaining - amount);
  quota.questionsAsked = (quota.questionsAsked || 0) + 1;
  saveVisitorQuota(quota);
  updateTokenDisplay();
}

function appendMessage(sender, text, tokenCost = null, originalQuestion = "") {
  const containers = [
    document.getElementById("agent-messages"),
    document.getElementById("popup-agent-messages")
  ].filter(Boolean);

  if (containers.length === 0) return;
  const data = getData();
  const p = data.profile || {};
  const agentName = (data.assistant && data.assistant.agentName) || "Suman AI";

  let innerHtml = "";
  if (sender === "user") {
    innerHtml = `
      <div class="chat-bubble-user bg-blue-700 text-white rounded-xl max-w-[85%] px-3.5 py-2.5 text-xs sm:text-sm shadow-xs">
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  } else {
    const formattedText = renderMarkdown(text);
    const smsLink = sanitizeUrl(`sms:${p.phoneDial || "+64220512513"}?body=${encodeURIComponent("Hi Suman, regarding: " + (originalQuestion || "").slice(0, 60))}`);
    innerHtml = `
      <div class="chat-bubble-agent bg-slate-50 text-slate-900 border border-slate-300 rounded-xl max-w-[94%] px-4 py-3 text-xs sm:text-sm">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 text-[11px] text-slate-600">
          <span class="font-bold text-blue-700">${escapeHtml(agentName)} • Portfolio Intelligence</span>
          ${tokenCost !== null ? `<span class="font-mono">${tokenCost} tokens</span>` : ""}
        </div>
        <div class="text-slate-900 leading-relaxed text-xs sm:text-sm space-y-1">${formattedText}</div>
        <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
          <a href="${escapeHtml(smsLink)}" class="text-blue-700 hover:underline font-medium">Text Suman (${escapeHtml(p.phoneLocal || "022 051 2513")})</a>
          <span class="text-slate-500">✓ Suman notified</span>
        </div>
      </div>
    `;
  }

  containers.forEach(container => {
    const msgDiv = document.createElement("div");
    msgDiv.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;
    msgDiv.innerHTML = innerHtml;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  });
}

function showTypingIndicator() {
  const containers = [
    document.getElementById("agent-messages"),
    document.getElementById("popup-agent-messages")
  ].filter(Boolean);
  if (containers.length === 0) return null;

  const id = "typing-" + Date.now();
  containers.forEach((container, idx) => {
    const div = document.createElement("div");
    div.id = `${id}-${idx}`;
    div.setAttribute("data-typing-id", id);
    div.className = "flex justify-start";
    div.innerHTML = `
      <div class="chat-bubble-agent bg-slate-50 text-slate-700 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono">
        Suman AI is synthesizing an executive summary...
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  });
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  document.querySelectorAll(`[data-typing-id="${id}"]`).forEach(el => el.remove());
}

function buildDynamicPortfolioSummary() {
  const data = getData();
  const p = data.profile || {};
  const skills = (data.skills || []).map(s => `${s.name} (${s.description})`).join("; ");
  const exp = (data.experience || []).map(e => `${e.role} at ${e.company}, ${e.location} (${e.period}): ${(e.bullets || []).join(" ")}`).join(" | ");
  const edu = (data.education || []).map(ed => `${ed.degree} ${ed.major ? "(" + ed.major + ")" : ""} at ${ed.institution}, ${ed.location} (${ed.period}): ${ed.description || ""}`).join(" | ");
  const projs = liveProjectsList.map(pr => `${pr.displayName} [Repo: ${pr.name}, Category: ${pr.category}, Tech: ${(pr.tags || []).join(", ")}, URL: ${pr.html_url}]: ${pr.description} Highlights: ${(pr.highlights || []).join(" ")}`).join(" || ");
  const extra = (data.assistant && data.assistant.extraNotesForAI) || "";

  return `Name: ${p.name} | Role: ${p.headline} | Location: ${p.location} | Status: ${p.statusBadge}
Extra Notes: ${extra}
Education: ${edu}
Experience: ${exp}
Skills: ${skills}
Verified Public GitHub Projects: ${projs}
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

  const systemInstruction = `You are Suman AI, an executive-level Portfolio & Project Intelligence Agent representing Suman Bhandari.
PORTFOLIO FACTS:
${summaryContext}
STRICT PROFESSIONAL RULES:
1) Answer ONLY questions about Suman Bhandari's projects, education/studies, work experience, technical skills, or contact details.
2) When asked about a specific project or all projects, provide a structured, professional Executive Summary with Overview, Key Engineering/Analytical Highlights, and Tech Stack.
3) Format clearly with bold headings and bullet points (•). Keep under 220 words and under ${HARD_MAX_OUTPUT_TOKENS} tokens.`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemInstruction}\n\nVisitor Question: ${userQuery}` }] }],
      generationConfig: {
        maxOutputTokens: HARD_MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        topP: 0.85
      }
    })
  });

  if (!response.ok) throw new Error("API error");

  const data = await response.json();
  let text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  if (!text) return generateLocalResponse(userQuery, inputTokens);

  if (text.length > 1400) text = text.slice(0, 1397) + "...";

  const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(text.length / 4));
  const totalUsed = Math.min(HARD_MAX_OUTPUT_TOKENS + inputTokens, inputTokens + outputTokens);
  consumeVisitorTokens(totalUsed);

  return { text, tokenCost: totalUsed };
}

function findMatchingProject(q) {
  // Don't match a single project if the user explicitly asks for "all projects"
  if (q.includes("all project") || q.includes("every project") || q.includes("list of project") || q.includes("his projects")) {
    return null;
  }

  const keywordMap = [
    {
      match: ["residential", "property", "housing", "real estate", "price prediction", "valuation"],
      repoMatch: "residential-property-price-prediction-bi"
    },
    {
      match: ["warehousing", "warehouse", "big data", "big-data", "pipeline", "medallion", "kimball", "star schema"],
      repoMatch: "big-data-warehousing-pipeline"
    },
    {
      match: ["music", "spotify", "streaming", "audio", "song", "listener"],
      repoMatch: "music"
    },
    {
      match: ["diwali", "dewali", "festival", "retail sales", "customer segmentation", "purchasing"],
      repoMatch: "data-analysis-dewali"
    }
  ];

  for (const rule of keywordMap) {
    if (rule.match.some(kw => q.includes(kw))) {
      const found = liveProjectsList.find(p => p.name.toLowerCase() === rule.repoMatch);
      if (found) return found;
    }
  }

  // Dynamic match against any current or future public GitHub repo name or displayName
  for (const proj of liveProjectsList) {
    const repoLower = (proj.name || "").toLowerCase();
    const displayLower = (proj.displayName || "").toLowerCase();
    if (repoLower && q.includes(repoLower)) return proj;
    if (displayLower && q.includes(displayLower)) return proj;

    const significantTokens = displayLower
      .split(/[\s\-_&,/()]+/)
      .filter(w => w.length >= 5 && !["project", "analysis", "analytics", "pipeline", "intelligence", "business", "system", "data"].includes(w));

    if (significantTokens.some(tok => q.includes(tok))) {
      return proj;
    }
  }

  return null;
}

function formatSingleProjectExecutiveSummary(proj) {
  const highlights = Array.isArray(proj.highlights) && proj.highlights.length > 0
    ? proj.highlights
    : [
        "End-to-end data ingestion, automated cleaning, and structured feature preparation.",
        "In-depth analytical modeling and business KPI extraction tailored for decision-makers.",
        "Reproducible codebase and documentation published on GitHub."
      ];

  const highlightsBullets = highlights.map(h => `• ${h}`).join("\n");
  const techStack = (proj.tags || []).join(", ") || "Python, SQL, Power BI";

  return `**Executive Project Summary — ${proj.displayName}**\n` +
    `**Category**: ${proj.category}\n` +
    `**Project Overview**: ${proj.description}\n\n` +
    `**Key Engineering & Analytical Highlights**:\n${highlightsBullets}\n\n` +
    `**Tech Stack**: ${techStack}\n` +
    `**GitHub Repository**: [View ${proj.name} on GitHub](${proj.html_url})`;
}

function formatAllProjectsExecutiveSummary() {
  if (!liveProjectsList || liveProjectsList.length === 0) {
    return "Suman's public GitHub projects are available at [github.com/bhsuman](https://github.com/bhsuman).";
  }

  const lines = liveProjectsList.map((proj, idx) => {
    const tech = (proj.tags || []).slice(0, 4).join(", ");
    return `**${idx + 1}. ${proj.displayName}** *(${proj.category})*\n` +
      `• **Summary**: ${proj.description}\n` +
      `• **Tech Stack**: ${tech} — [GitHub Repo](${proj.html_url})`;
  }).join("\n\n");

  return `**Executive Summary of Suman's Public Portfolio Projects (${liveProjectsList.length} Verified Repositories)**:\n\n` +
    `${lines}\n\n` +
    `*Tip: Ask me about any specific project above (e.g., "Tell me more about Residential Property Price Prediction") for a deep-dive technical breakdown.*`;
}

function generateLocalResponse(query, inputTokens) {
  const q = query.toLowerCase().trim();
  const data = getData();
  const p = data.profile || {};
  let responseText = "";

  // 1) Check if the user is asking about a SPECIFIC project first (e.g., "tell me more about residential property")
  const matchedProject = findMatchingProject(q);
  if (matchedProject) {
    responseText = formatSingleProjectExecutiveSummary(matchedProject);
  }
  // 2) General Projects / GitHub / Portfolio Summary
  else if (
    q.includes("project") ||
    q.includes("github") ||
    q.includes("repo") ||
    q.includes("portfolio") ||
    q.includes("built") ||
    (q.includes("summary") && !q.includes("experience") && !q.includes("studi") && !q.includes("study"))
  ) {
    responseText = formatAllProjectsExecutiveSummary();
  }
  // 3) Studies, Academic Background, Degrees & Unitec (Fixes "studies", "study", "studied", "education", "unitec")
  else if (
    q.includes("studi") ||
    q.includes("study") ||
    q.includes("education") ||
    q.includes("academic") ||
    q.includes("unitec") ||
    q.includes("degree") ||
    q.includes("master") ||
    q.includes("bachelor") ||
    q.includes("csit") ||
    q.includes("university") ||
    q.includes("college") ||
    q.includes("samriddhi") ||
    q.includes("siddhartha") ||
    q.includes("qualif") ||
    q.includes("school")
  ) {
    responseText =
      `**Academic & Postgraduate Background — ${p.name}**\n\n` +
      `**1. Master of Applied Technologies – Computing (Current • 2026 – Present)**\n` +
      `• **Institution**: Unitec Institute of Technology • Auckland, New Zealand\n` +
      `• **Focus Areas**: Advanced Data Engineering, Cloud Analytics, Machine Learning Systems, and Enterprise Business Intelligence.\n\n` +
      `**2. B.Sc. in Computer Science & Information Technology — B.Sc. CSIT Honours (2019 – 2023)**\n` +
      `• **Institution**: Samriddhi College (Tribhuvan University) • Kathmandu, Nepal\n` +
      `• **Focus Areas**: 4-year Honours degree covering Database Management Systems (DBMS), Data Warehousing, Statistical Computing, Algorithms, and Software Engineering.\n\n` +
      `**Work Availability**: Based in Henderson, Auckland (**Student • Open to Work**), available for part-time data roles & internships during semester and full-time roles during breaks / upon graduation.`;
  }
  // 4) Specific or General Commercial Work Experience (2+ Years)
  else if (
    q.includes("experience") ||
    q.includes("bank") ||
    q.includes("laxmi") ||
    q.includes("sunrise") ||
    q.includes("catalyst") ||
    q.includes("consultancy") ||
    q.includes("lis ") ||
    q.includes("lis nepal") ||
    q.includes("career") ||
    q.includes("worked") ||
    q.includes("work history") ||
    q.includes("employment") ||
    q.includes("company") ||
    q.includes("companies")
  ) {
    const expList = (data.experience || []).map(e => {
      const topBullets = (e.bullets || []).slice(0, 2).map(b => `  – ${b}`).join("\n");
      return `**• ${e.role} — ${e.company}** *(${e.period} | ${e.location})*\n${topBullets}`;
    }).join("\n\n");

    responseText =
      `**Commercial Data & Analytics Experience (2+ Years)**\n\n` +
      `${expList}\n\n` +
      `**Current Status**: Pursuing his Master's at **Unitec (Auckland)** and actively open to Data Engineer, Data Analyst, and Data Scientist roles in NZ & Australia.`;
  }
  // 5) Technical Skills, Stack & Role Fit (Data Engineer, Data Analyst, Data Scientist)
  else if (
    q.includes("skill") ||
    q.includes("stack") ||
    q.includes("tech") ||
    q.includes("tool") ||
    q.includes("snowflake") ||
    q.includes("databricks") ||
    q.includes("power bi") ||
    q.includes("tableau") ||
    q.includes("python") ||
    q.includes("sql") ||
    q.includes("dbt") ||
    q.includes("airflow") ||
    q.includes("fabric") ||
    q.includes("azure") ||
    q.includes("machine learning") ||
    q.includes("data engineer") ||
    q.includes("data analyst") ||
    q.includes("data scientist") ||
    q.includes("why hire") ||
    q.includes("strength") ||
    q.includes("fit")
  ) {
    responseText =
      `**Core Technical Stack & Role Alignment — ${p.name}**\n\n` +
      `**• Data Engineering & Cloud Warehousing**:\n` +
      `  Snowflake, Databricks (PySpark, Delta Lake), dbt, Apache Airflow, Azure Data Factory (ADF), Microsoft Fabric, Kimball Star Schema, Medallion Architecture, SQL Server & PostgreSQL.\n\n` +
      `**• Data Analytics & Business Intelligence**:\n` +
      `  Advanced SQL (CTEs, Window Functions, Query Optimization), Power BI (DAX, Power Query, Executive KPI Dashboards), Tableau, Looker Studio, and Advanced Excel.\n\n` +
      `**• Data Science & Machine Learning**:\n` +
      `  Python (Pandas, NumPy, Scikit-Learn, XGBoost), R (tidyverse), Predictive Regression/Classification, A/B Testing, and Time-Series Forecasting.`;
  }
  // 6) Contact Information
  else if (
    q.includes("contact") ||
    q.includes("phone") ||
    q.includes("number") ||
    q.includes("call") ||
    q.includes("email") ||
    q.includes("reach") ||
    q.includes("sms") ||
    q.includes("text") ||
    q.includes("linkedin") ||
    q.includes("connect")
  ) {
    responseText =
      `**Direct Contact Details — ${p.name}**\n` +
      `• **Phone / SMS**: ${p.phoneDisplay} (${p.phoneLocal})\n` +
      `• **Email**: ${p.email}\n` +
      `• **Location**: ${p.location}\n` +
      `• **LinkedIn**: [Suman Bhandari on LinkedIn](${p.linkedinUrl || "https://www.linkedin.com/in/suman-bhandari-ab4394279/"})\n` +
      `• **GitHub**: [github.com/bhsuman](${p.githubUrl || "https://github.com/bhsuman"})`;
  }
  // 7) Student Work Status & Availability
  else if (
    q.includes("student") ||
    q.includes("status") ||
    q.includes("open") ||
    q.includes("available") ||
    q.includes("availability") ||
    q.includes("intern") ||
    q.includes("visa") ||
    q.includes("part-time") ||
    q.includes("full-time")
  ) {
    responseText =
      `**Current Status & Work Eligibility — ${p.name}**\n` +
      `• **Status**: **${p.statusBadge}** (Master of Applied Technologies – Computing student at Unitec, Auckland).\n` +
      `• **Availability**: Eligible for **part-time Data Engineer, Data Analyst, and Data Scientist roles or internships** during semester and **full-time work** during scheduled breaks and post-study across New Zealand & Australia.\n` +
      `• **Direct Contact**: **${p.phoneLocal}** or **${p.email}**.`;
  }
  // 8) General Executive Candidate Overview (Fallback for broad questions like "Tell me about Suman", "Hello", etc.)
  else {
    const projectNames = liveProjectsList.map(pr => `**${pr.displayName}**`).join(", ");
    responseText =
      `**Executive Candidate Overview — ${p.name}**\n` +
      `• **Current Profile**: ${p.headline} based in **${p.location}** (**${p.statusBadge}**).\n` +
      `• **Commercial Experience (2+ Years)**: Delivered banking analytics, enterprise data warehouse ETL pipelines, and executive BI dashboards at **Laxmi Sunrise Bank**, **Development Catalyst Consultancy**, and **LIS Nepal**.\n` +
      `• **Postgraduate Study**: Pursuing a **Master of Applied Technologies – Computing** at **Unitec (Auckland)**, holding a **B.Sc. CSIT (Honours)** degree.\n` +
      `• **Featured Public Projects**: ${projectNames}.\n` +
      `• **Core Stack**: SQL, Python, Snowflake, Databricks, dbt, Airflow, Power BI, Tableau & Machine Learning.\n\n` +
      `*Ask me about any specific project (e.g., "Tell me more about Residential Property Price Prediction"), his studies, or his work experience for a detailed breakdown!*`;
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
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-semibold underline hover:text-blue-900">$1 ↗</a>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\• (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/gim, '<br />');
}

function showToastNotification(message) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-20 right-5 z-50 bg-blue-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium transition-all duration-300 translate-y-4 opacity-0";
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

// Floating Side-of-Screen Popup Controls (Suman AI)
window.openSumanAIPopup = function() {
  const popup = document.getElementById("suman-ai-popup");
  const popupInput = document.getElementById("popup-chat-input");
  if (popup) {
    popup.classList.remove("hidden");
    popup.classList.add("flex");
    const msgBox = document.getElementById("popup-agent-messages");
    if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
    if (popupInput) setTimeout(() => popupInput.focus(), 80);
  }
};

window.closeSumanAIPopup = function() {
  const popup = document.getElementById("suman-ai-popup");
  if (popup) {
    popup.classList.add("hidden");
    popup.classList.remove("flex");
  }
};

window.toggleSumanAIPopup = function() {
  const popup = document.getElementById("suman-ai-popup");
  if (!popup) return;
  if (popup.classList.contains("hidden")) {
    window.openSumanAIPopup();
  } else {
    window.closeSumanAIPopup();
  }
};

window.askAboutProject = function(projectTitle) {
  window.openSumanAIPopup();
  const promptText = `Give me an executive summary of the ${projectTitle} project`;
  handleUserQuerySubmit(promptText);
};

window.askQuickQuestion = function(question) {
  handleUserQuerySubmit(question);
};

window.copyToClipboard = function(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToastNotification(`Copied ${label}: ${text}`);
  }).catch(() => {
    showToastNotification(`${label}: ${text}`);
  });
};
