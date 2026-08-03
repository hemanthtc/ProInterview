"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileExplorer,
} from "@/components/synthetic/FileExplorer";
import { PreviewTable } from "@/components/synthetic/PreviewTable";
import { DocumentViewer } from "@/components/synthetic/DocumentViewer";
import { CodeViewer } from "@/components/synthetic/CodeViewer";
import { SchemaEditor, SchemaField } from "@/components/synthetic/SchemaEditor";
import { AgentTerminal, LogEntry } from "@/components/synthetic/AgentTerminal";
import {
  listFiles,
  listFolders,
  createFile,
  createFolder,
  updateFolder,
  deleteFolder,
  updateFile,
  deleteFile,
  duplicateFile,
  toggleFileVisibility,
  CustomFolder,
  GeneratedFile,
} from "@/services/synthetic/filesApi";
import { getStorageItem } from "@/utils/storage";
import {
  Sparkles,
  ArrowLeft,
  Database,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Plus,
  Table,
  Sliders,
  Terminal,
} from "lucide-react";

export default function SyntheticGeneratorPage() {
  const [activeScope, setActiveScope] = useState<"mine" | "all">("mine");
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [generationMode, setGenerationMode] = useState<"tabular" | "document">("tabular");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [rowCount, setRowCount] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([
    { id: "1", name: "id", label: "User ID", type: "id", isActive: true },
    { id: "2", name: "name", label: "Full Name", type: "name", isActive: true },
    { id: "3", name: "email", label: "Email Address", type: "email", isActive: true },
    { id: "4", name: "role", label: "Job Title", type: "category", isActive: true },
    { id: "5", name: "score", label: "Performance Score", type: "number", isActive: true },
  ]);

  const currentUserId = typeof window !== "undefined"
    ? getStorageItem("userIdentifier") || localStorage.getItem("userIdentifier") || "guest_user"
    : "guest_user";

  const notify = (type: "success" | "error" | "info" | "warning", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const addLog = (type: "info" | "success" | "error" | "warning", message: string) => {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      type,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    setLogs((prev) => [entry, ...prev.slice(0, 49)]);
  };

  const loadData = async (scope: "mine" | "all" = activeScope) => {
    setLoading(true);
    try {
      const [fetchedFiles, fetchedFolders] = await Promise.all([
        listFiles(scope),
        listFolders(),
      ]);
      setFiles(fetchedFiles);
      setFolders(fetchedFolders);
      addLog("info", `Loaded ${fetchedFiles.length} files & ${fetchedFolders.length} folders (${scope === 'mine' ? 'My Files' : 'Public Discovery'}).`);
    } catch (err: any) {
      addLog("error", err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope]);

  // Handle AI Data Generation
  const handleGenerateData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicPrompt.trim()) {
      notify("warning", "Please enter a dataset topic or description.");
      return;
    }

    setIsGenerating(true);
    addLog("info", `Starting AI generation for prompt: "${topicPrompt}" (${generationMode.toUpperCase()})`);

    try {
      const payloadData: any[] = [];
      const fieldsToGenerate = schemaFields.filter(f => f.isActive);

      // Generate synthetic sample rows
      for (let i = 1; i <= rowCount; i++) {
        const row: Record<string, any> = {};
        for (const field of fieldsToGenerate) {
          if (field.type === "id") row[field.name] = `USR_${1000 + i}`;
          else if (field.type === "name") row[field.name] = `Candidate ${i}`;
          else if (field.type === "email") row[field.name] = `candidate_${i}@example.com`;
          else if (field.type === "number") row[field.name] = Math.floor(Math.random() * 40) + 60;
          else if (field.type === "boolean") row[field.name] = i % 2 === 0;
          else row[field.name] = `${field.label} Value ${i}`;
        }
        payloadData.push(row);
      }

      const newFilePayload: Partial<GeneratedFile> = {
        title: topicPrompt.slice(0, 40),
        filename: `${topicPrompt.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30)}.${generationMode === 'tabular' ? 'json' : 'md'}`,
        contentType: generationMode,
        fileType: generationMode === 'tabular' ? 'json' : 'md',
        format: generationMode === 'tabular' ? 'json' : 'markdown',
        visibility: "private",
        rowCount: payloadData.length,
        data: payloadData,
        schema: fieldsToGenerate,
        textContent: generationMode === 'document'
          ? `# ${topicPrompt}\n\nGenerated Synthetic Document\n\n## Overview\nThis is a synthetic document automatically generated for: ${topicPrompt}.\n\n### Details\n- Mode: ${generationMode}\n- Generated At: ${new Date().toLocaleString()}`
          : JSON.stringify(payloadData, null, 2),
        originalPrompt: topicPrompt,
        aiModel: "gemini-2.5-flash",
      };

      const created = await createFile(newFilePayload);
      setFiles((prev) => [created, ...prev]);
      setSelectedFile(created);
      setTopicPrompt("");
      addLog("success", `Successfully generated synthetic dataset: "${created.title}" with ${rowCount} rows.`);
      notify("success", "Synthetic dataset generated successfully!");
    } catch (err: any) {
      addLog("error", err.message || "Failed to generate dataset.");
      notify("error", err.message || "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Synthetic Data & Code Studio
                <span className="px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-mono">
                  v2.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Multi-tenant AI dataset generator with Public/Private access controls</p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border text-xs font-medium shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-2 ${
          notification.type === 'success' ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-red-950 border-red-800 text-red-300'
        }`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Studio Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-[1700px] w-full mx-auto overflow-hidden">
        {/* Left Column: Generator Inputs & Logs (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4 overflow-y-auto pr-1">
          {/* AI Generator Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-slate-100 text-sm">Generate Synthetic Data</h2>
              </div>
              {/* Mode Toggle */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setGenerationMode("tabular")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    generationMode === "tabular" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Tabular
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode("document")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    generationMode === "document" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Document
                </button>
              </div>
            </div>

            <form onSubmit={handleGenerateData} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Topic / Prompt Description
                </label>
                <textarea
                  value={topicPrompt}
                  onChange={(e) => setTopicPrompt(e.target.value)}
                  placeholder={
                    generationMode === "tabular"
                      ? "e.g., E-commerce customer interview responses with ratings and job roles..."
                      : "e.g., Senior Software Engineer technical interview rubric and guide..."
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {generationMode === "tabular" && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Row Count: {rowCount} records
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={rowCount}
                    onChange={(e) => setRowCount(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-indigo-600/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Synthetic Dataset</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Schema Builder */}
          <SchemaEditor
            fields={schemaFields}
            onFieldsChange={setSchemaFields}
            generationMode={generationMode}
          />

          {/* Terminal Logs */}
          <AgentTerminal logs={logs} isGenerating={isGenerating} />
        </div>

        {/* Right Column: File Explorer & File Viewer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4 overflow-hidden h-[calc(100vh-100px)]">
          {/* Top Half: User-Isolated File Explorer */}
          <div className="h-1/2 min-h-[320px]">
            <FileExplorer
              files={files}
              folders={folders}
              loading={loading}
              activeScope={activeScope}
              onScopeChange={setActiveScope}
              currentUserId={currentUserId}
              onRefresh={() => loadData(activeScope)}
              onOpen={(file) => setSelectedFile(file)}
              onRename={async (file, newTitle) => {
                await updateFile(file.id || file._id || "", { title: newTitle });
                loadData(activeScope);
              }}
              onToggleFavorite={async (file) => {
                await updateFile(file.id || file._id || "", { favorite: !file.favorite });
                loadData(activeScope);
              }}
              onToggleVisibility={async (file) => {
                const nextVis = file.visibility === "public" ? "private" : "public";
                await toggleFileVisibility(file.id || file._id || "", nextVis);
                notify("success", `File is now ${nextVis.toUpperCase()}.`);
                loadData(activeScope);
              }}
              onDuplicate={async (file) => {
                await duplicateFile(file.id || file._id || "");
                notify("success", "File duplicated to your workspace.");
                loadData(activeScope);
              }}
              onDelete={async (file) => {
                await deleteFile(file.id || file._id || "");
                if (selectedFile?.id === file.id) setSelectedFile(null);
                loadData(activeScope);
              }}
              onMoveFolder={async (file, folderId) => {
                await updateFile(file.id || file._id || "", { folderId });
                loadData(activeScope);
              }}
              onCreateFolder={async (name, parentId, type) => {
                await createFolder({ name, parentId, type });
                loadData(activeScope);
              }}
              onRenameFolder={async (id, name) => {
                await updateFolder(id, { name });
                loadData(activeScope);
              }}
              onDeleteFolder={async (id) => {
                await deleteFolder(id);
                loadData(activeScope);
              }}
              onNotify={notify}
            />
          </div>

          {/* Bottom Half: Active File Viewer */}
          <div className="flex-1 overflow-hidden min-h-[300px]">
            {selectedFile ? (
              selectedFile.contentType === "tabular" ? (
                <PreviewTable file={selectedFile} onNotify={notify} />
              ) : selectedFile.contentType === "code" ? (
                <CodeViewer file={selectedFile} onNotify={notify} />
              ) : (
                <DocumentViewer file={selectedFile} onNotify={notify} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-slate-500 text-xs space-y-3">
                <Table className="w-10 h-10 text-slate-700" />
                <p className="font-medium text-slate-400">No file selected for preview</p>
                <p className="text-slate-600 text-center max-w-sm">
                  Click any file in the File Explorer above to preview tabular records, code snippets, or synthetic documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
