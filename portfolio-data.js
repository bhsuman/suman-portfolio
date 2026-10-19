/**
 * ============================================================================
 * SUMAN BHANDARI — MASTER PORTFOLIO CONTENT FILE (portfolio-data.js)
 * ============================================================================
 * HOW TO UPDATE YOUR PORTFOLIO:
 * Edit any text, skill, job, education, or project below and save this file.
 * Both your website AND your AI Assistant automatically sync with this file!
 * ============================================================================
 */

window.PORTFOLIO_DATA = {

  // --------------------------------------------------------------------------
  // 1. PERSONAL PROFILE & PUBLIC CONTACT DETAILS (Employer-Facing)
  // --------------------------------------------------------------------------
  profile: {
    name: "Suman Bhandari",
    initials: "SB",
    headline: "Data Analyst, Associate Data Engineer & Data Science Postgraduate",
    subheadline: "Data Engineering • Analytics • Data Science",
    statusBadge: "Student • Open to Work",
    heroBadge: "Master's Student at Unitec (Auckland) • Open to Work (Student)",
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
      "Master of Applied Technologies (Computing – Data Analytics) student at Unitec Institute of Technology, Auckland, with over 2 years of hands-on industry experience across Data Engineering, Business Intelligence, and Banking ICT. Skilled in building scalable ETL/ELT pipelines, cloud data warehouses (Snowflake, Databricks, BigQuery, Azure), interactive Power BI & Tableau dashboards, and Python/R machine learning models."
  },

  // --------------------------------------------------------------------------
  // 2. TOP SUMMARY CARDS (4 Highlight Boxes under the Hero Section)
  // --------------------------------------------------------------------------
  highlights: [
    {
      value: "2+ Years",
      title: "Industry Experience",
      subtitle: "Data Engineering, Analytics & ICT"
    },
    {
      value: "15+ Tools",
      title: "Modern Data Stack",
      subtitle: "SQL, Python, Snowflake, Databricks, BI"
    },
    {
      value: "Master's",
      title: "Applied Tech (Data Analytics)",
      subtitle: "Unitec Institute of Technology, Auckland"
    },
    {
      value: "Student",
      title: "Open to Work",
      subtitle: "Data Analyst, Engineer & Scientist Roles"
    }
  ],

  // --------------------------------------------------------------------------
  // 3. ABOUT SECTION & QUICK DETAILS TABLE
  // --------------------------------------------------------------------------
  about: {
    heading: "Bridging Data Engineering, Business Analytics & Data Science",
    paragraphs: [
      "Kia Ora! I am Suman Bhandari, currently based in Henderson, Auckland, New Zealand, pursuing my Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology. Prior to my postgraduate studies in Auckland, I built practical industry experience across commercial banking IT operations at Laxmi Sunrise Bank, data engineering consultancy at Development Catalyst Consultancy, and cloud data warehousing at LIS Nepal.",
      "I work across the end-to-end data lifecycle: ingesting and transforming raw data into clean Medallion (Bronze/Silver/Gold) and Kimball Star Schema models using SQL, Python, PySpark, dbt, Snowflake, and Databricks; building predictive machine learning and statistical models in Python and R; and delivering executive-ready dashboards in Microsoft Power BI and Tableau."
    ],
    calloutTitle: "Current Status: Master's Student • Open to Work",
    calloutText:
      "Actively seeking internships, part-time positions, and graduate opportunities in Data Engineering, Data Analytics, Business Intelligence, and Data Science.",
    quickDetails: [
      { label: "Full Name", value: "Suman Bhandari" },
      { label: "Current Location", value: "Henderson, Auckland, New Zealand" },
      { label: "University", value: "Unitec Institute of Technology (Auckland)" },
      { label: "Current Degree", value: "Master of Applied Technologies (Data Analytics)" },
      { label: "Work Status", value: "Student • Open to Work", highlight: true },
      { label: "Target Roles", value: "Data Engineer / Data Analyst / Data Scientist" },
      { label: "Direct Phone / SMS", value: "+64 22 051 2513 (022 051 2513)", href: "sms:+64220512513" },
      { label: "Email", value: "bhsuman11@gmail.com", href: "mailto:bhsuman11@gmail.com" },
      { label: "LinkedIn", value: "linkedin.com/in/suman-bhandari-ab4394279", href: "https://www.linkedin.com/in/suman-bhandari-ab4394279/" },
      { label: "GitHub", value: "github.com/bhsuman", href: "https://github.com/bhsuman" }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. EXPANDED EMPLOYER-READY TECHNICAL SKILLS
  // Categories: "engineering", "analytics", "datascience", "cloud"
  // Tailored for Data Engineer, Data Analyst & Data Scientist hiring standards
  // --------------------------------------------------------------------------
  skills: [
    // Data Analytics & BI
    {
      code: "SQL",
      name: "Advanced SQL & Data Modeling",
      category: "analytics",
      description: "T-SQL, PostgreSQL, Snowflake SQL, CTEs, Window Functions, Query Optimization, Kimball Star & Snowflake Schemas"
    },
    {
      code: "PBI",
      name: "Microsoft Power BI & DAX",
      category: "analytics",
      description: "Interactive Executive Dashboards, Advanced DAX, Power Query (M), Data Modeling, KPI Reporting & Storytelling"
    },
    {
      code: "TAB",
      name: "Tableau & Looker Studio",
      category: "analytics",
      description: "Visual Analytics, Self-Service BI Dashboards, Cross-Filtering, Funnel & Retention Metrics, A/B Test Reporting"
    },
    {
      code: "XLS",
      name: "Advanced Excel & Business Analysis",
      category: "analytics",
      description: "Pivot Tables, XLOOKUP, Power Pivot, Financial & Operational Reporting, Requirements Gathering, Stakeholder Insights"
    },

    // Data Engineering & Warehousing
    {
      code: "SF",
      name: "Snowflake Cloud Data Warehouse",
      category: "engineering",
      description: "Cloud Warehousing, SnowSQL, External Stages, Streams & Tasks, Role-Based Access Control, Performance Tuning"
    },
    {
      code: "DBX",
      name: "Databricks, PySpark & Delta Lake",
      category: "engineering",
      description: "Medallion Lakehouse Architecture (Bronze / Silver / Gold), Apache Spark, Distributed Dataframes, Delta Live Tables"
    },
    {
      code: "DBT",
      name: "dbt & Apache Airflow (ETL / ELT)",
      category: "engineering",
      description: "Modular SQL Transformations with dbt, Automated Pipeline Orchestration, DAG Scheduling, Data Lineage & Testing"
    },
    {
      code: "ADF",
      name: "Azure Data Factory & MS Fabric",
      category: "engineering",
      description: "Cloud Data Ingestion Pipelines, Azure Data Lake Storage (ADLS), Microsoft Fabric Lakehouse & Synapse Analytics"
    },
    {
      code: "RDB",
      name: "MS SQL Server, PostgreSQL & MySQL",
      category: "engineering",
      description: "Relational Database Design, Stored Procedures, Indexing Strategies, ACID Transactions, Data Quality & Cleansing"
    },

    // Data Science & Machine Learning
    {
      code: "PY",
      name: "Python for Data Science & Automation",
      category: "datascience",
      description: "Pandas, NumPy, SciPy, Matplotlib, Seaborn, Plotly, REST API Data Extraction, Automated Cleaning Pipelines"
    },
    {
      code: "ML",
      name: "Machine Learning & Predictive Modeling",
      category: "datascience",
      description: "Scikit-Learn, Supervised & Unsupervised Learning (Regression, Random Forest, XGBoost, Clustering), Feature Engineering"
    },
    {
      code: "STAT",
      name: "R Programming & Statistical Analysis",
      category: "datascience",
      description: "R (tidyverse, ggplot2), Hypothesis Testing, Time-Series Forecasting, Probability Distributions, Anomaly Detection"
    },

    // Cloud, DevOps & Delivery
    {
      code: "CLD",
      name: "AWS, Azure & Google BigQuery",
      category: "cloud",
      description: "AWS (S3, Redshift, Glue Basics), Google Cloud BigQuery, Azure Cloud Data Services, Serverless Data Querying"
    },
    {
      code: "GIT",
      name: "Git, CI/CD & Container Basics",
      category: "cloud",
      description: "Git, GitHub Actions, Bitbucket, Docker Basics, Version-Controlled Analytics, Reproducible Jupyter Workflows"
    },
    {
      code: "AGL",
      name: "Agile, Jira & Data Governance",
      category: "cloud",
      description: "Jira, ClickUp, Confluence, Agile/Scrum Sprints, Data Security Policies, Data Validation & Documentation"
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
        "Supported daily core IT banking operations, system uptime, and technical operations across commercial banking branches.",
        "Resolved user technical queries, core banking application issues, and database connectivity tickets.",
        "Gained hands-on exposure to enterprise banking systems, strict financial data security policies, and operational efficiency."
      ]
    },
    {
      role: "Associate Data Engineer",
      company: "Development Catalyst Consultancy Pvt. Ltd",
      location: "Kathmandu, Nepal",
      period: "Jan 2024 – Jan 2026",
      active: true,
      bullets: [
        "Analyzed, transformed, and processed large-scale datasets using Python (Pandas, NumPy) and advanced SQL to deliver client business solutions.",
        "Designed and maintained automated ETL data cleaning, transformation, and schema validation pipelines to ensure high data quality.",
        "Authored complex relational SQL queries (CTEs, window functions, multi-table joins) to build reporting data marts.",
        "Collaborated with analysts and business stakeholders to translate reporting requirements into structured analytical datasets and BI dashboards."
      ]
    },
    {
      role: "Data Engineer Trainee",
      company: "LIS Nepal Pvt. Ltd",
      location: "Lalitpur, Nepal",
      period: "Jul 2023 – Oct 2023",
      active: false,
      bullets: [
        "Completed intensive enterprise training in advanced SQL, Snowflake Cloud Data Warehousing, and dimensional star-schema modeling.",
        "Built Snowflake ETL workflows and automated CSV/file-to-warehouse ingestion pipelines using Python scripts.",
        "Partnered with senior data engineers on SQL query tuning, code refactoring, and pipeline quality assurance."
      ]
    }
  ],

  // --------------------------------------------------------------------------
  // 6. EDUCATION
  // --------------------------------------------------------------------------
  education: [
    {
      badge: "Current Postgraduate Study • New Zealand",
      period: "Jul 2026 – Present",
      degree: "Master of Applied Technologies",
      major: "Computing – Data Analytics",
      institution: "Unitec Institute of Technology",
      location: "Auckland, New Zealand",
      description:
        "Postgraduate specialization in Advanced Data Analytics, Machine Learning, Big Data Engineering, Cloud Warehousing, Predictive Modeling, and Business Intelligence.",
      highlighted: true
    },
    {
      badge: "Bachelor's Degree (4-Year Honours)",
      period: "Oct 2018 – Dec 2023",
      degree: "Bachelor of Science in Computer Science and Information Technology (B.Sc. CSIT)",
      major: "Computer Science, Databases & Software Engineering",
      institution: "Samriddhi College (Tribhuvan University)",
      location: "Bhaktapur, Nepal",
      description:
        "Core coursework in Database Management Systems (DBMS), Data Warehousing & Data Mining, Data Structures & Algorithms, Statistical Computing, Artificial Intelligence, and Software Engineering.",
      highlighted: false
    },
    {
      badge: "High School Diploma",
      period: "Jun 2016 – Jul 2018",
      degree: "High School (+2 Science & Computing)",
      major: "Mathematics, Physics & Computer Science",
      institution: "Siddhartha College",
      location: "Banepa, Nepal",
      description: "Strong quantitative foundation in calculus, linear algebra, statistics, and computer fundamentals.",
      highlighted: false
    }
  ],

  // --------------------------------------------------------------------------
  // 7. AUTHENTIC PUBLIC GITHUB PROJECTS (LIVE SYNCED FROM GITHUB)
  // - Automatically fetches ONLY public repositories from github.com/bhsuman
  // - Never shows private or deleted repositories
  // - Excludes the portfolio website repository itself ("suman-portfolio")
  // --------------------------------------------------------------------------
  excludedRepos: ["suman-portfolio", "bhsuman"],

  githubRepoOverrides: {
    "big-data-warehousing-pipeline": {
      displayName: "Cloud Data Warehousing & BI Pipeline",
      category: "Data Engineering & BI",
      description:
        "End-to-end cloud data warehousing and Business Intelligence pipeline implementing Medallion Architecture (Bronze/Silver/Gold) and Kimball dimensional star-schema modeling using Databricks, PySpark, Delta Lake, SQL, and Power BI.",
      tags: ["Databricks", "PySpark", "Delta Lake", "Power BI", "SQL"],
      featured: true
    },
    "Music": {
      displayName: "Music Genre Classification ML Portal",
      category: "Data Science & ML",
      description:
        "Machine learning web application that extracts acoustic and spectrogram features from audio files and classifies music tracks into genres using Python, Scikit-Learn, Django, and Matplotlib on the GTZAN dataset.",
      tags: ["Python", "Machine Learning", "Django", "Matplotlib", "GTZAN"],
      featured: true
    },
    "Data-Analysis-Dewali": {
      displayName: "Retail Festive Sales & Customer Analytics",
      category: "Data Analytics & EDA",
      description:
        "In-depth exploratory data analysis inspecting customer demographics, regional segments, product categories, and order values to identify high-revenue retail purchasing patterns.",
      tags: ["Python", "Pandas", "Seaborn", "EDA", "Jupyter"],
      featured: true
    }
  },

  // --------------------------------------------------------------------------
  // 8. AI ASSISTANT QUICK PROMPTS & EXTRA NOTES
  // --------------------------------------------------------------------------
  assistant: {
    welcomeMessage:
      "Kia Ora! I am Suman Bhandari's Portfolio Assistant. Ask me about his Data Engineering, Data Analytics & Data Science skills, his Master's at Unitec Auckland, his 2+ years of work experience, or his GitHub projects.",
    quickPrompts: [
      { label: "Data Engineer & Analyst Skills", question: "What are Suman's skills for Data Engineer, Data Analyst, and Data Scientist roles?" },
      { label: "Snowflake, Databricks & BI", question: "Tell me about his Snowflake, Databricks, SQL, and Power BI experience" },
      { label: "Work Experience & Unitec Study", question: "What is Suman's work experience and current study at Unitec?" },
      { label: "Student Status & Contact", question: "What is his current student work status and how can I contact him?" }
    ],
    extraNotesForAI:
      "Suman Bhandari is based in Henderson, Auckland, New Zealand, pursuing his Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology. He is a Student • Open to Work for Data Analyst, Data Engineer, Business Intelligence, and Data Scientist roles (internships, part-time, and graduate opportunities)."
  }
};
