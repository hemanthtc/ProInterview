export interface ResumePreset {
    id: string;
    roleName: string;
    title: string;
    summary: string;
    skills: string;
    experience: string;
    education: string;
    projects: string;
    internships: string;
    certifications: string;
    awards: string;
    templateId: string;
    accentColor: string;
}

export const RESUME_PRESETS: ResumePreset[] = [
    {
        id: "preset_fullstack",
        roleName: "Full-Stack Software Engineer",
        title: "Full-Stack Software Engineer Preset",
        summary: "Detail-oriented and passionate Full-Stack Software Engineer with 4+ years of experience designing, building, and deploying scalable web applications. Highly proficient in JavaScript/TypeScript, React, Next.js, Node.js, Express, and SQL/NoSQL databases. Strong proponent of clean code, automated testing, and agile methodologies.",
        skills: "React, Next.js, TypeScript, JavaScript, Node.js, Express, PostgreSQL, MongoDB, Git, Docker, RESTful APIs, Tailwind CSS, GraphQL, AWS (S3, EC2)",
        experience: "Senior Software Engineer | TechCorp (2024 - Present)\n- Architected and built a microservices-based SaaS dashboard using Next.js and Express, improving page load speeds by 42%.\n- Led a team of 4 developers, organizing sprints, performing code reviews, and maintaining a high test coverage of 90%.\n- Implemented real-time updates and notification systems using WebSockets, reducing payload overhead by 30%.\n\nSoftware Engineer | WebInnovations (2022 - 2024)\n- Developed responsive frontend user interfaces with React, Tailwind CSS, and Framer Motion, enhancing user engagement by 18%.\n- Created secure payment flows integrated with Stripe, processing over $50k in transactions monthly.\n- Optimised database queries and indexes in PostgreSQL, reducing average API response times from 350ms to 120ms.",
        education: "Bachelor of Technology in Computer Science & Engineering (2018 - 2022)\nNational Institute of Technology | GPA: 8.9/10",
        projects: "Real-Time Collaborative Drawing Board (Next.js & WebSockets)\n- Built an interactive canvas allowing multi-user collaboration in real-time. Features brush customization, undo/redo state stack, and export to PNG.\n\nAI-Powered Resume Builder Platform (Next.js, Node.js, Gemini API)\n- Designed a tool for auto-generating, editing, and exporting resumes with tailored formats based on preferred company and roles.",
        internships: "Software Development Intern | AppForge Solutions (Summer 2021)\n- Developed internal administrative dashboards using React and material-UI, saving 15 hours of manual data entry per week.",
        certifications: "AWS Certified Developer – Associate (Score: 890/1000, 2025)\nMeta Front-End Developer Professional Certificate (Coursera, 2023)",
        awards: "Outstanding Performance Award (Q3 2025) – TechCorp\n1st Place Winner – Regional Web Development Hackathon (2021)",
        templateId: "modern",
        accentColor: "indigo"
    },
    {
        id: "preset_datascientist",
        roleName: "Data Scientist & Analyst",
        title: "Data Scientist Preset",
        summary: "Analytical and results-driven Data Scientist with a strong foundation in statistical modeling, machine learning, and data visualization. Skilled in Python, R, SQL, and Pandas/NumPy, with extensive experience deploying predictive models to production and translating complex datasets into actionable business strategies.",
        skills: "Python, R, SQL, Pandas, NumPy, Scikit-Learn, TensorFlow, PyTorch, Tableau, PowerBI, Git, Docker, Machine Learning, Statistical Analysis, A/B Testing",
        experience: "Data Scientist | Insight Analytics (2024 - Present)\n- Formulated predictive models for customer churn using XGBoost and Random Forests, reducing churn rates by 14% and saving $120k annually.\n- Designed and executed complex A/B testing frameworks for feature rollout, analyzing metrics across 1.2M active users.\n- Built automated ETL pipelines utilizing Apache Airflow to ingest and clean 5GB of daily telemetry data.\n\nJunior Data Analyst | RetailGenius (2022 - 2024)\n- Created dynamic Tableau dashboards for sales executives, replacing manual weekly reporting and saving 10 hours of analyst time per week.\n- Conducted cohort and funnel analysis using SQL to identify product friction points, increasing checkout conversions by 5%.\n- Developed internal regression models to forecast seasonal demand with an accuracy of 92%.",
        education: "Master of Science in Data Science & Analytics (2022 - 2024)\nState University | GPA: 3.8 / 4.0\n\nBachelor of Science in Mathematics & Statistics (2019 - 2022)\nMetropolitan College | First Class with Distinction",
        projects: "Predictive Housing Market Model (Python & Scikit-Learn)\n- Developed a multivariate regression model to forecast residential property values based on local economic factors, achieving an R-squared of 0.88.\n\nSentiment Analysis on Financial News (NLTK & PyTorch)\n- Trained a BERT-based transformer model to classify financial news articles into positive/negative sentiment, guiding automated trading signals.",
        internships: "Data Analyst Intern | Fintech Partners (Summer 2021)\n- Extracted and cleaned transaction records, creating automated reports that detected anomalies in loan application data.",
        certifications: "Google Advanced Data Analytics Professional Certificate (2024)\nDeepLearning.AI TensorFlow Developer Certificate (2023)",
        awards: "Best Research Project Award (Graduate School Exhibition, 2024)\nWinner of RetailGenius Hackathon for Innovative Dashboarding (2023)",
        templateId: "minimalist",
        accentColor: "slate"
    },
    {
        id: "preset_productmanager",
        roleName: "Product Manager",
        title: "Product Manager Preset",
        summary: "User-centric and data-informed Associate Product Manager with 3+ years of experience driving cross-functional alignment across design, engineering, and sales. Skilled in roadmap planning, user research, agile product delivery, and defining product requirements documents (PRDs) that drive measurable business outcomes.",
        skills: "Product Roadmap, Agile/Scrum, User Research, JIRA, Confluence, Figma, Mixpanel, SQL, Feature Prioritization, Go-To-Market (GTM) Strategy",
        experience: "Associate Product Manager | SaaSify (2024 - Present)\n- Owned the lifecycle of 4 core collaboration features from discovery to launch, resulting in a 22% increase in weekly active users (WAU).\n- Conducted 30+ user interviews to identify usability gaps, translating qualitative insights into structured engineering backlogs.\n- Collaborated with UX designers to wireframe and user-test interactive prototypes, reducing task completion times by 15%.\n\nProduct Analyst | EnterpriseCore (2022 - 2024)\n- Managed backlog prioritization, sprint planning, and daily standups using Scrum methodology for a team of 8 software engineers.\n- Used SQL and Mixpanel to audit product usage funnels, highlighting dropped flows and optimizing the onboarding conversion rate by 12%.\n- Coordinated joint customer discovery calls, refining product documentation and client alignment.",
        education: "Bachelor of Business Administration (BBA) in Information Systems (2018 - 2022)\nSchool of Commerce & Technology | GPA: 3.7 / 4.0",
        projects: "Redesign of Mobile Onboarding Flow (Figma & Mixpanel)\n- Led a volunteer project to design and prototype a simplified 3-step signup flow. User testing showed a decrease in bounce rates by 35%.\n\nProduct Launch Playbook (Co-authored Git Repository)\n- Structured a comprehensive guidelines framework for SaaS product rollouts, used by 10+ early-stage startup founders.",
        internships: "Product Management Intern | StreamTech (Summer 2021)\n- Gathered and defined functional requirements for internal moderation tools, presenting findings to the Director of Product.",
        certifications: "Product School Certified Product Manager (CPM, 2024)\nCertified Scrum Product Owner (CSPO – Scrum Alliance, 2023)",
        awards: "SaaSify MVP Award (Product Team, 2025)\nRunner-Up in National Business Pitch Competition (2021)",
        templateId: "classic",
        accentColor: "rose"
    },
    {
        id: "preset_uiux",
        roleName: "UI/UX Designer",
        title: "UI/UX Designer Preset",
        summary: "Creative and empathetic UI/UX Designer with a passion for designing elegant, intuitive, and accessible digital products. Expert in user-centered design, user research, wireframing, high-fidelity prototyping, and design systems. Skilled in Figma, Adobe XD, and translating user needs into delightful user flows.",
        skills: "Figma, Adobe Creative Suite, Sketch, Wireframing, High-Fidelity Prototyping, User Research, Information Architecture, Accessibility (WCAG), HTML/CSS",
        experience: "UI/UX Designer | PixelCraft Studios (2023 - Present)\n- Created end-to-end designs and interactive prototypes for 8 responsive web platforms and mobile apps (iOS & Android).\n- Established and maintained a unified brand design system in Figma, reducing front-end development implementation time by 25%.\n- Orchestrated usability testing sessions with 20+ external participants, identifying key navigation pain-points and resolving them in design.\n\nJunior Designer | Interface Labs (2021 - 2023)\n- Designed mockups, micro-interactions, and visual layouts for customer onboarding flows, boosting completion rates by 15%.\n- Collaborated closely with front-end engineers to ensure design fidelity during hand-off and pixel-perfect rendering.\n- Conducted heuristic evaluations on existing client portals, proposing concrete redesign recommendations.",
        education: "Bachelor of Design (B.Des) in Communication Design (2017 - 2021)\nSchool of Fine Arts & Design | CGPA: 9.0 / 10.0",
        projects: "EcoCart Mobile App Design (Figma Prototype)\n- Designed a sustainable grocery shopping app from concept to high-fidelity prototype, incorporating zero-waste store finders and receipt scanning.\n\nAccessible Tech Dashboard Redesign (Web Accessibility Study)\n- Redesigned an analytics portal dashboard to align with WCAG 2.1 AA accessibility guidelines, correcting color contrast and layout structures.",
        internships: "Graphic & UI Intern | Creative Agency (Summer 2020)\n- Created marketing assets, social graphics, and UI landing pages for diverse SME clients.",
        certifications: "Google UX Design Professional Certificate (Coursera, 2022)\nInteraction Design Foundation (IxDF) – Interaction Design Specialization (2023)",
        awards: "Creative Choice Award for Best UI Concept – PixelCraft Studios (2024)\nWinner – Interface Labs Internal Design Challenge (2022)",
        templateId: "creative",
        accentColor: "teal"
    },
    {
        id: "preset_devops",
        roleName: "DevOps & Cloud Engineer",
        title: "DevOps & Cloud Engineer Preset",
        summary: "Cloud Architect and DevOps Engineer with 3+ years of experience designing and managing robust CI/CD pipelines, containerized environments, and cloud infrastructure. Proficient in AWS, Docker, Kubernetes, Terraform, and automated deployment architectures, with a focus on high availability, security, and infrastructure as code (IaC).",
        skills: "AWS, Docker, Kubernetes, Terraform, CI/CD (GitHub Actions, Jenkins), Bash scripting, Linux, Nginx, Prometheus, Grafana, Ansible, Git",
        experience: "DevOps Engineer | CloudScale Systems (2024 - Present)\n- Implemented Infrastructure as Code (IaC) using Terraform, provisioning multi-region AWS environments that cut infrastructure setup times by 70%.\n- Designed and maintained automated CI/CD pipelines in GitHub Actions, automating testing and deployments for 15+ containerized applications.\n- Configured Prometheus and Grafana monitoring stacks, reducing average incident detection and resolution times (MTTD/MTTR) by 35%.\n\nAssociate Cloud Engineer | HostNet (2022 - 2024)\n- Containerized legacy applications using Docker, improving local developer productivity and reducing staging configuration drifts.\n- Administered self-managed Kubernetes clusters, optimizing pod scheduling and horizontal auto-scaling parameters to handle traffic surges.\n- Managed AWS resources including VPCs, IAM roles, EC2 instances, S3 buckets, and RDS instances, securing them according to best practices.",
        education: "Bachelor of Science in Information Technology (2018 - 2022)\nCollege of Engineering & IT | GPA: 3.6 / 4.0",
        projects: "Automated AWS EKS Deployment (Terraform & Kubernetes)\n- Engineered a repeatable Terraform configuration to spin up a fully monitored AWS EKS cluster, complete with ingress controllers and ALB controllers.\n- Integrated automated SSL certificate renewals via Let's Encrypt.\n\nMulti-Branch GitOps Pipeline (ArgoCD & GitLab CI)\n- Developed a GitOps continuous deployment pipeline that automatically syncs code repository updates with live Kubernetes environments.",
        internships: "System Administrator Intern | TechOps Solutions (Summer 2021)\n- Scripted server monitoring automation using Bash, reporting daily server health logs to Slack.",
        certifications: "AWS Certified Solutions Architect – Associate (2024)\nHashiCorp Certified: Terraform Associate (2023)\nCertified Kubernetes Administrator (CKA – Linux Foundation, 2025)",
        awards: "CloudScale Systems Engineer of the Month (October 2024)\nWinner of College Cybersecurity Capture the Flag (CTF) (2020)",
        templateId: "modern",
        accentColor: "violet"
    },
    {
        id: "preset_vlsi",
        roleName: "VLSI & Silicon Design Engineer",
        title: "VLSI & Embedded Systems Preset",
        summary: "Hardware and Silicon Design Engineer with 3+ years of experience in digital RTL architecture, Verilog/SystemVerilog, static timing analysis (STA), and ASIC verification. Proven track record delivering zero-defect silicon prototypes and optimizing PPA (power, performance, area) margins.",
        skills: "Verilog, SystemVerilog, UVM, RTL Design, Static Timing Analysis (STA), Synopsys Design Compiler, Cadence Virtuoso, FPGA (Xilinx Vivado), Microcontrollers (ARM Cortex-M), C/C++, Linux",
        experience: "Silicon Design Engineer | MicroSilicon Tech (2024 - Present)\n- Designed and simulated high-speed AXI-crossbar interconnect in SystemVerilog, reducing latency by 22% across 8 bus masters.\n- Performed RTL synthesis and constraint definitions in Synopsys DC, achieving timing closure at 850 MHz on a 12nm process.\n- Closed multi-corner setup and hold timing violations across clock domain crossings (CDC) with zero silicon re-spins.\n\nHardware Verification Intern | ChipDesign Labs (2022 - 2024)\n- Developed UVM testbenches and constrained-random tests for a multi-channel DMA controller, boosting functional coverage to 98%.\n- Validated FPGA bitstreams on Xilinx Zynq boards, verifying SPI and I2C peripheral controllers against hardware logic analyzers.",
        education: "Bachelor of Technology in Electronics & Communication Engineering (2018 - 2022)\nInstitute of Technology | CGPA: 9.1 / 10",
        projects: "RISC-V 5-Stage Pipelined Processor Core (Verilog & Vivado)\n- Implemented a complete 32-bit RV32I integer core with hazard detection, branch prediction, and forwarding units. Verified execution of compiled C binaries.\n\nLow-Power Digital Filter ASIC (Cadence Toolflow)\n- Designed a 16-tap FIR digital filter architecture with clock gating, reducing dynamic power consumption by 34%.",
        internships: "VLSI Engineering Intern | Apex Semiconductor (Summer 2021)\n- Synthesized digital modules and generated timing constraint files (SDC) for high-speed memory controller interfaces.",
        certifications: "Certified SystemVerilog & UVM Verification Specialist (2023)\nArm Accredited Engineer (AAE, 2024)",
        awards: "Outstanding Engineering Contributor (Q2 2025) – MicroSilicon Tech\nBest Final Year Hardware Project Award (2022)",
        templateId: "classic",
        accentColor: "indigo"
    },
    {
        id: "preset_finance",
        roleName: "Financial Analyst & Associate",
        title: "Financial Analyst Preset",
        summary: "Detail-oriented Financial Analyst with 3+ years of experience in dynamic three-statement financial modeling, DCF valuation, variance forecasting, and executive reporting. Adept at translating complex financial data into actionable strategic recommendations.",
        skills: "Financial Modeling (3-Statement, DCF, LBO), Budgeting & Forecasting, Variance Analysis, Valuation, Excel (Advanced, VBA), Bloomberg Terminal, SQL, PowerBI, Capital Budgeting",
        experience: "Financial Analyst | Global Capital Partners (2024 - Present)\n- Built comprehensive three-statement rolling forecast models for 6 portfolio business units, cutting variance between projected and actual EBITDA to under 3%.\n- Executed discounted cash flow (DCF) and comparable company valuation models for 4 potential acquisition targets valued at $45M+.\n- Partnered with department leads to review annual OPEX and CAPEX budgets, identifying $420k in operational cost savings.\n\nJunior Financial Analyst | Horizon Financial (2022 - 2024)\n- Prepared monthly executive performance decks and board packs analyzing revenue growth, contribution margins, and working capital cycles.\n- Automated weekly cash-flow reporting using Excel VBA and SQL queries, saving 6 hours of manual spreadsheet reconciliation per week.",
        education: "Bachelor of Science in Finance & Economics (2018 - 2022)\nUniversity School of Management | GPA: 3.9 / 4.0",
        projects: "M&A Synergy & Accretion/Dilution Analysis Model\n- Modeled an end-to-end $120M cross-border acquisition scenario, projecting post-merger EPS accretion and debt amortization schedules.\n\nSaaS Unit Economics & Cohort Retention Tool\n- Designed an automated dashboard evaluating CAC payback periods, LTV, net revenue retention (NRR), and churn patterns across customer tiers.",
        internships: "Financial Planning & Analysis (FP&A) Intern | Retail Corp (Summer 2021)\n- Analyzed seasonal inventory holding costs across regional distribution centers, presenting recommendations to senior finance leadership.",
        certifications: "CFA Program – Level II Passed (2024)\nFinancial Modeling & Valuation Analyst (FMVA® – CFI, 2023)",
        awards: "Dean’s Academic Excellence Award in Economics (2022)\nNational University Case Competition Finalist (2021)",
        templateId: "minimalist",
        accentColor: "emerald"
    },
    {
        id: "preset_marketing",
        roleName: "Growth & Digital Marketing Manager",
        title: "Growth Marketing Manager Preset",
        summary: "Data-driven Growth Marketing Manager with 4+ years of experience spearheading multi-channel user acquisition, retention loops, performance marketing, and conversion rate optimization (CRO). Proven ability to scale ARR efficiently while driving down customer acquisition cost (CAC).",
        skills: "Growth Marketing, Performance Advertising (Google Ads, Meta Ads), Conversion Rate Optimization (CRO), A/B Testing, Google Analytics 4, Mixpanel, SEO, Email Marketing (HubSpot), SQL",
        experience: "Growth Marketing Manager | CloudPeak (2024 - Present)\n- Managed a $1.2M annual performance marketing budget across paid search, paid social, and display, driving a 65% YoY surge in qualified leads while reducing CAC by 24%.\n- Orchestrated rapid iterative A/B testing on landing pages and signup flows, boosting visitor-to-lead conversion rates from 3.1% to 5.4%.\n- Designed multi-touch automated email nurture sequences that improved lead-to-opportunity acceleration by 30%.\n\nDigital Marketing Specialist | ApexMedia (2022 - 2024)\n- Led organic search engine optimization (SEO) initiative, publishing 50+ targeted pillar guides that grew non-brand organic search traffic by 140%.\n- Built real-time acquisition dashboards in Looker Studio and Google Analytics, giving leadership continuous visibility into channel ROAS.",
        education: "Bachelor of Business Administration (BBA) in Marketing (2018 - 2022)\nSchool of Business | GPA: 3.8 / 4.0",
        projects: "Omnichannel Product Launch Campaign Strategy\n- Designed and executed a 60-day launch campaign across PR, paid search, and creator partnerships, driving 15k product waitlist signups in month one.\n\nViral Referral Engine Framework\n- Prototyped a customer referral mechanism with tiered rewards, achieving a viral coefficient (K-factor) of 1.25 within 90 days.",
        internships: "Digital Marketing Intern | VentureStudio (Summer 2021)\n- Created ad creatives and managed A/B copy testing on social media channels, improving ad click-through rate (CTR) by 18%.",
        certifications: "Google Ads & Google Analytics 4 Certified (2024)\nHubSpot Inbound Marketing Certified (2023)",
        awards: "Top Marketing Performer Award (2025) – CloudPeak\n1st Place – Collegiate Digital Strategy Hackathon (2021)",
        templateId: "creative",
        accentColor: "rose"
    }
];
