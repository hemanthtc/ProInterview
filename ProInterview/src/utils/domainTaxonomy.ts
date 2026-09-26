export interface DomainDefinition {
    id: string;
    name: string;
    subDomains?: string[];
    educationMarkers: string[];
    primaryRoles: string[];
    relatedRoles: string[];
    skills: string[];
    tools: string[];
    keywords: string[];
}

export const DOMAINS: DomainDefinition[] = [
    {
        id: "mechanical_engineering",
        name: "Mechanical Engineering",
        subDomains: ["Manufacturing", "Design & CAD", "Thermal Engineering", "HVAC", "Automotive Mechanical"],
        educationMarkers: [
            "mechanical engineering",
            "b.e. mechanical",
            "b.tech mechanical",
            "b.e in mechanical",
            "b.tech in mechanical",
            "m.tech mechanical",
            "diploma in mechanical",
            "bachelor of mechanical",
            "master of mechanical",
            "thermal engineering",
            "fluid mechanics",
        ],
        primaryRoles: [
            "Mechanical Engineer",
            "Design Engineer",
            "Production Engineer",
            "Manufacturing Engineer",
            "CAD Engineer",
            "HVAC Engineer",
        ],
        relatedRoles: [
            "Maintenance Engineer",
            "Quality Engineer",
            "Process Engineer",
            "Tool Design Engineer",
            "R&D Engineer",
        ],
        skills: [
            "cad",
            "finite element analysis",
            "fea",
            "gd&t",
            "cfd",
            "thermodynamics",
            "fluid mechanics",
            "manufacturing processes",
            "cnc programming",
            "sheet metal design",
            "hydraulics",
            "pneumatics",
            "hvac",
            "piping design",
            "dfm",
            "dfmea",
            "geometric dimensioning",
        ],
        tools: [
            "solidworks",
            "autocad",
            "catia",
            "ansys",
            "creo",
            "pro/e",
            "nx cad",
            "siemens nx",
            "inventor",
            "fusion 360",
            "hypermesh",
            "mastercam",
        ],
        keywords: [
            "fabrication",
            "machining",
            "assembly",
            "tolerance analysis",
            "prototype",
            "tooling",
            "casting",
            "forging",
            "heat treatment",
            "pumps",
            "valves",
            "compressors",
        ],
    },
    {
        id: "civil_engineering",
        name: "Civil Engineering",
        subDomains: ["Structural Engineering", "Construction Management", "Geotechnical", "Transportation", "Surveying"],
        educationMarkers: [
            "civil engineering",
            "b.e. civil",
            "b.tech civil",
            "b.e in civil",
            "b.tech in civil",
            "m.tech civil",
            "m.tech structural",
            "diploma in civil",
            "bachelor of civil",
        ],
        primaryRoles: [
            "Civil Engineer",
            "Site Engineer",
            "Structural Engineer",
            "Quantity Surveyor",
            "Construction Project Manager",
            "Planning Engineer",
        ],
        relatedRoles: [
            "Billing Engineer",
            "Quality Control Engineer",
            "Geotechnical Engineer",
            "Surveyor",
            "Estimator",
        ],
        skills: [
            "site supervision",
            "structural design",
            "quantity estimation",
            "surveying",
            "concrete technology",
            "bar bending schedule",
            "bbs",
            "geotechnical analysis",
            "soil mechanics",
            "tendering",
            "cost estimation",
            "project scheduling",
            "reinforcement detailing",
        ],
        tools: [
            "staad.pro",
            "staad pro",
            "etabs",
            "autocad",
            "autocad civil",
            "revit",
            "primavera",
            "ms project",
            "arcgis",
            "sap2000",
            "total station",
        ],
        keywords: [
            "construction",
            "rcc",
            "high-rise",
            "infrastructure",
            "bridge design",
            "highway engineering",
            "site execution",
            "foundation design",
            "quality assurance",
        ],
    },
    {
        id: "electrical_engineering",
        name: "Electrical Engineering",
        subDomains: ["Power Systems", "Control Systems", "Electrical Machines", "Renewable Energy", "Instrumentation"],
        educationMarkers: [
            "electrical engineering",
            "b.e. electrical",
            "b.tech electrical",
            "b.e in electrical",
            "b.tech in electrical",
            "m.tech electrical",
            "diploma in electrical",
            "eee",
            "electrical and electronics",
        ],
        primaryRoles: [
            "Electrical Engineer",
            "Power Systems Engineer",
            "Control Systems Engineer",
            "Electrical Design Engineer",
            "Substation Engineer",
        ],
        relatedRoles: [
            "Maintenance Electrical Engineer",
            "Switchgear Engineer",
            "Testing & Commissioning Engineer",
            "Renewable Energy Engineer",
        ],
        skills: [
            "power systems",
            "circuit design",
            "switchgear",
            "transformers",
            "plc programming",
            "scada",
            "high voltage",
            "relays",
            "electrical load calculation",
            "power distribution",
            "single line diagrams",
            "motor control",
        ],
        tools: [
            "matlab",
            "simulink",
            "etap",
            "autocad electrical",
            "plc",
            "scada",
            "labview",
            "pspice",
            "multisim",
        ],
        keywords: [
            "substation",
            "transmission",
            "distribution",
            "generators",
            "inverters",
            "solar pv",
            "commissioning",
            "wiring",
            "switchboard",
        ],
    },
    {
        id: "electronics_embedded",
        name: "Electronics & Embedded Systems",
        subDomains: ["Embedded Systems", "VLSI", "IoT", "Firmware", "Hardware Design"],
        educationMarkers: [
            "electronics and communication",
            "ece",
            "electronics engineering",
            "b.e. ece",
            "b.tech ece",
            "embedded systems",
            "vlsi design",
            "b.e electronics",
            "b.tech electronics",
        ],
        primaryRoles: [
            "Embedded Engineer",
            "Firmware Engineer",
            "Electronics Engineer",
            "Hardware Engineer",
            "IoT Engineer",
            "VLSI Design Engineer",
        ],
        relatedRoles: [
            "PCB Design Engineer",
            "Verification Engineer",
            "RTL Design Engineer",
            "Field Application Engineer",
        ],
        skills: [
            "embedded c",
            "c++",
            "microcontrollers",
            "arm cortex",
            "rtos",
            "free rtos",
            "freertos",
            "pcb design",
            "schematic capture",
            "i2c",
            "spi",
            "uart",
            "can bus",
            "verilog",
            "vhdl",
            "fpga",
            "circuit simulation",
            "iot protocols",
            "mqtt",
        ],
        tools: [
            "keil",
            "stm32cubeide",
            "altium designer",
            "eagle pcb",
            "kicad",
            "vivado",
            "model-sim",
            "modelsim",
            "quartus",
            "oscilloscope",
            "logic analyzer",
        ],
        keywords: [
            "microchip",
            "pic",
            "arduino",
            "esp32",
            "raspberry pi",
            "board bring-up",
            "firmware debugging",
            "signal integrity",
            "asic",
            "fpga",
        ],
    },
    {
        id: "finance_accounting",
        name: "Finance & Accounting",
        subDomains: ["Auditing", "Taxation", "Financial Planning & Analysis", "Corporate Finance", "Bookkeeping"],
        educationMarkers: [
            "b.com",
            "bcom",
            "m.com",
            "mcom",
            "chartered accountant",
            "ca inter",
            "ca final",
            "cfa",
            "cpa",
            "mba finance",
            "bba finance",
            "finance and accounting",
            "commerce",
        ],
        primaryRoles: [
            "Financial Analyst",
            "Accountant",
            "Finance Associate",
            "Accounts Executive",
            "Tax Consultant",
            "Audit Associate",
        ],
        relatedRoles: [
            "FP&A Analyst",
            "Accounts Payable Specialist",
            "Accounts Receivable Specialist",
            "Internal Auditor",
            "Treasury Analyst",
        ],
        skills: [
            "financial modeling",
            "financial analysis",
            "accounting",
            "taxation",
            "gst",
            "tds",
            "auditing",
            "balance sheet",
            "p&l management",
            "reconciliation",
            "budgeting",
            "forecasting",
            "variance analysis",
            "statutory compliance",
            "general ledger",
        ],
        tools: [
            "tally",
            "tally prime",
            "excel",
            "advanced excel",
            "quickbooks",
            "sap fico",
            "sap erp",
            "zoho books",
            "power bi",
        ],
        keywords: [
            "cash flow",
            "depreciation",
            "audit",
            "compliance",
            "payroll accounting",
            "working capital",
            "ifrs",
            "gaap",
            "journal entries",
        ],
    },
    {
        id: "banking",
        name: "Banking",
        subDomains: ["Retail Banking", "Investment Banking", "Wealth Management", "Credit & Risk Analysis"],
        educationMarkers: [
            "banking and finance",
            "mba banking",
            "investment banking",
            "financial engineering",
        ],
        primaryRoles: [
            "Banking Associate",
            "Credit Analyst",
            "Investment Banking Analyst",
            "Relationship Manager",
            "Branch Operations Officer",
        ],
        relatedRoles: [
            "Loan Officer",
            "Wealth Manager",
            "Risk Analyst",
            "Underwriter",
        ],
        skills: [
            "credit appraisal",
            "loan underwriting",
            "kyc",
            "aml",
            "risk assessment",
            "wealth management",
            "portfolio management",
            "equity research",
            "financial derivatives",
            "retail banking operations",
        ],
        tools: [
            "finacle",
            "bloomberg terminal",
            "excel",
            "reuters",
            "sap banking",
        ],
        keywords: [
            "credit limit",
            "npa",
            "collateral",
            "mortgage",
            "deposits",
            "liquidity",
            "capital adequacy",
            "basel iii",
        ],
    },
    {
        id: "human_resources",
        name: "Human Resources",
        subDomains: ["Recruitment & Talent Acquisition", "HR Operations", "Payroll & Compensation", "Employee Relations", "L&D"],
        educationMarkers: [
            "mba hr",
            "mba in human resources",
            "bba hr",
            "human resources management",
            "shrm",
            "pgdm hr",
        ],
        primaryRoles: [
            "HR Executive",
            "Recruiter",
            "Talent Acquisition Specialist",
            "HR Operations Associate",
            "HR Business Partner",
        ],
        relatedRoles: [
            "People Operations Associate",
            "Payroll Executive",
            "HR Generalist",
            "Training and Development Coordinator",
            "Technical Recruiter",
        ],
        skills: [
            "recruitment",
            "talent acquisition",
            "employee onboarding",
            "payroll",
            "payroll processing",
            "employee relations",
            "performance management",
            "hr compliance",
            "labor laws",
            "sourcing",
            "screening",
            "retention strategies",
            "exit formalities",
            "grievance handling",
        ],
        tools: [
            "workday",
            "keka",
            "darwinbox",
            "bamboohr",
            "linkedin recruiter",
            "naukri resdex",
            "greenhouse",
            "lever",
            "excel",
        ],
        keywords: [
            "ats",
            "offer roll-out",
            "job descriptions",
            "hr policies",
            "pf",
            "esi",
            "statutory deductions",
            "employee engagement",
            "culture",
        ],
    },
    {
        id: "marketing",
        name: "Marketing",
        subDomains: ["Digital Marketing", "SEO / SEM", "Content Marketing", "Brand Strategy", "Social Media"],
        educationMarkers: [
            "mba marketing",
            "bba marketing",
            "digital marketing certified",
            "marketing management",
            "mass communication and marketing",
        ],
        primaryRoles: [
            "Marketing Executive",
            "Digital Marketing Specialist",
            "SEO Specialist",
            "Content Marketing Specialist",
            "Social Media Manager",
            "Performance Marketer",
        ],
        relatedRoles: [
            "Growth Marketing Associate",
            "Email Marketing Specialist",
            "Brand Executive",
            "Campaign Manager",
            "SEM Analyst",
        ],
        skills: [
            "seo",
            "sem",
            "search engine optimization",
            "google ads",
            "meta ads",
            "content marketing",
            "social media marketing",
            "email marketing",
            "copywriting",
            "campaign strategy",
            "conversion rate optimization",
            "cro",
            "marketing analytics",
            "influencer marketing",
        ],
        tools: [
            "google analytics",
            "ga4",
            "google search console",
            "semrush",
            "ahrefs",
            "hubspot",
            "mailchimp",
            "canva",
            "meta business suite",
        ],
        keywords: [
            "cpc",
            "cpa",
            "roas",
            "organic traffic",
            "backlinks",
            "keyword research",
            "funnel optimization",
            "click-through rate",
            "ctr",
            "brand awareness",
        ],
    },
    {
        id: "sales_business_development",
        name: "Sales & Business Development",
        subDomains: ["B2B Sales", "Inside Sales", "Account Management", "Field Sales"],
        educationMarkers: [
            "mba sales",
            "bba sales",
            "business administration",
        ],
        primaryRoles: [
            "Business Development Executive",
            "Sales Executive",
            "Account Executive",
            "Inside Sales Specialist",
            "Sales Manager",
        ],
        relatedRoles: [
            "Business Development Associate",
            "Client Relationship Executive",
            "Key Account Manager",
            "Lead Generation Executive",
        ],
        skills: [
            "lead generation",
            "cold calling",
            "b2b sales",
            "client relationship management",
            "pipeline management",
            "negotiation",
            "sales pitch",
            "deal closing",
            "prospecting",
            "customer retention",
        ],
        tools: [
            "salesforce",
            "hubspot crm",
            "zoho crm",
            "apollo.io",
            "outreach",
            "linkedin sales navigator",
        ],
        keywords: [
            "revenue targets",
            "quota",
            "sales cycle",
            "discovery call",
            "churn",
            "customer acquisition",
            "up-selling",
            "cross-selling",
        ],
    },
    {
        id: "supply_chain_logistics",
        name: "Supply Chain & Logistics",
        subDomains: ["Procurement", "Warehouse Management", "Freight & Transport", "Inventory Management"],
        educationMarkers: [
            "supply chain management",
            "logistics management",
            "operations and supply chain",
            "mba supply chain",
        ],
        primaryRoles: [
            "Supply Chain Executive",
            "Procurement Specialist",
            "Logistics Coordinator",
            "Warehouse Supervisor",
            "Inventory Controller",
        ],
        relatedRoles: [
            "Supply Chain Analyst",
            "Vendor Management Executive",
            "Freight Operations Specialist",
            "Demand Planner",
        ],
        skills: [
            "procurement",
            "inventory control",
            "vendor management",
            "warehouse management",
            "logistics operations",
            "purchase order processing",
            "freight forwarding",
            "supply planning",
            "cost optimization",
            "demand forecasting",
        ],
        tools: [
            "sap mm",
            "oracle scm",
            "wms",
            "tally",
            "excel",
        ],
        keywords: [
            "lead time",
            "safety stock",
            "bill of lading",
            "rfq",
            "po generation",
            "customs clearance",
            "last-mile delivery",
            "fulfillment",
        ],
    },
    {
        id: "design_ui_ux",
        name: "UI/UX & Product Design",
        subDomains: ["UI Design", "UX Research", "Interaction Design", "Visual Design"],
        educationMarkers: [
            "b.des",
            "m.des",
            "interaction design",
            "graphic design",
            "user experience design",
            "nid",
            "nift",
        ],
        primaryRoles: [
            "UI/UX Designer",
            "Product Designer",
            "UX Researcher",
            "Interaction Designer",
            "Visual Designer",
        ],
        relatedRoles: [
            "Design Systems Specialist",
            "UI Designer",
            "Web Designer",
            "Graphic Designer",
        ],
        skills: [
            "user research",
            "wireframing",
            "prototyping",
            "design systems",
            "user journey mapping",
            "information architecture",
            "usability testing",
            "responsive design",
            "micro-interactions",
            "accessibility",
            "wcag",
        ],
        tools: [
            "figma",
            "adobe xd",
            "sketch",
            "invision",
            "framer",
            "miro",
            "illustrator",
            "photoshop",
        ],
        keywords: [
            "figma components",
            "auto layout",
            "user empathy",
            "persona",
            "heuristic evaluation",
            "design sprint",
            "mockups",
            "high fidelity",
        ],
    },
    {
        id: "graphic_creative_design",
        name: "Graphic & Creative Design",
        subDomains: ["Brand Identity", "Motion Graphics", "Digital Illustration", "Print Design"],
        educationMarkers: [
            "applied arts",
            "fine arts",
            "graphic design",
            "visual communication",
            "b.f.a",
        ],
        primaryRoles: [
            "Graphic Designer",
            "Visual Artist",
            "Motion Graphic Designer",
            "Brand Identity Designer",
            "Creative Associate",
        ],
        relatedRoles: [
            "Illustrator",
            "Video Editor",
            "Multimedia Specialist",
            "Art Director Assistant",
        ],
        skills: [
            "typography",
            "branding",
            "color theory",
            "vector illustration",
            "photo editing",
            "motion graphics",
            "storyboarding",
            "layout design",
            "print production",
        ],
        tools: [
            "photoshop",
            "illustrator",
            "after effects",
            "premiere pro",
            "indesign",
            "coreldraw",
            "canva",
        ],
        keywords: [
            "vector",
            "raster",
            "resolution",
            "render",
            "infographics",
            "banners",
            "packaging design",
            "brand guidelines",
        ],
    },
    {
        id: "education",
        name: "Education & Teaching",
        subDomains: ["School Teaching", "Higher Education", "EdTech / Online Tutoring", "Curriculum Development"],
        educationMarkers: [
            "b.ed",
            "m.ed",
            "m.sc mathematics",
            "m.a english",
            "m.sc physics",
            "m.sc chemistry",
            "ph.d",
            "net qualified",
            "set qualified",
            "teaching diploma",
            "bachelor of education",
        ],
        primaryRoles: [
            "Teacher",
            "Lecturer",
            "Academic Coordinator",
            "Tutor",
            "Curriculum Developer",
            "Subject Matter Expert",
        ],
        relatedRoles: [
            "Instructional Designer",
            "Faculty Associate",
            "Content Developer - Education",
            "Educational Consultant",
        ],
        skills: [
            "lesson planning",
            "curriculum design",
            "classroom management",
            "pedagogy",
            "student assessment",
            "doubt resolution",
            "instructional delivery",
            "educational psychology",
            "e-learning methodology",
        ],
        tools: [
            "google classroom",
            "canvas lms",
            "moodle",
            "ms teams for education",
            "smartboard",
            "zoom",
        ],
        keywords: [
            "cbse",
            "icse",
            "pedagogical",
            "formative assessment",
            "rubrics",
            "syllabus",
            "stem education",
            "academic progress",
        ],
    },
    {
        id: "healthcare",
        name: "Healthcare",
        subDomains: ["Clinical Practice", "Nursing", "Hospital Administration", "Medical Laboratory", "Allied Health"],
        educationMarkers: [
            "mbbs",
            "bds",
            "b.sc nursing",
            "bams",
            "bhms",
            "bpt",
            "physiotherapy",
            "medical lab technology",
            "bmlt",
            "hospital management",
            "md",
            "ms surgery",
        ],
        primaryRoles: [
            "Doctor",
            "Resident Medical Officer",
            "Staff Nurse",
            "Medical Officer",
            "Clinical Specialist",
            "Hospital Administrator",
        ],
        relatedRoles: [
            "Physiotherapist",
            "Medical Laboratory Technologist",
            "Healthcare Operations Coordinator",
            "Clinical Research Coordinator",
        ],
        skills: [
            "patient care",
            "clinical diagnosis",
            "treatment planning",
            "emergency response",
            "vital signs monitoring",
            "patient history",
            "infection control",
            "hospital procedures",
            "emr / ehr documentation",
            "pharmacology basics",
        ],
        tools: [
            "epic emr",
            "cerner",
            "his hospital information system",
            "ecg",
            "glucometer",
            "defibrillator",
        ],
        keywords: [
            "outpatient",
            "inpatient",
            "icu",
            "ward management",
            "triage",
            "nabh compliance",
            "medical ethics",
            "phlebotomy",
        ],
    },
    {
        id: "pharmaceutical_biotech",
        name: "Pharmaceutical & Biotechnology",
        subDomains: ["Clinical Research", "Quality Assurance / QC", "Formulation & R&D", "Regulatory Affairs"],
        educationMarkers: [
            "b.pharm",
            "m.pharm",
            "pharm.d",
            "biotechnology",
            "b.tech biotechnology",
            "m.sc biotechnology",
            "microbiology",
            "b.sc chemistry",
        ],
        primaryRoles: [
            "Pharmacist",
            "Quality Control Analyst - Pharma",
            "Clinical Research Associate",
            "Formulation Scientist",
            "Regulatory Affairs Associate",
        ],
        relatedRoles: [
            "QA Chemist",
            "Analytical Chemist",
            "Bioprocess Associate",
            "Drug Safety Associate",
        ],
        skills: [
            "gmp",
            "good manufacturing practices",
            "glp",
            "hplc",
            "gas chromatography",
            "titration",
            "formulation development",
            "dissolution testing",
            "clinical trial monitoring",
            "pharmacovigilance",
            "drug stability testing",
        ],
        tools: [
            "hplc",
            "gc-ms",
            "uv-vis spectrophotometer",
            "chemstation",
            "empower",
            "lims",
        ],
        keywords: [
            "fda guidelines",
            "ich guidelines",
            "standard operating procedure",
            "sop",
            "cleanroom",
            "batch records",
            "dosage forms",
        ],
    },
    {
        id: "legal_compliance",
        name: "Legal & Compliance",
        subDomains: ["Corporate Law", "Contract Drafting", "Intellectual Property", "Statutory Compliance"],
        educationMarkers: [
            "ll.b",
            "llb",
            "ll.m",
            "llm",
            "company secretary",
            "cs executive",
            "b.a. ll.b",
            "bba llb",
            "advocate",
        ],
        primaryRoles: [
            "Legal Associate",
            "Corporate Counsel",
            "Contract Specialist",
            "Compliance Officer",
            "Legal Executive",
        ],
        relatedRoles: [
            "Company Secretarial Associate",
            "IPR Specialist",
            "Litigation Associate",
            "Paralegal",
        ],
        skills: [
            "contract drafting",
            "contract review",
            "legal research",
            "due diligence",
            "statutory compliance",
            "litigation management",
            "intellectual property rights",
            "ipr",
            "regulatory filings",
            "dispute resolution",
            "arbitration",
        ],
        tools: [
            "manupatra",
            "scc online",
            "westlaw",
            "ms word",
        ],
        keywords: [
            "nda",
            "master services agreement",
            "articles of association",
            "mca portal",
            "registrar of companies",
            "roc",
            "trademark",
            "copyright",
        ],
    },
    {
        id: "chemical_engineering",
        name: "Chemical Engineering",
        subDomains: ["Petrochemicals", "Process Engineering", "Polymers", "Water Treatment"],
        educationMarkers: [
            "chemical engineering",
            "b.e. chemical",
            "b.tech chemical",
            "b.e in chemical",
            "b.tech in chemical",
            "m.tech chemical",
            "diploma in chemical",
        ],
        primaryRoles: [
            "Chemical Engineer",
            "Process Engineer",
            "Plant Operations Engineer",
            "Refinery Engineer",
        ],
        relatedRoles: [
            "Process Safety Engineer",
            "Quality Assurance Chemist",
            "Environmental Engineer",
            "R&D Chemical Specialist",
        ],
        skills: [
            "mass transfer",
            "heat transfer",
            "reaction engineering",
            "distillation",
            "p&id development",
            "process optimization",
            "process safety",
            "hazop",
            "material balance",
        ],
        tools: [
            "aspen plus",
            "aspen hysys",
            "chemcad",
            "autocad",
            "matlab",
        ],
        keywords: [
            "reactor",
            "heat exchanger",
            "refinery",
            "catalyst",
            "effluent treatment",
            "etp",
            "petrochemical",
            "piping and instrumentation",
        ],
    },
    {
        id: "automotive_aerospace",
        name: "Automotive & Aerospace",
        subDomains: ["Vehicle Dynamics", "Aerodynamics", "Powertrain", "Avionics"],
        educationMarkers: [
            "automobile engineering",
            "automotive engineering",
            "aerospace engineering",
            "aeronautical engineering",
            "b.e. automobile",
            "b.tech aerospace",
        ],
        primaryRoles: [
            "Automotive Engineer",
            "Aerospace Engineer",
            "Powertrain Engineer",
            "Vehicle Dynamics Engineer",
            "Avionics Engineer",
        ],
        relatedRoles: [
            "Calibration Engineer",
            "Aerodynamics Specialist",
            "Test & Validation Engineer",
            "Structural Analyst - Aero",
        ],
        skills: [
            "powertrain design",
            "ev systems",
            "battery management system",
            "bms",
            "aerodynamics",
            "chassis design",
            "nvh analysis",
            "automotive safety standards",
            "crashworthiness",
        ],
        tools: [
            "matlab",
            "simulink",
            "ansys fluent",
            "catia v5",
            "car-sim",
            "carsim",
            "adams",
        ],
        keywords: [
            "internal combustion",
            "electric vehicle",
            "telematics",
            "suspension",
            "flight dynamics",
            "propulsion",
            "can protocol",
        ],
    },
    {
        id: "hospitality_tourism",
        name: "Hospitality & Tourism",
        subDomains: ["Front Office", "Food & Beverage", "Housekeeping", "Event Management"],
        educationMarkers: [
            "hotel management",
            "bhm",
            "hospitality and tourism",
            "b.sc hospitality",
            "culinary arts",
        ],
        primaryRoles: [
            "Front Office Executive",
            "Guest Relations Executive",
            "Food and Beverage Supervisor",
            "Hotel Operations Associate",
            "Event Coordinator",
        ],
        relatedRoles: [
            "Travel Consultant",
            "Housekeeping Supervisor",
            "Catering Manager",
            "Banquet Executive",
        ],
        skills: [
            "guest service",
            "front desk management",
            "reservation management",
            "f&b service",
            "event planning",
            "hospitality standard compliance",
            "complaint handling",
            "concierge services",
        ],
        tools: [
            "opera pms",
            "ids next",
            "amadeus",
            "sabre",
            "excel",
        ],
        keywords: [
            "check-in",
            "check-out",
            "room occupancy",
            "buffet operations",
            "banquet",
            "tourism itinerary",
            "luxury hospitality",
        ],
    },
    {
        id: "operations_management",
        name: "Operations & Business Management",
        subDomains: ["Process Optimization", "General Operations", "Quality Management"],
        educationMarkers: [
            "mba operations",
            "operations management",
            "business administration",
            "bba",
            "pgdm",
        ],
        primaryRoles: [
            "Operations Executive",
            "Operations Manager",
            "Process Associate",
            "Business Operations Analyst",
        ],
        relatedRoles: [
            "Quality Assurance Associate",
            "Project Coordinator",
            "Service Delivery Associate",
            "Operations Lead",
        ],
        skills: [
            "process improvement",
            "six sigma",
            "lean principles",
            "sla management",
            "workflow optimization",
            "operational reporting",
            "kpi tracking",
            "vendor coordination",
            "cross-functional collaboration",
        ],
        tools: [
            "excel",
            "jira",
            "trello",
            "asana",
            "power bi",
            "visio",
        ],
        keywords: [
            "throughput",
            "standard operating procedures",
            "root cause analysis",
            "continuous improvement",
            "resource allocation",
        ],
    },
    {
        id: "data_analytics",
        name: "Data & Analytics",
        subDomains: ["Business Intelligence", "Data Engineering", "Machine Learning", "Data Science"],
        educationMarkers: [
            "data science",
            "b.sc statistics",
            "m.sc statistics",
            "business analytics",
            "m.sc data science",
        ],
        primaryRoles: [
            "Data Analyst",
            "Business Intelligence Analyst",
            "Data Scientist",
            "Data Engineer",
        ],
        relatedRoles: [
            "BI Developer",
            "Analytics Consultant",
            "Reporting Analyst",
            "Quantitative Analyst",
        ],
        skills: [
            "sql",
            "data analysis",
            "data visualization",
            "business intelligence",
            "statistical analysis",
            "etl pipelines",
            "dashboarding",
            "exploratory data analysis",
            "data cleaning",
        ],
        tools: [
            "power bi",
            "tableau",
            "excel",
            "sql",
            "python",
            "pandas",
            "snowflake",
            "bigquery",
            "looker",
        ],
        keywords: [
            "metrics",
            "kpi dashboards",
            "trend analysis",
            "cohort analysis",
            "a/b testing",
            "data storytelling",
        ],
    },
    {
        id: "software_it",
        name: "Software & IT",
        subDomains: ["Full-Stack", "Frontend", "Backend", "Mobile", "DevOps & Cloud", "QA / Testing"],
        educationMarkers: [
            "computer science",
            "information technology",
            "b.e. cse",
            "b.tech cse",
            "b.tech it",
            "b.e. it",
            "mca",
            "bca",
            "b.sc computer science",
            "m.tech cse",
        ],
        primaryRoles: [
            "Software Engineer",
            "Frontend Engineer",
            "Backend Engineer",
            "Full Stack Developer",
            "DevOps Engineer",
            "QA Automation Engineer",
            "Mobile Application Developer",
        ],
        relatedRoles: [
            "SDE",
            "Cloud Engineer",
            "Site Reliability Engineer",
            "API Developer",
            "Systems Software Engineer",
        ],
        skills: [
            "javascript",
            "typescript",
            "react",
            "next.js",
            "tailwind",
            "tailwind css",
            "html",
            "css",
            "node.js",
            "express",
            "python",
            "java",
            "c++",
            "c#",
            "go",
            "rust",
            "sql",
            "nosql",
            "mongodb",
            "postgresql",
            "docker",
            "kubernetes",
            "aws",
            "ci/cd",
            "git",
            "rest api",
            "graphql",
            "microservices",
            "system design",
            "data structures",
            "algorithms",
        ],
        tools: [
            "git",
            "github",
            "docker",
            "postman",
            "vs code",
            "intellij",
            "linux",
            "jira",
        ],
        keywords: [
            "scalable architecture",
            "unit testing",
            "code review",
            "pull request",
            "debugging",
            "distributed systems",
            "agile",
            "scrum",
        ],
    },
];

export interface DetectedDomainResult {
    careerDomain: string;
    subDomain?: string;
    confidence: number;
    roles: string[];
    relatedRoles: string[];
    skills: string[];
    toolsAndTechnologies: string[];
    industries: string[];
    isUserSpecified?: boolean;
}

/**
 * Domain-neutral classifier that evaluates resume text across all candidate domains.
 * Prioritizes education credentials, projects, professional title markers, domain tools, and domain keywords.
 * If userTargetDomain is provided by the candidate, it respects and prioritizes that preference.
 * Never defaults to "Software Engineer" for non-software candidates.
 */
export function detectCareerDomain(resumeText: string, userTargetDomain?: string): DetectedDomainResult {
    const text = resumeText.toLowerCase();
    const cleanTargetDomain = userTargetDomain?.trim();

    // 0. If user explicitly provided a typed target domain, check for direct taxonomy match
    let userSpecifiedDomain: DomainDefinition | null = null;
    if (cleanTargetDomain) {
        const targetLower = cleanTargetDomain.toLowerCase();
        for (const dom of DOMAINS) {
            if (
                dom.name.toLowerCase().includes(targetLower) ||
                targetLower.includes(dom.name.toLowerCase()) ||
                dom.id.toLowerCase().replace(/_/g, " ").includes(targetLower) ||
                dom.primaryRoles.some((r) => r.toLowerCase().includes(targetLower) || targetLower.includes(r.toLowerCase())) ||
                dom.subDomains?.some((s) => s.toLowerCase().includes(targetLower) || targetLower.includes(s.toLowerCase()))
            ) {
                userSpecifiedDomain = dom;
                break;
            }
        }
    }

    // Map each domain to a calculated relevance score
    const domainScores = DOMAINS.map((domain) => {
        let score = 0;
        const matchedSkills: string[] = [];
        const matchedTools: string[] = [];

        // If this domain is explicitly targeted by the user, grant massive priority boost
        if (userSpecifiedDomain && userSpecifiedDomain.id === domain.id) {
            score += 500;
        }

        // 1. Education markers (Strong signal, weight = 40)
        for (const edu of domain.educationMarkers) {
            if (text.includes(edu.toLowerCase())) {
                score += 40;
                break;
            }
        }

        // 2. Primary roles mentioned (Weight = 25 each, up to 50)
        let roleMatches = 0;
        for (const role of domain.primaryRoles) {
            const r = role.toLowerCase();
            if (text.includes(r)) {
                score += 25;
                roleMatches++;
                if (roleMatches >= 2) break;
            }
        }

        // 3. Tools and technologies (Weight = 15 each)
        for (const tool of domain.tools) {
            const t = tool.toLowerCase();
            // Word boundary check for short tools
            const regex = new RegExp(`\\b${t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
            if (regex.test(text)) {
                score += 15;
                matchedTools.push(tool);
            }
        }

        // 4. Domain specific skills (Weight = 8 each)
        for (const skill of domain.skills) {
            const s = skill.toLowerCase();
            const regex = new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
            if (regex.test(text)) {
                score += 8;
                matchedSkills.push(skill);
            }
        }

        // 5. Domain keywords & Project context (Weight = 4 each)
        for (const kw of domain.keywords) {
            if (text.includes(kw.toLowerCase())) {
                score += 4;
            }
        }

        return {
            domain,
            score,
            matchedSkills,
            matchedTools,
        };
    });

    // Sort domains by highest calculated score
    domainScores.sort((a, b) => b.score - a.score);
    const top = domainScores[0];

    // If candidate typed a domain that didn't match known taxonomy, create custom domain profile
    if (cleanTargetDomain && (!userSpecifiedDomain || top.score < 500)) {
        // Find any tools and skills matching the resume across all domains
        const allMatchedSkills: string[] = [];
        const allMatchedTools: string[] = [];
        for (const d of domainScores) {
            allMatchedSkills.push(...d.matchedSkills);
            allMatchedTools.push(...d.matchedTools);
        }
        const uniqueSkills = Array.from(new Set(allMatchedSkills)).slice(0, 12);
        const uniqueTools = Array.from(new Set(allMatchedTools)).slice(0, 8);

        const titleCaseDomain = cleanTargetDomain
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");

        return {
            careerDomain: titleCaseDomain,
            confidence: 0.95,
            roles: [
                `${titleCaseDomain} Specialist`,
                `${titleCaseDomain} Executive`,
                `${titleCaseDomain} Professional`,
                `${titleCaseDomain} Consultant`,
            ],
            relatedRoles: [
                `${titleCaseDomain} Associate`,
                `${titleCaseDomain} Coordinator`,
                `${titleCaseDomain} Analyst`,
            ],
            skills: uniqueSkills.length ? uniqueSkills : ["Domain Analysis", "Problem Solving", "Execution", "Communication"],
            toolsAndTechnologies: uniqueTools.length ? uniqueTools : ["Industry Tools", "Excel", "Project Management"],
            industries: [titleCaseDomain],
            isUserSpecified: true,
        };
    }

    // If top score is very low and no user domain, fall back gracefully to General / Multidisciplinary
    if (!top || top.score < 15) {
        return {
            careerDomain: "General / Multidisciplinary",
            confidence: 0.3,
            roles: ["Associate", "Operations Executive", "Project Coordinator", "Business Analyst"],
            relatedRoles: ["Executive Trainee", "Management Trainee", "Research Associate"],
            skills: ["Communication", "Problem Solving", "Project Management", "MS Office"],
            toolsAndTechnologies: ["Excel", "Word", "PowerPoint"],
            industries: ["General Business", "Corporate Services"],
            isUserSpecified: false,
        };
    }

    // Determine subDomain if applicable
    let subDomain: string | undefined;
    if (top.domain.subDomains && top.domain.subDomains.length > 0) {
        for (const sub of top.domain.subDomains) {
            if (text.includes(sub.toLowerCase())) {
                subDomain = sub;
                break;
            }
        }
    }

    // Identify roles: prioritize primary roles mentioned in the resume, then default to top primary roles
    const detectedRoles: string[] = [];
    for (const r of top.domain.primaryRoles) {
        if (text.includes(r.toLowerCase())) {
            detectedRoles.push(r);
        }
    }
    // Fill up to 4 roles from domain's primary list if fewer matched
    for (const r of top.domain.primaryRoles) {
        if (!detectedRoles.includes(r) && detectedRoles.length < 4) {
            detectedRoles.push(r);
        }
    }

    const detectedRelated: string[] = top.domain.relatedRoles.slice(0, 4);

    // Compute confidence: higher if user-specified or high score
    const confidence = userSpecifiedDomain ? 0.98 : Math.min(0.98, Math.max(0.5, top.score / 120));

    const resolvedCareerDomain = cleanTargetDomain
        ? (userSpecifiedDomain && userSpecifiedDomain.name.toLowerCase() === cleanTargetDomain.toLowerCase()
            ? userSpecifiedDomain.name
            : cleanTargetDomain.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "))
        : top.domain.name;

    // If user specified a specific subDomain or title (e.g. "Renewable Energy"), prioritize it in roles
    if (cleanTargetDomain && !detectedRoles.some((r) => r.toLowerCase().includes(cleanTargetDomain.toLowerCase()))) {
        detectedRoles.unshift(`${resolvedCareerDomain} Specialist`);
    }

    return {
        careerDomain: resolvedCareerDomain,
        subDomain: subDomain || (cleanTargetDomain && cleanTargetDomain.toLowerCase() !== resolvedCareerDomain.toLowerCase() ? cleanTargetDomain : undefined),
        confidence,
        roles: detectedRoles.slice(0, 5),
        relatedRoles: detectedRelated,
        skills: top.matchedSkills.length ? top.matchedSkills.slice(0, 15) : top.domain.skills.slice(0, 8),
        toolsAndTechnologies: top.matchedTools.length ? top.matchedTools.slice(0, 10) : top.domain.tools.slice(0, 6),
        industries: [resolvedCareerDomain, top.domain.name],
        isUserSpecified: !!cleanTargetDomain,
    };
}
