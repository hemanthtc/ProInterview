import React from 'react';
import { FileCode, Save } from 'lucide-react';
import type { GeneratedFile } from '../../services/synthetic/filesApi';

interface CodeEditorProps {
  file: GeneratedFile;
  value: string;
  onChange: (val: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ file, value, onChange, onSave, readOnly }) => {
  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">{file.filename || file.title}</span>
          {readOnly && (
            <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded-full">Read Only</span>
          )}
        </div>

        {onSave && !readOnly && (
          <button
            onClick={onSave}
            className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="flex-1 p-4 bg-slate-950 text-indigo-200 font-mono text-xs leading-relaxed focus:outline-none resize-none"
        placeholder="// Code editor..."
      />
    </div>
  );
};
