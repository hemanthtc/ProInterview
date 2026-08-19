"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Loader2, Send, Paperclip, Check, CheckCheck, CornerUpLeft, Trash2, Heart, Play, CornerDownRight, X, Film, Image as ImageIcon
} from "lucide-react";
import { getStorageItem } from "@/utils/storage";
import { processImageForUpload } from "@/utils/imageProcess";

interface ChatMessage {
    id: string;
    roomSlug: string;
    senderPublicId: string;
    senderName: string;
    body: string;
    replyToId?: string;
    replyToMessage?: {
        body: string;
        senderName: string;
        attachmentType?: string;
    };
    attachmentUrl?: string;
    attachmentType?: string;
    createdAt: string;
    mine?: boolean;
    isPending?: boolean;
    delivered?: boolean;
    read?: boolean;
    likes?: string[];
}

export default function FeedbackAdminPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [mePublicId, setMePublicId] = useState("");
    const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const touchStartX = useRef<number | null>(null);
    const touchStartMsg = useRef<ChatMessage | null>(null);

    const loadMessages = useCallback(async () => {
        try {
            const res = await fetch("/api/community/messages?room=feedback&limit=100");
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            console.error("Failed to load feedback messages:", err);
        }
    }, []);

    // Setup room and user identity
    useEffect(() => {
        fetch("/api/community/rooms")
            .then((res) => res.json())
            .then((data) => {
                if (data.mePublicId) {
                    Promise.resolve().then(() => {
                        setMePublicId(data.mePublicId);
                    });
                }
            })
            .catch(() => {});

        Promise.resolve().then(() => {
            void loadMessages();
        });
        const t = setInterval(() => {
            void loadMessages();
        }, 5000);
        return () => clearInterval(t);
    }, [loadMessages]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || sending) return;

        setSending(true);
        setError("");

        const payload = {
            roomSlug: "feedback",
            body: text,
            replyToId: replyingTo?.id,
            replyToMessage: replyingTo ? {
                body: replyingTo.body,
                senderName: replyingTo.senderName,
                attachmentType: replyingTo.attachmentType,
            } : undefined
        };

        try {
            const res = await fetch("/api/community/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to send message.");
            setDraft("");
            setReplyingTo(null);
            await loadMessages();
        } catch (err: any) {
            setError(err.message || "Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const handleSendDirectly = async (attachmentUrl: string, attachmentType: string) => {
        try {
            const res = await fetch("/api/community/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomSlug: "feedback",
                    body: "",
                    attachmentUrl,
                    attachmentType,
                })
            });
            if (res.ok) {
                await loadMessages();
            }
        } catch (err) {
            console.error("Failed to send attachment message:", err);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file || uploading) return;
        setUploading(true);
        setError("");

        try {
            const processedFile = await processImageForUpload(file);
            const formData = new FormData();
            formData.append("file", processedFile);
            formData.append("roomSlug", "feedback");

            const res = await fetch("/api/community/upload", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to upload file.");
            if (data.url) {
                await handleSendDirectly(data.url, data.type);
            }
        } catch (err: any) {
            setError(err.message || "Failed to upload file.");
        } finally {
            setUploading(false);
        }
    };

    const handleTouchStart = (e: React.TouchEvent, msg: ChatMessage) => {
        touchStartX.current = e.touches[0]?.clientX || null;
        touchStartMsg.current = msg;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || !touchStartMsg.current) return;
        const currentX = e.touches[0]?.clientX || null;
        if (currentX !== null) {
            const deltaX = currentX - touchStartX.current;
            if (deltaX > 80) { // Swipe right by 80px to reply
                const msg = touchStartMsg.current;
                if (!msg.isPending) {
                    setReplyingTo(msg);
                }
                touchStartX.current = null;
                touchStartMsg.current = null;
            }
        }
    };

    const handleTouchEnd = () => {
        touchStartX.current = null;
        touchStartMsg.current = null;
    };

    const formatTime = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
        } catch {
            return "";
        }
    };

    return (
        <div className="flex flex-col h-[75vh] max-h-[700px] border border-white/10 rounded-2xl bg-slate-900/50 backdrop-blur-md overflow-hidden relative">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-base font-bold text-white">Student Feedback Room</h3>
                    <p className="text-xs text-white/50">Reply to feedback, feature requests, and suggestions from students.</p>
                </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 custom-scrollbar bg-[#020205]/30">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <span>Loading feedback history...</span>
                    </div>
                ) : (
                    messages.map((m) => {
                        const mine = m.senderPublicId === mePublicId;
                        return (
                            <div
                                key={m.id}
                                className={`flex gap-3 relative group ${mine ? "flex-row-reverse" : "flex-row"}`}
                                onTouchStart={(e) => handleTouchStart(e, m)}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchMove}
                            >
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    mine ? "bg-indigo-500/30 border-indigo-400/20 text-indigo-100" : "bg-emerald-500/30 border-emerald-400/20 text-emerald-100"
                                }`}>
                                    {m.senderName.substring(0, 2).toUpperCase()}
                                </div>

                                {/* Message Box */}
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm relative ${
                                    mine 
                                        ? "bg-indigo-600 text-white rounded-tr-none font-medium" 
                                        : "bg-white/5 border border-white/10 text-white/90 rounded-tl-none"
                                }`}>
                                    <div className={`text-[10px] font-bold mb-1 ${mine ? "text-indigo-200" : "text-emerald-300"}`}>
                                        {m.senderName} {mine && " (Admin)"}
                                    </div>

                                    {/* Reply Preview inside bubble */}
                                    {m.replyToMessage && (
                                        <div className={`mb-2 rounded-lg px-2.5 py-1.5 text-xs border-l-2 ${
                                            mine ? "bg-black/20 border-white/40 text-white/90" : "bg-white/5 border-white/20 text-white/70"
                                        }`}>
                                            <div className="font-bold mb-0.5">{m.replyToMessage.senderName}</div>
                                            <div className="truncate italic">
                                                {m.replyToMessage.attachmentType && !m.replyToMessage.body 
                                                    ? `[${m.replyToMessage.attachmentType.startsWith("video/") ? "Video" : "Image"}]`
                                                    : m.replyToMessage.body}
                                            </div>
                                        </div>
                                    )}

                                    {/* Media rendering */}
                                    {m.attachmentUrl && (!m.attachmentType || m.attachmentType.startsWith("image/")) && (
                                        <div className="mt-1 mb-2 max-w-sm overflow-hidden rounded-lg cursor-pointer border border-black/10 shadow-sm bg-black/5" onClick={() => setExpandedImageUrl(m.attachmentUrl || null)}>
                                            <img src={m.attachmentUrl} alt="Feedback file" className="max-h-60 w-full object-cover transition hover:scale-[1.02]" />
                                        </div>
                                    )}

                                    {m.attachmentUrl && m.attachmentType?.startsWith("video/") && (
                                        <div className="mt-1 mb-2 max-w-sm overflow-hidden rounded-lg border border-black/10 shadow-sm bg-black/40">
                                            <video src={m.attachmentUrl} controls className="max-h-60 w-full object-contain" />
                                        </div>
                                    )}

                                    {m.body && <div className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</div>}

                                    {/* Bubble footer info */}
                                    <div className="flex items-center justify-between gap-4 mt-2 text-[10px] opacity-60">
                                        <span>{formatTime(m.createdAt)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(m)}
                                            className="flex items-center gap-1 hover:text-white transition"
                                            title="Reply to message"
                                        >
                                            <CornerUpLeft className="w-3.5 h-3.5" />
                                            <span>Reply</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Footer Area */}
            <form onSubmit={handleSend} className="shrink-0 border-t border-white/10 p-4 bg-black/40">
                {replyingTo && (
                    <div className="flex items-center justify-between px-3 py-2 mb-2 border border-white/10 rounded-xl bg-white/5 text-xs text-white/80">
                        <div className="truncate flex-1">
                            <span className="font-semibold text-indigo-400">Replying to {replyingTo.senderName}: </span>
                            <span className="italic opacity-85">
                                {replyingTo.attachmentUrl && !replyingTo.body ? `[${replyingTo.attachmentType?.startsWith("video/") ? "Video" : "Image"}]` : replyingTo.body}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReplyingTo(null)}
                            className="ml-2 text-rose-400 hover:text-rose-500 font-bold px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                )}
                
                {error && <p className="text-rose-500 text-xs mb-2 px-1 font-semibold">{error}</p>}
                
                <div className="flex gap-2">
                    <input
                        type="file"
                        accept="image/*,video/*"
                        ref={fileInputRef}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(file);
                        }}
                        className="hidden"
                    />
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl px-3 py-2.5 border border-white/10 text-white/60 bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-center justify-center shrink-0"
                        title="Attach image or video"
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Paperclip className="w-4 h-4" />
                        )}
                    </button>
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Type admin response/reply..."
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-indigo-500/50 transition"
                    />
                    <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-40 flex items-center justify-center"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </form>

            {/* Modal Image Viewer */}
            {expandedImageUrl && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setExpandedImageUrl(null)}>
                    <button className="absolute top-4 right-4 text-white hover:text-slate-200 transition-colors p-2 bg-black/40 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                    <img src={expandedImageUrl} alt="Expanded preview" className="max-w-full max-h-full object-contain rounded" />
                </div>
            )}
        </div>
    );
}
