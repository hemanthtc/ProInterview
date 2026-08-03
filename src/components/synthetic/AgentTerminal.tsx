import React from 'react';
import { Terminal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
}

interface AgentTerminalProps {
  logs: LogEntry[];
  isGenerating?: boolean;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ logs, isGenerating }) => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 h-44 overflow-y-auto shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider">AI Generation Log</span>
        </div>
        {isGenerating && (
          <span className="flex items-center space-x-1 text-indigo-400 animate-pulse text-[11px]">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing...</span>
          </span>
        )}
      </div>

      <div className="space-y-1.5 pt-1">
        {logs.length === 0 ? (
          <p className="text-slate-600 text-[11px] italic">Ready. Enter prompt or configure schema to generate synthetic data.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 text-[11px] leading-relaxed">
              <span className="text-slate-600 font-mono text-[10px] shrink-0">{log.timestamp}</span>
              {log.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              ) : log.type === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0 mt-1.5" />
              )}
              <span className={log.type === 'error' ? 'text-red-300' : log.type === 'success' ? 'text-emerald-300' : 'text-slate-300'}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
