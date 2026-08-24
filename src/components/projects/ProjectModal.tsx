import React, { useState } from 'react';
import { X, FolderPlus, Sparkles, Tag, FileText } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose }) => {
  const { createProjectItem } = useProjectStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createProjectItem(name.trim(), description.trim(), instructions.trim());
      setName('');
      setDescription('');
      setInstructions('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-white font-bold shadow-sm">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-950">Create New Project Workspace</h3>
              <p className="text-[11px] text-zinc-500">Persistent environment for chats, files & instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-medium text-zinc-700">
          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-800 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-600" /> Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CSE Final Year Project, Marketing Campaign 2026..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Project Description */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-800 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-zinc-500" /> Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief overview of project goals, tech stack, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Custom Instructions */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Project Custom AI Instructions (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Always format code in TypeScript. Provide clean architectural diagrams. Focus on React and Tauri..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
