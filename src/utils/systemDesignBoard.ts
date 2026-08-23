export type BoardShapeKind =
    // Basic Shapes
    | "box"
    | "circle"
    | "diamond"
    | "cloud"
    | "triangle"
    | "pentagon"
    | "hexagon"
    | "octagon"
    | "parallelogram"
    | "trapezoid"
    | "cross"
    | "heart"
    | "star"
    // Flowchart
    | "terminator"
    | "io-parallelogram"
    | "document"
    | "predefined-process"
    | "manual-input"
    | "preparation"
    | "merge"
    | "connector"
    // Lines & Arrows
    | "arrow"
    | "line"
    | "dashed-line"
    | "double-arrow"
    | "curved-arrow"
    // Block Arrows
    | "arrow-right-block"
    | "arrow-left-block"
    | "arrow-up-block"
    | "arrow-down-block"
    | "chevron"
    | "notched-arrow"
    | "u-turn-arrow"
    // Rectangles
    | "rounded-rect"
    | "snipped-rect"
    | "double-border-rect"
    | "folded-corner"
    // Stars & Banners
    | "star-4"
    | "star-5"
    | "star-6"
    | "burst"
    | "banner-ribbon"
    | "banner-scroll"
    // Callouts
    | "callout-rect"
    | "callout-rounded"
    | "callout-cloud"
    | "callout-line"
    // System Design Specific
    | "service"
    | "database"
    | "queue"
    | "actor"
    | "text";

export type WhiteboardTool = "select" | "draw" | "erase";

export interface BoardShape {
    id: string;
    kind: BoardShapeKind;
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    x2?: number; // Optional endpoint for lines
    y2?: number; // Optional endpoint for lines
}

export interface ShapePaletteEntry {
    kind: BoardShapeKind;
    label: string;
    defaultLabel: string;
    w: number;
    h: number;
}

export interface ShapeCategory {
    name: string;
    defaultOpen: boolean;
    shapes: ShapePaletteEntry[];
}

export const SHAPE_CATEGORIES: ShapeCategory[] = [
    {
        name: "Basic Shapes",
        defaultOpen: false,
        shapes: [
            { kind: "box", label: "Rectangle", defaultLabel: "Component", w: 140, h: 72 },
            { kind: "circle", label: "Circle", defaultLabel: "Cache", w: 90, h: 90 },
            { kind: "diamond", label: "Diamond", defaultLabel: "Decide", w: 110, h: 110 },
            { kind: "cloud", label: "Cloud", defaultLabel: "CDN / Cloud", w: 140, h: 80 },
            { kind: "triangle", label: "Triangle", defaultLabel: "Triangle", w: 100, h: 90 },
            { kind: "pentagon", label: "Pentagon", defaultLabel: "Pentagon", w: 100, h: 95 },
            { kind: "hexagon", label: "Hexagon", defaultLabel: "Hexagon", w: 110, h: 95 },
            { kind: "octagon", label: "Octagon", defaultLabel: "Stop", w: 95, h: 95 },
            { kind: "parallelogram", label: "Parallelogram", defaultLabel: "Parallelogram", w: 140, h: 72 },
            { kind: "trapezoid", label: "Trapezoid", defaultLabel: "Trapezoid", w: 130, h: 72 },
            { kind: "cross", label: "Cross", defaultLabel: "Cross", w: 90, h: 90 },
            { kind: "heart", label: "Heart", defaultLabel: "Heart", w: 90, h: 85 },
            { kind: "star", label: "Star", defaultLabel: "Star", w: 95, h: 90 },
        ],
    },
    {
        name: "Flowchart",
        defaultOpen: false,
        shapes: [
            { kind: "box", label: "Process", defaultLabel: "Process", w: 140, h: 72 },
            { kind: "diamond", label: "Decision", defaultLabel: "Decide", w: 110, h: 110 },
            { kind: "terminator", label: "Terminator", defaultLabel: "Start / End", w: 140, h: 56 },
            { kind: "io-parallelogram", label: "I/O", defaultLabel: "Input / Output", w: 140, h: 72 },
            { kind: "document", label: "Document", defaultLabel: "Document", w: 130, h: 90 },
            { kind: "predefined-process", label: "Predefined Process", defaultLabel: "Sub-process", w: 140, h: 72 },
            { kind: "manual-input", label: "Manual Input", defaultLabel: "Manual Input", w: 130, h: 80 },
            { kind: "preparation", label: "Preparation", defaultLabel: "Prepare", w: 130, h: 72 },
            { kind: "merge", label: "Merge", defaultLabel: "Merge", w: 100, h: 80 },
            { kind: "connector", label: "Connector", defaultLabel: "", w: 50, h: 50 },
        ],
    },
    {
        name: "Lines & Arrows",
        defaultOpen: false,
        shapes: [
            { kind: "arrow", label: "Arrow", defaultLabel: "", w: 120, h: 40 },
            { kind: "line", label: "Line", defaultLabel: "", w: 120, h: 24 },
            { kind: "dashed-line", label: "Dashed Line", defaultLabel: "", w: 120, h: 24 },
            { kind: "double-arrow", label: "Double Arrow", defaultLabel: "", w: 120, h: 40 },
            { kind: "curved-arrow", label: "Curved Arrow", defaultLabel: "", w: 120, h: 60 },
        ],
    },
    {
        name: "Block Arrows",
        defaultOpen: false,
        shapes: [
            { kind: "arrow-right-block", label: "Right", defaultLabel: "", w: 120, h: 60 },
            { kind: "arrow-left-block", label: "Left", defaultLabel: "", w: 120, h: 60 },
            { kind: "arrow-up-block", label: "Up", defaultLabel: "", w: 60, h: 100 },
            { kind: "arrow-down-block", label: "Down", defaultLabel: "", w: 60, h: 100 },
            { kind: "chevron", label: "Chevron", defaultLabel: "", w: 120, h: 60 },
            { kind: "notched-arrow", label: "Notched", defaultLabel: "", w: 130, h: 60 },
            { kind: "u-turn-arrow", label: "U-Turn", defaultLabel: "", w: 90, h: 100 },
        ],
    },
    {
        name: "Rectangles",
        defaultOpen: false,
        shapes: [
            { kind: "rounded-rect", label: "Rounded", defaultLabel: "Rounded", w: 140, h: 72 },
            { kind: "snipped-rect", label: "Snipped Corner", defaultLabel: "Snipped", w: 140, h: 72 },
            { kind: "double-border-rect", label: "Double Border", defaultLabel: "Container", w: 140, h: 72 },
            { kind: "folded-corner", label: "Folded Corner", defaultLabel: "Note", w: 120, h: 90 },
        ],
    },
    {
        name: "Stars & Banners",
        defaultOpen: false,
        shapes: [
            { kind: "star-4", label: "4-Point Star", defaultLabel: "Star", w: 90, h: 90 },
            { kind: "star-5", label: "5-Point Star", defaultLabel: "Star", w: 95, h: 90 },
            { kind: "star-6", label: "6-Point Star", defaultLabel: "Star", w: 95, h: 90 },
            { kind: "burst", label: "Burst", defaultLabel: "New!", w: 100, h: 100 },
            { kind: "banner-ribbon", label: "Ribbon", defaultLabel: "Banner", w: 160, h: 60 },
            { kind: "banner-scroll", label: "Scroll", defaultLabel: "Scroll", w: 140, h: 80 },
        ],
    },
    {
        name: "Callouts",
        defaultOpen: false,
        shapes: [
            { kind: "callout-rect", label: "Rectangular", defaultLabel: "Callout", w: 140, h: 90 },
            { kind: "callout-rounded", label: "Rounded", defaultLabel: "Callout", w: 140, h: 90 },
            { kind: "callout-cloud", label: "Cloud", defaultLabel: "Thought", w: 140, h: 100 },
            { kind: "callout-line", label: "Line", defaultLabel: "Note", w: 140, h: 80 },
        ],
    },
    {
        name: "System Design",
        defaultOpen: false,
        shapes: [
            { kind: "service", label: "Service", defaultLabel: "Service", w: 150, h: 70 },
            { kind: "database", label: "Database", defaultLabel: "DB", w: 100, h: 110 },
            { kind: "queue", label: "Queue", defaultLabel: "Queue", w: 150, h: 64 },
            { kind: "actor", label: "User / Actor", defaultLabel: "Client", w: 80, h: 110 },
            { kind: "text", label: "Text Label", defaultLabel: "Note", w: 140, h: 44 },
        ],
    },
];

// Flat palette kept for backward compat (union of all category shapes, de-duplicated by kind)
export const SHAPE_PALETTE: ShapePaletteEntry[] = (() => {
    const seen = new Set<BoardShapeKind>();
    const flat: ShapePaletteEntry[] = [];
    for (const cat of SHAPE_CATEGORIES) {
        for (const s of cat.shapes) {
            if (!seen.has(s.kind)) {
                seen.add(s.kind);
                flat.push(s);
            }
        }
    }
    return flat;
})();

export function defaultSizeForKind(kind: BoardShapeKind): { w: number; h: number; label: string } {
    const found = SHAPE_PALETTE.find((s) => s.kind === kind);
    if (found) {
        return { w: found.w, h: found.h, label: found.defaultLabel };
    }
    return { w: 120, h: 70, label: "Node" };
}

export function createBoardShape(
    kind: BoardShapeKind,
    x: number,
    y: number,
    labelOverride?: string
): BoardShape {
    const defaults = defaultSizeForKind(kind);
    const shape: BoardShape = {
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        x,
        y,
        w: defaults.w,
        h: defaults.h,
        label: labelOverride ?? defaults.label,
    };

    if (["arrow", "line", "dashed-line", "double-arrow", "curved-arrow", "callout-line"].includes(kind)) {
        shape.x2 = x + defaults.w;
        shape.y2 = y + defaults.h; // default angled or horizontal connection line
    }

    return shape;
}

export function summarizeBoard(shapes: BoardShape[], hasFreehand: boolean): string {
    if (shapes.length === 0 && !hasFreehand) {
        return "(empty whiteboard)";
    }
    const lines = shapes.map((s, i) => {
        return `${i + 1}. ${s.kind}${s.label ? ` labeled "${s.label}"` : ""} at (${Math.round(s.x)},${Math.round(s.y)})`;
    });
    if (hasFreehand) {
        lines.push("Plus freehand sketch strokes on the canvas.");
    }
    return lines.join("\n");
}
