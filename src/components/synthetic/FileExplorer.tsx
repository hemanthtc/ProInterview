import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Star, Pin, Trash2, Download, Copy, Pencil, Play, Eye,
  Upload, FolderOpen, Folder, FolderPlus, MoreHorizontal, FileCode,
  RefreshCw, ChevronRight, Home, Clock, X, FileSpreadsheet, FileText,
  Globe, Lock, User, Share2
} from 'lucide-react';
import type { CustomFolder, GeneratedFile } from '../../services/synthetic/filesApi';
import { formatBytes } from '../../services/synthetic/filesApi';
import { FolderPickerDialog } from './FolderPickerDialog';
import { ConfirmModal } from './ConfirmModal';

export interface ExplorerSelection {
  type: 'root' | 'folder' | 'starred' | 'all_files';
  id?: string;
}

interface FileExplorerProps {
  files: GeneratedFile[];
  folders: CustomFolder[];
  loading?: boolean;
  activeScope: 'mine' | 'all';
  onScopeChange: (scope: 'mine' | 'all') => void;
  currentUserId?: string;
  onRefresh: () => void;
  onOpen: (file: GeneratedFile) => void;
  onEdit?: (file: GeneratedFile) => void;
  onRename: (file: GeneratedFile, title: string) => Promise<void>;
  onToggleFavorite: (file: GeneratedFile) => Promise<void>;
  onTogglePin?: (file: GeneratedFile) => Promise<void>;
  onToggleVisibility: (file: GeneratedFile) => Promise<void>;
  onDuplicate: (file: GeneratedFile) => Promise<void>;
  onDelete: (file: GeneratedFile) => Promise<void>;
  onMoveFolder: (file: GeneratedFile, folderId: string | null) => Promise<void>;
  onCreateFolder: (name: string, parentId?: string | null, type?: 'tabular' | 'document') => Promise<CustomFolder | void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onUploaded?: (file: GeneratedFile) => void;
  onNotify: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = (props) => {
  const {
    files, folders, loading, activeScope, onScopeChange, currentUserId,
    onRefresh, onOpen, onEdit, onRename, onToggleFavorite, onToggleVisibility,
    onDuplicate, onDelete, onMoveFolder, onCreateFolder, onRenameFolder, onDeleteFolder,
    onNotify,
  } = props;

  const [selection, setSelection] = useState<ExplorerSelection>({ type: 'root' });
  const [typeFilter, setTypeFilter] = useState<'all' | 'tabular' | 'document'>('all');
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMovePicker, setShowMovePicker] = useState<GeneratedFile | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<CustomFolder | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<GeneratedFile | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<CustomFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const visibleFiles = useMemo(() => {
    let list = [...files];

    // Filter by tab selection
    if (selection.type === 'folder' && selection.id) {
      list = list.filter(f => f.folderId === selection.id);
    } else if (selection.type === 'starred') {
      list = list.filter(f => f.favorite);
    } else if (selection.type === 'root') {
      if (activeScope === 'mine') {
        list = list.filter(f => !f.folderId);
      }
    }

    // Type filter
    if (typeFilter === 'tabular') {
      list = list.filter(f => f.contentType === 'tabular' || f.fileType === 'csv' || f.fileType === 'json');
    } else if (typeFilter === 'document') {
      list = list.filter(f => f.contentType === 'document' || f.fileType === 'md' || f.fileType === 'txt');
    }

    // Search query
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.filename.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
      );
    }

    return list;
  }, [files, selection, typeFilter, query, activeScope]);

  const currentFolder = useMemo(() => {
    if (selection.type === 'folder' && selection.id) {
      return folders.find(f => f.id === selection.id || f._id === selection.id);
    }
    return null;
  }, [selection, folders]);

  const rootFolders = useMemo(() => {
    return folders.filter(f => !f.parentId);
  }, [folders]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await onCreateFolder(
        newFolderName.trim(),
        selection.type === 'folder' ? selection.id : null,
        typeFilter === 'all' ? 'tabular' : typeFilter
      );
      setNewFolderName('');
      setShowCreateFolder(false);
      onNotify('success', 'Folder created successfully!');
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to create folder');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Scope Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/90 border-b border-slate-800">
        <div className="flex items-center space-x-2 bg-slate-900 p-1 border border-slate-800 rounded-lg">
          <button
            onClick={() => {
              onScopeChange('mine');
              setSelection({ type: 'root' });
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeScope === 'mine'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Files</span>
          </button>
          <button
            onClick={() => {
              onScopeChange('all');
              setSelection({ type: 'all_files' });
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeScope === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>All Files (Public)</span>
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>

          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            title="Refresh Explorer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-56 bg-slate-950/60 border-r border-slate-800 p-3 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Navigation</p>
            <button
              onClick={() => setSelection({ type: 'root' })}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selection.type === 'root' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-4 h-4 text-indigo-400" />
              <span>Root Workspace</span>
            </button>
            <button
              onClick={() => setSelection({ type: 'starred' })}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selection.type === 'starred' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400" />
              <span>Favorites</span>
            </button>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-800/80">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Folders</p>
            {rootFolders.length === 0 ? (
              <p className="px-3 text-xs text-slate-600 italic">No folders created</p>
            ) : (
              rootFolders.map((f) => {
                const folderId = f.id || f._id || '';
                const isSelected = selection.type === 'folder' && selection.id === folderId;
                return (
                  <button
                    key={folderId}
                    onClick={() => setSelection({ type: 'folder', id: folderId })}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      isSelected ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="truncate">{f.name}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* File Table Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50">
          {/* Breadcrumb Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center space-x-1">
              <span className="font-semibold text-slate-200">
                {currentFolder ? currentFolder.name : selection.type === 'starred' ? 'Favorites' : activeScope === 'mine' ? 'My Workspace' : 'All Public Community Files'}
              </span>
              <span className="text-slate-600">({visibleFiles.length} files)</span>
            </div>

            {/* Type Filters */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${typeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('tabular')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${typeFilter === 'tabular' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Tabular
              </button>
              <button
                onClick={() => setTypeFilter('document')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium ${typeFilter === 'document' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Docs
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-auto">
            {visibleFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-slate-500 text-xs space-y-2">
                <FolderOpen className="w-8 h-8 text-slate-600" />
                <p>No files found in this view.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Access</th>
                    <th className="px-4 py-2.5">Owner</th>
                    <th className="px-4 py-2.5">Format</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {visibleFiles.map((file) => {
                    const fileId = file.id || file._id || '';
                    const isOwner = !file.userId || file.userId === currentUserId || activeScope === 'mine';
                    const isPublic = file.visibility === 'public';

                    return (
                      <tr key={fileId} className="hover:bg-slate-800/40 transition-colors group">
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => onOpen(file)}
                            className="flex items-center space-x-2 text-left hover:text-indigo-300 font-medium truncate max-w-xs"
                          >
                            {file.contentType === 'tabular' ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{file.title}</span>
                          </button>
                        </td>

                        {/* Visibility Badge */}
                        <td className="px-4 py-2.5">
                          {isPublic ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <Globe className="w-3 h-3" />
                              <span>Public</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              <Lock className="w-3 h-3" />
                              <span>Private</span>
                            </span>
                          )}
                        </td>

                        {/* Owner Column */}
                        <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                          {file.ownerName ? `@${file.ownerName}` : 'You'}
                        </td>

                        {/* Format */}
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px] uppercase">
                          {file.fileType || file.format}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {/* Toggle Public/Private (Owner only) */}
                            {isOwner && (
                              <button
                                onClick={() => onToggleVisibility(file)}
                                className={`p-1 rounded transition-colors ${
                                  isPublic ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                                title={isPublic ? 'Make Private' : 'Make Public'}
                              >
                                {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            {/* Favorite toggle */}
                            <button
                              onClick={() => onToggleFavorite(file)}
                              className={`p-1 rounded transition-colors ${
                                file.favorite ? 'text-amber-400 hover:bg-amber-500/20' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                              }`}
                              title="Favorite"
                            >
                              <Star className="w-3.5 h-3.5" fill={file.favorite ? 'currentColor' : 'none'} />
                            </button>

                            {/* Duplicate / Fork */}
                            <button
                              onClick={() => onDuplicate(file)}
                              className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors"
                              title={isOwner ? 'Duplicate File' : 'Fork to My Workspace'}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Move File (Owner only) */}
                            {isOwner && (
                              <button
                                onClick={() => setShowMovePicker(file)}
                                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                title="Move to Folder"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete File (Owner only) */}
                            {isOwner && (
                              <button
                                onClick={() => setConfirmDeleteFile(file)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete File"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateFolder} className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              Create New Folder
            </h3>
            <input
              type="text"
              placeholder="Folder Name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateFolder(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move Folder Dialog */}
      {showMovePicker && (
        <FolderPickerDialog
          isOpen={true}
          folders={folders}
          currentFolderId={showMovePicker.folderId}
          onSelect={(targetId) => {
            onMoveFolder(showMovePicker, targetId);
            setShowMovePicker(null);
            onNotify('success', 'File moved successfully!');
          }}
          onClose={() => setShowMovePicker(null)}
        />
      )}

      {/* Confirm Delete File Modal */}
      {confirmDeleteFile && (
        <ConfirmModal
          isOpen={true}
          title="Delete File"
          message={`Are you sure you want to delete "${confirmDeleteFile.title}"?`}
          onConfirm={async () => {
            await onDelete(confirmDeleteFile);
            setConfirmDeleteFile(null);
            onNotify('success', 'File deleted.');
          }}
          onCancel={() => setConfirmDeleteFile(null)}
        />
      )}
    </div>
  );
};
