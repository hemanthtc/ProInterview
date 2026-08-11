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
import { Download, Eraser, MousePointer2, PenLine, Trash2 } from "lucide-react";
import {
    BoardShape,
    BoardShapeKind,
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
    const commonLabel =
        shape.label && shape.kind !== "arrow" ? (
            <span className="pointer-events-none px-1 text-center text-[11px] font-medium leading-tight text-cyan-50">
                {shape.label}
            </span>
        ) : null;

    switch (shape.kind) {
        case "box":
            return (
                <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-cyan-300/70 bg-slate-900/90 shadow-sm">
                    {commonLabel}
                </div>
            );
        case "service":
            return (
                <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-emerald-300/70 bg-emerald-950/50 shadow-sm">
                    {commonLabel}
                </div>
            );
        case "database":
            return (
                <div className="relative flex h-full w-full flex-col items-center justify-center">
                    <div className="absolute inset-x-[12%] top-[8%] bottom-[8%] rounded-[50%/18%] border-2 border-amber-300/80 bg-amber-950/40" />
                    <div className="relative z-[1] px-2 text-center text-[11px] font-medium text-amber-50">
                        {shape.label}
                    </div>
                </div>
            );
        case "circle":
            return (
                <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-violet-300/70 bg-violet-950/40">
                    {commonLabel}
                </div>
            );
        case "diamond":
            return (
                <div className="flex h-full w-full items-center justify-center">
                    <div className="flex h-[72%] w-[72%] rotate-45 items-center justify-center border-2 border-rose-300/70 bg-rose-950/40">
                        <span className="-rotate-45 px-1 text-center text-[10px] font-medium text-rose-50">
                            {shape.label}
                        </span>
                    </div>
                </div>
            );
        case "queue":
            return (
                <div className="flex h-full w-full items-center gap-1 rounded-md border-2 border-sky-300/70 bg-sky-950/40 px-2">
                    <div className="h-[70%] w-2 rounded-sm bg-sky-300/40" />
                    <div className="h-[70%] w-2 rounded-sm bg-sky-300/40" />
                    <div className="h-[70%] w-2 rounded-sm bg-sky-300/40" />
                    <span className="ml-1 text-[11px] font-medium text-sky-50">{shape.label}</span>
                </div>
            );
        case "cloud":
            return (
                <div className="flex h-full w-full items-center justify-center rounded-[40%] border-2 border-teal-300/60 bg-teal-950/40">
                    {commonLabel}
                </div>
            );
        case "actor":
            return (
                <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-indigo-200">
                    <div className="h-5 w-5 rounded-full border-2 border-indigo-300/80" />
                    <div className="h-6 w-8 rounded-md border-2 border-indigo-300/80" />
                    <span className="text-[10px] font-medium text-indigo-100">{shape.label}</span>
                </div>
            );
        case "arrow":
            return (
                <div className="flex h-full w-full items-center px-1">
                    <div className="h-0.5 flex-1 bg-cyan-300/80" />
                    <div className="h-0 w-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-cyan-300/90" />
                </div>
            );
        case "text":
            return (
                <div className="flex h-full w-full items-center justify-center border border-dashed border-white/30 bg-black/20 px-2">
                    <span className="text-xs text-white/80">{shape.label || "Text"}</span>
                </div>
            );
        default: {
            const _exhaustive: never = shape.kind;
            return <div>{_exhaustive}</div>;
        }
    }
}

const InteractiveWhiteboard = forwardRef<InteractiveWhiteboardHandle, InteractiveWhiteboardProps>(
    function InteractiveWhiteboard({ shapes, onShapesChange, onFreehandChange, theme = "dark", isLight = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const inkRef = useRef(false);
    const dragShapeId = useRef<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [tool, setTool] = useState<WhiteboardTool>("select");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const reactId = useId();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const paintBg = () => {
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "#0b1220";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "rgba(148,163,184,0.08)";
            ctx.lineWidth = 1;
            for (let x = 0; x < canvas.width; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += 40) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        };
        paintBg();
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
        dragOffset.current = { x: pt.x - shape.x, y: pt.y - shape.y };
        setSelectedId(shape.id);
    }

    function onBoardPointerMove(e: ReactPointerEvent) {
        if (!dragShapeId.current || tool !== "select") return;
        const id = dragShapeId.current;
        const pt = boardPointFromClient(e.clientX, e.clientY);
        const board = boardRef.current;
        const maxW = board?.clientWidth ?? 900;
        const maxH = board?.clientHeight ?? 560;
        onShapesChange(
            shapes.map((s) => {
                if (s.id !== id) return s;
                const x = Math.min(Math.max(0, pt.x - dragOffset.current.x), Math.max(0, maxW - s.w));
                const y = Math.min(Math.max(0, pt.y - dragOffset.current.y), Math.max(0, maxH - s.h));
                return { ...s, x, y };
            })
        );
    }

    function onBoardPointerUp() {
        dragShapeId.current = null;
    }

    function clearCanvasInk() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(148,163,184,0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        inkRef.current = false;
        onFreehandChange?.(false);
    }

    function clearAll() {
        onShapesChange([]);
        setSelectedId(null);
        setEditingId(null);
        clearCanvasInk();
    }

    function buildPngDataUrl(): string | null {
        const ink = canvasRef.current;
        const board = boardRef.current;
        if (!ink || !board) return null;
        const out = document.createElement("canvas");
        out.width = ink.width;
        out.height = ink.height;
        const ctx = out.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(ink, 0, 0);

        const rect = board.getBoundingClientRect();
        const scaleX = out.width / Math.max(1, rect.width);
        const scaleY = out.height / Math.max(1, rect.height);

        for (const shape of shapes) {
            const x = shape.x * scaleX;
            const y = shape.y * scaleY;
            const w = shape.w * scaleX;
            const h = shape.h * scaleY;
            ctx.strokeStyle = "#67e8f9";
            ctx.fillStyle = "rgba(8, 47, 73, 0.65)";
            ctx.lineWidth = 2;
            switch (shape.kind) {
                case "circle":
                case "cloud":
                    ctx.beginPath();
                    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;
                case "diamond":
                    ctx.beginPath();
                    ctx.moveTo(x + w / 2, y);
                    ctx.lineTo(x + w, y + h / 2);
                    ctx.lineTo(x + w / 2, y + h);
                    ctx.lineTo(x, y + h / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;
                case "arrow":
                    ctx.beginPath();
                    ctx.moveTo(x, y + h / 2);
                    ctx.lineTo(x + w - 12, y + h / 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x + w - 12, y + h / 2 - 8);
                    ctx.lineTo(x + w, y + h / 2);
                    ctx.lineTo(x + w - 12, y + h / 2 + 8);
                    ctx.closePath();
                    ctx.fillStyle = "#67e8f9";
                    ctx.fill();
                    break;
                case "box":
                case "service":
                case "database":
                case "queue":
                case "actor":
                case "text":
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeRect(x, y, w, h);
                    break;
                default: {
                    const _exhaustive: never = shape.kind;
                    void _exhaustive;
                    break;
                }
            }
            if (shape.label && shape.kind !== "arrow") {
                ctx.fillStyle = "#e0f2fe";
                ctx.font = `${Math.max(11, Math.round(12 * scaleX))}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(shape.label.slice(0, 28), x + w / 2, y + h / 2, w - 8);
            }
        }

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
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
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
                    onClick={deleteSelected}
                    disabled={!selectedId}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer disabled:opacity-40 ${
                        theme === "eyeprotect"
                            ? "border-[#8c8578] bg-[#fffcf5] text-[#1c1917] hover:bg-[#f5ebd9] shadow-sm"
                            : isLight
                            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                            : "border-white/10 text-white/60 hover:text-white"
                    }`}
                >
                    Delete shape
                </button>
                <button
                    type="button"
                    onClick={clearAll}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                        theme === "eyeprotect"
                            ? "border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100 shadow-sm"
                            : isLight
                            ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 shadow-sm"
                            : "border-white/10 text-rose-200/80 hover:text-rose-100"
                    }`}
                >
                    <Trash2 className="h-3.5 w-3.5" /> Clear board
                </button>
                <button
                    type="button"
                    onClick={exportPng}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-100"
                >
                    <Download className="h-3.5 w-3.5" /> Export PNG
                </button>
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Shape palette">
                {SHAPE_PALETTE.map((item) => (
                    <div
                        key={`${reactId}-${item.kind}`}
                        draggable
                        onDragStart={(e) => onPaletteDragStart(e, item.kind)}
                        onClick={() => {
                            const board = boardRef.current;
                            const scale =
                                board && board.clientWidth < 480
                                    ? 0.72
                                    : 1;
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
                        className={`cursor-grab rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition active:cursor-grabbing ${
                            theme === "eyeprotect"
                                ? "border-[#8c8578] bg-[#fffcf5] text-[#1c1917] hover:bg-[#f5ebd9] shadow-sm"
                                : isLight
                                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                        title={`Drag onto board or click to place: ${item.label}`}
                    >
                        {item.label}
                    </div>
                ))}
            </div>
            <p className={`text-[11px] ${
                theme === "eyeprotect" ? "text-[#57534e] font-medium" : isLight ? "text-slate-600 font-medium" : "text-white/40"
            }`}>
                Drag shapes onto the board (or tap to place), move them in Select mode, or switch to Draw for freestyle.
            </p>

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
                className={`relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] min-h-[280px] aspect-[4/3] sm:aspect-[900/560] sm:min-h-0`}
            >
                <canvas
                    ref={canvasRef}
                    width={900}
                    height={560}
                    className={`absolute inset-0 h-full w-full touch-none ${
                        canvasInteractive ? "z-[1] cursor-crosshair" : "z-0 pointer-events-none"
                    }`}
                />
                <div className={`absolute inset-0 ${canvasInteractive ? "z-0 pointer-events-none" : "z-[2]"}`}>
                    {shapes.map((shape) => (
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
                                    // Single tap opens label edit on coarse pointers (mobile)
                                    if (window.matchMedia("(pointer: coarse)").matches) {
                                        setEditingId(shape.id);
                                    }
                                }
                            }}
                            style={{
                                left: shape.x,
                                top: shape.y,
                                width: shape.w,
                                height: shape.h,
                            }}
                            className={`absolute select-none ${
                                tool === "select" ? "cursor-move" : "pointer-events-none"
                            } ${selectedId === shape.id ? "ring-2 ring-cyan-400/80 ring-offset-1 ring-offset-slate-950" : ""}`}
                        >
                            <ShapeVisual shape={shape} />
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
                    ))}
                </div>
            </div>
        </div>
    );
    }
);

export default InteractiveWhiteboard;
