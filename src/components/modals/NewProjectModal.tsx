import React, { useState } from 'react';
import { X, FolderPlus, Sparkles } from 'lucide-react';
import { createProject, ProjectItem } from '../../services/database';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: ProjectItem) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [learningBudget, setLearningBudget] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newProj = await createProject(
        name.trim(),
        topic.trim() || name.trim(),
        goal.trim() || 'Master core domain concepts',
        description.trim(),
        learningBudget,
        ''
      );
      onProjectCreated(newProj);
      setName('');
      setTopic('');
      setGoal('');
      setDescription('');
      setLearningBudget(30);
      onClose();
    } catch (err) {
      console.error('Failed to create subject:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl max-w-md w-full p-6 text-zinc-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-850 border border-zinc-750 text-white">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create New Subject</h3>
              <p className="text-xs text-zinc-400">Organize your learning into a focused subject workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures, Machine Learning, Computer Networks"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!topic) setTopic(e.target.value);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1">
                Learning Topic *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Data Structures"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1">
                Learning Budget
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={learningBudget}
                onChange={(e) => setLearningBudget(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1">
              Learning Goal *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Master DSA fundamentals & algorithms"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Prepare for upcoming exams, technical interviews, or projects..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
              <span>{isSubmitting ? 'Creating...' : 'Create Subject Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
