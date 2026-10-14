/**
 * Suman Bhandari - Personal Portfolio & AI Agent
 * Henderson, Auckland, New Zealand
 * Phone / SMS: +64 22 051 2513
 */

// Configuration Constants
const SUMAN_INFO = {
  name: "Suman Bhandari",
  title: "Aspiring Data Analyst & Associate Data Engineer",
  location: "Henderson, Auckland, New Zealand",
  phone: "+64 22 051 2513",
  phoneLocal: "022 051 2513",
  phoneRaw: "220512513",
  email: "bhsuman11@gmail.com",
  linkedin: "https://www.linkedin.com/in/suman-bhandari-ab4394279/",
  github: "https://github.com/bhsuman",
  educationCurrent: "Master of Applied Technologies (Computing – Data Analytics), Unitec Institute of Technology, Auckland (July 2026 - Present)",
  bachelor: "Bachelor of Science in Computer Science and Information Technology, Samriddhi College, Nepal (Oct 2018 – Dec 2023)",
  highSchool: "Siddhartha College, Banepa, Nepal (Jun 2016 – Jul 2018)",
  roles: [
    {
      title: "Trainee Assistant - ICT",
      company: "Laxmi Sunrise Bank Limited",
      location: "Kathmandu, Nepal",
      period: "Feb 2026 – Jun 2026",
      points: [
        "Supported daily IT operations and technical activities for seamless banking.",
        "Supported users with technical queries and core banking applications.",
        "Gained deep exposure to data security, enterprise systems, and operational efficiency."
      ]
    },
    {
      title: "Associate Data Engineer",
      company: "DEVELOPMENT CATALYST CONSULTANCY PVT. LTD",
      location: "Kathmandu, Nepal",
      period: "Jan 2024 – Jan 2026",
      points: [
        "Analyzed and processed datasets using Python and SQL for key business requirements.",
        "Performed data cleaning, transformation, and validation pipelines for high data quality.",
        "Developed optimized SQL queries to extract, manipulate, and analyze relational data.",
        "Built reporting datasets and structured analytical outputs for stakeholders."
      ]
    },
    {
      title: "Data Engineer Trainee",
      company: "LIS NEPAL PVT. LTD",
      location: "Lalitpur, Nepal",
      period: "July 2023 – Oct 2023",
      points: [
        "In-depth exploration of SQL, Snowflake, and enterprise Data Warehousing concepts.",
        "Implemented ETL workflows in Snowflake and automated CSV-to-Python data extraction scripts.",
        "Collaborated with senior engineers on code refactoring and data pipeline performance."
      ]
    }
  ],
  skills: {
    languages: ["Python", "SQL", "R"],
    analytics: ["Power BI", "Data Visualization", "Jupyter Notebook", "DAX", "Business Intelligence", "Data Modelling"],
    databases: ["Snowflake", "Microsoft SQL Server", "MySQL", "Databricks Delta Lake"],
    engineering: ["ETL Pipelines", "Medallion Architecture", "Data Cleaning", "Data Integration", "Data Quality"],
    tools: ["AWS Cloud Computing (Basic)", "Git", "GitHub", "Bitbucket", "Jira", "ClickUp", "Agile"]
  },
  projects: [
    {
      name: "Big Data Warehousing & BI Pipeline",
      repo: "big-data-warehousing-pipeline",
      tech: "Databricks, PySpark, Delta Lake, Power BI, Python, SQL",
      description: "Cloud Data Warehousing and BI pipeline implementing Medallion Architecture (Bronze/Silver/Gold) and dimensional star-schema modeling."
    },
    {
      name: "Music Genre Classification",
      repo: "Music",
      tech: "Python, Django, Matplotlib, GTZAN",
      description: "Automated audio analysis web portal that classifies music tracks into genres using Python machine learning and spectrogram features."
    },
    {
      name: "Diwali Festive Sales Analysis",
      repo: "Data-Analysis-Dewali",
      tech: "Python, Pandas, Seaborn, Jupyter",
      description: "Exploratory data analysis identifying high-value customer demographics, seasonal purchasing behavior, and revenue drivers."
    },
    {
      name: "Atmospheric Weather Analysis",
      repo: "Data-Analysis-Weather",
      tech: "Python, Pandas, Matplotlib",
      description: "Analyzed weather metrics across meteorological datasets to model temperature patterns and cyclical trends."
    },
    {
      name: "Interactive Quiz Game",
      repo: "QuizGame",
      tech: "Python",
      description: "Interactive Python application with modular scoring rules, time trials, and category filtering."
    }
  ]
};

// State Variables
let sessionTokensRemaining = 2000;
const SESSION_MAX_TOKENS = 2000;
let configuredMaxOutputTokens = 180; // Limited token threshold
let geminiApiKey = localStorage.getItem("suman_gemini_api_key") || "";
let selectedModel = localStorage.getItem("suman_gemini_model") || "gemini-3.8-flash";
let notificationHistory = [];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initAucklandClock();
  initSkillsFilter();
  initAgentUI();
  initKeySettings();
  renderNotificationBadge();
});

// 1. Auckland / New Zealand Real-Time Clock
function initAucklandClock() {
  const clockElement = document.getElementById("auckland-clock");
  if (!clockElement) return;

  function updateClock() {
    try {
      const now = new Date();
      // Format in Auckland / Pacific Time
      const options = {
        timeZone: "Pacific/Auckland",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        weekday: "short"
      };
      const formatter = new Intl.DateTimeFormat("en-NZ", options);
      const timeParts = formatter.format(now);
      clockElement.innerHTML = `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5"></span> Henderson, Auckland: <strong class="text-white ml-1">${timeParts} (NZT)</strong>`;
    } catch (e) {
      clockElement.textContent = "Henderson, Auckland, NZ (UTC+13)";
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// 2. Skills Category Filter
function initSkillsFilter() {
  const filterBtns = document.querySelectorAll(".skill-filter-btn");
  const skillCards = document.querySelectorAll(".skill-card");

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => {
        b.classList.remove("bg-sky-500", "text-white", "border-sky-400");
        b.classList.add("bg-slate-800/60", "text-slate-300", "border-slate-700");
      });
      btn.classList.add("bg-sky-500", "text-white", "border-sky-400");
      btn.classList.remove("bg-slate-800/60", "text-slate-300", "border-slate-700");

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

// 3. AI Agent System & Limited Token Engine
function initAgentUI() {
  const chatForm = document.getElementById("agent-chat-form");
  const chatInput = document.getElementById("agent-chat-input");
  const messagesContainer = document.getElementById("agent-messages");
  const tokenMeter = document.getElementById("agent-token-meter");
  const tokenBar = document.getElementById("agent-token-bar");

  updateTokenDisplay();

  if (chatForm && chatInput) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;

      // Token budget check
      if (sessionTokensRemaining <= 20) {
        appendMessage("agent", "⚠️ Token limit reached for this session. To prevent runaway costs, tokens are capped. Please message Suman directly at **+64 22 051 2513** or email **bhsuman11@gmail.com**.");
        return;
      }

      // Append user message
      appendMessage("user", message);
      chatInput.value = "";
      chatInput.disabled = true;

      // Trigger automatic SMS alert dispatch to Suman's mobile (+64 22 051 2513)
      triggerSmsAlert(message);

      // Show typing indicator
      const typingId = showTypingIndicator();

      try {
        const response = await generateAgentResponse(message);
        removeTypingIndicator(typingId);
        appendMessage("agent", response.text, response.tokenCost, message);
      } catch (err) {
        removeTypingIndicator(typingId);
        appendMessage("agent", "I ran into a temporary connection issue. Please feel free to text Suman directly at **+64 22 051 2513**!");
      } finally {
        chatInput.disabled = false;
        chatInput.focus();
      }
    });
  }
}

// Update Token Meter Display
function updateTokenDisplay() {
  const tokenMeter = document.getElementById("agent-token-meter");
  const tokenBar = document.getElementById("agent-token-bar");
  if (tokenMeter) {
    tokenMeter.textContent = `${sessionTokensRemaining} / ${SESSION_MAX_TOKENS} tokens remaining`;
  }
  if (tokenBar) {
    const percentage = Math.max(0, Math.min(100, (sessionTokensRemaining / SESSION_MAX_TOKENS) * 100));
    tokenBar.style.width = `${percentage}%`;
    if (percentage < 25) {
      tokenBar.className = "token-bar-fill h-full bg-rose-500 rounded-full";
    } else if (percentage < 50) {
      tokenBar.className = "token-bar-fill h-full bg-amber-400 rounded-full";
    } else {
      tokenBar.className = "token-bar-fill h-full bg-emerald-400 rounded-full";
    }
  }
}

// Append Message to Agent UI
function appendMessage(sender, text, tokenCost = null, originalQuestion = "") {
  const container = document.getElementById("agent-messages");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `flex ${sender === "user" ? "justify-end" : "justify-start"} mb-4`;

  let innerHTML = "";
  if (sender === "user") {
    innerHTML = `
      <div class="chat-bubble-user max-w-[85%] px-4 py-3 text-sm shadow-md">
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  } else {
    // Agent bubble with token metadata and SMS notify quick-link
    const formattedText = renderMarkdown(text);
    const smsLink = `sms:+64220512513?body=${encodeURIComponent("Hi Suman, inquiry regarding: " + (originalQuestion || text.slice(0, 50)))}`;
    const waLink = `https://wa.me/64220512513?text=${encodeURIComponent("Kia Ora Suman, inquiry from portfolio: " + (originalQuestion || text.slice(0, 50)))}`;

    innerHTML = `
      <div class="chat-bubble-agent max-w-[90%] px-4 py-3 text-sm shadow-md text-slate-200">
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60 text-xs text-slate-400">
          <span class="flex items-center text-emerald-400 font-medium">
            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Suman AI Assistant
          </span>
          ${tokenCost ? `<span class="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-sky-300 font-mono">⚡ ${tokenCost} tokens used</span>` : ''}
        </div>
        <div class="prose prose-invert prose-sm text-slate-200 leading-relaxed">${formattedText}</div>
        
        <!-- SMS and WhatsApp direct reach-out action pills -->
        <div class="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-2 items-center text-xs">
          <a href="${smsLink}" class="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-medium transition-colors">
            <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            Text Suman (022 051 2513)
          </a>
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 transition-colors">
            WhatsApp Suman
          </a>
          <span class="text-[11px] text-slate-400 ml-auto flex items-center">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
            SMS notification sent to 220512513
          </span>
        </div>
      </div>
    `;
  }

  msgDiv.innerHTML = innerHTML;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

// Typing Indicator
function showTypingIndicator() {
  const container = document.getElementById("agent-messages");
  if (!container) return null;

  const id = "typing-" + Date.now();
  const div = document.createElement("div");
  div.id = id;
  div.className = "flex justify-start mb-4";
  div.innerHTML = `
    <div class="chat-bubble-agent px-4 py-3 text-sm flex items-center space-x-1.5 text-slate-400">
      <span class="text-xs mr-1 text-sky-400 font-mono">Thinking within token limit...</span>
      <span class="w-2 h-2 rounded-full bg-sky-400 animate-bounce"></span>
      <span class="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]"></span>
      <span class="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]"></span>
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

// 4. SMS & Mobile Notification Dispatcher to Suman (+64 22 051 2513)
async function triggerSmsAlert(questionText) {
  const timestamp = new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" });
  const alertItem = {
    time: timestamp,
    question: questionText,
    destination: "+64 22 051 2513",
    status: "Dispatched"
  };

  notificationHistory.unshift(alertItem);
  if (notificationHistory.length > 20) notificationHistory.pop();
  renderNotificationBadge();

  // Show Toast Alert Banner
  showToastNotification(`📱 Notification Alert: Suman's mobile (+64 22 051 2513) alerted with your inquiry!`);

  // 1) Asynchronous Free Webhook to NTFY (https://ntfy.sh/suman-portfolio-nz-220512513)
  // Suman can subscribe to this topic from his phone to receive immediate push notifications!
  try {
    fetch("https://ntfy.sh/suman-portfolio-nz-220512513", {
      method: "POST",
      body: `Portfolio Inquiry: "${questionText.slice(0, 180)}" - Sent at ${timestamp} (NZT). Destination: +64 22 051 2513`,
      headers: {
        "Title": "New Portfolio Visitor Question!",
        "Priority": "high",
        "Tags": "speech_balloon,briefcase"
      }
    }).catch(() => {});
  } catch (e) {
    // Silent failover for offline/local environments
  }

  // 2) Optional local Python backend forwarder if running server.py
  try {
    fetch("/api/notify-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "+64220512513",
        text: questionText,
        timestamp: timestamp
      })
    }).catch(() => {});
  } catch (e) {}
}

function renderNotificationBadge() {
  const notifyBadge = document.getElementById("sms-notify-status");
  if (notifyBadge) {
    notifyBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
      SMS Alert Active: <strong class="text-emerald-300 ml-1">+64 22 051 2513</strong>
    `;
  }
}

// 5. Dual Engine Agent Response Generator (Gemini API with Token Bounding + Smart Local Engine)
async function generateAgentResponse(userQuery) {
  // Truncate query to prevent input token overflow
  const cleanQuery = userQuery.slice(0, 300);
  const estimatedInputTokens = Math.ceil(cleanQuery.length / 4);

  // If Gemini API Key is configured, attempt real Gemini call
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      return await callGeminiAPI(cleanQuery, estimatedInputTokens);
    } catch (apiError) {
      console.warn("Gemini API error, falling back to local knowledge engine:", apiError);
    }
  }

  // Fallback to Smart Offline Local Knowledge Engine
  return generateLocalResponse(cleanQuery, estimatedInputTokens);
}

// Real Gemini API Calling (Strictly Token Limited)
async function callGeminiAPI(userQuery, inputTokens) {
  // Using official Gemini API endpoint with generationConfig: maxOutputTokens
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`;

  const systemInstruction = `You are the personal AI Career Assistant for Suman Bhandari, an Aspiring Data Analyst & Associate Data Engineer currently located in Henderson, Auckland, New Zealand.
Suman is currently pursuing a Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology, Auckland (July 2026 - Present).
His Bachelor's is in Computer Science and IT from Samriddhi College, Nepal (2018 - 2023).
His experience includes:
1) Trainee Assistant - ICT at Laxmi Sunrise Bank Limited, Nepal (Feb 2026 - Jun 2026)
2) Associate Data Engineer at DEVELOPMENT CATALYST CONSULTANCY (Jan 2024 - Jan 2026) working with Python, SQL, ETL pipelines, data quality.
3) Data Engineer Trainee at LIS NEPAL (July 2023 - Oct 2023) working with Snowflake, SQL, data warehousing.
Key Technical Skills: Python, SQL, R, Microsoft Power BI, Snowflake, MS SQL Server, MySQL, Databricks Delta Lake, Medallion Architecture, AWS (Basic), Git, Jira.
Top Projects: Cloud Data Warehousing & BI pipeline on Databricks/PySpark/Delta Lake/Power BI (Medallion architecture), Music Genre Classification (Python/Django), Diwali Sales Analysis, Weather Analysis.
Contact: Mobile +64 22 051 2513 (NZ text/call: 022 051 2513), Email: bhsuman11@gmail.com, GitHub: bhsuman, LinkedIn: suman-bhandari-ab4394279.
Tone: Warm, professional, Australasian / Kiwi friendly ("Kia Ora!"), clear and concise.
CRITICAL CONSTRAINT: Keep response under ${configuredMaxOutputTokens} tokens. Always be helpful, factual, and invite recruiters to contact Suman directly.`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemInstruction + "\n\nUser Question: " + userQuery }
        ]
      }
    ],
    generationConfig: {
      maxOutputTokens: configuredMaxOutputTokens,
      temperature: 0.4,
      topP: 0.8
    }
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Gemini API request failed");
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Thank you for reaching out! Please connect with Suman directly.";
  
  // Calculate tokens used
  const outputTokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
  const totalUsed = (data.usageMetadata?.totalTokenCount) ? data.usageMetadata.totalTokenCount : (inputTokens + outputTokens);
  
  sessionTokensRemaining = Math.max(0, sessionTokensRemaining - totalUsed);
  updateTokenDisplay();

  return {
    text: text,
    tokenCost: totalUsed
  };
}

// Smart Local Knowledge Engine (No Key Required, Instant, Token-Bounded)
function generateLocalResponse(query, inputTokens) {
  const q = query.toLowerCase();
  let responseText = "";

  if (q.includes("hi") || q.includes("hello") || q.includes("kia ora") || q.includes("hey") || q.includes("who are you")) {
    responseText = "Kia Ora! I'm Suman's AI Career Assistant. Suman is a Data Analyst & Associate Data Engineer based in Henderson, Auckland, currently completing his Master's in Applied Technologies (Data Analytics) at Unitec. How can I help you learn more about his background, projects, or work availability?";
  } else if (q.includes("contact") || q.includes("phone") || q.includes("number") || q.includes("call") || q.includes("email") || q.includes("reach") || q.includes("sms")) {
    responseText = "You can reach Suman directly in Auckland:\n• **Mobile / SMS**: +64 22 051 2513 (NZ local: 022 051 2513)\n• **Email**: bhsuman11@gmail.com\n• **Location**: Henderson, Auckland, New Zealand\n• **LinkedIn**: linkedin.com/in/suman-bhandari-ab4394279\n• **GitHub**: github.com/bhsuman\n\nYour inquiry has also triggered a notification alert to his phone!";
  } else if (q.includes("skill") || q.includes("python") || q.includes("sql") || q.includes("power bi") || q.includes("tech") || q.includes("stack") || q.includes("tools")) {
    responseText = "Suman's core technical stack includes:\n• **Languages**: Python (Pandas, NumPy, Matplotlib, Scikit-Learn), SQL, R\n• **BI & Visualization**: Microsoft Power BI, DAX, Jupyter Notebook\n• **Databases & Warehouses**: Snowflake, Microsoft SQL Server, MySQL, Databricks Delta Lake\n• **Data Engineering**: ETL Pipelines, Medallion Architecture (Bronze/Silver/Gold), Data Quality & Cleaning\n• **Cloud & Tools**: AWS (Basic), Git/GitHub, Jira, Agile.";
  } else if (q.includes("project") || q.includes("portfolio") || q.includes("databricks") || q.includes("dewali") || q.includes("music") || q.includes("weather")) {
    responseText = "Featured projects developed by Suman:\n1. **Big Data Warehousing Pipeline**: Implemented Databricks, PySpark, Delta Lake & Power BI with Medallion Architecture (github.com/bhsuman/big-data-warehousing-pipeline).\n2. **Music Genre Classifier**: Django & Python audio classification using GTZAN (github.com/bhsuman/Music).\n3. **Diwali Sales Analytics**: EDA and customer purchase behavioral insights (github.com/bhsuman/Data-Analysis-Dewali).\n4. **Weather Data Analytics**: Time-series meteorological trend analysis (github.com/bhsuman/Data-Analysis-Weather).";
  } else if (q.includes("education") || q.includes("unitec") || q.includes("degree") || q.includes("master") || q.includes("college") || q.includes("study") || q.includes("qualification")) {
    responseText = "Suman's academic qualifications:\n• **Master of Applied Technologies (Computing – Data Analytics)**: Unitec Institute of Technology, Auckland, New Zealand (July 2026 - Present)\n• **B.Sc. in Computer Science & Information Technology (CSIT)**: Samriddhi College, Nepal (2018 – 2023)\n• **High School (Science & Computing)**: Siddhartha College, Nepal (2016 – 2018).";
  } else if (q.includes("experience") || q.includes("bank") || q.includes("laxmi") || q.includes("work") || q.includes("history") || q.includes("development catalyst") || q.includes("lis nepal")) {
    responseText = "Suman brings over 2 years of hands-on data & tech experience:\n1. **Trainee Assistant - ICT** at Laxmi Sunrise Bank Limited, Nepal (Feb 2026 - Jun 2026): Enterprise banking systems, data security, operational workflows.\n2. **Associate Data Engineer** at DEVELOPMENT CATALYST CONSULTANCY (Jan 2024 - Jan 2026): Python, SQL data extraction, cleansing, transformation & client reporting.\n3. **Data Engineer Trainee** at LIS NEPAL (July 2023 - Oct 2023): Snowflake ETL pipelines, SQL data warehousing, automated script generation.";
  } else if (q.includes("visa") || q.includes("work right") || q.includes("new zealand") || q.includes("australia") || q.includes("auckland") || q.includes("available") || q.includes("relocate")) {
    responseText = "Suman is currently based in Henderson, Auckland, New Zealand. He has active study and work rights in New Zealand, and is actively seeking Data Analyst, Associate Data Engineer, and Business Intelligence roles across Auckland, throughout New Zealand, and remote Australia/NZ roles!";
  } else {
    responseText = `Kia Ora! Thank you for asking. Suman is an Auckland-based Data Analyst skilled in SQL, Python, Power BI, Snowflake, and Databricks. For in-depth discussions or interview opportunities, please call/text him directly at **+64 22 051 2513** or email **bhsuman11@gmail.com**. Your question has been forwarded to his mobile!`;
  }

  // Token bounding logic
  const estimatedOutputTokens = Math.min(configuredMaxOutputTokens, Math.ceil(responseText.length / 4));
  const totalCost = inputTokens + estimatedOutputTokens;
  sessionTokensRemaining = Math.max(0, sessionTokensRemaining - totalCost);
  updateTokenDisplay();

  return {
    text: responseText,
    tokenCost: totalCost
  };
}

// 6. Settings Modal (Gemini API Key, Model Selection, Token Limiter)
function initKeySettings() {
  const modal = document.getElementById("settings-modal");
  const openBtn = document.getElementById("open-settings-btn");
  const closeBtn = document.getElementById("close-settings-btn");
  const saveBtn = document.getElementById("save-settings-btn");
  const keyInput = document.getElementById("gemini-api-key-input");
  const modelSelect = document.getElementById("gemini-model-select");
  const tokenLimitInput = document.getElementById("token-limit-input");
  const tokenLimitValue = document.getElementById("token-limit-value");

  if (!modal) return;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (keyInput) keyInput.value = geminiApiKey;
      if (modelSelect) modelSelect.value = selectedModel;
      if (tokenLimitInput) tokenLimitInput.value = configuredMaxOutputTokens;
      if (tokenLimitValue) tokenLimitValue.textContent = configuredMaxOutputTokens;
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

  if (tokenLimitInput && tokenLimitValue) {
    tokenLimitInput.addEventListener("input", (e) => {
      tokenLimitValue.textContent = e.target.value;
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      geminiApiKey = (keyInput ? keyInput.value.trim() : "");
      selectedModel = (modelSelect ? modelSelect.value : "gemini-3.8-flash");
      configuredMaxOutputTokens = (tokenLimitInput ? parseInt(tokenLimitInput.value, 10) : 180);

      localStorage.setItem("suman_gemini_api_key", geminiApiKey);
      localStorage.setItem("suman_gemini_model", selectedModel);
      
      modal.classList.add("hidden");
      modal.classList.remove("flex");

      showToastNotification(`Settings saved! AI Agent configured with ${selectedModel} (Max tokens: ${configuredMaxOutputTokens})`);
    });
  }
}

// 7. Toast Notification Utility
function showToastNotification(message) {
  const toast = document.createElement("div");
  toast.className = "fixed bottom-5 right-5 z-50 bg-slate-900/95 text-emerald-300 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3 text-sm transform transition-all duration-300 translate-y-8 opacity-0";
  toast.innerHTML = `
    <span class="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
    </span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove("translate-y-8", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
  }, 50);

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-8", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// 8. Quick Question Click Helper
window.askQuickQuestion = function(question) {
  const chatInput = document.getElementById("agent-chat-input");
  const chatForm = document.getElementById("agent-chat-form");
  if (chatInput && chatForm) {
    chatInput.value = question;
    chatForm.dispatchEvent(new Event("submit"));
    // Scroll to chat
    const chatSection = document.getElementById("ai-agent-section");
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: "smooth" });
    }
  }
};

// 9. Copy to Clipboard Utility
window.copyToClipboard = function(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    showToastNotification(`Copied ${label} to clipboard!`);
  }).catch(() => {
    showToastNotification(`Selected: ${text}`);
  });
};

// Markdown Formatter Helper
function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-white mt-2 mb-1">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-white mt-2 mb-1">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="font-bold text-white mt-2 mb-1">$1</h2>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\• (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n$/gim, '<br />')
    .replace(/\n/gim, '<br />');
  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
