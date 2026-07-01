import type { ColorPalette, FontFamily, ResumeTemplate } from './types';

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "classic-navy",
    name: "Classic Navy",
    primary: "#1E3A8A", // dark blue
    secondary: "#475569", // slate grey
    accent: "#3B82F6", // bright blue
    text: "#1F2937", // off-black
    background: "#FFFFFF",
    sidebarBg: "#F3F4F6", // light grey sidebar
    sidebarText: "#1F2937",
    bannerBg: "#1E3A8A",
    bannerText: "#FFFFFF"
  },
  {
    id: "emerald-modern",
    name: "Emerald Professional",
    primary: "#065F46", // dark emerald
    secondary: "#047857", // emerald
    accent: "#10B981", // active emerald
    text: "#292524", // stone dark
    background: "#FFFFFF",
    sidebarBg: "#ECFDF5", // light green sidebar
    sidebarText: "#065F46",
    bannerBg: "#065F46",
    bannerText: "#FFFFFF"
  },
  {
    id: "sunset-orange",
    name: "Creative Sunset",
    primary: "#C2410C", // orange-red
    secondary: "#7C2D12", // dark brown
    accent: "#F97316", // orange
    text: "#1F2937",
    background: "#FFFFFF",
    sidebarBg: "#FFF7ED", // light orange sidebar
    sidebarText: "#431407",
    bannerBg: "#C2410C",
    bannerText: "#FFFFFF"
  },
  {
    id: "royal-purple",
    name: "Royal Velvet",
    primary: "#5B21B6", // deep purple
    secondary: "#6D28D9", // purple
    accent: "#8B5CF6", // violet
    text: "#111827",
    background: "#FFFFFF",
    sidebarBg: "#F5F3FF", // lavender sidebar
    sidebarText: "#5B21B6",
    bannerBg: "#5B21B6",
    bannerText: "#FFFFFF"
  },
  {
    id: "dark-noir",
    name: "Modern Executive Noir",
    primary: "#0F172A", // slate-900 (dark black-blue)
    secondary: "#475569", // slate-600
    accent: "#0EA5E9", // sky-500
    text: "#0F172A",
    background: "#FFFFFF",
    sidebarBg: "#0F172A", // fully dark sidebar
    sidebarText: "#F8FAFC", // white text in sidebar
    bannerBg: "#0F172A",
    bannerText: "#FFFFFF"
  },
  {
    id: "monochrome-slate",
    name: "Minimalist Slate",
    primary: "#374151", // charcoal
    secondary: "#6B7280", // medium grey
    accent: "#9CA3AF", // silver grey
    text: "#111827",
    background: "#FFFFFF",
    sidebarBg: "#F9FAFB", // minimalist off-white sidebar
    sidebarText: "#374151",
    bannerBg: "#374151",
    bannerText: "#FFFFFF"
  },
  {
    id: "teal-clean",
    name: "Ocean Teal",
    primary: "#075985", // ocean blue/teal
    secondary: "#0369A1", // light ocean blue
    accent: "#06B6D4", // cyan
    text: "#1F2937",
    background: "#FFFFFF",
    sidebarBg: "#F0F9FF", // light blue sidebar
    sidebarText: "#075985",
    bannerBg: "#075985",
    bannerText: "#FFFFFF"
  },
  {
    id: "warm-burgundy",
    name: "Warm Burgundy",
    primary: "#881337", // deep burgundy
    secondary: "#9F1239", // red-800
    accent: "#F43F5E", // rose
    text: "#27272A", // zinc dark
    background: "#FFFFFF",
    sidebarBg: "#FFF1F2", // light rose sidebar
    sidebarText: "#881337",
    bannerBg: "#881337",
    bannerText: "#FFFFFF"
  }
];

export const FONT_FAMILIES: FontFamily[] = [
  { id: "inter", name: "Inter (Modern Sans)", class: "font-sans" },
  { id: "playfair", name: "Playfair Display (Elegant Serif)", class: "font-serif" },
  { id: "fira-code", name: "Fira Code (Clean Monospace)", class: "font-mono" },
  { id: "outfit", name: "Outfit (Geometric Modern)", class: "font-outfit" }
];

export const TEMPLATES: ResumeTemplate[] = [
  // --- PROFESSIONAL TEMPLATES ---
  {
    id: "tmpl-1",
    name: "The Executive Director",
    category: "Professional",
    description: "Traditional single-column layout with a minimalist header and classic navy accents, ideal for corporate leadership and manager roles.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "classic-navy",
      fontFamilyId: "playfair",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-2",
    name: "The Modern Boardroom",
    category: "Professional",
    description: "Two-column design with a subtle left sidebar and clean dividers, giving structure to deep professional careers.",
    style: {
      layout: "left-sidebar",
      headerStyle: "accent-line",
      colorPaletteId: "classic-navy",
      fontFamilyId: "inter",
      dividerStyle: "accent-block",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-3",
    name: "The Global Consultant",
    category: "Professional",
    description: "Three-column grid with compact spacing, designed for packing deep expertise, consulting histories, and international projects.",
    style: {
      layout: "three-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-4",
    name: "The Burgundy Chief",
    category: "Professional",
    description: "Single column with bold headers and warm burgundy tones. Brings high-end authority to business managers.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "warm-burgundy",
      fontFamilyId: "playfair",
      dividerStyle: "accent-block",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-5",
    name: "The Emerald Partner",
    category: "Professional",
    description: "Two-column right-sidebar configuration in rich green tones. Fits financial analysts and law partners.",
    style: {
      layout: "right-sidebar",
      headerStyle: "minimalist",
      colorPaletteId: "emerald-modern",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-6",
    name: "The Enterprise Architect",
    category: "Professional",
    description: "Classic layout with split-header details. Maximizes corporate presentation value and certifications list.",
    style: {
      layout: "split-header",
      headerStyle: "accent-line",
      colorPaletteId: "classic-navy",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-7",
    name: "The Legacy Advisor",
    category: "Professional",
    description: "Single column with large serif headings and timeline details. Fits experienced advisors and attorneys.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "playfair",
      dividerStyle: "timeline",
      fontSize: "md",
      spacing: "relaxed",
      margins: "wide",
      showAvatars: false
    }
  },

  // --- MODERN TEMPLATES ---
  {
    id: "tmpl-8",
    name: "The Silicon Valley Lead",
    category: "Modern",
    description: "Features a modern dark sidebar on the left and bright teal accents. Very polished and tech-industry standard.",
    style: {
      layout: "left-sidebar",
      headerStyle: "split-profile",
      colorPaletteId: "dark-noir",
      fontFamilyId: "outfit",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: true
    }
  },
  {
    id: "tmpl-9",
    name: "The Geometric Architect",
    category: "Modern",
    description: "Bold Outfit font with geometric spacing and thick accent divider lines. Feels clean and premium.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "teal-clean",
      fontFamilyId: "outfit",
      dividerStyle: "accent-block",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-10",
    name: "The Ocean Gradient",
    category: "Modern",
    description: "Rich ocean teal banner header with clean modern columns. Eye-catching layout for high-end digital leads.",
    style: {
      layout: "single-column",
      headerStyle: "bold-banner",
      colorPaletteId: "teal-clean",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-11",
    name: "The Slate Metro",
    category: "Modern",
    description: "Two-column grid layout with clean outline borders. Offers structural compactness and a corporate design.",
    style: {
      layout: "left-sidebar",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "inter",
      dividerStyle: "accent-block",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-12",
    name: "The Purple Fusion",
    category: "Modern",
    description: "Features a dark purple sidebar and modern round avatars. Fits product managers and agile leaders.",
    style: {
      layout: "left-sidebar",
      headerStyle: "split-profile",
      colorPaletteId: "royal-purple",
      fontFamilyId: "outfit",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: true
    }
  },
  {
    id: "tmpl-13",
    name: "The Split Professional",
    category: "Modern",
    description: "Split header layout, dividing the top contact details and profile cleanly from the sections below.",
    style: {
      layout: "split-header",
      headerStyle: "split-profile",
      colorPaletteId: "classic-navy",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: true
    }
  },
  {
    id: "tmpl-14",
    name: "The Emerald Lineage",
    category: "Modern",
    description: "Single column with timeline style divider blocks and emerald-green highlights.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "emerald-modern",
      fontFamilyId: "outfit",
      dividerStyle: "timeline",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },

  // --- CREATIVE TEMPLATES ---
  {
    id: "tmpl-15",
    name: "The Creative Designer",
    category: "Creative",
    description: "Bold sunset orange gradient header, custom badges, and asymmetrical columns to make your design portfolio pop.",
    style: {
      layout: "right-sidebar",
      headerStyle: "bold-banner",
      colorPaletteId: "sunset-orange",
      fontFamilyId: "outfit",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: true
    }
  },
  {
    id: "tmpl-16",
    name: "The Purple Bold Banner",
    category: "Creative",
    description: "Royal purple top block banner with large white text name, ideal for content creators, artists, and marketers.",
    style: {
      layout: "single-column",
      headerStyle: "bold-banner",
      colorPaletteId: "royal-purple",
      fontFamilyId: "outfit",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "relaxed",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-17",
    name: "The Sunset Block",
    category: "Creative",
    description: "Two-column right-sidebar with modern accent blocks and sunset colors. Bold and youthful representation.",
    style: {
      layout: "right-sidebar",
      headerStyle: "split-profile",
      colorPaletteId: "sunset-orange",
      fontFamilyId: "inter",
      dividerStyle: "accent-block",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: true
    }
  },
  {
    id: "tmpl-18",
    name: "The Teal Innovator",
    category: "Creative",
    description: "Three-column grid with custom cyan pills. Dynamic layout for startup employees, growth hackers, and innovators.",
    style: {
      layout: "three-column",
      headerStyle: "split-profile",
      colorPaletteId: "teal-clean",
      fontFamilyId: "outfit",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "normal",
      margins: "narrow",
      showAvatars: true
    }
  },
  {
    id: "tmpl-19",
    name: "The Neon Noir",
    category: "Creative",
    description: "A dark theme layout containing rich dark background panels, sky-blue neon text details, and rounded shapes.",
    style: {
      layout: "left-sidebar",
      headerStyle: "bold-banner",
      colorPaletteId: "dark-noir",
      fontFamilyId: "outfit",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-20",
    name: "The Rose Artisan",
    category: "Creative",
    description: "Single column with elegant rose text dividers, centered header, and spacious margins. Fits gallery coordinators and brand leads.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "warm-burgundy",
      fontFamilyId: "playfair",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "relaxed",
      margins: "wide",
      showAvatars: false
    }
  },
  {
    id: "tmpl-21",
    name: "The Forest Creator",
    category: "Creative",
    description: "Two-column layout in warm green tones with profile block. Gives a natural, craft-focused aesthetic.",
    style: {
      layout: "left-sidebar",
      headerStyle: "split-profile",
      colorPaletteId: "emerald-modern",
      fontFamilyId: "inter",
      dividerStyle: "accent-block",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: true
    }
  },

  // --- ACADEMIC TEMPLATES ---
  {
    id: "tmpl-22",
    name: "The Scholar",
    category: "Academic",
    description: "Strict serif font, compact margins, and extended lists. Classic CV design for research researchers and teachers.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "playfair",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-23",
    name: "The Classic CV Researcher",
    category: "Academic",
    description: "Double-column serif layout with a narrow right sidebar for publications metadata and contact details.",
    style: {
      layout: "right-sidebar",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "playfair",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-24",
    name: "The Ivy League Fellow",
    category: "Academic",
    description: "Classic serif typography with rich navy headers. Suitable for postdocs, professors, and grant applications.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "classic-navy",
      fontFamilyId: "playfair",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-25",
    name: "The Medical Scientist",
    category: "Academic",
    description: "Clean layout with subtle emerald highlights. Designed for physicians, clinical trials managers, and labs researchers.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "emerald-modern",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-26",
    name: "The Deep Archive Scholar",
    category: "Academic",
    description: "Centered name, double accent lines, and generous margins. Best for literature, humanities, and arts PhDs.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "playfair",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "relaxed",
      margins: "wide",
      showAvatars: false
    }
  },
  {
    id: "tmpl-27",
    name: "The STEM Investigator",
    category: "Academic",
    description: "Split header, sans-serif body, but classic academic section divisions. Fits math and engineering faculty.",
    style: {
      layout: "split-header",
      headerStyle: "minimalist",
      colorPaletteId: "classic-navy",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "normal",
      showAvatars: false
    }
  },

  // --- TECHNICAL TEMPLATES ---
  {
    id: "tmpl-28",
    name: "The Silicon Valley Engineer",
    category: "Technical",
    description: "Monospace coding font, markdown-style headers, and clean tags. Tailored for engineers, Devops, and Sysadmins.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "fira-code",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-29",
    name: "The Dark Developer Console",
    category: "Technical",
    description: "Featuring a slate-900 dark header card, monospace fonts, and sky-blue variables indicators. Extremely premium tech feel.",
    style: {
      layout: "single-column",
      headerStyle: "bold-banner",
      colorPaletteId: "dark-noir",
      fontFamilyId: "fira-code",
      dividerStyle: "accent-block",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-30",
    name: "The DevOps Operator",
    category: "Technical",
    description: "Two-column left-sidebar layout with monochrome-slate and Fira Code fonts. High packing efficiency for cloud tools.",
    style: {
      layout: "left-sidebar",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "fira-code",
      dividerStyle: "accent-block",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-31",
    name: "The Data Scientist Grid",
    category: "Technical",
    description: "Left sidebar dark-noir theme, with clean monospace coding tags. Excellent for displaying mathematical models and python packages.",
    style: {
      layout: "left-sidebar",
      headerStyle: "split-profile",
      colorPaletteId: "dark-noir",
      fontFamilyId: "fira-code",
      dividerStyle: "pill-badges",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: true
    }
  },
  {
    id: "tmpl-32",
    name: "The Web Artisan Teal",
    category: "Technical",
    description: "Ocean teal highlights on single-column monospace framework structure. Perfect for frontend devs and javascript architects.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "teal-clean",
      fontFamilyId: "fira-code",
      dividerStyle: "pill-badges",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-33",
    name: "The Cybersecurity Matrix",
    category: "Technical",
    description: "Monochrome slate with timeline dividers. Highlights security audits, bug bounties, and cryptography projects.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "fira-code",
      dividerStyle: "timeline",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-34",
    name: "The Deep Tech Lead",
    category: "Technical",
    description: "Split-header layout combining sans-serif headings with monospace bullet points. Ideal for engineering leads and PMs.",
    style: {
      layout: "split-header",
      headerStyle: "minimalist",
      colorPaletteId: "classic-navy",
      fontFamilyId: "fira-code",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },

  // --- MINIMALIST TEMPLATES ---
  {
    id: "tmpl-35",
    name: "The Zen Minimalist",
    category: "Minimalist",
    description: "Extreme focus on margins, whitespace, and bare typography. Simple grey headings. Perfect for designers and copywriters.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "relaxed",
      margins: "wide",
      showAvatars: false
    }
  },
  {
    id: "tmpl-36",
    name: "The Clean Sheet",
    category: "Minimalist",
    description: "A compact single-column sheet that fits an entire career onto exactly one page with a simple bottom divider accent.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "inter",
      dividerStyle: "accent-block",
      fontSize: "sm",
      spacing: "compact",
      margins: "narrow",
      showAvatars: false
    }
  },
  {
    id: "tmpl-37",
    name: "The Minimalist Sidebar",
    category: "Minimalist",
    description: "Two-column layout in black and white with no backgrounds. High spacing efficiency and a structured presentation.",
    style: {
      layout: "left-sidebar",
      headerStyle: "minimalist",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "sm",
      spacing: "compact",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-38",
    name: "The Geometry Dot",
    category: "Minimalist",
    description: "Delicate dots and thin lines in outfit geometric sans font. Elegant modern minimalism.",
    style: {
      layout: "single-column",
      headerStyle: "minimalist",
      colorPaletteId: "teal-clean",
      fontFamilyId: "outfit",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-39",
    name: "The Classic Slate Sheet",
    category: "Minimalist",
    description: "Centered heading with clean standard sans-serif layout. Standard corporate look done with premium spacing.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "inter",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "normal",
      margins: "normal",
      showAvatars: false
    }
  },
  {
    id: "tmpl-40",
    name: "The Elegant Minimalist",
    category: "Minimalist",
    description: "Double accent lines, elegant serif headlines, and spacious margins. Exudes subtle premium class.",
    style: {
      layout: "single-column",
      headerStyle: "accent-line",
      colorPaletteId: "monochrome-slate",
      fontFamilyId: "playfair",
      dividerStyle: "simple",
      fontSize: "md",
      spacing: "relaxed",
      margins: "wide",
      showAvatars: false
    }
  }
];
