"use client";

import { useState, useEffect, useCallback } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Target,
    BookOpen,
    FileText,
    Briefcase,
    Wrench,
    Settings,
    GripVertical,
    Eye,
    EyeOff,
    Save,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Undo2,
} from "lucide-react";

// ── Tool & Category definitions ──────────────────────────────────────────────

interface ToolItem {
    id: string;
    title: string;
    desc: string;
}

interface Category {
    id: string;
    label: string;
    icon: typeof Target;
    color: string;
    items: ToolItem[];
}

const ALL_CATEGORIES: Category[] = [
    {
        id: "interview_practice",
        label: "Interview Practice",
        icon: Target,
        color: "indigo",
        items: [
            { id: "start_interview", title: "Start Interview Session", desc: "Real-time AI interview" },
            { id: "panel_interview", title: "Panel Interviews", desc: "Multi-interviewer rounds" },
            { id: "star_coach", title: "STAR Coach", desc: "Behavioral question drills" },
            { id: "english_fluency", title: "English Fluency", desc: "Words, speaking, interview English" },
            { id: "system_design", title: "System Design Lab", desc: "Shapes, freestyle, eval" },
            { id: "coding_lab", title: "Coding Lab", desc: "Progressive hidden tests" },
        ],
    },
    {
        id: "preparation_study",
        label: "Preparation & Study",
        icon: BookOpen,
        color: "purple",
        items: [
            { id: "my_progress", title: "Dashboard", desc: "Track scores & growth" },
            { id: "mock_aptitude", title: "Mock Aptitude", desc: "Timed test rounds" },
            { id: "spaced_drills", title: "Spaced Drills", desc: "Smart repetition" },
            { id: "prep_packs", title: "Prep Packs", desc: "Curated role bundles" },
            { id: "study_materials", title: "Study Materials", desc: "Notes & cheatsheets" },
            { id: "domain_packs", title: "Domain Packs", desc: "Specialized tech packs" },
        ],
    },
    {
        id: "ai_tools",
        label: "AI Tools",
        icon: Wrench,
        color: "amber",
        items: [
            { id: "email_analyser", title: "AI Email Analyser", desc: "Tone & clarity analysis" },
            { id: "roadmap_generator", title: "Roadmap Generator", desc: "Personalized learning path" },
            { id: "synthetic_data", title: "Synthetic Data Generator", desc: "Mock datasets for practice" },
        ],
    },
    {
        id: "resume_profile",
        label: "Resume & Profile",
        icon: FileText,
        color: "sky",
        items: [
            { id: "pre_interview_analysis", title: "Pre-Interview Analysis", desc: "Resume & skills feedback" },
            { id: "resume_builder", title: "Resume Builder", desc: "ATS-optimized resumes" },
            { id: "ats_match", title: "ATS Match", desc: "JD vs resume scoring" },
        ],
    },
    {
        id: "settings_analytics",
        label: "Settings & Analytics",
        icon: Settings,
        color: "rose",
        items: [
            { id: "community_chat", title: "Community Chat", desc: "Talk with other students" },
            { id: "language_sarvam", title: "Language / Sarvam", desc: "Hindi + regional voice" },
        ],
    },
    {
        id: "career_jobs",
        label: "Career & Jobs",
        icon: Briefcase,
        color: "emerald",
        items: [
            { id: "open_jobs", title: "Open Job Roles", desc: "Location-matched openings" },
            { id: "offer_negotiation", title: "Offer Negotiation", desc: "Salary strategy & sim" },
            { id: "coach_marketplace", title: "Coach Marketplace", desc: "Book & pay coaches" },
            { id: "referrals", title: "Referrals", desc: "Invite & compare scores" },
        ],
    },
];

// Flatten all tool IDs for lookup
const ALL_TOOLS_MAP = new Map<string, { tool: ToolItem; categoryId: string }>();
ALL_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
        ALL_TOOLS_MAP.set(item.id, { tool: item, categoryId: cat.id });
    });
});

// ── Color maps ───────────────────────────────────────────────────────────────

const categoryColors: Record<string, { bg: string; border: string; text: string; iconBg: string; badge: string }> = {
    indigo:  { bg: "bg-indigo-500/5",  border: "border-indigo-500/20",  text: "text-indigo-400",  iconBg: "bg-indigo-500/15",  badge: "bg-indigo-500/20 text-indigo-300" },
    purple:  { bg: "bg-purple-500/5",  border: "border-purple-500/20",  text: "text-purple-400",  iconBg: "bg-purple-500/15",  badge: "bg-purple-500/20 text-purple-300" },
    sky:     { bg: "bg-sky-500/5",     border: "border-sky-500/20",     text: "text-sky-400",     iconBg: "bg-sky-500/15",     badge: "bg-sky-500/20 text-sky-300" },
    emerald: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400", iconBg: "bg-emerald-500/15", badge: "bg-emerald-500/20 text-emerald-300" },
    amber:   { bg: "bg-amber-500/5",   border: "border-amber-500/20",   text: "text-amber-400",   iconBg: "bg-amber-500/15",   badge: "bg-amber-500/20 text-amber-300" },
    rose:    { bg: "bg-rose-500/5",    border: "border-rose-500/20",    text: "text-rose-400",    iconBg: "bg-rose-500/15",    badge: "bg-rose-500/20 text-rose-300" },
};

// ── Draggable Tool Card ──────────────────────────────────────────────────────

function DraggableToolCard({ tool, isHidden }: { tool: ToolItem; isHidden?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tool.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                isHidden
                    ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                    : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06]"
            } ${isDragging ? "shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/30 z-50" : ""}`}
            {...attributes}
            {...listeners}
        >
            <div className="text-white/20 group-hover:text-white/40 transition-colors shrink-0">
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold truncate ${isHidden ? "text-red-300/80" : "text-white/90"}`}>
                    {tool.title}
                </p>
                <p className={`text-[10px] truncate ${isHidden ? "text-red-300/40" : "text-white/40"}`}>
                    {tool.desc}
                </p>
            </div>
            {isHidden && (
                <EyeOff className="w-3.5 h-3.5 text-red-400/60 shrink-0" />
            )}
            {!isHidden && (
                <Eye className="w-3.5 h-3.5 text-emerald-400/40 shrink-0" />
            )}
        </div>
    );
}

// ── Drag Overlay Card (shown while dragging) ─────────────────────────────────

function OverlayCard({ tool }: { tool: ToolItem }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-indigo-500/40 bg-[#12121a] shadow-2xl shadow-indigo-500/30 ring-2 ring-indigo-500/30 cursor-grabbing select-none">
            <div className="text-indigo-400 shrink-0">
                <GripVertical className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{tool.title}</p>
                <p className="text-[10px] text-white/40 truncate">{tool.desc}</p>
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function LabsVisibilityManager() {
    const [hiddenTools, setHiddenTools] = useState<string[]>([]);
    const [originalHiddenTools, setOriginalHiddenTools] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const fetchVisibility = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/labs-visibility");
            const data = await res.json();
            const tools = data.hiddenTools || [];
            setHiddenTools(tools);
            setOriginalHiddenTools(tools);
        } catch {
            setHiddenTools([]);
            setOriginalHiddenTools([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVisibility();
    }, [fetchVisibility]);

    const hasChanges = JSON.stringify([...hiddenTools].sort()) !== JSON.stringify([...originalHiddenTools].sort());

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const toolId = active.id as string;
        const overId = over.id as string;

        // Dragged onto the hidden zone
        if (overId === "hidden-zone") {
            if (!hiddenTools.includes(toolId)) {
                setHiddenTools((prev) => [...prev, toolId]);
            }
            return;
        }

        // Dragged onto a category zone (restore from hidden)
        if (overId.startsWith("category-")) {
            if (hiddenTools.includes(toolId)) {
                setHiddenTools((prev) => prev.filter((id) => id !== toolId));
            }
            return;
        }

        // Dragged onto another tool — check if the target is in hidden or visible
        const isOverHidden = hiddenTools.includes(overId);
        const isActiveHidden = hiddenTools.includes(toolId);

        if (isOverHidden && !isActiveHidden) {
            // Dropping onto a hidden tool → hide this tool too
            setHiddenTools((prev) => [...prev, toolId]);
        } else if (!isOverHidden && isActiveHidden) {
            // Dropping onto a visible tool → restore this tool
            setHiddenTools((prev) => prev.filter((id) => id !== toolId));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/labs-visibility", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hiddenTools }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save.");
            setOriginalHiddenTools([...hiddenTools]);
            setMessage({ type: "success", text: "Labs visibility updated. Changes are live for all users." });
            setTimeout(() => setMessage(null), 4000);
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setHiddenTools([...originalHiddenTools]);
    };

    const activeTool = activeId ? ALL_TOOLS_MAP.get(activeId)?.tool : null;

    // Get hidden tool objects grouped for display
    const hiddenToolObjects = hiddenTools
        .map((id) => ALL_TOOLS_MAP.get(id))
        .filter(Boolean)
        .map((entry) => entry!.tool);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white">Labs Visibility</h2>
                    <p className="text-sm text-white/50 mt-1">
                        Drag tools to the <span className="text-red-400 font-semibold">Hidden zone</span> to remove them from all users. Drag back to restore.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-white/15 text-white/70 hover:bg-white/10 transition-all"
                        >
                            <Undo2 className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    )}
                    <button
                        disabled={!hasChanges || saving}
                        onClick={handleSave}
                        className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                            hasChanges
                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500"
                                : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                        } disabled:opacity-50`}
                    >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Status message */}
            {message && (
                <div
                    className={`flex items-center gap-2 p-4 rounded-xl border text-sm ${
                        message.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                >
                    {message.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-bold">{ALL_TOOLS_MAP.size - hiddenTools.length}</span> visible
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span className="font-bold">{hiddenTools.length}</span> hidden
                </span>
                {hasChanges && (
                    <span className="text-amber-400 font-semibold ml-auto">● Unsaved changes</span>
                )}
            </div>

            {/* DnD Context */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {/* Category Sections */}
                <div className="space-y-4">
                    {ALL_CATEGORIES.map((category) => {
                        const colors = categoryColors[category.color] || categoryColors.indigo;
                        const Icon = category.icon;
                        const visibleItems = category.items.filter(
                            (item) => !hiddenTools.includes(item.id)
                        );
                        const visibleIds = visibleItems.map((i) => i.id);

                        return (
                            <div
                                key={category.id}
                                className={`rounded-2xl border ${colors.border} ${colors.bg} p-4 transition-all`}
                            >
                                {/* Category Header */}
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
                                        <Icon className={`w-4 h-4 ${colors.text}`} />
                                    </div>
                                    <div>
                                        <h3 className={`text-sm font-bold ${colors.text}`}>
                                            {category.label}
                                        </h3>
                                        <p className="text-[10px] text-white/30">
                                            {visibleItems.length} of {category.items.length} visible
                                        </p>
                                    </div>
                                </div>

                                {/* Droppable category zone */}
                                <SortableContext
                                    id={`category-${category.id}`}
                                    items={visibleIds}
                                    strategy={rectSortingStrategy}
                                >
                                    <DroppableZone id={`category-${category.id}`}>
                                        {visibleItems.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {visibleItems.map((tool) => (
                                                    <DraggableToolCard
                                                        key={tool.id}
                                                        tool={tool}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-4 text-center text-xs text-white/20 border border-dashed border-white/10 rounded-xl">
                                                All tools in this category are hidden
                                            </div>
                                        )}
                                    </DroppableZone>
                                </SortableContext>
                            </div>
                        );
                    })}
                </div>

                {/* Hidden Tools Drop Zone */}
                <SortableContext
                    id="hidden-zone"
                    items={hiddenTools}
                    strategy={rectSortingStrategy}
                >
                    <DroppableZone id="hidden-zone">
                        <div
                            className={`rounded-2xl border-2 border-dashed p-4 transition-all mt-6 ${
                                hiddenTools.length > 0
                                    ? "border-red-500/30 bg-red-500/5"
                                    : "border-white/10 bg-white/[0.02]"
                            } ${activeId && !hiddenTools.includes(activeId) ? "border-red-500/50 bg-red-500/10 ring-2 ring-red-500/20" : ""}`}
                        >
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                                    <EyeOff className="w-4 h-4 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-red-400">
                                        Hidden Tools
                                    </h3>
                                    <p className="text-[10px] text-white/30">
                                        Drag tools here to hide them from all users
                                    </p>
                                </div>
                            </div>

                            {hiddenToolObjects.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {hiddenToolObjects.map((tool) => (
                                        <DraggableToolCard
                                            key={tool.id}
                                            tool={tool}
                                            isHidden
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-6 text-center text-xs text-white/20">
                                    No hidden tools — all tools are visible to users
                                </div>
                            )}
                        </div>
                    </DroppableZone>
                </SortableContext>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeTool ? <OverlayCard tool={activeTool} /> : null}
                </DragOverlay>
            </DndContext>

            {/* Footer hint */}
            <div className="text-[11px] text-white/25 text-center pt-2 pb-4">
                Drag tool cards between categories and the Hidden zone. Click &quot;Save Changes&quot; to persist.
            </div>
        </div>
    );
}

// ── Droppable Zone wrapper ───────────────────────────────────────────────────

function DroppableZone({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
    const { setNodeRef } = useSortable({ id, disabled: true });

    return (
        <div ref={setNodeRef} data-droppable-id={id}>
            {children}
        </div>
    );
}
