"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

export default function PeerMockPage() {
    const [code, setCode] = useState("");
    const room = useMemo(() => (code.trim().toUpperCase() || "PEER01").slice(0, 8), [code]);

    return (
        <div className="min-h-screen bg-[#0b141a] text-white px-4 py-12">
            <div className="max-w-xl mx-auto">
                <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Peer mock
                </p>
                <h1 className="mt-2 text-3xl font-bold">Two students, one observer AI</h1>
                <p className="mt-3 text-sm text-white/55">
                    Share a room code. One person interviews, the other answers. ProInterview scores the transcript after you paste it
                    into Film Room.
                </p>
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Room code"
                    className="mt-6 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono"
                />
                <p className="mt-3 text-sm text-white/70">
                    Active room: <span className="font-mono text-emerald-300">{room}</span>
                </p>
                <ol className="mt-6 space-y-2 text-sm text-white/60 list-decimal pl-5">
                    <li>Student A asks questions from the practice interview bank.</li>
                    <li>Student B answers out loud (use the voice coach on /interview).</li>
                    <li>Paste the transcript into Film Room for an AI rewrite.</li>
                </ol>
                <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
                    <Link href="/interview" className="text-emerald-400 hover:underline">
                        Open interview room →
                    </Link>
                    <Link href="/film-room" className="text-white/50 hover:text-white">
                        Film Room
                    </Link>
                </div>
            </div>
        </div>
    );
}
