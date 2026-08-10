export type BoardShapeKind =
    | "box"
    | "service"
    | "database"
    | "circle"
    | "diamond"
    | "queue"
    | "cloud"
    | "actor"
    | "arrow"
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
}

export const SHAPE_PALETTE: {
    kind: BoardShapeKind;
    label: string;
    defaultLabel: string;
    w: number;
    h: number;
}[] = [
    { kind: "box", label: "Box", defaultLabel: "Component", w: 140, h: 72 },
    { kind: "service", label: "Service", defaultLabel: "Service", w: 150, h: 70 },
    { kind: "database", label: "Database", defaultLabel: "DB", w: 100, h: 110 },
    { kind: "circle", label: "Circle", defaultLabel: "Cache", w: 90, h: 90 },
    { kind: "diamond", label: "Decision", defaultLabel: "Decide", w: 110, h: 110 },
    { kind: "queue", label: "Queue", defaultLabel: "Queue", w: 150, h: 64 },
    { kind: "cloud", label: "Cloud", defaultLabel: "CDN / Cloud", w: 140, h: 80 },
    { kind: "actor", label: "User", defaultLabel: "Client", w: 80, h: 110 },
    { kind: "arrow", label: "Arrow", defaultLabel: "", w: 120, h: 40 },
    { kind: "text", label: "Text", defaultLabel: "Note", w: 140, h: 44 },
];

export function defaultSizeForKind(kind: BoardShapeKind): { w: number; h: number; label: string } {
    const found = SHAPE_PALETTE.find((s) => s.kind === kind);
    if (found) {
        return { w: found.w, h: found.h, label: found.defaultLabel };
    }
    switch (kind) {
        case "box":
        case "service":
        case "database":
        case "circle":
        case "diamond":
        case "queue":
        case "cloud":
        case "actor":
        case "arrow":
        case "text":
            return { w: 120, h: 70, label: "Node" };
        default: {
            const _exhaustive: never = kind;
            return { w: 120, h: 70, label: String(_exhaustive) };
        }
    }
}

export function createBoardShape(
    kind: BoardShapeKind,
    x: number,
    y: number,
    labelOverride?: string
): BoardShape {
    const defaults = defaultSizeForKind(kind);
    return {
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        x,
        y,
        w: defaults.w,
        h: defaults.h,
        label: labelOverride ?? defaults.label,
    };
}

export function summarizeBoard(shapes: BoardShape[], hasFreehand: boolean): string {
    if (shapes.length === 0 && !hasFreehand) {
        return "(empty whiteboard)";
    }
    const lines = shapes.map((s, i) => {
        switch (s.kind) {
            case "box":
            case "service":
            case "database":
            case "circle":
            case "diamond":
            case "queue":
            case "cloud":
            case "actor":
            case "arrow":
            case "text":
                return `${i + 1}. ${s.kind}${s.label ? ` labeled "${s.label}"` : ""} at (${Math.round(s.x)},${Math.round(s.y)})`;
            default: {
                const _exhaustive: never = s.kind;
                return `${i + 1}. unknown(${_exhaustive})`;
            }
        }
    });
    if (hasFreehand) {
        lines.push("Plus freehand sketch strokes on the canvas.");
    }
    return lines.join("\n");
}
