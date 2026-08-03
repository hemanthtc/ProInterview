import React, { useState } from 'react';
import { Copy, Download, FileText, Check, Globe, Lock } from 'lucide-react';
import type { GeneratedFile } from '../../services/synthetic/filesApi';

interface DocumentViewerProps {
  file: GeneratedFile;
  onNotify?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, onNotify }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.textContent || '');
    setCopied(true);
    if (onNotify) onNotify('success', 'Document text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([file.textContent || ''], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = file.filename || `${file.title}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
              {file.title}
              {file.visibility === 'public' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  <Globe className="w-3 h-3" /> Public
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 rounded-full">
                  <Lock className="w-3 h-3" /> Private
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {file.fileType.toUpperCase()} Document • {file.ownerName ? `Created by @${file.ownerName}` : 'Synthetic Document'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      <div className="flex-1 overflow-auto p-6 bg-slate-900/60 font-sans text-slate-200 leading-relaxed text-sm whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-indigo-200">
        {file.textContent || 'No text content available in this document.'}
      </div>
    </div>
  );
};
