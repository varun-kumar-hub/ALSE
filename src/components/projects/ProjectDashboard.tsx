import React, { useState } from 'react';
import {
  Folder,
  MessageSquare,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Save,
  Check,
  Paperclip,
  Activity,
  FileUp,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useAppStore } from '../../stores/appStore';
import { ChatArea } from '../chat/ChatArea';
import { Chat, ChatMessage as ChatMessageType, ProjectFile } from '../../services/types';

interface ProjectDashboardProps {
  projectId: string;
  onNewProjectChat: (projectId: string) => void;
  onSelectChat: (chatId: string) => void;
  chats: Chat[];
  activeChatId?: string | null;
  messages?: ChatMessageType[];
  onSendMessage?: (text: string, attachedFile?: { name: string; content: string } | null) => void;
  onStopStreaming?: () => void;
  onRegenerate?: () => void;
  onExport?: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projectId,
  onNewProjectChat,
  onSelectChat,
  chats,
  activeChatId,
  messages = [],
  onSendMessage = () => {},
  onStopStreaming = () => {},
  onRegenerate = () => {},
  onExport = () => {},
}) => {
  const { projects, updateProjectInstructions, deleteProjectItem, addProjectFileItem, removeProjectFileItem, projectFiles } =
    useProjectStore();
  const { selectedModel } = useAppStore();

  const currentProject = projects.find((p) => p.id === projectId);
  const [activeTab, setActiveTab] = useState<'chats' | 'files' | 'instructions' | 'activity'>('chats');
  const [instructionsText, setInstructionsText] = useState(currentProject?.instructions || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!currentProject) {
    return (
      <div className="p-8 text-center text-zinc-500 font-medium">
        Project not found. Select a project from the sidebar.
      </div>
    );
  }

  const projectChats = chats.filter((c) => c.project_id === projectId);
  const currentFiles = projectFiles.get(projectId) || [];
  const activeProjectChat = chats.find((c) => c.id === activeChatId && c.project_id === projectId);

  if (activeProjectChat) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
        {/* Project Breadcrumb Header Bar */}
        <div className="h-10 bg-amber-500/10 border-b border-amber-200/60 px-6 flex items-center justify-between text-xs font-bold text-amber-950 shrink-0">
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-amber-600" />
            <span className="cursor-pointer hover:underline" onClick={() => onSelectChat('')}>
              Workspace: <strong>{currentProject.name}</strong>
            </span>
            <span>/</span>
            <span className="text-zinc-700">{activeProjectChat.title}</span>
          </div>
          <button
            onClick={() => onSelectChat('')}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
          >
            ← Back to Project Dashboard
          </button>
        </div>

        <ChatArea
          chatTitle={`${currentProject.name} / ${activeProjectChat.title}`}
          messages={messages}
          onSendMessage={onSendMessage}
          onStopStreaming={onStopStreaming}
          onRegenerate={onRegenerate}
          onExport={onExport}
        />
      </div>
    );
  }

  const handleSaveInstructions = async () => {
    await updateProjectInstructions(projectId, instructionsText);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const newFile: ProjectFile = {
        id: String(Date.now() + i),
        project_id: projectId,
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop() || 'document',
        uploaded_at: new Date().toISOString(),
      };
      addProjectFileItem(projectId, newFile);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/50 overflow-hidden select-none">
      {/* Project Header (ChatGPT Style) */}
      <div className="bg-white border-b border-zinc-200/80 p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-amber-400 flex items-center justify-center font-bold shadow-sm">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-zinc-950 flex items-center gap-2">
                {currentProject.name}
              </h1>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                {currentProject.description || 'Project Workspace'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold text-xs cursor-pointer shadow-2xs"
            >
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => deleteProjectItem(projectId)}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 cursor-pointer"
              title="Delete Project Workspace"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Prominent "+ New chat in [Project Name]" Input Pill (ChatGPT Style) */}
        <div
          onClick={() => onNewProjectChat(projectId)}
          className="w-full bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 rounded-full px-5 py-3 flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4 text-zinc-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-zinc-800">
              New chat in {currentProject.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60 font-bold">
              ⚡ {selectedModel}
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'chats'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats ({projectChats.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Sources ({currentFiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'instructions'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instructions</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-500 hover:bg-zinc-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity</span>
          </button>
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Chats Tab */}
        {activeTab === 'chats' && (
          <div className="max-w-4xl mx-auto space-y-3">
            {projectChats.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 space-y-3">
                <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-semibold text-zinc-600">No chats created in {currentProject.name} yet.</p>
                <button
                  onClick={() => onNewProjectChat(projectId)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white font-extrabold text-xs cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Start Project Chat
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {projectChats.map((c) => {
                  const formattedDate = c.created_at
                    ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Recent';

                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelectChat(c.id)}
                      className="p-4 bg-white rounded-2xl border border-zinc-200/90 hover:border-zinc-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="space-y-0.5 min-w-0 pr-4">
                        <h3 className="font-extrabold text-zinc-900 text-sm truncate group-hover:text-amber-600 transition-colors">
                          {c.title}
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium truncate">
                          Active Model: {c.model || selectedModel}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-zinc-400 font-mono shrink-0">
                        {formattedDate}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider">
                Uploaded Project Files
              </h2>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 font-bold text-xs cursor-pointer hover:bg-amber-100">
                <FileUp className="w-3.5 h-3.5" /> Upload File
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {currentFiles.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 space-y-2">
                <Paperclip className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-semibold text-zinc-600">No files uploaded to this project.</p>
                <p className="text-[11px] text-zinc-400">Upload PDF, DOCX, CSV, or code files for persistent context.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentFiles.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 bg-white rounded-2xl border border-zinc-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{f.name}</h4>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {(f.size / 1024).toFixed(1)} KB • Uploaded {f.uploaded_at.split('T')[0]}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeProjectFileItem(projectId, f.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Instructions Tab */}
        {activeTab === 'instructions' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider">
                  Project Custom System Instructions
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Every chat inside this project will automatically inherit these custom instructions.
                </p>
              </div>
              <button
                onClick={handleSaveInstructions}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm cursor-pointer"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{savedSuccess ? 'Saved!' : 'Save Instructions'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              placeholder="e.g. Always format responses in clean markdown. Prioritize TypeScript, TailwindCSS, and Tauri patterns. Focus on security best practices..."
              className="w-full bg-white border border-zinc-200 rounded-3xl p-4 text-xs font-medium text-zinc-900 focus:outline-none focus:border-amber-500 shadow-2xs resize-none"
            />
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="max-w-4xl mx-auto space-y-3">
            <h2 className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider">Project Timeline</h2>
            <div className="p-4 bg-white rounded-3xl border border-zinc-200 space-y-3">
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Project Workspace <strong>{currentProject.name}</strong> created.</span>
                <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                  {currentProject.created_at.split('T')[0]}
                </span>
              </div>
              {projectChats.map((c) => (
                <div key={c.id} className="flex items-center gap-3 text-xs text-zinc-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>New chat started: <strong>{c.title}</strong></span>
                  <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                    {c.created_at ? c.created_at.split('T')[0] : 'recent'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
