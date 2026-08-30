"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    ShieldAlert,
    HardDrive,
    Sparkles,
    FileIcon
} from "lucide-react";

interface ExpiredFile {
    key: string;
    name: string;
    lastModified?: string;
    size: number;
    ageDays: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function CleanupUploadsManager() {
    const [files, setFiles] = useState<ExpiredFile[]>([]);
    const [totalFiles, setTotalFiles] = useState(0);
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    const loadExpiredFiles = useCallback(async () => {
        setLoading(true);
        setError("");
        setSuccessMessage("");
        try {
            const res = await fetch("/api/admin/cleanup-uploads");
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to load files");
            }
            setConfigured(data.configured);
            setFiles(data.files || []);
            setTotalFiles(data.totalFiles || 0);
        } catch (err: any) {
            setError(err.message || "Failed to connect to administration api.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadExpiredFiles();
    }, [loadExpiredFiles]);

    const handlePurge = async () => {
        setActionLoading(true);
        setError("");
        setSuccessMessage("");
        setShowConfirm(false);
        try {
            const res = await fetch("/api/admin/cleanup-uploads", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to perform cleanup");
            }
            setSuccessMessage(`Successfully deleted ${data.deletedCount} temporary file(s).`);
            setFiles([]);
            setTotalFiles(prev => Math.max(0, prev - data.deletedCount));
            // reload file status
            void loadExpiredFiles();
        } catch (err: any) {
            setError(err.message || "Deletion failed");
        } finally {
            setActionLoading(false);
        }
    };

    const totalExpiredSize = files.reduce((acc, f) => acc + f.size, 0);

    if (loading && files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-white/50">Scanning S3 uploads folder...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-left">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-indigo-400" />
                        S3 Temporary Uploads Cleanup
                    </h2>
                    <p className="text-xs text-white/50 mt-1">
                        Review and clear temporary screens, images or references under the <b>uploads/</b> prefix older than 7 days.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void loadExpiredFiles()}
                        disabled={loading || actionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-white/70 hover:text-white transition disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    {configured && files.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowConfirm(true)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition shadow-lg shadow-red-500/20 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Purge Expired
                        </button>
                    )}
                </div>
            </div>

            {/* Error & Success Toasts */}
            {error && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-250 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Configuration warning */}
            {configured === false && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-amber-400">AWS S3 is inactive</h4>
                            <p className="text-xs text-white/60 leading-relaxed mt-1">
                                S3 uploads are disabled on this environment. File references and screenshots are processed in memory and immediately discarded. No temporary storage cleanup is required on this server.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {configured && (
                <>
                    {/* Summary statistics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                            <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Total Uploads</p>
                            <p className="text-2xl font-black mt-1">{totalFiles}</p>
                            <p className="text-[10px] text-white/50 mt-1">Files currently inside uploads/</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                            <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Expired Files (7+ Days)</p>
                            <p className="text-2xl font-black mt-1 text-red-400">{files.length}</p>
                            <p className="text-[10px] text-white/50 mt-1">Eligible for automated deletion</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                            <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Storage Reclaimable</p>
                            <p className="text-2xl font-black mt-1 text-emerald-450">{formatBytes(totalExpiredSize)}</p>
                            <p className="text-[10px] text-white/50 mt-1">Size of expired files</p>
                        </div>
                    </div>

                    {/* Listing of expired files */}
                    <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xs uppercase font-bold tracking-wider text-white/45">Expired Files list ({files.length})</h3>
                            {files.length > 0 && (
                                <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded">
                                    Needs purge
                                </span>
                            )}
                        </div>

                        {files.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5 text-white/40">
                                            <th className="px-5 py-3 font-semibold">File name</th>
                                            <th className="px-5 py-3 font-semibold">S3 Object Key</th>
                                            <th className="px-5 py-3 font-semibold">Upload Date</th>
                                            <th className="px-5 py-3 font-semibold text-right">Size</th>
                                            <th className="px-5 py-3 font-semibold text-right">Age</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {files.map((file) => (
                                            <tr key={file.key} className="hover:bg-white/2 transition-colors">
                                                <td className="px-5 py-3.5 font-bold flex items-center gap-2 min-w-[180px]">
                                                    <FileIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-[10px] text-white/50 truncate max-w-[240px]" title={file.key}>
                                                    {file.key}
                                                </td>
                                                <td className="px-5 py-3.5 text-white/60">
                                                    {file.lastModified ? new Date(file.lastModified).toLocaleDateString("en-IN") : "—"}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-medium">
                                                    {formatBytes(file.size)}
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-bold text-red-300">
                                                    {file.ageDays} days
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-14 space-y-2.5">
                                <Sparkles className="w-8 h-8 text-emerald-400" />
                                <p className="font-bold text-sm text-white/80">S3 bucket is clean!</p>
                                <p className="text-xs text-white/40">No temporary uploads older than 7 days found.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Confirm Purge Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161616] border border-white/10 rounded-2xl p-6 max-w-md w-full text-center space-y-4">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                        <div>
                            <h4 className="text-lg font-bold text-white">Confirm Purge Operation</h4>
                            <p className="text-xs text-white/60 mt-2 leading-relaxed">
                                You are about to permanently delete <b>{files.length}</b> expired files ({formatBytes(totalExpiredSize)}) from the S3 bucket under the <b>uploads/</b> prefix. This action is irreversible.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold text-white/80 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handlePurge()}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition cursor-pointer"
                            >
                                Yes, Delete Permanently
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
