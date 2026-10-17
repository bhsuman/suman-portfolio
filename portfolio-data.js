/**
 * ============================================================================
 * SUMAN BHANDARI — MASTER PORTFOLIO CONTENT FILE (portfolio-data.js)
 * ============================================================================
 * SECURITY NOTE:
 * - NEVER put any password, GitHub token, email password, or LinkedIn password
 *   in this file. None are needed!
 * - Visitors can ONLY see the specific GitHub repositories you list in Section 7
 *   (`whitelistedProjects`). Any other personal repositories on your GitHub
 *   account are strictly hidden from your portfolio.
 * ============================================================================
 */

window.PORTFOLIO_DATA = {

  // --------------------------------------------------------------------------
  // 1. PERSONAL PROFILE & PUBLIC CONTACT DETAILS
  // --------------------------------------------------------------------------
  profile: {
    name: "Suman Bhandari",
    initials: "SB",
    headline: "Data Analytics Student & Associate Data Engineer",
    subheadline: "Data Analytics & Engineering",
    statusBadge: "Student • Open to Work",
    heroBadge: "Master's Student at Unitec • Open to Work (Student)",
    photo: "assets/suman-bhandari.jpg",
    location: "Henderson, Auckland",
    country: "New Zealand",
    timezone: "Pacific/Auckland",
    phoneDisplay: "+64 22 051 2513",
    phoneLocal: "022 051 2513",
    phoneDial: "+64220512513",
    email: "bhsuman11@gmail.com",
    githubUsername: "bhsuman",
    githubUrl: "https://github.com/bhsuman",
    linkedinUrl: "https://www.linkedin.com/in/suman-bhandari-ab4394279/",
    heroBio:
      "Master of Applied Technologies (Computing – Data Analytics) student at Unitec Institute of Technology with two years of industry experience in SQL, Python, Snowflake warehousing, Databricks ETL pipelines, and Power BI reporting. Currently seeking student, internship, part-time, and graduate data roles."
  },

  // --------------------------------------------------------------------------
  // 2. TOP SUMMARY CARDS (4 Highlight Boxes under the Hero Section)
  // --------------------------------------------------------------------------
  highlights: [
    {
      value: "2+ Years",
      title: "Industry Experience",
      subtitle: "Data Engineering & ICT"
    },
    {
      value: "5 Projects",
      title: "Featured Repositories",
      subtitle: "Verified Portfolio Work",
      isGitHubCounter: true
    },
    {
      value: "Master's",
      title: "Computing (Data Analytics)",
      subtitle: "Unitec Institute of Technology"
    },
    {
      value: "Student",
      title: "Open to Work",
      subtitle: "Internships & Part-Time Roles"
    }
  ],

  // --------------------------------------------------------------------------
  // 3. ABOUT SECTION & QUICK DETAILS TABLE
  // --------------------------------------------------------------------------
  about: {
    heading: "Background in Data Warehousing, SQL & Analytics",
    paragraphs: [
      "I am currently studying my Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology in Auckland. Before starting my postgraduate studies, I worked across commercial banking IT operations at Laxmi Sunrise Bank, data engineering consultancy at Development Catalyst Consultancy, and cloud data warehousing at LIS Nepal.",
      "My day-to-day technical work focuses on writing clean SQL, building reliable Python & PySpark ETL pipelines, structuring data warehouses in Snowflake and Databricks (Medallion & Star Schema), and building clear Power BI reports."
    ],
    calloutTitle: "Current Status: Master's Student • Open to Work",
    calloutText:
      "Available for student positions, internships, part-time data analyst/engineering work, and academic or industry data projects.",
    quickDetails: [
      { label: "Name", value: "Suman Bhandari" },
      { label: "Location", value: "Henderson, Auckland" },
      { label: "Current Study", value: "Master's at Unitec" },
      { label: "Availability", value: "Student • Open to Work", highlight: true },
      { label: "Phone / SMS", value: "+64 22 051 2513", href: "sms:+64220512513" },
      { label: "Email", value: "bhsuman11@gmail.com", href: "mailto:bhsuman11@gmail.com" },
      { label: "GitHub", value: "github.com/bhsuman", href: "https://github.com/bhsuman" }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. TECHNICAL SKILLS
  // Categories: "languages", "analytics", "databases", "engineering"
  // --------------------------------------------------------------------------
  skills: [
    {
      code: "Py",
      name: "Python",
      category: "languages",
      description: "Pandas, NumPy, Matplotlib, Seaborn, Scikit-Learn, PySpark scripts"
    },
    {
      code: "SQL",
      name: "SQL",
      category: "languages",
      description: "Complex Joins, CTEs, Window Functions, Stored Procedures, Query Tuning"
    },
    {
      code: "BI",
      name: "Microsoft Power BI",
      category: "analytics",
      description: "Interactive Dashboards, DAX Measures, Star Schema Data Modeling"
    },
    {
      code: "SF",
      name: "Snowflake",
      category: "databases",
      description: "Cloud Data Warehousing, Stage Loading, ETL Pipelines, SnowSQL"
    },
    {
      code: "DB",
      name: "Databricks & Delta Lake",
      category: "engineering",
      description: "Medallion Architecture (Bronze / Silver / Gold), PySpark Transformations"
    },
    {
      code: "DB",
      name: "SQL Server & MySQL",
      category: "databases",
      description: "Relational Schema Design, Indexing, Data Integrity & Administration"
    },
    {
      code: "ETL",
      name: "ETL & Data Quality",
      category: "engineering",
      description: "Data Cleansing, Validation Rules, Schema Mapping, Deduplication"
    },
    {
      code: "R",
      name: "R Programming",
      category: "languages",
      description: "Statistical Analysis, Exploratory Data Analysis, Data Visualization"
    },
    {
      code: "Git",
      name: "AWS, Git & Agile Tools",
      category: "engineering",
      description: "Git, GitHub, Bitbucket, AWS Basics, Jira, ClickUp, Scrum Workflows"
    }
  ],

  // --------------------------------------------------------------------------
  // 5. WORK EXPERIENCE
  // --------------------------------------------------------------------------
  experience: [
    {
      role: "Trainee Assistant - ICT",
      company: "Laxmi Sunrise Bank Limited",
      location: "Kathmandu, Nepal",
      period: "Feb 2026 – Jun 2026",
      active: true,
      bullets: [
        "Supported daily core IT banking operations and technical stability across branches.",
        "Resolved user technical queries and provided frontline troubleshooting.",
        "Worked with enterprise banking systems, data security policies, and operational workflows."
      ]
    },
    {
      role: "Associate Data Engineer",
      company: "Development Catalyst Consultancy Pvt. Ltd",
      location: "Kathmandu, Nepal",
      period: "Jan 2024 – Jan 2026",
      active: true,
      bullets: [
        "Analyzed and processed datasets using Python and SQL for client business reporting.",
        "Built automated data cleaning, transformation, and validation pipelines.",
        "Wrote relational SQL queries to extract and model multi-table datasets."
      ]
    },
    {
      role: "Data Engineer Trainee",
      company: "LIS Nepal Pvt. Ltd",
      location: "Lalitpur, Nepal",
      period: "Jul 2023 – Oct 2023",
      active: false,
      bullets: [
        "Trained in SQL, Snowflake cloud warehousing, and dimensional modeling concepts.",
        "Implemented Snowflake ETL workflows and automated CSV-to-Python ingestion scripts.",
        "Assisted senior engineers with query tuning and pipeline testing."
      ]
    }
  ],

  // --------------------------------------------------------------------------
  // 6. EDUCATION
  // --------------------------------------------------------------------------
  education: [
    {
      badge: "Current Student",
      period: "Jul 2026 – Present",
      degree: "Master of Applied Technologies",
      major: "Computing – Data Analytics",
      institution: "Unitec Institute of Technology",
      location: "Auckland, New Zealand",
      description:
        "Postgraduate focus on data analytics, machine learning workflows, big data processing, and business intelligence.",
      highlighted: true
    },
    {
      badge: "Bachelor's Degree",
      period: "Oct 2018 – Dec 2023",
      degree: "B.Sc. in Computer Science and Information Technology (CSIT)",
      major: "",
      institution: "Samriddhi College",
      location: "Bhaktapur, Nepal",
      description:
        "Database Management Systems, Data Structures & Algorithms, Software Engineering, and Statistical Computing.",
      highlighted: false
    },
    {
      badge: "High School",
      period: "Jun 2016 – Jul 2018",
      degree: "High School (Science & Computing)",
      major: "",
      institution: "Siddhartha College",
      location: "Banepa, Nepal",
      description: "",
      highlighted: false
    }
  ],

  // --------------------------------------------------------------------------
  // 7. WHITELISTED GITHUB PROJECTS ONLY (Strict Privacy Mode)
  // ONLY the repositories listed below are shown on your portfolio.
  // Any other personal repositories on your GitHub are NEVER shown to visitors.
  // For these approved repos, live commit dates & descriptions sync from GitHub.
  // --------------------------------------------------------------------------
  onlyShowWhitelistedRepos: true,

  githubRepoOverrides: {
    "big-data-warehousing-pipeline": {
      displayName: "Big Data Warehousing & BI Pipeline",
      category: "Data Engineering",
      description:
        "Cloud data warehousing and BI pipeline implementing Medallion Architecture (Bronze/Silver/Gold) and dimensional star-schema modeling using Databricks, PySpark, Delta Lake, and Power BI.",
      tags: ["Databricks", "PySpark", "Delta Lake", "Power BI", "SQL"],
      featured: true
    },
    "Music": {
      displayName: "Music Genre Classification Portal",
      category: "Machine Learning",
      description:
        "Web portal that extracts acoustic features and classifies audio files into genres using Python, Django, and Matplotlib on the GTZAN dataset.",
      tags: ["Python", "Django", "Matplotlib", "GTZAN"],
      featured: true
    },
    "Data-Analysis-Dewali": {
      displayName: "Diwali Festive Sales Analysis",
      category: "Data Analysis",
      description:
        "Exploratory data analysis inspecting consumer demographics, product categories, and purchasing patterns to identify high-revenue retail segments.",
      tags: ["Python", "Pandas", "Seaborn", "Jupyter"],
      featured: true
    },
    "Data-Analysis-Weather": {
      displayName: "Atmospheric Weather Trends Analysis",
      category: "Data Analysis",
      description:
        "Cleaned and evaluated multi-variable meteorological readings to analyze humidity shifts, precipitation, and temperature trends.",
      tags: ["Python", "Pandas", "Matplotlib", "Jupyter"],
      featured: true
    },
    "QuizGame": {
      displayName: "Interactive Quiz Game Engine",
      category: "Python Programming",
      description:
        "Modular Python application implementing custom scoring rules, control flow, and category-based question workflows.",
      tags: ["Python", "OOP", "Logic Design"],
      featured: false
    }
  },

  // --------------------------------------------------------------------------
  // 8. AI ASSISTANT QUICK PROMPTS & EXTRA NOTES
  // --------------------------------------------------------------------------
  assistant: {
    welcomeMessage:
      "Hi! I can answer questions specifically about Suman Bhandari's technical skills, Unitec Master's studies, work experience, and selected portfolio projects.",
    quickPrompts: [
      { label: "SQL & Python Skills", question: "What are Suman's core SQL and Python skills?" },
      { label: "Featured Projects", question: "Tell me about his featured portfolio projects" },
      { label: "Student Work Status", question: "What is his current student & work status?" },
      { label: "Contact Info", question: "How can I contact Suman?" }
    ],
    extraNotesForAI:
      "Suman is a Master's Student in Computing (Data Analytics) at Unitec Institute of Technology and is Open to Work for student roles, internships, part-time positions, and graduate analytics roles."
  }
};
