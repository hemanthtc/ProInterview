"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Circle } from "lucide-react";

/**
 * Interview session recorder — captures mic (+ optional camera) to WebM
 * and exports a transcript PDF-ish HTML printout.
 */
export default function SessionRecorder({
    transcript,
    title = "ProInterview Session",
    blobUrl: externalBlobUrl = null,
}: {
    transcript: string;
    title?: string;
    blobUrl?: string | null;
}) {
    const [recording, setRecording] = useState(false);
    const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);

    const activeBlobUrl = externalBlobUrl || localBlobUrl;

    useEffect(() => {
        return () => {
            if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        };
    }, [localBlobUrl]);

    const start = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() =>
            navigator.mediaDevices.getUserMedia({ audio: true })
        );
        chunks.current = [];
        const rec = new MediaRecorder(stream);
        mediaRecorder.current = rec;
        rec.ondataavailable = (e) => {
            if (e.data.size) chunks.current.push(e.data);
        };
        rec.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunks.current, { type: "video/webm" });
            setLocalBlobUrl(URL.createObjectURL(blob));
        };
        rec.start();
        setRecording(true);
    }, []);

    const stop = useCallback(() => {
        mediaRecorder.current?.stop();
        setRecording(false);
    }, []);

    function exportTranscript() {
        const escapeHtml = (value: string) =>
            value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        const safeTitle = escapeHtml(title);
        const safeBody = escapeHtml(transcript);
        const w = window.open("", "_blank");
        if (!w) return;
        w.document.write(`<!doctype html><html><head><title>${safeTitle}</title>
          <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.5;white-space:pre-wrap}</style>
          </head><body><h1>${safeTitle}</h1><p>Exported ${new Date().toLocaleString()}</p><hr/>${safeBody}</body></html>`);
        w.document.close();
        w.focus();
        w.print();
    }

    return (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-wrap items-center gap-2 text-sm">
            {!externalBlobUrl && (
                <>
                    {!recording ? (
                        <button type="button" onClick={() => void start()} className="inline-flex items-center gap-1 rounded-lg bg-rose-500/90 px-3 py-1.5">
                            <Circle className="w-3 h-3 fill-current" /> Record session
                        </button>
                    ) : (
                        <button type="button" onClick={stop} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5">
                            Stop
                        </button>
                    )}
                </>
            )}
            {activeBlobUrl && (
                <a href={activeBlobUrl} download="prointerview-session.webm" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5">
                    <Download className="w-3.5 h-3.5" /> Download WebM
                </a>
            )}
            <button type="button" onClick={exportTranscript} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5">
                <Download className="w-3.5 h-3.5" /> Transcript PDF
            </button>
        </div>
    );
}
