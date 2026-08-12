import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Code,
  FileText,
  Sparkles,
  Search,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  getNotebookNotes,
  saveNotebookNote,
  deleteNotebookNote,
  NoteItem,
} from '../../services/database';

interface AINotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (content: string) => void;
}

export const AINotebookModal: React.FC<AINotebookModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat,
}) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getNotebookNotes().then((loaded) => {
        if (loaded.length > 0) {
          setNotes(loaded);
          setActiveNoteId(loaded[0].id);
        } else {
          const initial: NoteItem = {
            id: '1',
            title: 'Vector RAG Search Strategy',
            category: 'research',
            content:
              'Hybrid search combines dense vector embeddings (nomic-embed-text) with sparse BM25 keyword matching for 98% accuracy on technical codebases.',
            updatedAt: 'Just now',
          };
          setNotes([initial]);
          setActiveNoteId(initial.id);
          saveNotebookNote(initial);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleAddNote = () => {
    const newNote: NoteItem = {
      id: String(Date.now()),
      title: 'Untitled Note',
      category: 'general',
      content: 'Write your research notes, code snippets, or AI prompt templates here...',
      updatedAt: 'Just now',
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    saveNotebookNote(newNote);
  };

  const handleDeleteNote = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    deleteNotebookNote(id);
    if (remaining.length > 0) {
      setActiveNoteId(remaining[0].id);
    }
  };

  const handleCopyNote = async () => {
    if (activeNote) {
      await navigator.clipboard.writeText(activeNote.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-zinc-950/40 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-4xl h-[600px] bg-white border border-zinc-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80 bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-950">AI Knowledge Notebook</h2>
              <p className="text-[11px] text-zinc-500 font-mono">Store code snippets, research notes & prompts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddNote}>
              New Note
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split (Sidebar + Editor) */}
        <div className="flex-1 flex min-h-0">
          {/* Notes List Sidebar */}
          <div className="w-64 border-r border-zinc-200/80 bg-zinc-50/40 flex flex-col">
            <div className="p-3 border-b border-zinc-200/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredNotes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveNoteId(n.id)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer space-y-1 ${
                    activeNoteId === n.id
                      ? 'bg-purple-50 border border-purple-200/80 text-purple-900 shadow-sm'
                      : 'hover:bg-zinc-100/80 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[140px]">{n.title}</span>
                    {n.category === 'code' ? (
                      <Code className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{n.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Note Editor View */}
          {activeNote && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {/* Note Editor Bar */}
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    const updated = { ...activeNote, title: newTitle };
                    setNotes(notes.map((n) => (n.id === activeNote.id ? updated : n)));
                    saveNotebookNote(updated);
                  }}
                  className="text-base font-extrabold text-zinc-950 focus:outline-none w-full bg-transparent"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} onClick={handleCopyNote}>
                    {copied ? 'Copied' : 'Copy'}
                  </Button>

                  {onInsertToChat && (
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                      onClick={() => {
                        onInsertToChat(activeNote.content);
                        onClose();
                      }}
                    >
                      Use in Chat
                    </Button>
                  )}

                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Textarea Content */}
              <textarea
                value={activeNote.content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  const updated = { ...activeNote, content: newContent };
                  setNotes(notes.map((n) => (n.id === activeNote.id ? updated : n)));
                  saveNotebookNote(updated);
                }}
                placeholder="Type your notes..."
                className="flex-1 w-full p-6 text-sm font-mono text-zinc-800 leading-relaxed focus:outline-none resize-none bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
