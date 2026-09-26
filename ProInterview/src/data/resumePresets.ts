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
    }
];
