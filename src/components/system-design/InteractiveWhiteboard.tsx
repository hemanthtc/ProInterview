"use client";

import {
    forwardRef,
    useEffect,
    useId,
    useImperativeHandle,
    useRef,
    useState,
    type DragEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { Download, Eraser, MousePointer2, PenLine, Trash2, ChevronDown, FolderOpen, FolderClosed } from "lucide-react";
import {
    BoardShape,
    BoardShapeKind,
    SHAPE_CATEGORIES,
    SHAPE_PALETTE,
    WhiteboardTool,
    createBoardShape,
} from "@/utils/systemDesignBoard";

interface InteractiveWhiteboardProps {
    shapes: BoardShape[];
    onShapesChange: (shapes: BoardShape[]) => void;
    onFreehandChange?: (hasInk: boolean) => void;
    theme?: "dark" | "light" | "eyeprotect";
    isLight?: boolean;
}

export interface InteractiveWhiteboardHandle {
    /** Renders the current ink + shapes to a PNG data URL without triggering a download. */
    getPngDataUrl: () => string | null;
}

function ShapeVisual({ shape }: { shape: BoardShape }) {
    const isLine = typeof shape.x2 === "number" && typeof shape.y2 === "number";

    const commonLabel =
        shape.label && !["arrow", "line", "dashed-line", "double-arrow", "curved-arrow"].includes(shape.kind) ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-cyan-50 z-[1] select-none break-all line-clamp-3">
                {shape.label}
            </span>
        ) : null;

    // Bounds calculations
    const w = isLine ? Math.max(16, Math.abs(shape.x2! - shape.x)) : 100;
    const h = isLine ? Math.max(16, Math.abs(shape.y2! - shape.y)) : 100;

    const svgProps = {
        className: "absolute inset-0 w-full h-full pointer-events-none",
        viewBox: `0 0 ${w} ${h}`,
        preserveAspectRatio: "none",
    };

    // local points mapping
    const x1_loc = isLine ? (shape.x2! >= shape.x ? 0 : w) : 0;
    const y1_loc = isLine ? (shape.y2! >= shape.y ? 0 : h) : 0;
    const x2_loc = isLine ? (shape.x2! >= shape.x ? w : 0) : 100;
    const y2_loc = isLine ? (shape.y2! >= shape.y ? h : 0) : 100;

    const stroke = isLine ? "#818cf8" : "#22d3ee";
    const fill = isLine ? "none" : "rgba(8, 47, 73, 0.7)";
    const strokeWidth = "2.5";

    let svgContent = null;

    if (isLine) {
        switch (shape.kind) {
            case "arrow":
                svgContent = (
                    <g>
                        <defs>
                            <marker id={`arrowhead-${shape.id}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill={stroke} />
                            </marker>
                        </defs>
                        <line x1={x1_loc} y1={y1_loc} x2={x2_loc} y2={y2_loc} stroke={stroke} strokeWidth={strokeWidth} markerEnd={`url(#arrowhead-${shape.id})`} />
                    </g>
                );
                break;
            case "line":
                svgContent = <line x1={x1_loc} y1={y1_loc} x2={x2_loc} y2={y2_loc} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "dashed-line":
                svgContent = <line x1={x1_loc} y1={y1_loc} x2={x2_loc} y2={y2_loc} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="8,6" />;
                break;
            case "double-arrow":
                svgContent = (
                    <g>
                        <defs>
                            <marker id={`arrowhead-start-${shape.id}`} markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
                                <polygon points="8 0, 0 3, 8 6" fill={stroke} />
                            </marker>
                            <marker id={`arrowhead-end-${shape.id}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill={stroke} />
                            </marker>
                        </defs>
                        <line x1={x1_loc} y1={y1_loc} x2={x2_loc} y2={y2_loc} stroke={stroke} strokeWidth={strokeWidth} markerStart={`url(#arrowhead-start-${shape.id})`} markerEnd={`url(#arrowhead-end-${shape.id})`} />
                    </g>
                );
                break;
            case "curved-arrow":
                const ctrlX = (x1_loc + x2_loc) / 2;
                const ctrlY = Math.min(y1_loc, y2_loc) - 24;
                svgContent = (
                    <g>
                        <defs>
                            <marker id={`arrowhead-curve-${shape.id}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill={stroke} />
                            </marker>
                        </defs>
                        <path d={`M ${x1_loc} ${y1_loc} Q ${ctrlX} ${ctrlY} ${x2_loc} ${y2_loc}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} markerEnd={`url(#arrowhead-curve-${shape.id})`} />
                    </g>
                );
                break;
            default:
                svgContent = <line x1={x1_loc} y1={y1_loc} x2={x2_loc} y2={y2_loc} stroke={stroke} strokeWidth={strokeWidth} />;
        }
    } else {
        switch (shape.kind) {
            // --- BASIC SHAPES ---
            case "box":
                svgContent = <rect x="2" y="2" width="96" height="96" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "circle":
                svgContent = <circle cx="50" cy="50" r="46" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "diamond":
                svgContent = <polygon points="50,3 97,50 50,97 3,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "cloud":
                svgContent = <path d="M 25,65 A 20,20 0 0,1 35,28 A 22,22 0 0,1 75,30 A 18,18 0 0,1 80,65 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "triangle":
                svgContent = <polygon points="50,4 96,94 4,94" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "pentagon":
                svgContent = <polygon points="50,4 96,38 78,94 22,94 4,38" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "hexagon":
                svgContent = <polygon points="25,4 75,4 96,50 75,96 25,96 4,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "octagon":
                svgContent = <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "parallelogram":
                svgContent = <polygon points="20,4 96,4 80,96 4,96" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "trapezoid":
                svgContent = <polygon points="25,4 75,4 96,96 4,96" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "cross":
                svgContent = <polygon points="35,4 65,4 65,35 96,35 96,65 65,65 65,96 35,96 35,65 4,65 4,35 35,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "heart":
                svgContent = <path d="M 50,30 C 50,10 20,10 20,35 C 20,60 50,85 50,94 C 50,85 80,60 80,35 C 80,10 50,10 50,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "star":
                svgContent = <polygon points="50,4 63,35 96,38 72,61 78,94 50,78 22,94 28,61 4,38 37,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;

            // --- FLOWCHART ---
            case "terminator":
                svgContent = <rect x="2" y="2" width="96" height="96" rx="45" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "io-parallelogram":
                svgContent = <polygon points="15,4 96,4 85,96 4,96" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "document":
                svgContent = <path d="M 4,4 L 96,4 L 96,80 Q 72,96 48,80 Q 24,64 4,80 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "predefined-process":
                svgContent = (
                    <g>
                        <rect x="2" y="2" width="96" height="96" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                        <line x1="15" y1="2" x2="15" y2="98" stroke={stroke} strokeWidth={strokeWidth} />
                        <line x1="85" y1="2" x2="85" y2="98" stroke={stroke} strokeWidth={strokeWidth} />
                    </g>
                );
                break;
            case "manual-input":
                svgContent = <polygon points="4,24 96,4 96,96 4,96" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "preparation":
                svgContent = <polygon points="15,50 30,4 70,4 85,50 70,96 30,96" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "merge":
                svgContent = <polygon points="4,4 96,4 50,96" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "connector":
                svgContent = <circle cx="50" cy="50" r="40" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;

            // --- RECTANGLES ---
            case "rounded-rect":
                svgContent = <rect x="2" y="2" width="96" height="96" rx="20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "snipped-rect":
                svgContent = <polygon points="12,2 88,2 98,12 98,88 88,98 12,98 2,88 2,12" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "double-border-rect":
                svgContent = (
                    <g>
                        <rect x="2" y="2" width="96" height="96" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                        <rect x="8" y="8" width="84" height="84" fill="none" stroke={stroke} strokeWidth="1.5" />
                    </g>
                );
                break;
            case "folded-corner":
                svgContent = <polygon points="2,2 80,2 98,20 98,98 2,98" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;

            // --- STARS & BANNERS ---
            case "star-4":
                svgContent = <polygon points="50,2 62,38 98,50 62,62 50,98 38,62 2,50 38,38" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "star-5":
                svgContent = <polygon points="50,4 63,35 96,38 72,61 78,94 50,78 22,94 28,61 4,38 37,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "star-6":
                svgContent = <polygon points="50,2 65,30 96,30 75,50 90,80 50,65 10,80 25,50 4,30 35,30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "burst":
                svgContent = <polygon points="50,4 58,25 78,12 72,32 94,30 80,48 96,65 76,68 82,88 64,80 58,96 46,84 34,94 28,76 10,82 18,62 4,55 18,42 12,22 30,30 36,10 46,24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "banner-ribbon":
                svgContent = <polygon points="4,20 96,20 88,50 96,80 4,80 12,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "banner-scroll":
                svgContent = <path d="M 10,30 C 10,10 40,10 40,30 L 40,70 C 40,90 70,90 70,70 L 70,30" fill="none" stroke={stroke} strokeWidth={strokeWidth} />;
                break;

            // --- CALLOUTS ---
            case "callout-rect":
                svgContent = <polygon points="2,2 98,2 98,70 55,70 45,95 35,70 2,70" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
                break;
            case "callout-rounded":
                svgContent = (
                    <g>
                        <rect x="2" y="2" width="96" height="70" rx="16" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                        <polygon points="45,71 45,95 25,71" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    </g>
                );
                break;
            case "callout-cloud":
                svgContent = (
                    <g>
                        <path d="M 25,55 A 15,15 0 0,1 35,22 A 18,18 0 0,1 70,24 A 14,14 0 0,1 75,55 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                        <circle cx="25" cy="70" r="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
                        <circle cx="15" cy="82" r="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
                    </g>
                );
                break;
            case "callout-line":
                svgContent = (
                    <g>
                        <line x1="10" y1="90" x2="45" y2="45" stroke={stroke} strokeWidth={strokeWidth} />
                        <rect x="45" y="10" width="50" height="35" fill={fill} stroke={stroke} strokeWidth="1.5" />
                    </g>
                );
                break;

            // --- SYSTEM DESIGN SPECIFIC ---
            case "service":
                svgContent = <rect x="2" y="2" width="96" height="96" rx="12" fill="rgba(6,78,59,0.5)" stroke="#34d399" strokeWidth={strokeWidth} />;
                break;
            case "database":
                svgContent = (
                    <g>
                        <path d="M 4,20 C 4,5 96,5 96,20 L 96,80 C 96,95 4,95 4,80 Z" fill="rgba(120,53,4,0.5)" stroke="#fbbf24" strokeWidth={strokeWidth} />
                        <path d="M 4,20 C 4,35 96,35 96,20" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                        <path d="M 4,50 C 4,65 96,65 96,50" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                    </g>
                );
                break;
            case "queue":
                svgContent = (
                    <g>
                        <rect x="2" y="2" width="96" height="96" rx="4" fill="rgba(8,47,73,0.5)" stroke="#38bdf8" strokeWidth={strokeWidth} />
                        <line x1="25" y1="2" x2="25" y2="98" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="50" y1="2" x2="50" y2="98" stroke="#38bdf8" strokeWidth="1.5" />
                        <line x1="75" y1="2" x2="75" y2="98" stroke="#38bdf8" strokeWidth="1.5" />
                    </g>
                );
                break;
            case "actor":
                svgContent = (
                    <g fill="none" stroke="#a78bfa" strokeWidth={strokeWidth}>
                        {/* Head */}
                        <circle cx="50" cy="25" r="16" />
                        {/* Body/Arms */}
                        <path d="M 15,55 L 85,55 M 50,41 L 50,75 M 50,75 L 25,96 M 50,75 L 75,96" />
                    </g>
                );
                break;
            case "text":
                svgContent = <rect x="2" y="2" width="96" height="96" rx="4" fill="none" stroke="#ffffff" strokeDasharray="3,3" strokeWidth="1" />;
                break;

            default:
                svgContent = <rect x="2" y="2" width="96" height="96" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
        }
    }

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg {...svgProps}>
                {svgContent}
            </svg>
            {commonLabel}
        </div>
    );
}

function MiniShapeSymbol({ kind }: { kind: BoardShapeKind }) {
    const stroke = "#818cf8";
    const fill = "rgba(129, 140, 248, 0.15)";
    const strokeWidth = "6";

    let svgContent = null;
    switch (kind) {
        case "box":
            svgContent = <rect x="8" y="8" width="84" height="84" rx="8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "circle":
            svgContent = <circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "diamond":
            svgContent = <polygon points="50,8 92,50 50,92 8,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "cloud":
            svgContent = <path d="M 25,65 A 20,20 0 0,1 35,28 A 22,22 0 0,1 75,30 A 18,18 0 0,1 80,65 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "triangle":
            svgContent = <polygon points="50,8 92,90 8,90" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "pentagon":
            svgContent = <polygon points="50,8 92,38 77,90 23,90 8,38" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "hexagon":
            svgContent = <polygon points="25,8 75,8 92,50 75,92 25,92 8,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "octagon":
            svgContent = <polygon points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "parallelogram":
            svgContent = <polygon points="22,8 92,8 78,92 8,92" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "trapezoid":
            svgContent = <polygon points="25,8 75,8 92,92 8,92" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "cross":
            svgContent = <polygon points="35,8 65,8 65,35 92,35 92,65 65,65 65,92 35,92 35,65 8,65 8,35 35,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "heart":
            svgContent = <path d="M 50,30 C 50,12 22,12 22,35 C 22,58 50,82 50,90 C 50,82 78,58 78,35 C 78,12 50,12 50,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "star":
            svgContent = <polygon points="50,8 63,35 92,38 72,61 78,90 50,76 22,90 28,61 8,38 37,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "terminator":
            svgContent = <rect x="8" y="25" width="84" height="50" rx="25" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "io-parallelogram":
            svgContent = <polygon points="18,15 92,15 82,85 8,85" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "document":
            svgContent = <path d="M 8,8 L 92,8 L 92,72 Q 72,85 50,72 Q 28,59 8,72 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "predefined-process":
            svgContent = (
                <g>
                    <rect x="8" y="18" width="84" height="64" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    <line x1="22" y1="18" x2="22" y2="82" stroke={stroke} strokeWidth={strokeWidth} />
                    <line x1="78" y1="18" x2="78" y2="82" stroke={stroke} strokeWidth={strokeWidth} />
                </g>
            );
            break;
        case "manual-input":
            svgContent = <polygon points="8,30 92,12 92,88 8,88" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "preparation":
            svgContent = <polygon points="15,50 30,15 70,15 85,50 70,85 30,85" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "merge":
            svgContent = <polygon points="8,12 92,12 50,88" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "connector":
            svgContent = <circle cx="50" cy="50" r="32" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "arrow":
            svgContent = (
                <g>
                    <line x1="8" y1="50" x2="82" y2="50" stroke={stroke} strokeWidth={strokeWidth} />
                    <polygon points="92,50 76,36 76,64" fill={stroke} />
                </g>
            );
            break;
        case "line":
            svgContent = <line x1="8" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "dashed-line":
            svgContent = <line x1="8" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="14,10" />;
            break;
        case "double-arrow":
            svgContent = (
                <g>
                    <line x1="16" y1="50" x2="84" y2="50" stroke={stroke} strokeWidth={strokeWidth} />
                    <polygon points="8,50 24,36 24,64" fill={stroke} />
                    <polygon points="92,50 76,36 76,64" fill={stroke} />
                </g>
            );
            break;
        case "curved-arrow":
            svgContent = (
                <g>
                    <path d="M 12,70 Q 50,20 82,65" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
                    <polygon points="86,72 70,66 78,50" fill={stroke} />
                </g>
            );
            break;
        case "arrow-right-block":
            svgContent = <polygon points="8,35 60,35 60,18 92,50 60,82 60,65 8,65" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "arrow-left-block":
            svgContent = <polygon points="92,35 40,35 40,18 8,50 40,82 40,65 92,65" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "arrow-up-block":
            svgContent = <polygon points="35,92 35,40 18,40 50,8 82,40 65,40 65,92" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "arrow-down-block":
            svgContent = <polygon points="35,8 35,60 18,60 50,92 82,60 65,60 65,8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "chevron":
            svgContent = <polygon points="8,18 60,50 8,82 42,82 92,50 42,18" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "notched-arrow":
            svgContent = <polygon points="8,35 60,35 60,18 92,50 60,82 60,65 8,65 24,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "u-turn-arrow":
            svgContent = <path d="M 25,90 L 25,40 A 25,25 0 0,1 75,40 L 75,70 M 62,60 L 75,75 L 88,60" fill="none" stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "rounded-rect":
            svgContent = <rect x="8" y="8" width="84" height="84" rx="20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "snipped-rect":
            svgContent = <polygon points="20,8 80,8 92,20 92,80 80,92 20,92 8,80 8,20" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "double-border-rect":
            svgContent = (
                <g>
                    <rect x="8" y="8" width="84" height="84" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    <rect x="16" y="16" width="68" height="68" fill="none" stroke={stroke} strokeWidth="2" />
                </g>
            );
            break;
        case "folded-corner":
            svgContent = <polygon points="8,8 72,8 92,28 92,92 8,92" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "star-4":
            svgContent = <polygon points="50,6 62,38 94,50 62,62 50,94 38,62 6,50 38,38" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "star-5":
            svgContent = <polygon points="50,6 63,35 94,38 72,61 78,92 50,76 22,92 28,61 6,38 37,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "star-6":
            svgContent = <polygon points="50,6 65,30 94,30 75,50 90,80 50,65 10,80 25,50 6,30 35,30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "burst":
            svgContent = <polygon points="50,6 58,25 78,12 72,32 94,30 80,48 96,65 76,68 82,88 64,80 58,96 46,84 34,94 28,76 10,82 18,62 6,55 18,42 12,22 30,30 36,10 46,24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "banner-ribbon":
            svgContent = <polygon points="8,25 92,25 84,50 92,75 8,75 16,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "banner-scroll":
            svgContent = <path d="M 15,30 C 15,10 45,10 45,30 L 45,70 C 45,90 75,90 75,70 L 75,30" fill="none" stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "callout-rect":
            svgContent = <polygon points="8,15 92,15 92,70 55,70 45,90 35,70 8,70" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
            break;
        case "callout-rounded":
            svgContent = (
                <g>
                    <rect x="8" y="10" width="84" height="60" rx="12" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    <polygon points="45,71 45,90 30,71" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                </g>
            );
            break;
        case "callout-cloud":
            svgContent = (
                <g>
                    <path d="M 25,55 A 15,15 0 0,1 35,22 A 18,18 0 0,1 70,24 A 14,14 0 0,1 75,55 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    <circle cx="25" cy="70" r="5" fill={fill} stroke="none" />
                    <circle cx="18" cy="80" r="3" fill={fill} stroke="none" />
                </g>
            );
            break;
        case "callout-line":
            svgContent = (
                <g>
                    <line x1="15" y1="85" x2="45" y2="45" stroke={stroke} strokeWidth={strokeWidth} />
                    <rect x="45" y="15" width="48" height="30" fill={fill} stroke={stroke} strokeWidth="1.5" />
                </g>
            );
            break;
        case "service":
            svgContent = <rect x="8" y="18" width="84" height="64" rx="10" fill="rgba(6,78,59,0.15)" stroke="#34d399" strokeWidth={strokeWidth} />;
            break;
        case "database":
            svgContent = (
                <g>
                    <path d="M 10,25 C 10,12 90,12 90,25 L 90,75 C 90,88 10,88 10,75 Z" fill="rgba(120,53,4,0.15)" stroke="#fbbf24" strokeWidth={strokeWidth} />
                    <path d="M 10,25 C 10,38 90,38 90,25" fill="none" stroke="#fbbf24" strokeWidth="2" />
                    <path d="M 10,50 C 10,63 90,63 90,50" fill="none" stroke="#fbbf24" strokeWidth="2" />
                </g>
            );
            break;
        case "queue":
            svgContent = (
                <g>
                    <rect x="8" y="20" width="84" height="60" rx="4" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                    <line x1="28" y1="20" x2="28" y2="80" stroke={stroke} strokeWidth="2" />
                    <line x1="50" y1="20" x2="50" y2="80" stroke={stroke} strokeWidth="2" />
                    <line x1="72" y1="20" x2="72" y2="80" stroke={stroke} strokeWidth="2" />
                </g>
            );
            break;
        case "actor":
            svgContent = (
                <g fill="none" stroke="#a78bfa" strokeWidth={strokeWidth}>
                    <circle cx="50" cy="28" r="18" />
                    <path d="M 10,60 L 90,60 M 50,46 L 50,75 M 50,75 L 25,95 M 50,75 L 75,95" />
                </g>
            );
            break;
        case "text":
            svgContent = (
                <g>
                    <rect x="8" y="20" width="84" height="60" rx="4" fill="none" stroke="#ffffff" strokeDasharray="4,4" strokeWidth="2" />
                    <text x="50" y="60" fill="#ffffff" fontSize="42" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">A</text>
                </g>
            );
            break;
        default:
            svgContent = <rect x="8" y="8" width="84" height="84" rx="8" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    }

    return (
        <svg className="w-6 h-6 shrink-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {svgContent}
        </svg>
    );
}

const InteractiveWhiteboard = forwardRef<InteractiveWhiteboardHandle, InteractiveWhiteboardProps>(
    function InteractiveWhiteboard({ shapes, onShapesChange, onFreehandChange, theme = "dark", isLight = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gridCanvasRef = useRef<HTMLCanvasElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const inkRef = useRef(false);
    const dragShapeId = useRef<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const dragNode = useRef<"start" | "end" | null>(null);
    const dragNodeShapeId = useRef<string | null>(null);
    const lastDragPos = useRef({ x: 0, y: 0 });
    const [tool, setTool] = useState<WhiteboardTool>("select");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const reactId = useId();
    const [libraryOpen, setLibraryOpen] = useState(true);
    const [mobileLibraryCollapsed, setMobileLibraryCollapsed] = useState(true);

    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        SHAPE_CATEGORIES.forEach((cat) => {
            initial[cat.name] = cat.defaultOpen;
        });
        return initial;
    });

    const toggleCategory = (name: string) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    };

    const allExpanded = SHAPE_CATEGORIES.every((cat) => !!expandedCategories[cat.name]);

    const toggleExpandAll = () => {
        const nextState = !allExpanded;
        const updated: Record<string, boolean> = {};
        SHAPE_CATEGORIES.forEach((cat) => {
            updated[cat.name] = nextState;
        });
        setExpandedCategories(updated);
    };

    useEffect(() => {
        // Paint grid on separate background canvas
        const gridCanvas = gridCanvasRef.current;
        if (gridCanvas) {
            const gCtx = gridCanvas.getContext("2d");
            if (gCtx) {
                gCtx.fillStyle = "#0b1220";
                gCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
                gCtx.strokeStyle = "rgba(148,163,184,0.08)";
                gCtx.lineWidth = 1;
                for (let x = 0; x < gridCanvas.width; x += 40) {
                    gCtx.beginPath();
                    gCtx.moveTo(x, 0);
                    gCtx.lineTo(x, gridCanvas.height);
                    gCtx.stroke();
                }
                for (let y = 0; y < gridCanvas.height; y += 40) {
                    gCtx.beginPath();
                    gCtx.moveTo(0, y);
                    gCtx.lineTo(gridCanvas.width, y);
                    gCtx.stroke();
                }
            }
        }

        // Clear ink canvas (transparent)
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        inkRef.current = false;
        onFreehandChange?.(false);
        // Grid once on mount — tool changes must not wipe freestyle ink.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.strokeStyle = "#a5b4fc";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const pos = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            return {
                x: ((e.clientX - r.left) / r.width) * canvas.width,
                y: ((e.clientY - r.top) / r.height) * canvas.height,
            };
        };

        const down = (e: PointerEvent) => {
            if (tool !== "draw" && tool !== "erase") return;
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            if (tool === "erase") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.lineWidth = 22;
            } else {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = "#a5b4fc";
                ctx.lineWidth = 2.5;
            }
        };
        const move = (e: PointerEvent) => {
            if (!drawing.current || (tool !== "draw" && tool !== "erase")) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            if (tool === "draw" && !inkRef.current) {
                inkRef.current = true;
                onFreehandChange?.(true);
            }
        };
        const up = () => {
            drawing.current = false;
            ctx.globalCompositeOperation = "source-over";
            ctx.lineWidth = 2.5;
        };

        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            canvas.removeEventListener("pointerdown", down);
            canvas.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [tool, onFreehandChange]);

    function boardPointFromClient(clientX: number, clientY: number) {
        const board = boardRef.current;
        if (!board) return { x: 0, y: 0 };
        const r = board.getBoundingClientRect();
        return { x: clientX - r.left, y: clientY - r.top };
    }

    function onPaletteDragStart(e: DragEvent, kind: BoardShapeKind) {
        e.dataTransfer.setData("application/x-sd-shape", kind);
        e.dataTransfer.effectAllowed = "copy";
    }

    function onBoardDragOver(e: DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    }

    function onBoardDrop(e: DragEvent) {
        e.preventDefault();
        const kind = e.dataTransfer.getData("application/x-sd-shape") as BoardShapeKind;
        if (!kind || !SHAPE_PALETTE.some((p) => p.kind === kind)) return;
        const pt = boardPointFromClient(e.clientX, e.clientY);
        const shape = createBoardShape(kind, Math.max(8, pt.x - 40), Math.max(8, pt.y - 30));
        onShapesChange([...shapes, shape]);
        setSelectedId(shape.id);
        setTool("select");
    }

    function onShapePointerDown(e: ReactPointerEvent, shape: BoardShape) {
        if (tool !== "select") return;
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragShapeId.current = shape.id;
        const pt = boardPointFromClient(e.clientX, e.clientY);
        lastDragPos.current = pt;
        setSelectedId(shape.id);
    }

    function onEndpointPointerDown(e: ReactPointerEvent, shape: BoardShape, node: "start" | "end") {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragNode.current = node;
        dragNodeShapeId.current = shape.id;
        setSelectedId(shape.id);
    }

    function onBoardPointerMove(e: ReactPointerEvent) {
        if (tool !== "select") return;

        // 1. Dragging start/end handles of a line shape
        if (dragNode.current && dragNodeShapeId.current) {
            const id = dragNodeShapeId.current;
            const node = dragNode.current;
            const pt = boardPointFromClient(e.clientX, e.clientY);

            onShapesChange(
                shapes.map((s) => {
                    if (s.id !== id) return s;
                    if (node === "start") {
                        return { ...s, x: pt.x, y: pt.y };
                    } else {
                        return { ...s, x2: pt.x, y2: pt.y };
                    }
                })
            );
            return;
        }

        // 2. Dragging the shape body itself
        if (dragShapeId.current) {
            const id = dragShapeId.current;
            const pt = boardPointFromClient(e.clientX, e.clientY);
            const dx = pt.x - lastDragPos.current.x;
            const dy = pt.y - lastDragPos.current.y;
            lastDragPos.current = pt;

            const board = boardRef.current;
            const maxW = board?.clientWidth ?? 900;
            const maxH = board?.clientHeight ?? 560;

            onShapesChange(
                shapes.map((s) => {
                    if (s.id !== id) return s;
                    
                    const isLine = typeof s.x2 === "number" && typeof s.y2 === "number";
                    const newX = s.x + dx;
                    const newY = s.y + dy;

                    if (isLine) {
                        return {
                            ...s,
                            x: newX,
                            y: newY,
                            x2: s.x2! + dx,
                            y2: s.y2! + dy,
                        };
                    }

                    // For standard bounding box shapes, constraint inside board limits
                    const boundedX = Math.min(Math.max(0, newX), Math.max(0, maxW - s.w));
                    const boundedY = Math.min(Math.max(0, newY), Math.max(0, maxH - s.h));
                    return { ...s, x: boundedX, y: boundedY };
                })
            );
        }
    }

    function onBoardPointerUp() {
        dragShapeId.current = null;
        dragNode.current = null;
        dragNodeShapeId.current = null;
    }

    function clearCanvasInk() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        inkRef.current = false;
        onFreehandChange?.(false);
    }

    function deleteSelectedShape() {
        if (!selectedId) return;
        onShapesChange(shapes.filter((s) => s.id !== selectedId));
        setSelectedId(null);
        setEditingId(null);
    }

    function clearAll() {
        onShapesChange([]);
        setSelectedId(null);
        setEditingId(null);
        clearCanvasInk();
    }

    function buildPngDataUrl(): string | null {
        const ink = canvasRef.current;
        const grid = gridCanvasRef.current;
        const board = boardRef.current;
        if (!ink || !board) return null;
        const out = document.createElement("canvas");
        out.width = ink.width;
        out.height = ink.height;
        const ctx = out.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, out.width, out.height);
        if (grid) ctx.drawImage(grid, 0, 0);

        const rect = board.getBoundingClientRect();
        const scaleX = out.width / Math.max(1, rect.width);
        const scaleY = out.height / Math.max(1, rect.height);

        const POLYGON_MAP: Record<string, number[][]> = {
            diamond: [[50,3], [97,50], [50,97], [3,50]],
            triangle: [[50,4], [96,94], [4,94]],
            pentagon: [[50,4], [96,38], [78,94], [22,94], [4,38]],
            hexagon: [[25,4], [75,4], [96,50], [75,96], [25,96], [4,50]],
            octagon: [[30,4], [70,4], [96,30], [96,70], [70,96], [30,96], [4,70], [4,30]],
            parallelogram: [[20,4], [96,4], [80,96], [4,96]],
            trapezoid: [[25,4], [75,4], [96,96], [4,96]],
            cross: [[35,4], [65,4], [65,35], [96,35], [96,65], [65,65], [65,96], [35,96], [35,65], [4,65], [4,35], [35,35]],
            heart: [[50,30], [80,10], [90,30], [50,94], [10,30], [20,10]],
            star: [[50,4], [63,35], [96,38], [72,61], [78,94], [50,78], [22,94], [28,61], [4,38], [37,35]],
            "io-parallelogram": [[15,4], [96,4], [85,96], [4,96]],
            document: [[4,4], [96,4], [96,80], [4,80]],
            "manual-input": [[4,24], [96,4], [96,96], [4,96]],
            preparation: [[15,50], [30,4], [70,4], [85,50], [70,96], [30,96]],
            merge: [[4,4], [96,4], [50,96]],
            "arrow-right-block": [[4,35], [60,35], [60,15], [96,50], [60,85], [60,65], [4,65]],
            "arrow-left-block": [[96,35], [40,35], [40,15], [4,50], [40,85], [40,65], [96,65]],
            "arrow-up-block": [[35,96], [35,40], [15,40], [50,4], [85,40], [65,40], [65,96]],
            "arrow-down-block": [[35,4], [35,60], [15,60], [50,96], [85,60], [65,60], [65,4]],
            chevron: [[4,15], [60,50], [4,85], [40,85], [96,50], [40,15]],
            "notched-arrow": [[4,35], [60,35], [60,15], [96,50], [60,85], [60,65], [4,65], [24,50]],
            "rounded-rect": [[2,2], [98,2], [98,98], [2,98]],
            "snipped-rect": [[12,2], [88,2], [98,12], [98,88], [88,98], [12,98], [2,88], [2,12]],
            "folded-corner": [[2,2], [80,2], [98,20], [98,98], [2,98]],
            "star-4": [[50,2], [62,38], [98,50], [62,62], [50,98], [38,62], [2,50], [38,38]],
            "star-5": [[50,4], [63,35], [96,38], [72,61], [78,94], [50,78], [22,94], [28,61], [4,38], [37,35]],
            "star-6": [[50,2], [65,30], [96,30], [75,50], [90,80], [50,65], [10,80], [25,50], [4,30], [35,30]],
            "callout-rect": [[2,2], [98,2], [98,70], [55,70], [45,95], [35,70], [2,70]],
        };

        for (const shape of shapes) {
            const x = shape.x * scaleX;
            const y = shape.y * scaleY;
            const w = shape.w * scaleX;
            const h = shape.h * scaleY;
            ctx.strokeStyle = "#22d3ee";
            ctx.fillStyle = "rgba(8, 47, 73, 0.7)";
            ctx.lineWidth = 2.5;

            // Custom coloring for DB/Service
            if (shape.kind === "service") {
                ctx.strokeStyle = "#34d399";
                ctx.fillStyle = "rgba(6, 78, 59, 0.5)";
            } else if (shape.kind === "database") {
                ctx.strokeStyle = "#fbbf24";
                ctx.fillStyle = "rgba(120, 53, 4, 0.5)";
            }

            const points = POLYGON_MAP[shape.kind];

            if (points) {
                ctx.beginPath();
                points.forEach(([px, py], i) => {
                    const absX = x + (px / 100) * w;
                    const absY = y + (py / 100) * h;
                    if (i === 0) ctx.moveTo(absX, absY);
                    else ctx.lineTo(absX, absY);
                });
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (["circle", "cloud", "connector", "callout-cloud"].includes(shape.kind)) {
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (shape.kind === "arrow") {
                ctx.beginPath();
                ctx.moveTo(x, y + h / 2);
                ctx.lineTo(x + w - 12, y + h / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + w - 12, y + h / 2 - 8);
                ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w - 12, y + h / 2 + 8);
                ctx.closePath();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
            } else if (shape.kind === "line" || shape.kind === "dashed-line") {
                if (shape.kind === "dashed-line") ctx.setLineDash([10, 8]);
                ctx.beginPath();
                ctx.moveTo(x, y + h / 2);
                ctx.lineTo(x + w, y + h / 2);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (shape.kind === "double-arrow") {
                ctx.beginPath();
                ctx.moveTo(x + 12, y + h / 2);
                ctx.lineTo(x + w - 12, y + h / 2);
                ctx.stroke();
                // Arrowhead left
                ctx.beginPath();
                ctx.moveTo(x + 12, y + h / 2 - 8);
                ctx.lineTo(x, y + h / 2);
                ctx.lineTo(x + 12, y + h / 2 + 8);
                ctx.closePath();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
                // Arrowhead right
                ctx.beginPath();
                ctx.moveTo(x + w - 12, y + h / 2 - 8);
                ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w - 12, y + h / 2 + 8);
                ctx.closePath();
                ctx.fill();
            } else {
                // Default box / rounded-rect / terminator / predefined-process / manual-input / text / etc
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);
                if (shape.kind === "predefined-process") {
                    ctx.beginPath();
                    ctx.moveTo(x + 15, y);
                    ctx.lineTo(x + 15, y + h);
                    ctx.moveTo(x + w - 15, y);
                    ctx.lineTo(x + w - 15, y + h);
                    ctx.stroke();
                }
            }

            if (shape.label && !["arrow", "line", "dashed-line", "double-arrow", "curved-arrow"].includes(shape.kind)) {
                ctx.fillStyle = "#e0f2fe";
                ctx.font = `${Math.max(11, Math.round(12 * scaleX))}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(shape.label.slice(0, 28), x + w / 2, y + h / 2, w - 8);
            }
        }

        // Draw ink on top of shapes
        ctx.drawImage(ink, 0, 0);

        return out.toDataURL("image/png");
    }

    function exportPng() {
        const dataUrl = buildPngDataUrl();
        if (!dataUrl) return;
        const a = document.createElement("a");
        a.download = `system-design-board-${Date.now()}.png`;
        a.href = dataUrl;
        a.click();
    }

    useImperativeHandle(ref, () => ({
        getPngDataUrl: () => buildPngDataUrl(),
    }));

    function deleteSelected() {
        if (!selectedId) return;
        onShapesChange(shapes.filter((s) => s.id !== selectedId));
        setSelectedId(null);
        setEditingId(null);
    }

    function updateLabel(id: string, label: string) {
        onShapesChange(shapes.map((s) => (s.id === id ? { ...s, label } : s)));
    }

    const canvasInteractive = tool === "draw" || tool === "erase";
    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start w-full">
            {/* 1. Toolbar & Buttons Row (desktop: row 1 col 2, mobile: naturally top) */}
            <div className="lg:col-start-2 lg:row-start-1 flex flex-wrap items-center gap-2 w-full">
                <div className={`inline-flex rounded-xl border p-1 ${
                    theme === "eyeprotect"
                        ? "border-[#8c8578] bg-[#fffcf5] shadow-sm"
                        : isLight
                        ? "border-slate-300 bg-white shadow-sm"
                        : "border-white/10 bg-black/30"
                }`}>
                    {(
                        [
                            { id: "select" as const, icon: MousePointer2, title: "Select / move" },
                            { id: "draw" as const, icon: PenLine, title: "Freestyle draw" },
                            { id: "erase" as const, icon: Eraser, title: "Erase ink" },
                        ] as const
                    ).map((t) => {
                        const Icon = t.icon;
                        const isActive = tool === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                title={t.title}
                                onClick={() => setTool(t.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                    isActive
                                        ? theme === "eyeprotect"
                                            ? "bg-[#0b5f58] text-white font-bold"
                                            : isLight
                                            ? "bg-cyan-600 text-white font-bold shadow-sm"
                                            : "bg-cyan-500/25 text-cyan-100"
                                        : theme === "eyeprotect"
                                        ? "text-[#1c1917] hover:bg-[#f5ebd9]"
                                        : isLight
                                        ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                                        : "text-white/60 hover:text-white"
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {t.id === "select" ? "Move" : t.id === "draw" ? "Draw" : "Erase"}
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    disabled={!selectedId}
                    onClick={deleteSelectedShape}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        theme === "eyeprotect"
                            ? "border-[#8c8578] bg-[#fffcf5] text-[#1c1917] hover:bg-[#f5ebd9] shadow-sm"
                            : isLight
                            ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                            : "border-white/15 bg-white/10 text-white hover:bg-white/20"
                    }`}
                    title={selectedId ? "Delete selected shape" : "Select a shape on board to delete"}
                >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span>Delete shape</span>
                </button>
                <button
                    type="button"
                    onClick={clearAll}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                        theme === "eyeprotect"
                            ? "border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100 shadow-sm"
                            : isLight
                            ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-sm"
                            : "border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
                    }`}
                >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Clear board</span>
                </button>
                <button
                    type="button"
                    onClick={exportPng}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm ${
                        theme === "eyeprotect"
                            ? "border-[#0b5f58] bg-[#0b5f58] text-white hover:bg-[#084842]"
                            : isLight
                            ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700"
                            : "border-cyan-400/40 bg-cyan-500/25 text-cyan-100 hover:bg-cyan-500/35"
                    }`}
                >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span>Export PNG</span>
                </button>
            </div>

            {/* 2. Shape Library Sidebar (desktop: col 1 row 1-3, mobile: rendered below buttons, above description/canvas) */}
            <div 
                className={`lg:col-start-1 lg:row-start-1 lg:row-span-3 border rounded-2xl p-4 space-y-3 w-full h-full lg:max-h-[720px] lg:overflow-y-auto ${
                    theme === "eyeprotect"
                        ? "border-[#8c8578] bg-[#fffcf5] text-[#1c1917]"
                        : isLight
                        ? "border-slate-300 bg-white text-slate-800"
                        : "border-white/10 bg-black/25"
                }`}
                aria-label="Shape Palette Categories"
            >
                <div className="flex items-center justify-between gap-4 flex-wrap pb-1 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-400">Library</h4>
                        <button
                            type="button"
                            onClick={toggleExpandAll}
                            className={`text-[9px] text-indigo-400 hover:text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-400/20 hover:border-indigo-400/50 bg-indigo-500/5 transition cursor-pointer ${
                                mobileLibraryCollapsed ? "hidden lg:inline-block" : "inline-block"
                            }`}
                        >
                            {allExpanded ? "Collapse All" : "Expand All"}
                        </button>
                    </div>
                    {/* Mobile toggle */}
                    <button
                        type="button"
                        onClick={() => setMobileLibraryCollapsed(!mobileLibraryCollapsed)}
                        className="lg:hidden text-[10px] text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-400/20 px-2 py-0.5 rounded bg-cyan-500/5 cursor-pointer"
                    >
                        {mobileLibraryCollapsed ? "Expand Library" : "Collapse Library"}
                    </button>
                </div>

                {mobileLibraryCollapsed && (
                    <button
                        type="button"
                        onClick={() => setMobileLibraryCollapsed(false)}
                        className="lg:hidden w-full text-[10px] text-cyan-400 hover:text-cyan-300 font-bold border border-dashed border-cyan-400/30 rounded-lg p-3 text-center cursor-pointer bg-cyan-500/[0.02] hover:bg-cyan-500/[0.06] transition duration-200 select-none block"
                    >
                        Expand and select shapes & lines
                    </button>
                )}

                <div className={`space-y-2 pr-0.5 pt-1 ${mobileLibraryCollapsed ? "hidden lg:block" : "block"}`}>
                    {SHAPE_CATEGORIES.map((category) => {
                        const isOpen = !!expandedCategories[category.name];
                        return (
                            <div 
                                key={category.name} 
                                className={`rounded-xl border transition-all ${
                                    theme === "eyeprotect"
                                        ? "border-[#8c8578]/50 bg-[#f5ebd9]/30"
                                        : isLight
                                        ? "border-slate-200 bg-slate-50/50"
                                        : "border-white/5 bg-white/[0.01]"
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(category.name)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold hover:opacity-80 transition-opacity"
                                >
                                    <span>{category.name}</span>
                                    <ChevronDown 
                                        className={`w-3.5 h-3.5 opacity-50 transition-transform duration-200 ${
                                            isOpen ? "rotate-180" : ""
                                        }`} 
                                    />
                                </button>

                                {isOpen && (
                                    <div className="px-3 pb-3 pt-1 grid grid-cols-5 gap-1 border-t border-white/5">
                                        {category.shapes.map((item) => (
                                            <button
                                                key={`${reactId}-${item.kind}`}
                                                type="button"
                                                draggable
                                                onDragStart={(e) => onPaletteDragStart(e, item.kind)}
                                                onClick={() => {
                                                    const board = boardRef.current;
                                                    const scale = board && board.clientWidth < 480 ? 0.72 : 1;
                                                    const shape = createBoardShape(
                                                        item.kind,
                                                        24 + shapes.length * 10,
                                                        24 + shapes.length * 8
                                                    );
                                                    if (scale !== 1) {
                                                        shape.w = Math.round(shape.w * scale);
                                                        shape.h = Math.round(shape.h * scale);
                                                    }
                                                    onShapesChange([...shapes, shape]);
                                                    setSelectedId(shape.id);
                                                    setTool("select");
                                                }}
                                                className={`cursor-grab aspect-square rounded-lg border flex items-center justify-center transition active:cursor-grabbing hover:-translate-y-0.5 select-none hover:shadow-md ${
                                                    theme === "eyeprotect"
                                                        ? "border-[#8c8578] bg-[#fffcf5] hover:bg-[#f5ebd9]"
                                                        : isLight
                                                        ? "border-slate-300 bg-white hover:bg-slate-100"
                                                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-400/50"
                                                }`}
                                                title={item.label}
                                            >
                                                <MiniShapeSymbol kind={item.kind} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. Description text (desktop: row 2 col 2, mobile: third) */}
            <p className={`lg:col-start-2 lg:row-start-2 text-[11px] ${
                theme === "eyeprotect" ? "text-[#57534e] font-medium" : isLight ? "text-slate-600 font-medium" : "text-white/40"
            }`}>
                Drag shapes onto the board (or tap to place), move them in Select mode, or switch to Draw for freestyle.
            </p>

            {/* 4. Whiteboard Canvas grid workspace (desktop: row 3 col 2, mobile: bottom) */}
            <div
                ref={boardRef}
                onDragOver={onBoardDragOver}
                onDrop={onBoardDrop}
                onPointerMove={onBoardPointerMove}
                onPointerUp={onBoardPointerUp}
                onPointerLeave={onBoardPointerUp}
                onClick={() => {
                    if (tool === "select") setSelectedId(null);
                }}
                className="lg:col-start-2 lg:row-start-3 relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] min-h-[440px] sm:min-h-[520px] lg:min-h-[560px] aspect-[4/3] sm:aspect-[900/560] touch-none"
            >
                {/* Layer 0: Grid background */}
                <canvas
                    ref={gridCanvasRef}
                    width={900}
                    height={560}
                    className="absolute inset-0 h-full w-full z-0 pointer-events-none"
                />
                {/* Layer 2: Ink canvas (always on top visually, interactive only in draw/erase mode) */}
                <canvas
                    ref={canvasRef}
                    width={900}
                    height={560}
                    className={`absolute inset-0 h-full w-full touch-none z-[2] ${
                        canvasInteractive ? "cursor-crosshair" : "pointer-events-none"
                    }`}
                />
                {/* Layer 1: Shapes (between grid and ink, always visible) */}
                <div className={`absolute inset-0 z-[1] ${canvasInteractive ? "pointer-events-none" : ""}`}>
                    {shapes.map((shape) => {
                        const isLine = typeof shape.x2 === "number" && typeof shape.y2 === "number";
                        const left = isLine ? Math.min(shape.x, shape.x2!) : shape.x;
                        const top = isLine ? Math.min(shape.y, shape.y2!) : shape.y;
                        const width = isLine ? Math.max(16, Math.abs(shape.x2! - shape.x)) : shape.w;
                        const height = isLine ? Math.max(16, Math.abs(shape.y2! - shape.y)) : shape.h;

                        return (
                            <div
                                key={shape.id}
                                role="button"
                                tabIndex={0}
                                onPointerDown={(e) => onShapePointerDown(e, shape)}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(shape.id);
                                    setSelectedId(shape.id);
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (tool === "select") {
                                        setSelectedId(shape.id);
                                        if (window.matchMedia("(pointer: coarse)").matches) {
                                            setEditingId(shape.id);
                                        }
                                    }
                                }}
                                style={{
                                    left,
                                    top,
                                    width,
                                    height,
                                 }}
                                 className={`absolute select-none touch-none ${
                                     tool === "select" ? "cursor-move" : "pointer-events-none"
                                 } ${selectedId === shape.id && !isLine ? "ring-2 ring-cyan-400/80 ring-offset-1 ring-offset-slate-950" : ""}`}
                             >
                                <ShapeVisual shape={shape} />
                                {selectedId === shape.id && isLine && (
                                    <>
                                        {/* Start Handle */}
                                        <div 
                                            onPointerDown={(e) => onEndpointPointerDown(e, shape, "start")}
                                            style={{
                                                left: shape.x2! >= shape.x ? -6 : width - 6,
                                                top: shape.y2! >= shape.y ? -6 : height - 6,
                                            }}
                                            className="absolute w-3 h-3 bg-indigo-500 border-2 border-white rounded-full z-20 cursor-pointer shadow-sm hover:scale-125 transition-transform"
                                            title="Drag to move start point"
                                        />
                                        {/* End Handle */}
                                        <div 
                                            onPointerDown={(e) => onEndpointPointerDown(e, shape, "end")}
                                            style={{
                                                left: shape.x2! >= shape.x ? width - 6 : -6,
                                                top: shape.y2! >= shape.y ? height - 6 : -6,
                                            }}
                                            className="absolute w-3 h-3 bg-indigo-500 border-2 border-white rounded-full z-20 cursor-pointer shadow-sm hover:scale-125 transition-transform"
                                            title="Drag to move end point"
                                        />
                                    </>
                                )}
                                {editingId === shape.id && (
                                    <input
                                        autoFocus
                                        value={shape.label}
                                        onChange={(e) => updateLabel(shape.id, e.target.value)}
                                        onBlur={() => setEditingId(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") setEditingId(null);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="absolute inset-x-1 bottom-1 z-10 rounded bg-black/80 px-1 py-0.5 text-[11px] text-white outline-none ring-1 ring-cyan-400/50"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
    }
);

export default InteractiveWhiteboard;
