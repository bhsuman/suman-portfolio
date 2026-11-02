/**
 * Suman Bhandari — Security-Hardened Portfolio Renderer, Live GitHub Sync & Suman AI Assistant
 * Connected live to portfolio-data.js
 *
 * SECURITY ARCHITECTURE:
 * 1) Zero Client-Side Secrets: No AI provider keys, webhook URLs, or private notification topics
 *    are stored in localStorage or exposed in frontend code. AI provider calls are proxied only
 *    through the backend (`POST /api/chat`) when available, with deterministic local fallback.
 * 2) Strict Repository Filtering: Displays only authentic public repositories from github.com/bhsuman,
 *    excluding the portfolio site repo ("suman-portfolio") and any private/forked repos.
 * 3) XSS-Safe Markdown & URL Sanitization: All HTML is escaped before rendering Markdown; all links
 *    pass through strict scheme/character validation (`sanitizeUrl`).
 * 4) Prompt-Injection, Contact Validation & Rate/Quota Controls: Enforces input length caps,
 *    honeypot spam checks, cooldowns, session quotas, and portfolio-scope validation.
 */

// Session & Rate-Limit Constants
const HOURLY_MAX_TOKENS = 2500;
const HOURLY_MAX_QUESTIONS = 20;
const HARD_MAX_OUTPUT_TOKENS = 420;
const HARD_MAX_INPUT_CHARS = 300;
const COOLDOWN_MS = 1500;
const SESSION_WINDOW_MS = 60 * 60 * 1000; // 1 Hour (3,600,000 ms)

// Salted SHA-256 Hash for Default Owner PIN ("2513")
const PIN_SALT = "suman_portfolio_v1:";
const DEFAULT_OWNER_PIN_HASH = "471e6d936057a23b8fb9616f116cc8b5fed1e1f16586112c8fc1b208b3231411";
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const CONTACT_EMAIL_OR_PHONE_REGEX = /^([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|[\+\d][\d\s\-\(\)]{6,22})$/;

let lastQuestionTimestamp = 0;
let isRequestInFlight = false;
let isContactSubmitting = false;
let lastContactTimestamp = 0;
let lastSubmittedQuestion = "";
let isOwnerUnlocked = false;
let unlockedSessionPin = "";
let liveProjectsList = [];

// Multi-Turn Conversation State (Preserves context for follow-up questions)
const conversationState = {
  lastProject: null,
  lastTopic: null,
  history: [] // Array of { role: "user" | "assistant", text: string }
};

function getData() {
  return window.PORTFOLIO_DATA || {};
}

// Purge any legacy client-side secret keys from localStorage on startup
function cleanupLegacyClientSecrets() {
  try {
    localStorage.removeItem("suman_gemini_api_key");
    localStorage.removeItem("suman_gemini_model");
    localStorage.removeItem("suman_custom_webhook");
    localStorage.removeItem("suman_owner_ntfy_topic");
  } catch (e) {}
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  cleanupLegacyClientSecrets();
  initNavigation();
  renderAllFromPortfolioData();
  initAucklandClock();
  syncWhitelistedGitHubRepos();
  initContactForm();
  initAgentUI();
  initOwnerSecurityGate();
});

// ============================================================================
// 0. RESPONSIVE NAVIGATION & MODAL KEYBOARD ACCESSIBILITY
// ============================================================================
function initNavigation() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      const isHidden = mobileMenu.classList.toggle("hidden");
      menuBtn.setAttribute("aria-expanded", String(!isHidden));
    });
    mobileMenu.querySelectorAll("a, button").forEach(item => {
      item.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Close backdrop-clicked modals cleanly
  ["project-details-modal", "cv-summary-modal", "owner-auth-modal", "alerts-modal"].forEach(modalId => {
    const modalEl = document.getElementById(modalId);
    if (modalEl) {
      modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) {
          modalEl.classList.add("hidden");
          modalEl.classList.remove("flex");
        }
      });
    }
  });
}

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
    topPhone.href = sanitizeUrl(`tel:${profile.phoneDial}`);
    topPhone.textContent = profile.phoneDisplay;
  }
  const heroPhoto = document.getElementById("hero-photo");
  if (heroPhoto && profile.photo) {
    heroPhoto.src = sanitizeUrl(profile.photo);
    heroPhoto.alt = `Portrait of ${profile.name || "Suman Bhandari"}, ${profile.headline || "Data Professional"}`;
  }

  const heroGithub = document.getElementById("hero-github-link");
  if (heroGithub && profile.githubUrl) heroGithub.href = sanitizeUrl(profile.githubUrl);
  setText("hero-github-text", (profile.githubUrl || "").replace(/^https?:\/\//, ""));

  const heroLinkedin = document.getElementById("hero-linkedin-link");
  if (heroLinkedin && profile.linkedinUrl) heroLinkedin.href = sanitizeUrl(profile.linkedinUrl);

  setText("contact-phone-display", profile.phoneDisplay);
  setText("contact-email-display", profile.email);
  setText("contact-location-display", profile.location);
  setText("contact-status-display", profile.statusBadge);

  const contactLinkedin = document.getElementById("contact-linkedin-link");
  if (contactLinkedin && profile.linkedinUrl) contactLinkedin.href = sanitizeUrl(profile.linkedinUrl);
  const contactGithub = document.getElementById("contact-github-link");
  if (contactGithub && profile.githubUrl) {
    contactGithub.href = sanitizeUrl(profile.githubUrl);
    contactGithub.textContent = `GitHub (@${profile.githubUsername || "bhsuman"}) ↗`;
  }

  // Hero 4 Highlight Cards
  const highlightsGrid = document.getElementById("hero-highlights-grid");
  if (highlightsGrid && highlights.length > 0) {
    highlightsGrid.innerHTML = highlights.map(item => `
      <div class="p-5 rounded-xl bg-white border border-slate-200 border-t-2 border-t-blue-600 shadow-2xs flex flex-col justify-between">
        <p ${item.isGitHubCounter ? 'id="github-repo-count"' : ''} class="text-2xl font-bold text-blue-700 font-mono">${escapeHtml(item.value)}</p>
        <div class="mt-1">
          <p class="text-xs sm:text-sm text-slate-900 font-semibold">${escapeHtml(item.title)}</p>
          <p ${item.isGitHubCounter ? 'id="github-sync-subtext"' : ''} class="text-xs text-slate-500 mt-0.5">${escapeHtml(item.subtitle)}</p>
        </div>
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
        valHtml = `<a href="${escapeHtml(safeHref)}" ${external} class="text-blue-700 hover:underline font-semibold ${safeHref.startsWith('tel:') || safeHref.startsWith('sms:') ? 'font-mono' : ''}">${valHtml}</a>`;
      }
      const valClass = row.highlight ? "text-blue-700 font-semibold" : "text-slate-900 font-semibold";
      const isWide = (row.value && row.value.length > 28 && !row.href);
      return `
        <div class="p-3 rounded-lg bg-white border border-slate-200/80 ${isWide ? 'sm:col-span-2' : ''}">
          <dt class="text-[11px] font-mono uppercase tracking-wider text-slate-400">${escapeHtml(row.label)}</dt>
          <dd class="mt-0.5 text-xs sm:text-sm truncate ${row.href ? '' : valClass}" title="${escapeHtml(row.value)}">${valHtml}</dd>
        </div>
      `;
    }).join("");
  }

  // Technical Skills Grid (5 Meaningful Categories + Evidence Distinction)
  const skillsGrid = document.getElementById("skills-grid");
  if (skillsGrid && Array.isArray(skills)) {
    skillsGrid.innerHTML = skills.map(skill => {
      const isCommercial = (skill.evidenceBadge || "").toLowerCase().includes("commercial");
      const badgeColor = isCommercial
        ? "bg-blue-50 text-blue-800 border-blue-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
      return `
        <article data-category="${escapeHtml(skill.category)}" class="skill-card flex flex-col justify-between p-5 rounded-xl card-clean">
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0">
              ${escapeHtml(skill.code)}
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm font-bold text-slate-900 leading-snug">${escapeHtml(skill.name)}</h3>
              <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${escapeHtml(skill.description)}</p>
            </div>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span class="text-[11px] font-mono text-slate-400 truncate">${escapeHtml(skill.categoryLabel || "")}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeColor} flex-shrink-0">
              ${escapeHtml(skill.evidenceBadge || "Verified Skill")}
            </span>
          </div>
        </article>
      `;
    }).join("");
    initSkillsFilter();
  }

  // Work Experience Timeline (Cleanly Aligned Multi-Line Bullets)
  const expTimeline = document.getElementById("experience-timeline");
  if (expTimeline && Array.isArray(experience)) {
    expTimeline.innerHTML = experience.map((job, idx) => {
      const dotColor = idx === 0 ? "bg-blue-700" : "bg-blue-500";
      const bulletsHtml = (job.bullets || []).map(b => `<li class="leading-relaxed">${escapeHtml(b)}</li>`).join("");
      return `
        <article class="relative">
          <div class="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white" aria-hidden="true"></div>
          <div class="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h3 class="text-base font-bold text-slate-900">${escapeHtml(job.role)}</h3>
              <span class="text-xs font-mono px-2.5 py-0.5 rounded border text-blue-700 bg-blue-50 border-blue-200 font-medium">
                ${escapeHtml(job.period)}
              </span>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs sm:text-sm font-semibold text-slate-700">${escapeHtml(job.company)} • ${escapeHtml(job.location)}</p>
              ${job.typeBadge ? `<span class="text-[11px] font-mono text-slate-500">${escapeHtml(job.typeBadge)}</span>` : ""}
            </div>
            <ul class="mt-3 space-y-1.5 text-xs sm:text-[13px] text-slate-600 list-disc pl-4">
              ${bulletsHtml}
            </ul>
          </div>
        </article>
      `;
    }).join("");
  }

  // Education Timeline
  const eduTimeline = document.getElementById("education-timeline");
  if (eduTimeline && Array.isArray(education)) {
    eduTimeline.innerHTML = education.map(edu => {
      const cardBorder = edu.highlighted ? "border-2 border-blue-600 shadow-xs" : "border border-slate-200 shadow-2xs";
      const dotColor = edu.highlighted ? "bg-blue-700" : "bg-blue-500";
      const badgeHtml = edu.highlighted
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">${escapeHtml(edu.badge)}</span>`
        : `<span class="text-xs font-mono text-slate-500 font-medium">${escapeHtml(edu.badge)}</span>`;
      return `
        <article class="relative">
          <div class="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white" aria-hidden="true"></div>
          <div class="p-5 rounded-xl bg-white ${cardBorder}">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              ${badgeHtml}
              <span class="text-xs font-mono ${edu.highlighted ? 'text-blue-700 font-semibold' : 'text-slate-600'}">${escapeHtml(edu.period)}</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mt-1">${escapeHtml(edu.degree)}</h3>
            ${edu.major ? `<p class="text-xs sm:text-sm font-semibold text-blue-700 mt-0.5">${escapeHtml(edu.major)}</p>` : ""}
            <p class="text-xs sm:text-sm text-slate-700 font-medium mt-1">${escapeHtml(edu.institution)} • ${escapeHtml(edu.location)}</p>
            ${edu.description ? `<p class="text-xs sm:text-[13px] text-slate-600 mt-2.5 leading-relaxed">${escapeHtml(edu.description)}</p>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  // Suman AI Header & Wrapping Quick Topic Chips
  const agentName = assistant.name || assistant.agentName || "Suman AI";
  const agentSubtitle = assistant.subtitle || assistant.agentTagline || "Portfolio & Technical Assistant";
  setText("popup-agent-title", agentName);
  setText("popup-agent-subtitle", agentSubtitle);

  const popupPromptsEl = document.getElementById("popup-quick-prompts");
  const quickCategories = assistant.categoryChips || assistant.quickPrompts || [];
  if (popupPromptsEl && Array.isArray(quickCategories)) {
    popupPromptsEl.innerHTML = "";
    quickCategories.forEach(item => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[11px] font-medium text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-300 transition-colors cursor-pointer";
      btn.textContent = item.label;
      btn.addEventListener("click", () => askQuickQuestion(item.question));
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
// 2. AUTHENTIC PUBLIC GITHUB REPOSITORY SYNC + FEATURED PROJECT CARDS
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
      status: meta.status || "Completed Project",
      problemStatement: meta.problemStatement || meta.objective || meta.description || "",
      implementedSummary: Array.isArray(meta.implementedSummary) ? meta.implementedSummary : (meta.highlights || []),
      pipelineStages: Array.isArray(meta.pipelineStages) ? meta.pipelineStages : [],
      description: meta.description || "",
      objective: meta.objective || "",
      architecture: meta.architecture || "",
      highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
      challenges: meta.challenges || "",
      limitations: meta.limitations || "",
      followUpQuestions: Array.isArray(meta.followUpQuestions) ? meta.followUpQuestions : [],
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
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, {
      headers: { "Accept": "application/vnd.github.v3+json" }
    });
    if (!res.ok) return;

    const allPublicRepos = await res.json();
    if (!Array.isArray(allPublicRepos)) return;

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
        status: curated.status || "Completed Project",
        problemStatement: curated.problemStatement || curated.objective || bestDescription,
        implementedSummary: Array.isArray(curated.implementedSummary)
          ? [...curated.implementedSummary]
          : (Array.isArray(curated.highlights) ? [...curated.highlights] : []),
        pipelineStages: Array.isArray(curated.pipelineStages) ? [...curated.pipelineStages] : [],
        description: bestDescription,
        objective: curated.objective || "",
        architecture: curated.architecture || "",
        highlights: Array.isArray(curated.highlights) ? [...curated.highlights] : [],
        challenges: curated.challenges || "",
        limitations: curated.limitations || "",
        followUpQuestions: Array.isArray(curated.followUpQuestions) ? [...curated.followUpQuestions] : [],
        tags: tags.slice(0, 6),
        html_url: liveRepo.html_url || `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(liveRepo.name)}`,
        pushed_at: liveRepo.pushed_at || liveRepo.updated_at || null,
        featured: curated.featured !== undefined ? curated.featured : true
      };
    });

    updatedList.sort((a, b) => {
      const aHasOverride = Boolean(findOverrideForRepo(a.name, overrides));
      const bHasOverride = Boolean(findOverrideForRepo(b.name, overrides));
      if (aHasOverride !== bHasOverride) return aHasOverride ? -1 : 1;
      return new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0);
    });

    liveProjectsList = updatedList;
    renderProjectsGrid(updatedList);

    const countEl = document.getElementById("github-repo-count");
    if (countEl) countEl.textContent = `${updatedList.length} Repos`;
    if (pill) pill.textContent = `${updatedList.length} Verified Public Repositories`;

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
        repo.implementedSummary = bulletLines;
      }
    } catch (e) {}
  }
  renderProjectsGrid(repos);
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return "Completed Project";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "Completed Project";
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
    const safeRepoName = escapeHtml(repo.name).replace(/'/g, "\\'");

    // Architecture Pipeline Visual Schematic
    const stages = Array.isArray(repo.pipelineStages) && repo.pipelineStages.length > 0
      ? repo.pipelineStages
      : ["Data Ingestion", "Transformation & QA", "Analytical Model", "Reporting Output"];
    const pipelineHtml = stages.map((stage, idx) => `
      <span class="pipeline-step">${escapeHtml(stage)}</span>
      ${idx < stages.length - 1 ? '<span class="text-blue-500 font-mono text-xs font-bold" aria-hidden="true">→</span>' : ''}
    `).join("");

    // What I Implemented Bullets
    const implementedItems = (repo.implementedSummary && repo.implementedSummary.length > 0)
      ? repo.implementedSummary.slice(0, 3)
      : [repo.description];
    const implementedHtml = implementedItems.map(item =>
      `<li class="leading-relaxed">${escapeHtml(item)}</li>`
    ).join("");

    return `
      <article class="rounded-xl card-clean p-6 flex flex-col justify-between">
        <div class="space-y-4">
          <!-- Category & Status Header -->
          <div class="flex items-center justify-between gap-2">
            <span class="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-medium">
              ${escapeHtml(repo.category)}
            </span>
            <span class="text-[11px] font-mono text-slate-500">
              ${escapeHtml(updatedLabel)}
            </span>
          </div>

          <!-- Project Title -->
          <h3 class="text-lg font-bold text-slate-900 leading-snug">
            <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-700 transition-colors">
              ${escapeHtml(repo.displayName)}
            </a>
          </h3>

          <!-- Architectural Pipeline Flow Visual -->
          <div class="pipeline-visual" aria-label="Project architecture pipeline flow">
            <p class="text-[10px] font-mono uppercase tracking-wider text-blue-800 font-semibold mb-1.5">Architecture &amp; Data Flow</p>
            <div class="flex flex-wrap items-center gap-1.5">
              ${pipelineHtml}
            </div>
          </div>

          <!-- Short Problem Statement -->
          <div class="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
            <span class="font-bold text-slate-900">Problem Statement:</span>
            ${escapeHtml(repo.problemStatement || repo.description)}
          </div>

          <!-- What I Implemented -->
          <div>
            <p class="text-xs font-bold text-slate-900 mb-1">What I Implemented:</p>
            <ul class="text-xs text-slate-600 list-disc pl-4 space-y-1">
              ${implementedHtml}
            </ul>
          </div>

          <!-- Main Technologies Used -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${tagsHtml}
          </div>
        </div>

        <!-- Card Actions: GitHub Repo, Project Details Modal, Ask Suman AI -->
        <div class="pt-4 border-t border-slate-100 mt-5 flex flex-wrap items-center justify-between gap-2">
          <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center">
            GitHub Repository ↗
          </a>
          <div class="flex items-center gap-2">
            <button type="button" onclick="openProjectDetailsModal('${safeRepoName}')" class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition-colors cursor-pointer">
              Project Details
            </button>
            <button type="button" onclick="askAboutProject('${safeProjectTitle}')" class="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors cursor-pointer">
              Ask Suman AI
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// ============================================================================
// 2B. PROJECT DETAILS MODAL & CV SUMMARY MODAL CONTROLS
// ============================================================================
window.openProjectDetailsModal = function(repoName) {
  const modal = document.getElementById("project-details-modal");
  const bodyEl = document.getElementById("project-modal-body");
  const titleEl = document.getElementById("project-modal-title");
  const catEl = document.getElementById("project-modal-category");
  const statusEl = document.getElementById("project-modal-status");
  const repoLinkEl = document.getElementById("project-modal-repo-link");
  const aiBtnEl = document.getElementById("project-modal-ai-btn");

  if (!modal || !bodyEl) return;

  const proj = liveProjectsList.find(p => p.name.toLowerCase() === String(repoName).toLowerCase()) || liveProjectsList[0];
  if (!proj) return;

  if (titleEl) titleEl.textContent = proj.displayName;
  if (catEl) catEl.textContent = proj.category;
  if (statusEl) statusEl.textContent = proj.status || "Completed Project";
  if (repoLinkEl) repoLinkEl.href = sanitizeUrl(proj.html_url);
  if (aiBtnEl) {
    aiBtnEl.onclick = () => {
      closeProjectDetailsModal();
      askAboutProject(proj.displayName);
    };
  }

  const stages = Array.isArray(proj.pipelineStages) ? proj.pipelineStages : [];
  const stagesHtml = stages.map((s, idx) => `
    <span class="pipeline-step">${escapeHtml(s)}</span>
    ${idx < stages.length - 1 ? '<span class="text-blue-500 font-mono text-xs font-bold">→</span>' : ''}
  `).join("");

  const highlightsHtml = (proj.highlights || proj.implementedSummary || []).map(h =>
    `<li class="leading-relaxed">${escapeHtml(h)}</li>`
  ).join("");

  const tagsHtml = (proj.tags || []).map(t =>
    `<span class="px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-800 border border-slate-200">${escapeHtml(t)}</span>`
  ).join("");

  bodyEl.innerHTML = `
    <div class="pipeline-visual">
      <p class="text-[10px] font-mono uppercase tracking-wider text-blue-800 font-semibold mb-1.5">End-to-End Architecture Flow</p>
      <div class="flex flex-wrap items-center gap-1.5">${stagesHtml}</div>
    </div>

    <div>
      <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono text-blue-700">1. Problem Statement &amp; Objective</h4>
      <p class="mt-1">${escapeHtml(proj.problemStatement || proj.objective || proj.description)}</p>
    </div>

    <div>
      <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono text-blue-700">2. Architecture &amp; Methodology</h4>
      <p class="mt-1">${escapeHtml(proj.architecture || proj.description)}</p>
    </div>

    <div>
      <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono text-blue-700">3. What Was Implemented</h4>
      <ul class="mt-1.5 list-disc pl-4 space-y-1">${highlightsHtml}</ul>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <h4 class="font-bold text-slate-900 text-xs uppercase font-mono text-blue-700">4. Engineering Challenges</h4>
        <p class="mt-1 text-xs text-slate-600 leading-relaxed">${escapeHtml(proj.challenges || "Standardizing raw input schemas and validating analytical outputs.")}</p>
      </div>
      <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <h4 class="font-bold text-slate-900 text-xs uppercase font-mono text-blue-700">5. Scope &amp; Limitations</h4>
        <p class="mt-1 text-xs text-slate-600 leading-relaxed">${escapeHtml(proj.limitations || "Built on historical benchmark datasets.")}</p>
      </div>
    </div>

    <div>
      <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono text-blue-700 mb-1.5">Technologies Used</h4>
      <div class="flex flex-wrap gap-1.5">${tagsHtml}</div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
};

window.closeProjectDetailsModal = function() {
  const modal = document.getElementById("project-details-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

window.openCvModal = function() {
  const modal = document.getElementById("cv-summary-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
};

window.closeCvModal = function() {
  const modal = document.getElementById("cv-summary-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
};

// ============================================================================
// 3. CLOCK, SKILLS FILTER & VALIDATED CONTACT FORM
// ============================================================================
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
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("bg-blue-700", "text-white", "border-blue-700");
      btn.classList.remove("bg-white", "text-slate-700", "border-slate-300");
      btn.setAttribute("aria-pressed", "true");

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

function showContactStatus(type, message) {
  const statusEl = document.getElementById("contact-form-status");
  if (!statusEl) return;
  statusEl.classList.remove(
    "hidden",
    "bg-red-50",
    "text-red-800",
    "border-red-200",
    "bg-emerald-50",
    "text-emerald-900",
    "border-emerald-200",
    "bg-blue-50",
    "text-blue-800",
    "border-blue-200"
  );
  if (type === "error") {
    statusEl.setAttribute("role", "alert");
    statusEl.classList.add("bg-red-50", "text-red-800", "border-red-200");
  } else if (type === "success") {
    statusEl.setAttribute("role", "status");
    statusEl.classList.add("bg-emerald-50", "text-emerald-900", "border-emerald-200");
  } else {
    statusEl.setAttribute("role", "status");
    statusEl.classList.add("bg-blue-50", "text-blue-800", "border-blue-200");
  }
  statusEl.textContent = message;
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isContactSubmitting) return;

    const nameInput = document.getElementById("contact-name");
    const phoneInput = document.getElementById("contact-phone");
    const subjectInput = document.getElementById("contact-subject");
    const msgInput = document.getElementById("contact-msg");
    const honeypotInput = document.getElementById("contact-website");
    const submitBtn = document.getElementById("contact-submit-btn");

    // Honeypot check against automated bots
    if (honeypotInput && honeypotInput.value.trim() !== "") {
      showContactStatus("error", "Submission blocked by spam filter.");
      return;
    }

    const now = Date.now();
    if (now - lastContactTimestamp < 5000) {
      showContactStatus("error", "Please wait a few seconds before sending another message.");
      return;
    }

    const name = (nameInput ? nameInput.value : "").trim();
    const contact = (phoneInput ? phoneInput.value : "").trim();
    const subject = (subjectInput ? subjectInput.value : "").trim() || "Portfolio Inquiry";
    const message = (msgInput ? msgInput.value : "").trim();

    if (name.length < 2 || name.length > 80) {
      showContactStatus("error", "Please enter your name (between 2 and 80 characters).");
      if (nameInput) nameInput.focus();
      return;
    }

    if (!CONTACT_EMAIL_OR_PHONE_REGEX.test(contact)) {
      showContactStatus("error", "Please enter a valid email address (e.g., name@company.com) or phone number.");
      if (phoneInput) phoneInput.focus();
      return;
    }

    if (message.length < 10 || message.length > 1500) {
      showContactStatus("error", "Please enter a message between 10 and 1,500 characters.");
      if (msgInput) msgInput.focus();
      return;
    }

    isContactSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending Message...";
    }
    showContactStatus("info", "Sending your message to Suman...");

    const p = getData().profile || {};
    const targetEmail = p.email || "bhsuman11@gmail.com";
    const timestamp = new Date().toLocaleString("en-NZ", { timeZone: p.timezone || "Pacific/Auckland" });
    let delivered = false;

    // 1) Try local backend `/api/contact` when running on localhost
    if (window.location.protocol.startsWith("http") && window.location.hostname === "localhost") {
      try {
        const backendResp = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            contact,
            subject,
            message,
            website: honeypotInput ? honeypotInput.value : ""
          })
        });
        if (backendResp.ok) {
          delivered = true;
        } else {
          const errJson = await backendResp.json().catch(() => ({}));
          if (backendResp.status >= 400 && backendResp.status < 500 && errJson.error) {
            showContactStatus("error", errJson.error);
            isContactSubmitting = false;
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Send Message";
            }
            return;
          }
        }
      } catch (err) {}
    }

    // 2) Send via FormSubmit AJAX endpoint for email delivery
    try {
      const formResp = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: `Portfolio Contact (${subject}) from ${name}`,
          Name: name,
          Contact_Details: contact,
          Subject: subject,
          Message: message,
          Timestamp_NZT: timestamp,
          _template: "table",
          _captcha: "false"
        })
      });
      if (formResp.ok) {
        delivered = true;
      }
    } catch (err) {}

    isContactSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }

    if (delivered) {
      lastContactTimestamp = Date.now();
      form.reset();
      showContactStatus("success", `Thank you, ${name}! Your message has been delivered to Suman.`);
    } else {
      showContactStatus(
        "error",
        `Unable to reach the mail relay right now. Please email Suman directly at ${targetEmail} or call ${p.phoneDisplay || "+64 22 051 2513"}.`
      );
    }
  });
}

// ============================================================================
// 4. STRICT CONTENT & PROMPT-INJECTION GUARDRAILS
// ============================================================================
function validatePortfolioQuery(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  if (q.length < 2) {
    return { allowed: false, reason: "Please enter a clear question about Suman's projects, skills, or experience." };
  }

  if (q.length > HARD_MAX_INPUT_CHARS) {
    return { allowed: false, reason: `Please keep your question under ${HARD_MAX_INPUT_CHARS} characters.` };
  }

  const blockedPatterns = [
    /ignore\s+(all|previous|above|prior|system)/i,
    /system\s*prompt|developer\s*mode|dan\s*mode|jailbreak/i,
    /act\s+as|pretend\s+to\s+be|roleplay/i,
    /write\s+(a|an|me)\s+(poem|essay|story|song|joke|script|blog|recipe|malware|virus|exploit)/i,
    /generate\s+(image|story|poem|joke|essay|malware|virus|exploit)/i,
    /solve\s+this|leetcode|hackerrank/i,
    /tell\s+me\s+a\s+joke|riddle/i,
    /who\s+is\s+(the\s+president|prime\s+minister|elon|trump|biden)/i,
    /password|credential|secret|private\s*key|api\s*key|\.env/i,
    /\b(wtf|fuck|shit|bitch|asshole|dick|porn|nsfw|sex|idiot|stupid)\b/i
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(q)) {
      return {
        allowed: false,
        reason: "I'm Suman AI, and I focus strictly on Suman Bhandari's verified portfolio projects, technical skills, education, and commercial experience."
      };
    }
  }

  // Allow follow-up questions when an active conversation context exists
  if (conversationState.lastProject || conversationState.lastTopic) {
    const followUpIndicators = [
      "how", "what", "why", "where", "which", "explain", "detail", "more", "deep dive", "architecture",
      "challenge", "limitation", "result", "outcome", "method", "link", "repo", "code", "used", "it", "that", "this"
    ];
    if (followUpIndicators.some(ind => q.includes(ind))) {
      return { allowed: true };
    }
  }

  const allowedKeywords = [
    "suman", "bhandari", "hi", "hello", "hey", "kia ora", "who", "about", "background", "summary", "summarize", "summarise", "profile", "overview", "explain", "tell", "walk", "detail", "more", "explore", "show",
    "skill", "tech", "technologies", "technology", "stack", "tool", "evidence", "python", "sql", "t-sql", "postgresql", "postgres", "sql server", "mysql",
    "power bi", "powerbi", "dax", "tableau", "looker", "excel", "xlookup", "pivot", "bi", "business intelligence", "dashboard",
    "snowflake", "databricks", "spark", "pyspark", "delta", "medallion", "kimball", "star schema", "etl", "elt", "dimensional",
    "dbt", "airflow", "dag", "orchestration", "azure", "adf", "data factory", "fabric", "synapse", "adls",
    "bigquery", "gcp", "aws", "s3", "redshift", "glue", "cloud", "warehouse", "warehousing", "database", "lakehouse",
    "machine learning", "ml", "data science", "scientist", "scikit", "xgboost", "regression", "classification", "clustering", "predictive", "prediction", "model",
    "r ", "tidyverse", "ggplot", "statistics", "statistical", "forecasting", "time-series", "time series", "pandas", "numpy", "eda",
    "git", "github", "docker", "ci/cd", "agile", "scrum", "jira", "clickup", "confluence",
    "project", "projects", "portfolio", "repo", "repository", "pipeline", "lendingclub", "lending", "credit", "risk", "loan",
    "music", "genre", "gtzan", "audio", "spectrogram", "mfcc", "django", "spotify", "streaming",
    "diwali", "dewali", "retail", "sales", "festive", "customer", "featured",
    "residential", "property", "price", "housing", "real estate", "valuation", "market",
    "work", "worked", "working", "experience", "professional", "career", "job", "role", "intern", "internship", "student", "studi", "study", "studies", "studying", "studied", "school",
    "available", "availability", "open", "status", "hire", "hiring", "why", "strength", "fit", "part-time", "part time", "full-time", "full time", "graduate", "visa",
    "education", "educational", "academic", "degree", "master", "masters", "bachelor", "bachelors", "csit", "unitec", "college", "samriddhi", "siddhartha", "qualification", "university", "institute",
    "bank", "banking", "laxmi", "sunrise", "catalyst", "consultancy", "lis", "nepal", "auckland", "henderson", "new zealand", "nz", "australia",
    "contact", "phone", "number", "mobile", "sms", "text", "call", "email", "gmail", "linkedin", "reach", "connect", "cv", "resume", "data", "analyst", "engineer", "engineering", "analytics",
    "challenge", "limitation", "architecture", "deep dive", "token", "quota", "allowance", "session", "gpa", "certification", "certificate", "salary", "his", "him", "he"
  ];

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
      reason: "I'm Suman AI, your guide to Suman Bhandari's technical portfolio. Ask me about his data warehousing, machine learning, or analytics projects, his technical skills, his Unitec Master's study, or his professional experience."
    };
  }

  return { allowed: true };
}

// ============================================================================
// 5. SUMAN AI ASSISTANT ENGINE (WELCOME SCREEN, CONTEXT & SAFE RENDERING)
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

function consumeVisitorTokens(amount) {
  const quota = getVisitorQuota();
  quota.tokensRemaining = Math.max(0, quota.tokensRemaining - amount);
  quota.questionsAsked = (quota.questionsAsked || 0) + 1;
  saveVisitorQuota(quota);
}

function initAgentUI() {
  const popupForm = document.getElementById("popup-chat-form");
  const popupInput = document.getElementById("popup-chat-input");

  renderWelcomeState();

  if (popupInput) {
    popupInput.addEventListener("input", () => {
      popupInput.style.height = "auto";
      popupInput.style.height = Math.min(popupInput.scrollHeight, 96) + "px";
    });

    popupInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (popupForm) popupForm.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  if (popupForm && popupInput) {
    popupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isRequestInFlight) return;
      const rawMessage = popupInput.value.trim().slice(0, HARD_MAX_INPUT_CHARS);
      if (!rawMessage) return;
      popupInput.value = "";
      popupInput.style.height = "auto";
      await handleUserQuerySubmit(rawMessage);
    });
  }

  // Global Escape key handler to close any active modal or Suman AI popup
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProjectDetailsModal();
      closeCvModal();
      closeOwnerAuthModal();
      closeAlertsModal();
      const popup = document.getElementById("suman-ai-popup");
      if (popup && !popup.classList.contains("hidden")) {
        window.closeSumanAIPopup();
      }
    }
  });
}

function renderWelcomeState() {
  const container = document.getElementById("popup-agent-messages");
  if (!container) return;

  const assistant = getData().assistant || {};
  const p1 = assistant.welcomeParagraph1 ||
    "Kia ora! I'm Suman AI, your guide to Suman Bhandari's technical portfolio. Explore his data engineering, analytics, and machine learning projects, learn about his technical skills, and discover how he approaches real-world problems.";
  const p2 = assistant.welcomeParagraph2 || "What would you like to explore today?";

  const categoryChips = assistant.categoryChips || [
    { label: "Project Portfolio", description: "End-to-end overview of verified projects", question: "Show me an overview of Suman's project portfolio." },
    { label: "Data Engineering & Cloud", description: "Databricks, Delta Lake, Snowflake & ETL", question: "Walk me through the end-to-end data warehousing project." },
    { label: "Machine Learning & Analytics", description: "Predictive models, GTZAN audio ML & BI", question: "What Machine Learning and Data Analytics projects has Suman built?" },
    { label: "Experience & Technical Skills", description: "2+ years commercial roles & stack evidence", question: "Summarise Suman's professional experience." }
  ];

  const exampleQuestions = assistant.exampleQuestions || [
    "Walk me through the end-to-end data warehousing project.",
    "What technologies has Suman used in his projects?",
    "Explain the Music Genre Classification project.",
    "Summarise Suman's professional experience."
  ];

  const cardsHtml = categoryChips.map(chip => {
    const safeQ = escapeHtml(chip.question).replace(/'/g, "\\'");
    return `
      <button
        type="button"
        onclick="askQuickQuestion('${safeQ}')"
        class="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition-all group cursor-pointer"
      >
        <p class="text-xs font-bold text-slate-900 group-hover:text-blue-700 leading-snug">${escapeHtml(chip.label)}</p>
        <p class="text-[11px] text-slate-500 mt-0.5 leading-tight">${escapeHtml(chip.description || "")}</p>
      </button>
    `;
  }).join("");

  const examplesHtml = exampleQuestions.map(q => {
    const safeQ = escapeHtml(q).replace(/'/g, "\\'");
    return `
      <button
        type="button"
        onclick="askQuickQuestion('${safeQ}')"
        class="w-full text-left px-3 py-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs text-slate-700 hover:text-blue-700 transition-colors flex items-center justify-between gap-2 cursor-pointer"
      >
        <span>"${escapeHtml(q)}"</span>
        <span class="text-blue-600 font-mono text-xs flex-shrink-0" aria-hidden="true">→</span>
      </button>
    `;
  }).join("");

  container.innerHTML = `
    <div class="space-y-3.5">
      <div class="chat-bubble-agent bg-slate-50 text-slate-900 border border-slate-300 rounded-xl px-4 py-3 text-xs sm:text-sm space-y-2">
        <p class="leading-relaxed text-slate-800">${escapeHtml(p1)}</p>
        <p class="font-semibold text-slate-900">${escapeHtml(p2)}</p>
      </div>

      <div>
        <p class="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 px-0.5">Explore by Topic</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${cardsHtml}
        </div>
      </div>

      <div>
        <p class="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">Suggested Questions</p>
        <div class="space-y-1.5">
          ${examplesHtml}
        </div>
      </div>
    </div>
  `;
  container.scrollTop = 0;
}

window.resetSumanAIConversation = function() {
  conversationState.lastProject = null;
  conversationState.lastTopic = null;
  conversationState.history = [];
  isRequestInFlight = false;
  renderWelcomeState();
  const popupInput = document.getElementById("popup-chat-input");
  if (popupInput) {
    popupInput.disabled = false;
    popupInput.value = "";
    popupInput.focus();
  }
};

window.retryLastQuestion = function() {
  if (isRequestInFlight || !lastSubmittedQuestion) return;
  handleUserQuerySubmit(lastSubmittedQuestion, true);
};

async function handleUserQuerySubmit(rawMessage, isRetry = false) {
  if (isRequestInFlight) return;
  const popupInput = document.getElementById("popup-chat-input");
  const sendBtn = document.getElementById("popup-send-btn");

  const now = Date.now();
  if (!isRetry && now - lastQuestionTimestamp < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - lastQuestionTimestamp)) / 1000);
    showToastNotification(`Please wait ${waitSec}s before sending another question.`);
    return;
  }

  const quota = getVisitorQuota();
  if (quota.tokensRemaining <= 20 || quota.questionsAsked >= HOURLY_MAX_QUESTIONS) {
    const p = getData().profile || {};
    appendMessage(
      "agent",
      `You have reached the session query limit. You can contact Suman directly at **[${p.email || "bhsuman11@gmail.com"}](mailto:${p.email || "bhsuman11@gmail.com"})** or **[${p.phoneDisplay || "+64 22 051 2513"}](tel:${p.phoneDial || "+64220512513"})**, or start a new session in a little while.`
    );
    return;
  }

  lastQuestionTimestamp = now;
  lastSubmittedQuestion = rawMessage;

  if (!isRetry) {
    appendMessage("user", rawMessage);
  }

  const validation = validatePortfolioQuery(rawMessage);
  if (!validation.allowed) {
    appendMessage("agent", validation.reason);
    triggerSmsAlert(`[Filtered Off-Topic Prompt]: ${rawMessage}`, validation.reason, "Suman AI (Filtered)");
    return;
  }

  isRequestInFlight = true;
  if (popupInput) popupInput.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  const typingId = showTypingIndicator();

  try {
    const response = await generateAgentResponse(rawMessage);
    removeTypingIndicator(typingId);

    conversationState.history.push({ role: "user", text: rawMessage });
    conversationState.history.push({ role: "assistant", text: response.text });
    if (conversationState.history.length > 10) {
      conversationState.history = conversationState.history.slice(-10);
    }

    appendMessage("agent", response.text, response.followUps || []);
    triggerSmsAlert(rawMessage, response.text, "Suman AI");
  } catch (err) {
    removeTypingIndicator(typingId);
    appendErrorMessage("Unable to complete the response right now. Please retry or use one of the suggested prompts.");
  } finally {
    isRequestInFlight = false;
    if (popupInput) {
      popupInput.disabled = false;
      popupInput.focus();
    }
    if (sendBtn) sendBtn.disabled = false;
  }
}

function appendMessage(sender, text, followUps = []) {
  const container = document.getElementById("popup-agent-messages");
  if (!container) return;
  const data = getData();
  const agentName = (data.assistant && data.assistant.name) || "Suman AI";

  const msgDiv = document.createElement("div");
  msgDiv.className = `flex flex-col ${sender === "user" ? "items-end" : "items-start"}`;

  if (sender === "user") {
    msgDiv.innerHTML = `
      <div class="chat-bubble-user bg-blue-700 text-white rounded-xl max-w-[86%] px-3.5 py-2.5 text-xs sm:text-sm shadow-xs">
        <p class="whitespace-pre-wrap">${escapeHtml(text)}</p>
      </div>
    `;
  } else {
    const formattedText = renderSafeMarkdown(text);
    let followUpsHtml = "";
    if (Array.isArray(followUps) && followUps.length > 0) {
      const chips = followUps.slice(0, 3).map(fq => {
        const safeFq = escapeHtml(fq).replace(/'/g, "\\'");
        return `
          <button
            type="button"
            onclick="askQuickQuestion('${safeFq}')"
            class="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] text-blue-700 font-medium transition-colors cursor-pointer"
          >
            ${escapeHtml(fq)} →
          </button>
        `;
      }).join("");
      followUpsHtml = `
        <div class="mt-2.5 pt-2 border-t border-slate-200/80">
          <p class="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Follow-up Questions</p>
          <div class="flex flex-col gap-1.5">
            ${chips}
          </div>
        </div>
      `;
    }

    msgDiv.innerHTML = `
      <div class="chat-bubble-agent bg-slate-50 text-slate-900 border border-slate-300 rounded-xl max-w-[95%] px-4 py-3 text-xs sm:text-sm">
        <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 text-[11px]">
          <span class="font-bold text-blue-700">${escapeHtml(agentName)}</span>
          <span class="text-[10px] font-mono text-slate-400">Portfolio &amp; Technical Assistant</span>
        </div>
        <div class="md-content text-slate-800 leading-relaxed text-xs sm:text-sm">${formattedText}</div>
        ${followUpsHtml}
      </div>
    `;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendErrorMessage(errorText) {
  const container = document.getElementById("popup-agent-messages");
  if (!container) return;

  const div = document.createElement("div");
  div.className = "flex justify-start";
  div.innerHTML = `
    <div class="chat-bubble-agent bg-red-50 text-slate-900 border border-red-200 rounded-xl max-w-[92%] px-4 py-3 text-xs sm:text-sm space-y-2">
      <p class="text-red-800 font-medium">${escapeHtml(errorText)}</p>
      <button
        type="button"
        onclick="retryLastQuestion()"
        class="px-3 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors cursor-pointer"
      >
        Retry Question
      </button>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById("popup-agent-messages");
  if (!container) return null;

  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.setAttribute("data-typing-id", id);
  div.className = "flex justify-start";
  div.innerHTML = `
    <div class="chat-bubble-agent bg-slate-50 text-slate-600 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping" aria-hidden="true"></span>
      <span>Suman AI is preparing a response...</span>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  document.querySelectorAll(`[data-typing-id="${id}"]`).forEach(el => el.remove());
}

// ============================================================================
// 6. SERVER-SIDE AI PROXY INTEGRATION + DETERMINISTIC PORTFOLIO ENGINE
// ============================================================================
async function generateAgentResponse(userQuery) {
  const cleanQuery = userQuery.slice(0, HARD_MAX_INPUT_CHARS);
  const estimatedInputTokens = Math.max(5, Math.ceil(cleanQuery.length / 4));

  const localResult = generateLocalResponse(cleanQuery, estimatedInputTokens, false);

  if (window.location.protocol.startsWith("http") && window.location.hostname === "localhost") {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanQuery,
          history: conversationState.history.slice(-4)
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.status === "ok" && data.reply) {
          const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(data.reply.length / 4));
          consumeVisitorTokens(estimatedInputTokens + outputTokens);
          return {
            text: data.reply,
            tokenCost: estimatedInputTokens + outputTokens,
            followUps: localResult.followUps
          };
        }
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  consumeVisitorTokens(localResult.tokenCost);
  return localResult;
}

function findMatchingProject(q) {
  if (
    q.includes("all project") ||
    q.includes("every project") ||
    q.includes("list of project") ||
    q.includes("project portfolio") ||
    q.includes("overview of suman's project") ||
    q.includes("technologies has suman used in his projects")
  ) {
    return null;
  }

  const keywordMap = [
    {
      match: ["warehousing", "warehouse", "big data", "big-data", "pipeline", "medallion", "kimball", "star schema", "lendingclub", "lending club", "credit risk", "loan", "delta lake"],
      repoMatch: "big-data-warehousing-pipeline"
    },
    {
      match: ["residential", "property", "housing", "real estate", "price prediction", "valuation"],
      repoMatch: "residential-property-price-prediction-bi"
    },
    {
      match: ["music", "genre", "gtzan", "audio", "spectrogram", "mfcc", "django"],
      repoMatch: "music"
    },
    {
      match: ["diwali", "dewali", "festival", "festive", "retail sales", "customer segmentation", "purchasing"],
      repoMatch: "data-analysis-dewali"
    }
  ];

  for (const rule of keywordMap) {
    if (rule.match.some(kw => q.includes(kw))) {
      const found = liveProjectsList.find(p => p.name.toLowerCase() === rule.repoMatch);
      if (found) return found;
    }
  }

  for (const proj of liveProjectsList) {
    const repoLower = (proj.name || "").toLowerCase();
    const displayLower = (proj.displayName || "").toLowerCase();
    if (repoLower && q.includes(repoLower)) return proj;
    if (displayLower && q.includes(displayLower)) return proj;

    const significantTokens = displayLower
      .split(/[\s\-_&,/()]+/)
      .filter(w => w.length >= 5 && !["project", "analysis", "analytics", "pipeline", "intelligence", "business", "system", "data", "cloud"].includes(w));

    if (significantTokens.some(tok => q.includes(tok))) {
      return proj;
    }
  }

  return null;
}

function formatProjectResponse(proj, q) {
  const wantsDeepDive =
    q.includes("deep dive") ||
    q.includes("architecture") ||
    q.includes("how does") ||
    q.includes("how were") ||
    q.includes("method") ||
    q.includes("schema") ||
    q.includes("medallion") ||
    q.includes("kimball");

  const wantsChallenges =
    q.includes("challenge") ||
    q.includes("limitation") ||
    q.includes("quality") ||
    q.includes("problem") ||
    q.includes("issue") ||
    q.includes("tradeoff") ||
    q.includes("constraint");

  const techStack = (proj.tags || []).join(", ") || "Python, SQL, Power BI";
  const highlights = Array.isArray(proj.highlights) && proj.highlights.length > 0
    ? proj.highlights
    : [
        "End-to-end data ingestion, automated cleaning, and structured feature preparation.",
        "Analytical modeling and business KPI reporting tailored for decision-makers."
      ];

  if (wantsChallenges) {
    const text =
      `### ${proj.displayName} — Challenges & Limitations\n` +
      `**Project Status**: ${proj.status || "Completed Project"}\n\n` +
      `**Engineering & Analytical Challenges**:\n` +
      `• ${proj.challenges || "Standardizing raw input schemas, handling missing or skewed records, and validating analytical outputs."}\n\n` +
      `**Documented Scope & Limitations**:\n` +
      `• ${proj.limitations || "Built on historical benchmark datasets; live streaming production feeds are outside the current repository scope."}\n\n` +
      `**Repository**: [View ${proj.name} on GitHub](${proj.html_url})`;

    return {
      text,
      followUps: [
        `Give me a technical deep dive into ${proj.displayName}.`,
        "Show me an overview of Suman's project portfolio.",
        "What technologies has Suman used in his projects?"
      ]
    };
  }

  if (wantsDeepDive) {
    const highlightsBullets = highlights.map(h => `• ${h}`).join("\n");
    const text =
      `### Technical Deep Dive: ${proj.displayName}\n` +
      `**Status**: ${proj.status || "Completed Project"} (${proj.category})\n\n` +
      `**Objective**:\n${proj.objective || proj.description}\n\n` +
      `**Architecture & Implementation**:\n${proj.architecture || proj.description}\n\n` +
      `**Key Engineering Steps**:\n${highlightsBullets}\n\n` +
      `**Technologies**: \`${techStack}\`\n` +
      `**Source Code**: [View ${proj.name} on GitHub](${proj.html_url})`;

    return {
      text,
      followUps: [
        `What challenges and limitations exist in ${proj.displayName}?`,
        "What technologies has Suman used in his projects?",
        "Show me an overview of Suman's project portfolio."
      ]
    };
  }

  // Standard Executive Project Walkthrough
  const highlightsBullets = highlights.map(h => `• ${h}`).join("\n");
  const text =
    `### ${proj.displayName}\n` +
    `**Status**: ${proj.status || "Completed Project"} • **Category**: ${proj.category}\n\n` +
    `**Problem Statement**: ${proj.problemStatement || proj.description}\n\n` +
    `**Architecture Overview**:\n${proj.architecture || proj.objective || "Modular data ingestion, transformation, and analytical reporting workflow."}\n\n` +
    `**What Was Implemented**:\n${highlightsBullets}\n\n` +
    `**Technologies Used**: \`${techStack}\`\n` +
    `**GitHub Repository**: [View ${proj.name} on GitHub](${proj.html_url})`;

  const defaultFollowUps = (proj.followUpQuestions && proj.followUpQuestions.length > 0)
    ? proj.followUpQuestions
    : [
        `Give me a technical deep dive into ${proj.displayName}.`,
        `What challenges and limitations exist in ${proj.displayName}?`,
        "Show me an overview of Suman's project portfolio."
      ];

  return { text, followUps: defaultFollowUps };
}

function formatAllProjectsExecutiveSummary() {
  if (!liveProjectsList || liveProjectsList.length === 0) {
    return {
      text: "Suman's public GitHub projects are available at [github.com/bhsuman](https://github.com/bhsuman).",
      followUps: ["Summarise Suman's professional experience.", "What technologies has Suman used in his projects?"]
    };
  }

  const lines = liveProjectsList.map((proj, idx) => {
    const tech = (proj.tags || []).slice(0, 4).join(", ");
    return `**${idx + 1}. ${proj.displayName}** *(${proj.status || "Completed Project"} — ${proj.category})*\n` +
      `• **Problem**: ${proj.problemStatement || proj.description}\n` +
      `• **Stack**: \`${tech}\` — [GitHub Repository](${proj.html_url})`;
  }).join("\n\n");

  const text =
    `### Suman's Verified Project Portfolio (${liveProjectsList.length} Public Repositories)\n` +
    `Here is a concise summary of Suman's completed public projects on GitHub:\n\n` +
    `${lines}\n\n` +
    `*Note: His current Master of Applied Technologies coursework at Unitec (Auckland) is ongoing postgraduate study, kept distinct from his completed public repositories above.*`;

  return {
    text,
    followUps: [
      "Walk me through the end-to-end data warehousing project.",
      "Explain the Music Genre Classification project.",
      "Tell me more about the Residential Property Price Prediction & BI project."
    ]
  };
}

function formatSkillsToProjectEvidence() {
  const text =
    `### Technologies & Project Evidence Matrix\n` +
    `Suman applies his technical stack across both completed GitHub projects and 2+ years of commercial work:\n\n` +
    `| Domain | Technologies | Verified Evidence |\n` +
    `| :--- | :--- | :--- |\n` +
    `| **Data Engineering & Cloud** | Databricks, PySpark, Delta Lake, Snowflake | [Cloud Data Warehousing Pipeline](https://github.com/bhsuman/big-data-warehousing-pipeline) (LendingClub Medallion & Kimball Star Schema) & **LIS Nepal** |\n` +
    `| **Programming & Querying** | Advanced SQL (T-SQL, PostgreSQL), Python, R, Git | **Development Catalyst Consultancy** (2 yrs) & all 4 GitHub repositories |\n` +
    `| **Analytics & Visualisation** | Power BI (DAX), Tableau, Seaborn, Matplotlib | Credit Risk & Property BI Dashboards + [Retail Festive Sales EDA](https://github.com/bhsuman/Data-Analysis-Dewali) |\n` +
    `| **Machine Learning & AI** | Scikit-Learn, Regression, Audio MFCCs/Spectrograms | [Residential Property Price Prediction](https://github.com/bhsuman/Residential-Property-Price-Prediction-BI) & [Music Genre Classification](https://github.com/bhsuman/Music) |\n` +
    `| **Databases & Governance** | SQL Server, PostgreSQL, Star Schema, Banking ICT | **Laxmi Sunrise Bank Limited** & **Development Catalyst** |`;

  return {
    text,
    followUps: [
      "Walk me through the end-to-end data warehousing project.",
      "Explain the Music Genre Classification project.",
      "Summarise Suman's professional experience."
    ]
  };
}

function generateLocalResponse(query, inputTokens, consumeNow = true) {
  const q = query.toLowerCase().trim();
  const data = getData();
  const p = data.profile || {};
  let responseText = "";
  let followUps = [];

  if (
    q.includes("gpa") ||
    q.includes("grade") ||
    q.includes("transcript") ||
    q.includes("salary") ||
    q.includes("pay rate") ||
    q.includes("compensation") ||
    q.includes("passport") ||
    q.includes("driver") ||
    q.includes("reference") ||
    q.includes("referee")
  ) {
    responseText =
      `### Information Not Publicly Listed\n` +
      `That specific detail (such as academic transcripts/GPA, compensation expectations, or private referees) is not published in the public portfolio.\n\n` +
      `You can request Suman's full CV, academic records, or references directly:\n` +
      `• **Email**: [${p.email || "bhsuman11@gmail.com"}](mailto:${p.email || "bhsuman11@gmail.com"})\n` +
      `• **Phone / SMS**: [${p.phoneDisplay || "+64 22 051 2513"}](tel:${p.phoneDial || "+64220512513"})\n` +
      `• **LinkedIn**: [Suman Bhandari on LinkedIn](${p.linkedinUrl || "https://www.linkedin.com/in/suman-bhandari-ab4394279/"})`;
    followUps = [
      "Summarise Suman's professional experience.",
      "Tell me about Suman's studies at Unitec and academic background.",
      "Show me an overview of Suman's project portfolio."
    ];
  } else {
    let matchedProject = findMatchingProject(q);

    if (
      !matchedProject &&
      conversationState.lastProject &&
      (q.includes("challenge") ||
        q.includes("limitation") ||
        q.includes("architecture") ||
        q.includes("deep dive") ||
        q.includes("schema") ||
        q.includes("quality") ||
        q.includes("method") ||
        q.includes("result") ||
        q.includes("how did") ||
        q.includes("how does") ||
        q.includes("in this project") ||
        q.includes("in that project"))
    ) {
      matchedProject = conversationState.lastProject;
    }

    if (matchedProject) {
      conversationState.lastProject = matchedProject;
      conversationState.lastTopic = "project";
      const projRes = formatProjectResponse(matchedProject, q);
      responseText = projRes.text;
      followUps = projRes.followUps;
    } else if (
      q.includes("technologies has suman used") ||
      q.includes("what technologies") ||
      q.includes("skills-to-project") ||
      q.includes("evidence") ||
      (q.includes("tech") && q.includes("project"))
    ) {
      conversationState.lastTopic = "skills";
      const ev = formatSkillsToProjectEvidence();
      responseText = ev.text;
      followUps = ev.followUps;
    } else if (
      q.includes("machine learning and data analytics projects") ||
      (q.includes("machine learning") && q.includes("project"))
    ) {
      conversationState.lastTopic = "ml_projects";
      responseText =
        `### Machine Learning & Data Analytics Projects\n` +
        `Suman has built three public repositories focused on Machine Learning, Predictive Modeling, and Exploratory Data Analytics:\n\n` +
        `**1. Residential Property Price Prediction & BI** *(Completed Project)*\n` +
        `• **Focus**: Supervised regression modeling in Python (\`Scikit-Learn\`) paired with Power BI valuation dashboards to estimate housing prices and identify key market drivers.\n` +
        `• **Repository**: [Residential-Property-Price-Prediction-BI](https://github.com/bhsuman/Residential-Property-Price-Prediction-BI)\n\n` +
        `**2. Music Genre Classification ML Portal** *(Completed Project)*\n` +
        `• **Focus**: Audio feature extraction (MFCCs, spectral centroid, chroma, spectrograms) on the GTZAN dataset using Python and \`Scikit-Learn\`, deployed inside an interactive Django web interface.\n` +
        `• **Repository**: [Music](https://github.com/bhsuman/Music)\n\n` +
        `**3. Retail Festive Sales & Customer Analytics** *(Completed Project)*\n` +
        `• **Focus**: Multi-dimensional exploratory data analysis (EDA) in Python (\`Pandas\`, \`NumPy\`, \`Seaborn\`) identifying high-value customer demographics and regional retail segments.\n` +
        `• **Repository**: [Data-Analysis-Dewali](https://github.com/bhsuman/Data-Analysis-Dewali)`;
      followUps = [
        "Explain the Music Genre Classification project.",
        "Tell me more about the Residential Property Price Prediction & BI project.",
        "Walk me through the end-to-end data warehousing project."
      ];
    } else if (
      q.includes("project") ||
      q.includes("github") ||
      q.includes("repo") ||
      q.includes("portfolio") ||
      q.includes("built")
    ) {
      conversationState.lastTopic = "projects_overview";
      const allRes = formatAllProjectsExecutiveSummary();
      responseText = allRes.text;
      followUps = allRes.followUps;
    } else if (
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
      conversationState.lastTopic = "education";
      responseText =
        `### Academic Background & Postgraduate Study\n` +
        `Suman combines a 4-year Honours degree in Computer Science with current postgraduate specialization in Data Analytics in Auckland:\n\n` +
        `**1. Master of Applied Technologies — Computing (Data Analytics)** *(Current Study • Jul 2026 – Present)*\n` +
        `• **Institution**: Unitec Institute of Technology • Auckland, New Zealand\n` +
        `• **Specialization**: Advanced Data Analytics, Machine Learning, Big Data Engineering, Cloud Warehousing, Predictive Modeling, and Business Intelligence.\n\n` +
        `**2. B.Sc. in Computer Science & Information Technology (B.Sc. CSIT — 4-Year Honours)** *(Completed • Oct 2018 – Dec 2023)*\n` +
        `• **Institution**: Samriddhi College (Tribhuvan University) • Bhaktapur, Nepal\n` +
        `• **Core Coursework**: Database Management Systems (DBMS), Data Warehousing & Data Mining, Statistical Computing, Data Structures & Algorithms, AI, and Software Engineering.\n\n` +
        `**Work Eligibility**: Based in Henderson, Auckland (**Student • Open to Work**) for internships, part-time roles, and graduate opportunities across NZ & Australia.`;
      followUps = [
        "Summarise Suman's professional experience.",
        "Walk me through the end-to-end data warehousing project.",
        "What technologies has Suman used in his projects?"
      ];
    } else if (
      q.includes("experience") ||
      q.includes("professional") ||
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
      q.includes("companies") ||
      q.includes("summarise suman") ||
      q.includes("summarize suman")
    ) {
      conversationState.lastTopic = "experience";
      const expList = (data.experience || []).map(e => {
        const topBullets = (e.bullets || []).map(b => `• ${b}`).join("\n");
        return `**${e.role} — ${e.company}** *(${e.period} | ${e.location})*\n${topBullets}`;
      }).join("\n\n");

      responseText =
        `### Summary of Professional Experience (2+ Years)\n` +
        `Suman has over 2 years of commercial experience across data engineering consultancy, cloud data warehousing, and banking ICT operations:\n\n` +
        `${expList}\n\n` +
        `**Current Status**: Master's student at **Unitec (Auckland)**, actively open to Data Engineer, Data Analyst, and Data Scientist roles.`;
      followUps = [
        "What technologies has Suman used in his projects?",
        "Walk me through the end-to-end data warehousing project.",
        "Tell me about Suman's studies at Unitec and academic background."
      ];
    } else if (
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
      conversationState.lastTopic = "skills";
      responseText =
        `### Technical Skills & Role Alignment\n` +
        `Suman's skills are organised across five core domains:\n\n` +
        `**1. Data Engineering & Cloud**: Databricks (\`PySpark\`, \`Delta Lake\`), ETL/ELT data quality pipelines, \`dbt\`, Apache Airflow, Azure Data Factory, BigQuery.\n` +
        `**2. Programming & Querying**: Advanced SQL (T-SQL, PostgreSQL, SnowSQL — 2+ yrs commercial), Python (\`Pandas\`, \`NumPy\`, \`SciPy\`), R (\`tidyverse\`), Git & Django.\n` +
        `**3. Analytics & Visualisation**: Microsoft Power BI (\`DAX\`, Power Query), Tableau, Seaborn, Matplotlib, Advanced Excel.\n` +
        `**4. Machine Learning & AI**: Supervised regression & multi-class classification (\`Scikit-Learn\`), audio signal/MFCC feature extraction (GTZAN).\n` +
        `**5. Databases & Data Platforms**: Snowflake Cloud Data Warehouse, Kimball Star Schema dimensional modeling, MS SQL Server, PostgreSQL, MySQL.`;
      followUps = [
        "What technologies has Suman used in his projects?",
        "Walk me through the end-to-end data warehousing project.",
        "Explain the Music Genre Classification project."
      ];
    } else if (
      q.includes("contact") ||
      q.includes("phone") ||
      q.includes("number") ||
      q.includes("call") ||
      q.includes("email") ||
      q.includes("reach") ||
      q.includes("sms") ||
      q.includes("text") ||
      q.includes("linkedin") ||
      q.includes("connect") ||
      q.includes("cv") ||
      q.includes("resume")
    ) {
      conversationState.lastTopic = "contact";
      responseText =
        `### Direct Contact & CV — ${p.name}\n` +
        `You can reach Suman directly for interviews, CV requests, or role discussions:\n\n` +
        `• **Email**: [${p.email || "bhsuman11@gmail.com"}](mailto:${p.email || "bhsuman11@gmail.com"})\n` +
        `• **Phone / SMS**: [${p.phoneDisplay || "+64 22 051 2513"}](tel:${p.phoneDial || "+64220512513"}) (${p.phoneLocal || "022 051 2513"})\n` +
        `• **Location**: ${p.location || "Henderson, Auckland"}, ${p.country || "New Zealand"}\n` +
        `• **LinkedIn**: [linkedin.com/in/suman-bhandari-ab4394279](${p.linkedinUrl || "https://www.linkedin.com/in/suman-bhandari-ab4394279/"})\n` +
        `• **GitHub**: [github.com/bhsuman](${p.githubUrl || "https://github.com/bhsuman"})`;
      followUps = [
        "Summarise Suman's professional experience.",
        "Show me an overview of Suman's project portfolio."
      ];
    } else if (
      q.includes("token") ||
      q.includes("quota") ||
      q.includes("session limit") ||
      q.includes("allowance")
    ) {
      const quota = getVisitorQuota();
      responseText =
        `### Session Usage Status\n` +
        `• **Tokens Remaining**: \`${quota.tokensRemaining} / ${HOURLY_MAX_TOKENS}\` tokens\n` +
        `• **Questions Asked**: \`${quota.questionsAsked} / ${HOURLY_MAX_QUESTIONS}\` queries in this 1-hour session window.`;
      followUps = [
        "Show me an overview of Suman's project portfolio.",
        "Summarise Suman's professional experience."
      ];
    } else if (
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
      conversationState.lastTopic = "status";
      responseText =
        `### Work Availability & Student Status\n` +
        `• **Current Status**: **${p.statusBadge}** — Master of Applied Technologies (Computing – Data Analytics) student at Unitec Institute of Technology, Auckland.\n` +
        `• **Target Roles**: Data Engineer, Data Analyst, Business Intelligence Analyst, and Data Scientist (internships, part-time roles during semester, and full-time opportunities during breaks / post-completion).\n` +
        `• **Direct Contact**: [${p.email || "bhsuman11@gmail.com"}](mailto:${p.email || "bhsuman11@gmail.com"}) or **${p.phoneLocal || "022 051 2513"}**.`;
      followUps = [
        "Summarise Suman's professional experience.",
        "What technologies has Suman used in his projects?"
      ];
    } else {
      conversationState.lastTopic = "overview";
      const projectNames = liveProjectsList.map(pr => `**${pr.displayName}**`).join(", ");
      responseText =
        `### Candidate Profile Summary — ${p.name}\n` +
        `**${p.headline}** based in **${p.location}, ${p.country || "New Zealand"}** (**${p.statusBadge}**).\n\n` +
        `• **Commercial Experience (2+ Years)**: Associate Data Engineer at **Development Catalyst Consultancy**, Trainee Assistant - ICT at **Laxmi Sunrise Bank**, and Data Engineer Trainee at **LIS Nepal**.\n` +
        `• **Academic Qualifications**: Pursuing a **Master of Applied Technologies (Data Analytics)** at **Unitec (Auckland)**; holds a 4-year **B.Sc. CSIT (Honours)** degree.\n` +
        `• **Verified Projects**: ${projectNames}.\n` +
        `• **Core Technologies**: \`SQL\`, \`Python\`, \`Databricks\`, \`PySpark\`, \`Delta Lake\`, \`Snowflake\`, \`dbt\`, \`Power BI\`, \`Tableau\`, and \`Scikit-Learn\`.`;
      followUps = [
        "Walk me through the end-to-end data warehousing project.",
        "Explain the Music Genre Classification project.",
        "What technologies has Suman used in his projects?"
      ];
    }
  }

  const outputTokens = Math.min(HARD_MAX_OUTPUT_TOKENS, Math.ceil(responseText.length / 4));
  const totalCost = inputTokens + outputTokens;
  if (consumeNow) {
    consumeVisitorTokens(totalCost);
  }

  return { text: responseText, tokenCost: totalCost, followUps };
}

// ============================================================================
// 7. PRIVATE VISITOR NOTIFICATION DISPATCHER (WRITE-ONLY FOR VISITORS)
// ============================================================================
async function triggerSmsAlert(questionText, aiReply = "", source = "Suman AI") {
  const p = getData().profile || {};
  const timestamp = new Date().toLocaleString("en-NZ", { timeZone: p.timezone || "Pacific/Auckland" });
  const cleanQuestion = String(questionText).slice(0, 200);
  const cleanReply = String(aiReply).slice(0, 280);
  const targetEmail = p.email || "bhsuman11@gmail.com";

  if (isOwnerUnlocked) {
    saveStoredNotification({ timestamp, source, question: cleanQuestion, reply: cleanReply });
  }

  try {
    fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: `Portfolio Alert (${source}): "${cleanQuestion.slice(0, 50)}"`,
        Visitor_Inquiry: cleanQuestion,
        Assistant_Reply: cleanReply || "Direct Inquiry",
        Timestamp_NZT: timestamp,
        _template: "table",
        _captcha: "false"
      })
    }).catch(() => {});
  } catch (e) {}

  if (window.location.protocol.startsWith("http") && window.location.hostname === "localhost") {
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
}
window.triggerSmsAlert = triggerSmsAlert;

// ============================================================================
// 8. OWNER-ONLY SECURITY GATE (SHA-256 SALTED PIN + BRUTE-FORCE LOCKOUT)
// ============================================================================
function initOwnerSecurityGate() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l")) {
      e.preventDefault();
      requestOwnerAccess();
    }
  });

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

  renderNotificationListItems(getStoredNotifications());
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  if (window.location.protocol.startsWith("http") && window.location.hostname === "localhost") {
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
  const newPinInput = document.getElementById("owner-new-pin-input");
  if (newPinInput && newPinInput.value.trim().length >= 4) {
    const newHash = await sha256Hex(PIN_SALT + newPinInput.value.trim());
    localStorage.setItem("suman_custom_pin_hash", newHash);
    unlockedSessionPin = newPinInput.value.trim();
    newPinInput.value = "";
    showToastNotification("Owner PIN updated.");
  } else {
    showToastNotification("Enter a PIN of at least 4 characters.");
  }
};

window.enableBrowserNotifications = function() {
  if (!("Notification" in window)) {
    showToastNotification("Browser notifications are not supported on this device.");
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
    "Owner Test Notification: Verifying Suman AI alert delivery!",
    "Test succeeded. Alerts are active.",
    "Owner Test"
  );

  setTimeout(() => {
    if (statusEl) {
      statusEl.textContent = "✓ Sent! Check bhsuman11@gmail.com (and server logs if running locally).";
    }
    if (btn) btn.disabled = false;
    renderNotificationListItems(getStoredNotifications());
    showToastNotification("Test notification sent!");
  }, 900);
};

// ============================================================================
// 9. XSS-SAFE MARKDOWN RENDERER & URL SANITIZATION
// ============================================================================
function sanitizeUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim().replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, "");
  if (
    trimmed.includes('"') ||
    trimmed.includes("'") ||
    trimmed.includes("<") ||
    trimmed.includes(">")
  ) {
    return "#";
  }
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

function formatInlineMarkdown(escapedLine) {
  return escapedLine
    .replace(/`([^`]+)`/g, '<code class="md-inline-code font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawUrl) => {
      const unescapedUrl = rawUrl
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      const safe = sanitizeUrl(unescapedUrl);
      if (safe === "#") return label;
      const isExternal = safe.startsWith("http");
      const extAttrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(safe)}" ${extAttrs} class="text-blue-700 font-semibold underline hover:text-blue-900">${label}${isExternal ? " ↗" : ""}</a>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function renderSafeMarkdown(md) {
  if (!md) return "";
  const rawLines = String(md).replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inUl = false;
  let inOl = false;
  let tableRows = [];

  function closeListsAndTables() {
    if (inUl) {
      htmlBlocks.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlBlocks.push("</ol>");
      inOl = false;
    }
    if (tableRows.length > 0) {
      const headerCells = tableRows[0];
      const bodyRows = tableRows.slice(1).filter(r => !r.every(c => /^[:\-]+$/.test(c)));
      const thHtml = headerCells.map(c => `<th>${formatInlineMarkdown(escapeHtml(c))}</th>`).join("");
      const trsHtml = bodyRows.map(row =>
        `<tr>${row.map(c => `<td>${formatInlineMarkdown(escapeHtml(c))}</td>`).join("")}</tr>`
      ).join("");
      htmlBlocks.push(`<div class="overflow-x-auto"><table class="md-table"><thead><tr>${thHtml}</tr></thead><tbody>${trsHtml}</tbody></table></div>`);
      tableRows = [];
    }
  }

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      closeListsAndTables();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        htmlBlocks.push(`<pre class="md-code-block font-mono"><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
      if (inUl) { htmlBlocks.push("</ul>"); inUl = false; }
      if (inOl) { htmlBlocks.push("</ol>"); inOl = false; }
      const cells = trimmed.slice(1, -1).split("|").map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (tableRows.length > 0) {
      closeListsAndTables();
    }

    if (!trimmed) {
      closeListsAndTables();
      continue;
    }

    if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      closeListsAndTables();
      const headingText = trimmed.replace(/^#{2,3}\s+/, "");
      htmlBlocks.push(`<h3>${formatInlineMarkdown(escapeHtml(headingText))}</h3>`);
      continue;
    }

    if (/^([•\-*])\s+/.test(trimmed)) {
      if (inOl) { htmlBlocks.push("</ol>"); inOl = false; }
      if (!inUl) {
        htmlBlocks.push('<ul class="list-disc">');
        inUl = true;
      }
      const itemText = trimmed.replace(/^([•\-*])\s+/, "");
      htmlBlocks.push(`<li>${formatInlineMarkdown(escapeHtml(itemText))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      if (inUl) { htmlBlocks.push("</ul>"); inUl = false; }
      if (!inOl) {
        htmlBlocks.push('<ol class="list-decimal">');
        inOl = true;
      }
      const itemText = trimmed.replace(/^\d+\.\s+/, "");
      htmlBlocks.push(`<li>${formatInlineMarkdown(escapeHtml(itemText))}</li>`);
      continue;
    }

    closeListsAndTables();
    htmlBlocks.push(`<p>${formatInlineMarkdown(escapeHtml(trimmed))}</p>`);
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    htmlBlocks.push(`<pre class="md-code-block font-mono"><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  closeListsAndTables();

  return htmlBlocks.join("");
}

function showToastNotification(message) {
  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
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
  const fab = document.getElementById("suman-ai-fab");
  const popupInput = document.getElementById("popup-chat-input");
  if (popup) {
    popup.classList.remove("hidden");
    popup.classList.add("flex");
    if (fab) {
      fab.setAttribute("aria-expanded", "true");
      fab.classList.add("hidden");
    }
    const msgBox = document.getElementById("popup-agent-messages");
    if (msgBox && conversationState.history.length > 0) {
      msgBox.scrollTop = msgBox.scrollHeight;
    }
    if (popupInput) setTimeout(() => popupInput.focus(), 80);
  }
};

window.closeSumanAIPopup = function() {
  const popup = document.getElementById("suman-ai-popup");
  const fab = document.getElementById("suman-ai-fab");
  if (popup) {
    popup.classList.add("hidden");
    popup.classList.remove("flex");
  }
  if (fab) {
    fab.classList.remove("hidden");
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
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
  const promptText = `Walk me through the ${projectTitle} project.`;
  handleUserQuerySubmit(promptText);
};

window.askQuickQuestion = function(question) {
  window.openSumanAIPopup();
  handleUserQuerySubmit(question);
};

window.copyToClipboard = function(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToastNotification(`Copied ${label}: ${text}`);
  }).catch(() => {
    showToastNotification(`${label}: ${text}`);
  });
};
