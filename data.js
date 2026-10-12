// ─────────────────────────────────────────────────────────────
// THE SINGLE SOURCE OF TRUTH
// Every answer the MCP server gives is built from this file only.
// If it is not written here, the agent cannot claim it.
// Only add things that are true and that you could defend in an interview.
// ─────────────────────────────────────────────────────────────

const GH = "https://github.com/hassanmehmood56/";

export const profile = {
  name: "Hassan Mehmood",
  headline: "Machine Learning & Retrieval Systems",
  summary:
    "Computer Science student who builds systems that answer from the documents they were given, cite their evidence, " +
    "and refuse instead of guessing. Also works on churn prediction, anomaly detection and interactive web apps.",
  education: {
    institution: "Institute of Management Sciences (IMSciences), Peshawar",
    degree: "BS Computer Science",
    status: "In progress (final year)",
  },
  from: "Mardan, Pakistan",
  current: [
    "Final-year project: UniVoice, a local grounded question-answering assistant for IMSciences",
    "Machine Learning Intern at SOFIT Consultancy (summer internship, 2026)",
  ],
  principles: [
    "Refuse before you guess: \"not found in the documents\" is a correct answer, a confident wrong one is not.",
    "Enforce rules in code, not in prompts: a small model follows a long rule list unreliably, a program checks every time.",
    "Measure honestly: a string match is a proxy, not accuracy; leakage gets tested, not promised.",
    "Make the pattern visible: if a person can't see why the system said it, the work isn't finished.",
  ],
  links: {
    github: "https://github.com/hassanmehmood56",
    linkedin: "https://www.linkedin.com/in/hassan-mehmood-4b3a20294",
  },
};

export const experience = [
  {
    role: "Machine Learning Intern",
    org: "SOFIT Consultancy — Innovating Ideas · A TNG Company",
    period: "Summer 2026",
    type: "internship",
  },
];

export const milestones = [
  { when: "2026", what: "Started UniVoice, final-year project (in progress)" },
  { when: "Aug 2026", what: "Published the Pakistani Tax Law RAG and the four-domain churn predictor on GitHub" },
];

export const projects = [
  {
    id: "univoice",
    name: "UniVoice",
    status: "in-progress",
    kind: "Final-year project · grounded question answering",
    summary:
      "A local assistant that answers questions about IMSciences from official public sources, in English, Urdu, Roman Urdu and mixed speech. " +
      "The model never writes to the reader directly: it returns claims with word-for-word quotes, and programs check each one before anything is shown.",
    stack: ["Python", "RAG", "Ollama", "Gemma 3", "BM25", "pytest"],
    stats: { automated_tests: 198, question_styles: 4, cloud_calls: 0 },
    highlights: [
      "Search without a model: BM25 keyword search weighted by source type and age, so old news cannot outrank a current policy. Weights demote; nothing is removed.",
      "Claims, not prose: the model returns one fact per claim, the quoted sentence copied from a passage, and that passage's label.",
      "Programs check every claim: the quote must appear in the cited passage word for word, every number in the claim must be in the quote, and a prohibition or requirement must not be reversed. A failing claim is dropped without taking passing claims down.",
      "If no claim survives, the caller gets a fixed 'no reliable information' reply, with no citations or details of the failed check.",
    ],
    limitations: [
      "The final verifier is the same small model, so it is a second opinion, not proof.",
      "Ingestion, keyword retrieval and the claim-checking answer engine are built and unit-tested; speech and telephony are planned as later layers.",
    ],
    link: null,
  },
  {
    id: "taxrag",
    name: "Pakistani Tax Law RAG",
    status: "published",
    kind: "RAG · fully offline",
    summary:
      "Question answering over Pakistani federal tax legislation. It answers only from the documents it was given, cites the one it used, and says 'Not found in the documents' rather than guessing.",
    stack: ["Python", "RAG", "Ollama", "ChromaDB", "Streamlit", "pypdf"],
    stats: { fbr_documents: 15, chunks_approx: 9400, tax_domains: 4 },
    highlights: [
      "Metadata filtering, not just similarity: every chunk has a hand-written status label, so a draft or repealed SRO is not answered from.",
      "Distance is not a quality signal here: a question with no answer anywhere in the corpus scored 0.201, better than most questions that do have answers.",
      "Neighbour expansion: each hit also pulls the chunks on either side, because an 800-character cut splits provisions mid-sentence.",
      "Output rules enforced in code: a refusal that arrives with a citation is contradictory, so the citation is stripped in code instead of asked for in the prompt.",
    ],
    limitations: [
      "About 90 seconds per answer on a laptop CPU, and answers can be incomplete.",
      "An experimental system built for learning, not tax advice.",
    ],
    link: GH + "pakistan-tax-rag",
  },
  {
    id: "churn",
    name: "Churn, Across Four Domains",
    status: "published",
    kind: "Machine learning · explainability",
    summary:
      "One pipeline reads a customer file, works out what kind of data it holds, trains a model, and ranks every customer by likelihood to leave, with a reason for each. When the data cannot support an answer, it says so.",
    stack: ["Python", "XGBoost", "Pandas", "Streamlit"],
    stats: { auc_retail: 0.801, auc_streaming: 0.893, auc_banking: 0.862 },
    highlights: [
      "Three very different data shapes: retail receipts with no outcome column (churn inferred from going quiet), streaming subscribers (simulated on real MovieLens viewing history) and bank customers (real, observed). The fourth domain is any file you upload.",
      "Columns that already know the answer are removed: any single column separating leavers from stayers above 0.97 is dropped and reported.",
      "Leakage is tested, not promised: features are rebuilt from a log with everything after the cut-off deleted and must match exactly, otherwise the run stops.",
      "Thin data is refused: under 60 customers, or under 15 in the smaller group. An AUC above 0.995 is reported as suspicious, never as excellent.",
      "Reasons without extra dependencies: per-customer contributions are read straight from the XGBoost booster and written out as sentences.",
    ],
    limitations: ["The streaming domain is simulated on real MovieLens viewing history, not observed churn."],
    link: GH + "churn-predictor",
  },
  {
    id: "logs",
    name: "Log Anomaly & Clustering Assistant",
    status: "completed",
    kind: "Machine learning · anomaly detection",
    summary:
      "Parses raw HDFS server logs, engineers features from log structure and timing, and flags anomalous activity at the block level, clustering similar log patterns to make large-scale system behaviour legible.",
    stack: ["Python", "Pandas", "Regex", "Anomaly detection", "Clustering"],
    stats: { log_lines_parsed: "11.17M", blocks_tracked: 575061, anomaly_rate: "2.93%" },
    highlights: [
      "Raw HDFS log lines parsed with regular expressions into structured events.",
      "Features engineered from log structure and timing for each of the 575,061 blocks.",
      "Anomalous blocks flagged (2.93% of the total) and similar log patterns clustered.",
    ],
    limitations: [],
    link: null,
  },
  {
    id: "seizure",
    name: "Seizure Prediction: Preprocessing & Regularisation",
    status: "published",
    kind: "Machine learning · research",
    summary:
      "An IEEE-style study of how preprocessing order, regularisation (L1 / L2 / Elastic Net) and class-imbalance handling affect generalisation in seizure-prediction models, across three datasets with 5% to 20% seizure rate.",
    stack: ["Python", "Scikit-learn", "Logistic Regression", "EEG", "Jupyter"],
    stats: { datasets: 3, pr_auc_shift_from_ordering: "2-5%" },
    highlights: [
      "Preprocessing order shifted PR-AUC by 2-5% across pipelines.",
      "Elastic Net generalised most consistently across all three datasets.",
      "Class weighting was the most reliable of the imbalance-handling strategies compared.",
    ],
    limitations: [],
    link: GH + "seizure_prediction",
  },
  {
    id: "body",
    name: "Human Body Explorer",
    status: "completed",
    kind: "Web development · interactive (team project)",
    summary:
      "An interactive anatomy learning platform covering all 11 human body systems through hand-coded clickable SVG diagrams, with organ-level detail, system comparisons and a timed quiz mode with three difficulty levels.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "SVG"],
    stats: { body_systems: 11, quiz_difficulty_levels: 3 },
    highlights: [
      "Hassan led front-end development, interaction logic and animation.",
      "Co-developed with Muhammad Danyal Ali, who did the visual design and SVG illustration.",
      "Every diagram is hand-coded SVG, so each organ is its own clickable element with its own detail view.",
    ],
    limitations: [],
    link: null,
  },
  {
    id: "expense",
    name: "Expense Tracker",
    status: "published",
    kind: "Web development · full stack",
    summary:
      "A full-stack expense tracking app with session-based authentication, category and date filtering, and a dashboard visualising spending by category with total and monthly summaries.",
    stack: ["PHP", "MySQL", "JavaScript", "HTML/CSS", "Chart.js"],
    stats: {},
    highlights: [
      "Each user signs in and sees only their own records.",
      "Full create, edit and delete, with filtering by category and by date.",
    ],
    limitations: [],
    link: GH + "expense-tracker",
  },
  {
    id: "coursework",
    name: "Coursework projects",
    status: "coursework",
    kind: "University coursework",
    summary: "Smaller university projects: two PHP database systems and two HCI projects.",
    stack: ["PHP", "PostgreSQL", "MySQL", "Figma"],
    stats: {},
    highlights: [
      "Lost & Found Management System (PHP, PostgreSQL): report lost or found items, browse listings, manage claims.",
      "Library Management System (PHP, MySQL): books, members and borrowing records with availability and due dates.",
      "IMSciences Student Portal: HCI usability evaluation of the student portal.",
      "EasyPaisa UI Redesign: redesign prototype built in Figma.",
    ],
    limitations: ["Coursework scale, not production systems."],
    link: null,
  },
];

// strength: "built" (used in a working/finished project), "in-progress" (used in a project
// still underway), "coursework" (only used in coursework), "listed" (claimed, but no project
// evidence recorded yet — the fit check reports these as unproven rather than as matches).
// aliases: what the fit check looks for in a job description.
export const skills = [
  { name: "Python", category: "Languages", aliases: ["python"], strength: "built",
    evidence: [["taxrag", "RAG pipeline and Streamlit app"], ["churn", "Whole churn pipeline"], ["logs", "Log parsing and feature engineering"], ["seizure", "Modelling experiments"], ["univoice", "Answer engine and 198 tests"]] },
  { name: "RAG", category: "Retrieval & LLMs", aliases: ["rag", "retrieval augmented generation", "retrieval-augmented generation", "retrieval augmented", "semantic search", "grounded generation"], strength: "built",
    evidence: [["taxrag", "Cited, offline RAG over ~9,400 chunks of tax law, with metadata filtering and neighbour expansion"], ["univoice", "Grounded QA with claim checking (in progress)"]] },
  { name: "Ollama / local LLMs", category: "Retrieval & LLMs", aliases: ["ollama", "local llm", "local llms", "on-device llm", "self-hosted llm", "open-source llm", "open source llm", "gemma", "llama"], strength: "built",
    evidence: [["taxrag", "Fully offline generation through Ollama"], ["univoice", "Gemma 3 through Ollama, no cloud calls"]] },
  { name: "ChromaDB", category: "Retrieval & LLMs", aliases: ["chromadb", "chroma", "vector database", "vector databases", "vector db", "vector store"], strength: "built",
    evidence: [["taxrag", "Stores and queries ~9,400 chunks"]] },
  { name: "BM25 / keyword retrieval", category: "Retrieval & LLMs", aliases: ["bm25", "keyword search", "information retrieval", "lexical search"], strength: "in-progress",
    evidence: [["univoice", "Model-free BM25 retrieval weighted by source type and age"]] },
  { name: "Prompt design", category: "Retrieval & LLMs", aliases: ["prompt engineering", "prompt design", "prompting", "llm", "llms", "large language model", "large language models", "generative ai", "genai"], strength: "built",
    evidence: [["univoice", "Structured claim-and-quote output instead of free text"], ["taxrag", "Refusal behaviour, with rules enforced in code rather than in the prompt"]] },
  { name: "Streamlit", category: "Retrieval & LLMs", aliases: ["streamlit"], strength: "built",
    evidence: [["taxrag", "Search UI"], ["churn", "Interactive churn app"]] },
  { name: "Pandas", category: "Data & ML", aliases: ["pandas"], strength: "built",
    evidence: [["churn", "Customer feature building"], ["logs", "Processing 11.17M parsed log lines"]] },
  { name: "Scikit-learn", category: "Data & ML", aliases: ["scikit-learn", "sklearn", "scikit learn"], strength: "built",
    evidence: [["seizure", "Regularised logistic regression experiments across three datasets"]] },
  { name: "XGBoost", category: "Data & ML", aliases: ["xgboost", "gradient boosting", "gradient boosted trees"], strength: "built",
    evidence: [["churn", "Churn models, AUC 0.801 / 0.893 / 0.862, with per-customer reasons from the booster"]] },
  { name: "Machine learning", category: "Data & ML", aliases: ["machine learning", "ml", "predictive modeling", "predictive modelling", "classification", "supervised learning", "churn", "churn prediction", "model evaluation", "feature engineering"], strength: "built",
    evidence: [["churn", "End-to-end churn modelling with leakage tests and refusal on thin data"], ["seizure", "Study of preprocessing order, regularisation and class imbalance"], ["logs", "Block-level feature engineering"]] },
  { name: "Anomaly detection", category: "Data & ML", aliases: ["anomaly detection", "outlier detection", "log analysis"], strength: "built",
    evidence: [["logs", "Flagged 2.93% of 575,061 HDFS blocks as anomalous"]] },
  { name: "Clustering", category: "Data & ML", aliases: ["clustering", "unsupervised learning", "k-means", "kmeans"], strength: "built",
    evidence: [["logs", "Clustered similar log patterns"]] },
  { name: "Regex / log parsing", category: "Data & ML", aliases: ["regex", "regular expressions", "log parsing", "parsing"], strength: "built",
    evidence: [["logs", "Parsed 11.17M raw HDFS log lines into structured events"]] },
  { name: "Jupyter", category: "Data & ML", aliases: ["jupyter", "notebooks", "jupyter notebook"], strength: "built",
    evidence: [["seizure", "Research experiments in notebooks"]] },
  { name: "Matplotlib", category: "Data & ML", aliases: ["matplotlib", "data visualization", "data visualisation"], strength: "listed", evidence: [] },
  { name: "JavaScript", category: "Web development", aliases: ["javascript", "js"], strength: "built",
    evidence: [["expense", "Front-end logic"]] },
  { name: "TypeScript", category: "Web development", aliases: ["typescript"], strength: "built",
    evidence: [["body", "Human Body Explorer front end"]] },
  { name: "Next.js", category: "Web development", aliases: ["next.js", "nextjs", "next js"], strength: "built",
    evidence: [["body", "Led front-end development"]] },
  { name: "Tailwind CSS", category: "Web development", aliases: ["tailwind", "tailwind css", "tailwindcss"], strength: "built",
    evidence: [["body", "Styling"]] },
  { name: "HTML/CSS", category: "Web development", aliases: ["html", "css", "html/css", "html5", "css3"], strength: "built",
    evidence: [["expense", "Interface"], ["body", "Interface"]] },
  { name: "PHP", category: "Web development", aliases: ["php"], strength: "built",
    evidence: [["expense", "Full-stack app with session authentication"], ["coursework", "Library Management and Lost & Found systems"]] },
  { name: "MySQL", category: "Web development", aliases: ["mysql"], strength: "built",
    evidence: [["expense", "Expense and user records"], ["coursework", "Library Management System"]] },
  { name: "PostgreSQL", category: "Web development", aliases: ["postgresql", "postgres"], strength: "coursework",
    evidence: [["coursework", "Lost & Found Management System"]] },
  { name: "SQL", category: "Web development", aliases: ["sql", "relational database", "relational databases"], strength: "built",
    evidence: [["expense", "MySQL-backed app"], ["coursework", "MySQL and PostgreSQL systems"]] },
  { name: "Chart.js", category: "Web development", aliases: ["chart.js", "chartjs"], strength: "built",
    evidence: [["expense", "Spending-by-category dashboard"]] },
  { name: "Framer Motion", category: "Tools & practice", aliases: ["framer motion", "framer-motion"], strength: "built",
    evidence: [["body", "Animation and interaction"]] },
  { name: "Git / GitHub", category: "Tools & practice", aliases: ["git", "github", "version control"], strength: "built",
    evidence: [["taxrag", "Published on GitHub"], ["churn", "Published on GitHub"], ["seizure", "Published on GitHub"]] },
  { name: "pytest", category: "Tools & practice", aliases: ["pytest", "unit testing", "unit tests", "automated testing", "test automation"], strength: "built",
    evidence: [["univoice", "198 automated tests"]] },
  { name: "Figma", category: "Tools & practice", aliases: ["figma", "ui design", "ux design", "prototyping"], strength: "coursework",
    evidence: [["coursework", "EasyPaisa UI redesign prototype"]] },
];

// Things job descriptions often ask for that have NO evidence in this file.
// Spotting one produces an honest "gap". Add a term here to make the fit check aware of it.
export const knownGapTerms = [
  "Java", "C++", "C#", ".NET", "Go", "Rust", "Kotlin", "Swift", "Ruby", "Scala",
  "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot",
  "MongoDB", "Redis", "Elasticsearch", "Oracle", "Cassandra",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "CI/CD", "Jenkins", "Linux",
  "PyTorch", "TensorFlow", "Keras", "Hugging Face", "Transformers", "OpenCV", "Computer Vision",
  "Spark", "PySpark", "Airflow", "Kafka", "dbt", "Snowflake", "Databricks", "BigQuery",
  "LangChain", "LlamaIndex", "OpenAI API", "fine-tuning", "LoRA", "MLOps", "MLflow", "Reinforcement Learning",
  "Time Series", "NLP", "Deep Learning", "Neural Networks", "Speech Recognition",
  "GraphQL", "REST APIs", "Microservices", "Tableau", "Power BI", "Agile", "Scrum",
];
