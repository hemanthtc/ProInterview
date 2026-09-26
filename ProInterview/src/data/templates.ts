export interface ResumeTemplate {
    id: string;
    name: string;
    description: string;
    thumbnailColor: string; // CSS gradient classes for selector
    accentColor: string;    // Hex color for dividers/headings in download
    fontFamily: string;     // Font stack
    headerAlign: "left" | "center";
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
    {
        id: "modern",
        name: "Modern Indigo",
        description: "Professional sans-serif layout with sleek indigo headings and clean borders.",
        thumbnailColor: "from-indigo-600 to-indigo-400 border-indigo-400",
        accentColor: "#4f46e5",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        headerAlign: "left"
    },
    {
        id: "classic",
        name: "Classic Serif",
        description: "Elegant serif typography with centered headers and traditional double dividers.",
        thumbnailColor: "from-neutral-700 to-neutral-500 border-neutral-500",
        accentColor: "#111111",
        fontFamily: "Georgia, 'Times New Roman', Times, serif",
        headerAlign: "center"
    },
    {
        id: "minimalist",
        name: "Minimalist Slate",
        description: "Clean, distraction-free aesthetic with high readability and subtle slate accents.",
        thumbnailColor: "from-slate-600 to-slate-400 border-slate-400",
        accentColor: "#475569",
        fontFamily: "Calibri, Arial, sans-serif",
        headerAlign: "left"
    },
    {
        id: "creative",
        name: "Creative Teal",
        description: "Dynamic left sidebar layout separating contact info from experience highlights.",
        thumbnailColor: "from-teal-600 to-teal-400 border-teal-400",
        accentColor: "#0d9488",
        fontFamily: "Tahoma, Geneva, sans-serif",
        headerAlign: "left"
    }
];
