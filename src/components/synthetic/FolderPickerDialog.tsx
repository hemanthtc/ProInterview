import React, { useState } from 'react';
import { Folder, ChevronRight, X, Home } from 'lucide-react';
import type { CustomFolder } from '../../services/synthetic/filesApi';

interface FolderPickerDialogProps {
  isOpen: boolean;
  folders: CustomFolder[];
  currentFolderId?: string | null;
  targetType?: 'tabular' | 'document';
  title?: string;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export const FolderPickerDialog: React.FC<FolderPickerDialogProps> = ({
  isOpen,
  folders,
  currentFolderId,
  targetType,
  title = 'Move to Folder',
  onSelect,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId || null);

  if (!isOpen) return null;

  const filteredFolders = folders.filter((f) => !targetType || (f.type || 'tabular') === targetType);
  const rootFolders = filteredFolders.filter((f) => !f.parentId);

  const getSubfolders = (parentId: string) => filteredFolders.filter((f) => f.parentId === parentId);

  const renderTree = (folderList: CustomFolder[], level = 0) => {
    return folderList.map((folder) => {
      const subs = getSubfolders(folder.id || '');
      const isSelected = selectedId === folder.id;

      return (
        <div key={folder.id} className="space-y-1">
          <button
            onClick={() => setSelectedId(folder.id || null)}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              isSelected
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
            style={{ paddingLeft: `${(level + 1) * 12 + 12}px` }}
          >
            <Folder className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span className="truncate flex-1">{folder.name}</span>
            {subs.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>
          {subs.length > 0 && renderTree(subs, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 border border-slate-800 rounded-lg p-2 bg-slate-950/50">
          <button
            onClick={() => setSelectedId(null)}
            className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              selectedId === null
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Home className={`w-4 h-4 ${selectedId === null ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span className="font-medium">Root Workspace (No Folder)</span>
          </button>

          {renderTree(rootFolders)}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSelect(selectedId);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};
