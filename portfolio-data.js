/**
 * ============================================================================
 * SUMAN BHANDARI — MASTER PORTFOLIO CONTENT FILE (portfolio-data.js)
 * ============================================================================
 * Single source of truth for both the portfolio website and Suman AI.
 * Grounded strictly in verified academic, commercial, and GitHub project records.
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
    subheadline: "Data Engineering & Analytics",
    statusBadge: "Student • Open to Work",
    heroBadge: "Master's Student at Unitec (Auckland) • Open to Work",
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
      "Master of Applied Technologies (Computing – Data Analytics) student at Unitec Institute of Technology, Auckland, with over 2 years of commercial experience across data engineering consultancy, cloud data warehousing, and banking ICT operations. I build reliable ETL/ELT pipelines, dimensional data warehouses (Databricks, Delta Lake, Snowflake, SQL), predictive machine learning models in Python, and executive BI dashboards in Power BI and Tableau."
  },

  // --------------------------------------------------------------------------
  // 2. TOP SUMMARY CARDS (4 Highlight Boxes under the Hero Section)
  // --------------------------------------------------------------------------
  highlights: [
    {
      value: "2+ Years",
      title: "Commercial Experience",
      subtitle: "Data Engineering, Analytics & Banking ICT"
    },
    {
      value: "4 Repos",
      title: "Verified Public Projects",
      subtitle: "Lakehouse ETL, Property ML, Audio ML & EDA",
      isGitHubCounter: true
    },
    {
      value: "Master's",
      title: "Applied Tech (Data Analytics)",
      subtitle: "Unitec Institute of Technology, Auckland"
    },
    {
      value: "Auckland",
      title: "Student • Open to Work",
      subtitle: "Data Engineer, Analyst & Scientist Roles"
    }
  ],

  // --------------------------------------------------------------------------
  // 3. ABOUT SECTION & QUICK DETAILS TABLE
  // --------------------------------------------------------------------------
  about: {
    heading: "Bridging Data Engineering, Business Analytics & Machine Learning",
    paragraphs: [
      "Kia ora! I am Suman Bhandari, based in Henderson, Auckland, New Zealand, where I am completing my Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology. Prior to relocating to Auckland, I gained over two years of commercial experience across banking ICT operations at Laxmi Sunrise Bank, data engineering and analytics delivery at Development Catalyst Consultancy, and Snowflake data warehousing at LIS Nepal.",
      "My work focuses on turning raw, messy operational data into trusted analytical assets: designing Medallion (Bronze/Silver/Gold) lakehouse pipelines and Kimball Star Schemas in Databricks, PySpark, Delta Lake, and Snowflake; developing supervised machine learning and statistical models in Python and R; and delivering clear, decision-oriented dashboards in Power BI and Tableau."
    ],
    calloutTitle: "Availability: Master's Student • Open to Work (NZ & Australia)",
    calloutText:
      "Available for data engineering, data analytics, business intelligence, and data science internships, part-time roles during semester, and graduate/full-time opportunities.",
    quickDetails: [
      { label: "Full Name", value: "Suman Bhandari" },
      { label: "Location", value: "Henderson, Auckland, NZ" },
      { label: "Postgraduate Study", value: "Master of Applied Technologies (Data Analytics) — Unitec" },
      { label: "Undergraduate Degree", value: "B.Sc. CSIT (4-Year Honours) — Tribhuvan University" },
      { label: "Work Eligibility", value: "Student • Open to Work", highlight: true },
      { label: "Target Roles", value: "Data Engineer • Data Analyst • Data Scientist" },
      { label: "Phone / SMS", value: "+64 22 051 2513", href: "tel:+64220512513" },
      { label: "Email", value: "bhsuman11@gmail.com", href: "mailto:bhsuman11@gmail.com" },
      { label: "LinkedIn", value: "in/suman-bhandari-ab4394279 ↗", href: "https://www.linkedin.com/in/suman-bhandari-ab4394279/" },
      { label: "GitHub", value: "github.com/bhsuman ↗", href: "https://github.com/bhsuman" }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. TECHNICAL SKILLS ORGANISED INTO 5 MEANINGFUL CATEGORIES
  // Categories:
  // - "engineering-cloud" : Data Engineering & Cloud
  // - "programming"       : Programming & Querying
  // - "analytics"         : Analytics & Visualisation
  // - "ml-ai"             : Machine Learning & AI
  // - "databases"         : Databases & Data Platforms
  // Distinguishes Commercial Experience vs. Completed Projects vs. Postgraduate exposure.
  // --------------------------------------------------------------------------
  skillCategories: [
    { id: "all", label: "All Skills (15)" },
    { id: "engineering-cloud", label: "Data Engineering & Cloud" },
    { id: "programming", label: "Programming & Querying" },
    { id: "analytics", label: "Analytics & Visualisation" },
    { id: "ml-ai", label: "Machine Learning & AI" },
    { id: "databases", label: "Databases & Data Platforms" }
  ],

  skills: [
    // 1. Data Engineering & Cloud
    {
      code: "DBX",
      name: "Databricks, PySpark & Delta Lake",
      category: "engineering-cloud",
      categoryLabel: "Data Engineering & Cloud",
      evidenceBadge: "Completed Project & Postgraduate",
      description: "Medallion Lakehouse Architecture (Bronze / Silver / Gold), distributed PySpark transformations, schema enforcement, and Delta tables."
    },
    {
      code: "ETL",
      name: "ETL / ELT Pipeline Design & Data Quality",
      category: "engineering-cloud",
      categoryLabel: "Data Engineering & Cloud",
      evidenceBadge: "Commercial Experience (2+ yrs)",
      description: "Automated data ingestion, deduplication, null/type validation, surrogate key generation, and modular SQL/Python transformation workflows."
    },
    {
      code: "DBT",
      name: "dbt & Apache Airflow Orchestration",
      category: "engineering-cloud",
      categoryLabel: "Data Engineering & Cloud",
      evidenceBadge: "Project & Postgraduate Exposure",
      description: "Modular SQL transformation models in dbt, DAG scheduling, pipeline dependency management, data lineage, and schema testing."
    },
    {
      code: "ADF",
      name: "Azure Data Services, BigQuery & AWS",
      category: "engineering-cloud",
      categoryLabel: "Data Engineering & Cloud",
      evidenceBadge: "Postgraduate & Cloud Practice",
      description: "Azure Data Factory (ADF), Microsoft Fabric Lakehouse, Google Cloud BigQuery, and AWS S3/Glue fundamentals for cloud analytics."
    },

    // 2. Programming & Querying
    {
      code: "SQL",
      name: "Advanced SQL & Query Optimization",
      category: "programming",
      categoryLabel: "Programming & Querying",
      evidenceBadge: "Commercial Experience (2+ yrs)",
      description: "Complex CTEs, window functions, multi-table joins, analytical aggregations, indexing strategies, and query tuning across T-SQL, PostgreSQL, and Snowflake."
    },
    {
      code: "PY",
      name: "Python for Data Engineering & Analytics",
      category: "programming",
      categoryLabel: "Programming & Querying",
      evidenceBadge: "Commercial & 4 Public Projects",
      description: "Pandas, NumPy, SciPy, PySpark, REST API extraction, automated data wrangling scripts, and reproducible Jupyter Notebook workflows."
    },
    {
      code: "STAT",
      name: "R Programming & Statistical Computing",
      category: "programming",
      categoryLabel: "Programming & Querying",
      evidenceBadge: "Postgraduate & Academic",
      description: "R (tidyverse, ggplot2), hypothesis testing, probability distributions, regression diagnostics, and exploratory statistical analysis."
    },
    {
      code: "GIT",
      name: "Git, GitHub Actions & Django Delivery",
      category: "programming",
      categoryLabel: "Programming & Querying",
      evidenceBadge: "Commercial & Completed Projects",
      description: "Version-controlled data pipelines, GitHub Actions static/CI workflows, and Python Django web deployment for ML model inference."
    },

    // 3. Analytics & Visualisation
    {
      code: "PBI",
      name: "Microsoft Power BI & DAX",
      category: "analytics",
      categoryLabel: "Analytics & Visualisation",
      evidenceBadge: "Commercial & Completed Projects",
      description: "Interactive executive dashboards, DAX measures, Power Query (M) transformations, star-schema data modeling, and credit/property KPI reporting."
    },
    {
      code: "TAB",
      name: "Tableau, Seaborn & Matplotlib",
      category: "analytics",
      categoryLabel: "Analytics & Visualisation",
      evidenceBadge: "Commercial & Completed Projects",
      description: "Self-service visual analytics in Tableau and programmatic statistical plotting in Python (Seaborn, Matplotlib) for demographic and trend discovery."
    },
    {
      code: "XLS",
      name: "Advanced Excel & Business Analysis",
      category: "analytics",
      categoryLabel: "Analytics & Visualisation",
      evidenceBadge: "Commercial Experience (2+ yrs)",
      description: "Pivot Tables, XLOOKUP, Power Pivot, stakeholder requirements gathering, ad-hoc operational reporting, and KPI definition."
    },

    // 4. Machine Learning & AI
    {
      code: "ML",
      name: "Supervised & Unsupervised Machine Learning",
      category: "ml-ai",
      categoryLabel: "Machine Learning & AI",
      evidenceBadge: "Completed Projects & Postgraduate",
      description: "Scikit-Learn regression and multi-class classification models, feature engineering, outlier treatment, cross-validation, and model evaluation."
    },
    {
      code: "AUD",
      name: "Audio Signal & Feature Engineering",
      category: "ml-ai",
      categoryLabel: "Machine Learning & AI",
      evidenceBadge: "Completed Project (GTZAN)",
      description: "Acoustic feature extraction (MFCCs, spectral centroid, spectral rolloff, chroma frequencies, spectrograms) and tabular feature scaling."
    },

    // 5. Databases & Data Platforms
    {
      code: "SF",
      name: "Snowflake Cloud Data Warehouse",
      category: "databases",
      categoryLabel: "Databases & Data Platforms",
      evidenceBadge: "Commercial Experience (LIS Nepal)",
      description: "Snowflake cloud warehousing, SnowSQL, staging and file-to-warehouse ingestion pipelines, role-based access control, and dimensional modeling."
    },
    {
      code: "RDB",
      name: "Relational Databases & Kimball Modeling",
      category: "databases",
      categoryLabel: "Databases & Data Platforms",
      evidenceBadge: "Commercial Experience (2+ yrs)",
      description: "Kimball Star Schema design (conformed Fact and Dimension tables), MS SQL Server, PostgreSQL, MySQL, and banking database operations."
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
      typeBadge: "Banking ICT Operations",
      active: false,
      bullets: [
        "Supported daily core banking IT operations, branch system availability, and technical incident resolution across commercial banking operations.",
        "Diagnosed and resolved user technical escalations, core banking application issues, and relational database connectivity tickets.",
        "Operated within strict enterprise financial data governance, access control, and security compliance standards."
      ]
    },
    {
      role: "Associate Data Engineer",
      company: "Development Catalyst Consultancy Pvt. Ltd",
      location: "Kathmandu, Nepal",
      period: "Jan 2024 – Jan 2026",
      typeBadge: "2 Years • Data Engineering & Analytics",
      active: false,
      bullets: [
        "Designed and maintained automated Python (Pandas, NumPy) and SQL ETL pipelines to ingest, clean, and validate large-scale client datasets.",
        "Authored complex relational SQL queries (CTEs, window functions, multi-table joins) to build structured reporting data marts.",
        "Implemented schema validation and data quality checks that reduced manual data preparation effort for downstream analytics.",
        "Partnered with business analysts and stakeholders to translate reporting requirements into curated datasets and BI dashboards."
      ]
    },
    {
      role: "Data Engineer Trainee",
      company: "LIS Nepal Pvt. Ltd",
      location: "Lalitpur, Nepal",
      period: "Jul 2023 – Oct 2023",
      typeBadge: "Cloud Data Warehousing",
      active: false,
      bullets: [
        "Completed intensive enterprise training in advanced SQL, Snowflake Cloud Data Warehousing, and Kimball dimensional star-schema modeling.",
        "Built automated Python and SnowSQL ingestion scripts to load and transform structured CSV/file feeds into Snowflake staging and core tables.",
        "Collaborated with senior data engineers on SQL query optimization, code reviews, and pipeline quality assurance."
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
      degree: "Bachelor of Science in Computer Science & Information Technology (B.Sc. CSIT)",
      major: "Computer Science, Databases & Software Engineering",
      institution: "Samriddhi College (Tribhuvan University)",
      location: "Bhaktapur, Nepal",
      description:
        "Core coursework in Database Management Systems (DBMS), Data Warehousing & Data Mining, Data Structures & Algorithms, Statistical Computing, Artificial Intelligence, and Software Engineering.",
      highlighted: false
    },
    {
      badge: "High School (+2 Science)",
      period: "Jun 2016 – Jul 2018",
      degree: "Higher Secondary Certificate (+2 Science & Computing)",
      major: "Mathematics, Physics & Computer Science",
      institution: "Siddhartha College",
      location: "Banepa, Nepal",
      description:
        "Quantitative foundation in calculus, linear algebra, probability, statistics, and programming fundamentals.",
      highlighted: false
    }
  ],

  // --------------------------------------------------------------------------
  // 7. AUTHENTIC PUBLIC GITHUB PROJECTS (LIVE SYNCED FROM GITHUB)
  // --------------------------------------------------------------------------
  excludedRepos: ["suman-portfolio", "bhsuman"],

  githubRepoOverrides: {
    "big-data-warehousing-pipeline": {
      displayName: "Cloud Data Warehousing & Credit Risk Analytics Pipeline",
      category: "Data Engineering & Lakehouse BI",
      status: "Completed Project",
      problemStatement:
        "Raw LendingClub loan records contain inconsistent data types, missing borrower attributes, and denormalized structures that prevent reliable credit risk and delinquency reporting.",
      implementedSummary: [
        "Built a 3-tier Medallion Lakehouse pipeline (Bronze, Silver, Gold) in Databricks using PySpark and Delta Lake.",
        "Implemented Silver-layer standardization, deduplication, and data quality rules across loan statuses, interest rates, and DTI ratios.",
        "Modeled a Gold-layer Kimball Star Schema (FactLoan joined to borrower, grade, purpose, and time dimensions) powering Power BI credit risk views."
      ],
      pipelineStages: ["LendingClub Raw Data", "Bronze (Delta Lake)", "Silver (PySpark QA)", "Gold (Kimball Star Schema)", "Power BI Credit Risk"],
      description:
        "End-to-end Lakehouse data warehousing and credit risk analytics pipeline processing LendingClub loan data using Databricks, PySpark, Delta Lake (Bronze/Silver/Gold Medallion architecture), Kimball dimensional modelling, and Power BI.",
      objective:
        "Design a scalable cloud data warehouse capable of ingesting raw LendingClub financial loan records, enforcing strict data quality rules, and serving conformed dimensional models for credit risk and loan portfolio analysis.",
      architecture:
        "Implemented a 3-tier Medallion Architecture in Databricks (Delta Lake): Bronze layer for raw LendingClub ingestion, Silver layer for PySpark standardization, deduplication, and null/type validation, and Gold layer structured as a Kimball Star Schema (FactLoan performance table joined to borrower, grade, purpose, and time dimensions) connected to Power BI.",
      highlights: [
        "Processed LendingClub loan datasets in Databricks using distributed PySpark and Delta Lake storage.",
        "Enforced Silver-layer data quality checks including schema validation, loan status normalization, debt-to-income cleaning, and duplicate removal.",
        "Designed a Gold-layer Kimball Star Schema optimized for analytical queries on default rates, interest spreads, loan grades, and borrower risk segments.",
        "Delivered interactive BI reporting views to evaluate credit risk exposure, delinquency drivers, and portfolio performance."
      ],
      challenges:
        "Handling inconsistent raw financial attributes (mixed string/numeric formats for term lengths, employment duration, and interest rates) and high-cardinality borrower fields required modular PySpark transformation rules and surrogate key generation before loading the Gold dimensional tables.",
      limitations:
        "The pipeline operates on historical batch LendingClub datasets rather than a live streaming loan origination feed; exact cluster benchmark timings and live Power BI tenant links are not publicly hosted due to licensing.",
      followUpQuestions: [
        "Give me a technical deep dive into the Medallion and Kimball schema in the data warehousing project.",
        "How were LendingClub data quality issues and challenges handled?",
        "What technologies has Suman used in his projects?"
      ],
      tags: ["Databricks", "PySpark", "Delta Lake", "SQL", "Kimball Star Schema", "Power BI"],
      featured: true
    },

    "Residential-Property-Price-Prediction-BI": {
      displayName: "Residential Property Price Prediction & BI",
      category: "Machine Learning & Valuation BI",
      status: "Completed Project",
      problemStatement:
        "Property buyers and analysts need both accurate price estimates from structural/location attributes and transparent visual analytics explaining which factors drive regional housing valuations.",
      implementedSummary: [
        "Engineered property features, treated extreme price outliers, and corrected skewed distributions in Python (Pandas, NumPy).",
        "Trained and evaluated supervised regression models in Scikit-Learn to predict residential housing prices.",
        "Created interactive Power BI valuation dashboards comparing predicted vs. actual prices, regional tiers, and feature importance."
      ],
      pipelineStages: ["Raw Housing Records", "Feature Engineering", "Scikit-Learn Regression", "Valuation Outputs", "Power BI Dashboard"],
      description:
        "End-to-end residential property valuation and Business Intelligence solution combining Python machine learning regression models with interactive BI analytics to predict housing prices and uncover key market value drivers.",
      objective:
        "Predict residential property values accurately from structural and locational attributes while providing business stakeholders with an interactive BI dashboard to explore regional price trends.",
      architecture:
        "Two-stage analytics workflow: (1) Python data preparation and Scikit-Learn supervised regression pipeline for feature engineering, outlier treatment, and model evaluation; (2) Curated analytical dataset exported for interactive Business Intelligence dashboarding and price-driver visualization.",
      highlights: [
        "Engineered data preprocessing, skewness correction, outlier handling, and feature engineering across property attributes (location, floor area, bedrooms, land size, and market indicators).",
        "Trained and evaluated supervised regression models in Python (Scikit-Learn) to estimate residential property prices.",
        "Built interactive Business Intelligence views to inspect regional price distributions, price-per-square-meter trends, and feature importance for buyers and analysts."
      ],
      challenges:
        "Addressing right-skewed property price distributions, multicollinearity among size/room features, and extreme luxury property outliers without distorting baseline neighbourhood valuations.",
      limitations:
        "Trained on static historical housing records without real-time macroeconomic interest-rate feeds or automated live MLS scraping.",
      followUpQuestions: [
        "What machine learning methods and features were used in the Residential Property project?",
        "What challenges and limitations exist in the Residential Property project?",
        "Walk me through the end-to-end data warehousing project."
      ],
      tags: ["Python", "Scikit-Learn", "Regression Modeling", "Feature Engineering", "Power BI"],
      featured: true
    },

    "Music": {
      displayName: "Music Genre Classification ML Portal",
      category: "Machine Learning & Web Deployment",
      status: "Completed Project",
      problemStatement:
        "Classifying raw audio files by musical genre requires transforming unstructured acoustic waveforms into discriminative numerical features and serving predictions through an accessible interface.",
      implementedSummary: [
        "Extracted time- and frequency-domain audio features (MFCCs, spectral centroid, chroma, rolloff, spectrograms) from the 10-genre GTZAN dataset.",
        "Trained and compared supervised multi-class classification models in Python (Scikit-Learn) on extracted acoustic feature vectors.",
        "Integrated the serialized classifier into a Python Django web application allowing users to upload audio tracks and view genre predictions."
      ],
      pipelineStages: ["GTZAN Audio Files", "MFCC & Spectrograms", "Scikit-Learn Classifier", "Django Web Portal", "Genre Prediction"],
      description:
        "Machine learning web application that extracts acoustic and spectrogram features from audio files and classifies music tracks into genres using Python, Scikit-Learn, Django, and Matplotlib on the GTZAN dataset.",
      objective:
        "Automate multi-class music genre recognition from raw audio signals and expose the trained classifier through an accessible web interface.",
      architecture:
        "Audio signal processing pipeline extracting frequency and time-domain features (MFCCs, spectral centroid, spectral rolloff, chroma frequencies, zero-crossing rate) from the GTZAN collection, paired with Scikit-Learn classification models serialized and served via a Python Django web application.",
      highlights: [
        "Processed raw audio signals from the GTZAN dataset (10 genres) to extract numerical acoustic features and mel-spectrogram representations.",
        "Trained and compared supervised multi-class classification algorithms in Python (Scikit-Learn) on extracted audio feature vectors.",
        "Integrated the inference workflow into a Django web portal where users can upload audio tracks and view predicted genres alongside visual plots."
      ],
      challenges:
        "Translating raw waveform audio into compact, discriminative tabular features and managing overlapping acoustic characteristics between closely related genres (such as Rock, Country, and Blues).",
      limitations:
        "Trained on the standard GTZAN benchmark dataset (1,000 tracks across 10 genres), so generalization to modern sub-genres or full-length multi-genre tracks is bounded by the training corpus. Formal confusion-matrix test benchmarks are not separately published in the repository README.",
      followUpQuestions: [
        "How does the audio feature extraction and Django inference work in the Music project?",
        "What are the limitations of the Music Genre Classification project?",
        "What technologies has Suman used in his projects?"
      ],
      tags: ["Python", "Scikit-Learn", "Audio Feature Extraction", "Django", "Matplotlib", "GTZAN"],
      featured: true
    },

    "Data-Analysis-Dewali": {
      displayName: "Retail Festive Sales & Customer Analytics",
      category: "Exploratory Data Analysis (EDA)",
      status: "Completed Project",
      problemStatement:
        "Retailers running seasonal promotional campaigns need clean transaction data and demographic segmentation to identify which buyer personas, states, and product categories drive peak revenue.",
      implementedSummary: [
        "Cleaned raw retail sales logs in Python (Pandas, NumPy), resolving null columns, missing values, and numeric data-type conversions.",
        "Performed multi-dimensional exploratory data analysis across customer age groups, gender, marital status, occupation, geographic state, and product category.",
        "Built Seaborn and Matplotlib statistical visualizations pinpointing top-spending buyer segments and high-performing regional markets."
      ],
      pipelineStages: ["Raw Sales Logs", "Pandas Data Cleaning", "Demographic Aggregation", "Seaborn Visuals", "Merchandising Insights"],
      description:
        "In-depth exploratory data analysis inspecting customer demographics, regional segments, product categories, and order values to identify high-revenue retail purchasing patterns.",
      objective:
        "Identify top-spending customer segments, regional demand centres, and high-performing product categories during peak festive retail periods to guide inventory and marketing decisions.",
      architecture:
        "Jupyter-based Python exploratory data analysis (EDA) pipeline using Pandas and NumPy for data cleaning/wrangling and Seaborn/Matplotlib for multi-dimensional statistical aggregation and visualization.",
      highlights: [
        "Cleaned and standardized raw retail transaction records in Python (Pandas, NumPy), resolving missing values, null columns, and float-to-integer type casting.",
        "Conducted multi-dimensional exploratory analysis across customer age groups, gender, marital status, occupations, states, and product categories.",
        "Produced clear statistical visualizations in Seaborn and Matplotlib highlighting key revenue drivers and target buyer personas."
      ],
      challenges:
        "Resolving incomplete demographic records and skewed order-amount distributions across diverse regional states and product SKUs.",
      limitations:
        "Focused on descriptive and diagnostic exploratory analysis (EDA) of historical campaign sales rather than predictive demand forecasting.",
      followUpQuestions: [
        "What business insights and data cleaning steps were performed in the Retail Sales project?",
        "How do Suman's skills map to real project evidence?",
        "Summarise Suman's professional experience."
      ],
      tags: ["Python", "Pandas", "NumPy", "Seaborn", "Matplotlib", "Jupyter EDA"],
      featured: true
    }
  },

  // --------------------------------------------------------------------------
  // 8. SUMAN AI ASSISTANT CONFIGURATION
  // --------------------------------------------------------------------------
  assistant: {
    name: "Suman AI",
    subtitle: "Portfolio & Technical Assistant",
    welcomeParagraph1:
      "Kia ora! I'm Suman AI, your guide to Suman Bhandari's technical portfolio. Explore his data engineering, analytics, and machine learning projects, learn about his technical skills, and discover how he approaches real-world problems.",
    welcomeParagraph2:
      "What would you like to explore today?",
    categoryChips: [
      {
        label: "Project Portfolio",
        description: "End-to-end overview of verified projects",
        question: "Show me an overview of Suman's project portfolio."
      },
      {
        label: "Data Engineering & Cloud",
        description: "Databricks, Delta Lake, Snowflake & ETL",
        question: "Walk me through the end-to-end data warehousing project."
      },
      {
        label: "Machine Learning & Analytics",
        description: "Predictive models, GTZAN audio ML & BI",
        question: "What Machine Learning and Data Analytics projects has Suman built?"
      },
      {
        label: "Experience & Technical Skills",
        description: "2+ years commercial roles & stack evidence",
        question: "Summarise Suman's professional experience."
      }
    ],
    exampleQuestions: [
      "Walk me through the end-to-end data warehousing project.",
      "What technologies has Suman used in his projects?",
      "Explain the Music Genre Classification project.",
      "Summarise Suman's professional experience."
    ],
    quickPrompts: [
      { label: "Project Portfolio", question: "Show me an overview of Suman's project portfolio." },
      { label: "Data Engineering & Cloud", question: "Walk me through the end-to-end data warehousing project." },
      { label: "Machine Learning & Analytics", question: "Explain the Music Genre Classification project." },
      { label: "Experience & Technical Skills", question: "Summarise Suman's professional experience." }
    ],
    extraNotesForAI:
      "Suman Bhandari is based in Henderson, Auckland, New Zealand, pursuing his Master of Applied Technologies (Computing – Data Analytics) at Unitec Institute of Technology. He is a Student • Open to Work for Data Analyst, Data Engineer, Business Intelligence, and Data Scientist roles (internships, part-time, and graduate opportunities)."
  }
};
