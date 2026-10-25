"use client";

import React, { useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, X, Send } from "lucide-react";

interface ReportIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme?: "dark" | "light" | "eyeprotect";
    getScreenshot?: () => Promise<string | null> | string | null;
    diagnostics?: Record<string, any>;
    onSuccess?: (ticketId: string) => void;
}

export default function ReportIssueModal({
    isOpen,
    onClose,
    theme = "dark",
    getScreenshot,
    diagnostics = {},
    onSuccess,
}: ReportIssueModalProps) {
    const [issueType, setIssueType] = useState<"whiteboard" | "code_editor" | "camera" | "audio" | "general_ui">("whiteboard");
    const [note, setNote] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
    const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
    const [isCapturingPreview, setIsCapturingPreview] = useState(false);

    React.useEffect(() => {
        if (isOpen && getScreenshot) {
            setIsCapturingPreview(true);
            Promise.resolve(getScreenshot())
                .then((img) => {
                    if (img) setPreviewScreenshot(img);
                })
                .catch(() => {})
                .finally(() => setIsCapturingPreview(false));
        } else if (!isOpen) {
            setPreviewScreenshot(null);
        }
    }, [isOpen, getScreenshot]);

    if (!isOpen) return null;

    const isLight = theme === "light";
    const isEye = theme === "eyeprotect";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let screenshot = previewScreenshot;
            if (!screenshot && getScreenshot) {
                screenshot = await Promise.resolve(getScreenshot());
            }
            const res = await fetch("/api/interview/report-issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    issueType,
                    userMessage: note.trim() || `Candidate reported ${issueType} issue during live interview`,
                    screenshot: screenshot || "",
                    diagnostics: {
                        ...diagnostics,
                        reportedVia: "Manual In-Room Bug Modal",
                        screenCaptureType: "Full Interview Room Window",
                        timestamp: new Date().toISOString(),
                    },
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSubmittedTicketId(data.ticketId || "SUCCESS");
                onSuccess?.(data.ticketId || "");
                setTimeout(() => {
                    setSubmittedTicketId(null);
                    setNote("");
                    onClose();
                }, 2200);
            } else {
                throw new Error(data.error || "Failed to submit");
            }
        } catch (err: any) {
            console.error("Error submitting manual issue report:", err);
            alert("Could not submit issue report: " + (err.message || "Network error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div
                className={`relative w-full max-w-md rounded-2xl border p-5 shadow-2xl transition-all ${
                    isEye
                        ? "border-[#8c8578] bg-[#fffcf5] text-[#1c1917]"
                        : isLight
                        ? "border-slate-300 bg-white text-slate-900 shadow-slate-300/50"
                        : "border-white/10 bg-[#12121a] text-white shadow-black/80"
                }`}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {submittedTicketId ? (
                    <div className="py-6 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                        <h3 className="text-base font-bold text-emerald-400">Diagnostic Snapshot Logged!</h3>
                        <p className="text-xs opacity-75 max-w-xs mx-auto">
                            Ticket #{submittedTicketId.slice(-6)} has been dispatched to our engineering team with your workspace screenshot. You will not be penalized for this technical issue.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold">Report Interface Issue</h3>
                                <p className="text-[11px] opacity-60">
                                    Instant diagnostic snapshot with workspace screenshot will be sent to developers.
                                </p>
                            </div>
                        </div>

                        {/* Issue Category */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold opacity-75">What is having an issue?</label>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {[
                                    { id: "whiteboard" as const, label: "🎨 Whiteboard / Canvas" },
                                    { id: "code_editor" as const, label: "💻 Code Editor" },
                                    { id: "audio" as const, label: "🎙️ Mic / Audio" },
                                    { id: "camera" as const, label: "📷 Camera / Video" },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setIssueType(item.id)}
                                        className={`px-2.5 py-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                                            issueType === item.id
                                                ? isLight
                                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-sm"
                                                    : "border-indigo-500 bg-indigo-500/20 text-indigo-300 font-bold shadow-sm"
                                                : isLight
                                                ? "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                                : "border-white/5 bg-white/5 text-white/70 hover:bg-white/10"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Problem Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold opacity-75">Brief Description (Optional)</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. Can't place shapes on canvas, editor execution stuck..."
                                rows={3}
                                className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none transition resize-none ${
                                    isEye
                                        ? "bg-[#f5ebd9] border-[#8c8578] text-[#1c1917]"
                                        : isLight
                                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500"
                                        : "bg-black/40 border-white/10 text-white focus:border-indigo-500"
                                }`}
                            />
                        </div>

                        {/* Full Interview Room Snapshot Preview */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold opacity-75">
                                <span className="flex items-center gap-1.5">
                                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                                    Attached Workspace Snapshot
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                    Full Room Capture
                                </span>
                            </div>

                            {isCapturingPreview ? (
                                <div className="h-24 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center gap-2 text-xs opacity-60">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                    Capturing entire interview room...
                                </div>
                            ) : previewScreenshot ? (
                                <div className="relative rounded-xl border border-white/10 overflow-hidden bg-black max-h-32 group">
                                    <img
                                        src={previewScreenshot}
                                        alt="Full Interview Room Preview"
                                        className="w-full h-auto object-cover max-h-32 opacity-90 group-hover:opacity-100 transition-opacity"
                                    />
                                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] text-white/80 font-medium">
                                        Entire Viewport Captured
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2.5 rounded-xl border border-dashed border-white/10 text-xs opacity-50 text-center">
                                    Full room snapshot will be automatically captured on submit.
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Capturing & Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Send Report to Developers</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
