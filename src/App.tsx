import { useEffect, useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { ChatHeader } from './components/chat/ChatHeader';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { SetupWizard } from './components/setup/SetupWizard';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { DebugPanel } from './components/debug/DebugPanel';
import { CommandPaletteModal } from './components/palette/CommandPaletteModal';
import { ModelSwitchModal } from './components/modals/ModelSwitchModal';
import { NewProjectModal } from './components/modals/NewProjectModal';

import { LearnView } from './components/views/LearnView';
import { KnowledgeView } from './components/views/KnowledgeView';
import { ResearchView } from './components/views/ResearchView';
import { StoryChallengeView } from './components/views/StoryChallengeView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { EvaluationLabView } from './components/views/EvaluationLabView';
import { JudgeControlView } from './components/views/JudgeControlView';
import { ProjectsView } from './components/views/ProjectsView';
import { ProjectDashboardView } from './components/views/ProjectDashboardView';
import { AdaptiveLearningDashboard } from './components/dashboard/AdaptiveLearningDashboard';

import { useAppStore } from './stores/appStore';
import {
  getChats,
  createChat,
  updateChatTitle,
  togglePinChat,
  deleteChat as dbDeleteChat,
  getMessages,
  addMessage,
  getProjects,
  deleteProject as dbDeleteProject,
  ProjectItem,
} from './services/database';
import { createProviderManager, getCapabilitiesForIntent, getProviderIdForModel } from './services/providers';
import { saveWorkspaceFile } from './services/workspace';
import { detectQueryIntent } from './lib/intentDetector';
import { optimizePrompt } from './lib/promptOptimizer';
import { filterResponseForIntent } from './lib/responseFilter';
import { buildThinkingTimeline } from './lib/thinkingTimeline';
import { webSearch, webExtract } from './services/webTools';
import { processLearnerInteraction } from './engine/ps6Engine';
import { Chat, ChatMessage as ChatMessageType } from './services/types';

function hasActiveTextSelection(): boolean {
  const selection = window.getSelection?.();
  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
}

export function App() {
  const {
    activeView: storeView,
    setActiveView: setStoreView,
    currentChatId,
    setCurrentChatId,
    activeProjectId,
    setActiveProjectId,
    selectedModel,
    aiMode,
    defaultProvider,
    providerConfigs,
    setIsStreaming,
    setStreamingContent,
    setGenerationStage,
    setThinkingTimeline,
    updateThinkingTimelinePhase,
    completeThinkingTimeline,
    failThinkingTimelinePhase,
    resetThinkingTimeline,
    initApp,
  } = useAppStore();

  const [activeWorkspaceView, setActiveWorkspaceView] = useState<string>('chat');
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);

  // Initialize app settings, projects, and local persistence.
  useEffect(() => {
    initApp();
    loadProjects();
    loadChats();
  }, []);

  // Load messages when active chat changes
  useEffect(() => {
    if (currentChatId) {
      getMessages(currentChatId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const loadProjects = async () => {
    const list = await getProjects();
    setProjects(list);
  };

  const loadChats = async (explicitChatId?: string | null, overrideProjectId?: string | null) => {
    const targetProjectId = overrideProjectId !== undefined ? overrideProjectId : activeProjectId;
    const allChats = await getChats();
    setChats(allChats);

    // Context-scoped chats for current active workspace
    const contextChats = allChats.filter((c) => {
      if (targetProjectId === null) return !c.project_id;
      return c.project_id === targetProjectId;
    });

    if (explicitChatId !== undefined) {
      setCurrentChatId(explicitChatId);
      return;
    }

    const savedChatId = localStorage.getItem('ai_os_active_chat_id');

    if (currentChatId && contextChats.some((c) => c.id === currentChatId)) {
      return;
    }

    if (savedChatId && contextChats.some((c) => c.id === savedChatId)) {
      setCurrentChatId(savedChatId);
    } else if (contextChats.length > 0) {
      setCurrentChatId(contextChats[0].id);
    } else {
      setCurrentChatId(null);
    }
  };

  const handleSelectProject = async (projectId: string | null) => {
    setActiveProjectId(projectId);
    await loadChats(undefined, projectId);
  };

  const handleNewChat = async (initialPrompt?: string) => {
    const title = initialPrompt ? initialPrompt.slice(0, 30) : 'New Chat';
    const chat = await createChat(title, selectedModel, activeProjectId || undefined);
    setCurrentChatId(chat.id);
    setMessages([]);
    setActiveWorkspaceView('chat');
    await loadChats(chat.id, activeProjectId);

    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    setActiveWorkspaceView('chat');
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    await updateChatTitle(id, newTitle);
    await loadChats(currentChatId, activeProjectId);
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    await togglePinChat(id, !currentPin);
    await loadChats(currentChatId, activeProjectId);
  };

  const handleDeleteChat = async (id: string) => {
    await dbDeleteChat(id);
    const allChats = await getChats();
    setChats(allChats);

    const contextChats = allChats.filter((c) => {
      if (activeProjectId === null) return !c.project_id;
      return c.project_id === activeProjectId;
    });

    let nextActiveId: string | null = currentChatId;
    if (currentChatId === id) {
      if (contextChats.length > 0) {
        nextActiveId = contextChats[0].id;
        setCurrentChatId(nextActiveId);
      } else {
        nextActiveId = null;
        setCurrentChatId(null);
        setMessages([]);
      }
    }
    await loadChats(nextActiveId, activeProjectId);
  };

  const handleDeleteProject = async (projectId: string) => {
    await dbDeleteProject(projectId);
    await loadProjects();
    if (activeProjectId === projectId) {
      await handleSelectProject(null);
    }
  };

  const handleProjectCreated = async (newProj: ProjectItem) => {
    await loadProjects();
    await handleSelectProject(newProj.id);
    setActiveWorkspaceView('project_dashboard');
  };

  // Main streaming chat completion logic connected to PS6 engine
  const handleSendMessage = async (userPrompt: string) => {
    let targetChatId = currentChatId;

    if (!targetChatId) {
      const newChat = await createChat('New Chat', selectedModel, activeProjectId || undefined);
      targetChatId = newChat.id;
      setCurrentChatId(targetChatId);
      await loadChats(targetChatId, activeProjectId);
    }

    const intent = detectQueryIntent(userPrompt);
    const providerManager = createProviderManager(providerConfigs, aiMode, defaultProvider);
    const capabilities = getCapabilitiesForIntent(intent);

    setThinkingTimeline(buildThinkingTimeline(intent, userPrompt, selectedModel));
    updateThinkingTimelinePhase('analyze');

    await addMessage(targetChatId, 'user', userPrompt, intent);
    const currentMsgs = await getMessages(targetChatId);
    setMessages(currentMsgs);

    if (currentMsgs.length <= 2) {
      const autoTitle = userPrompt.trim().slice(0, 42) || 'New Chat';
      await updateChatTitle(targetChatId, autoTitle);
      await loadChats(targetChatId, activeProjectId);
    }

    updateThinkingTimelinePhase('gather');
    let webContext = '';
    const urlMatch = userPrompt.match(/https?:\/\/[^\s]+/i);
    const actualToolsUsed: string[] = [];

    if (urlMatch) {
      const targetUrl = urlMatch[0];
      try {
        const extractRes = await webExtract(targetUrl, 4000);
        if (extractRes.ok) {
          webContext = `\n\n[Web Content for ${targetUrl}]:\n${extractRes.content}\n\n`;
          actualToolsUsed.push('Web Extractor');
        }
      } catch (err) {
        console.warn('URL extract failed:', err);
      }
    } else {
      const isSearchWorthy =
        intent === 'research' ||
        /\b(search|lookup|news|latest|update|who|what|when|where)\b/i.test(userPrompt);

      if (isSearchWorthy) {
        const searchRes = await webSearch(userPrompt, 4);
        if (searchRes.ok && searchRes.content) {
          webContext += `\n\n[Web Search Results]:\n${searchRes.content}\n\n`;
          actualToolsUsed.push('Web Search');
        }
      }
    }

    updateThinkingTimelinePhase('plan');
    const memoryEpisodes: string[] = [];
    currentMsgs
      .filter((m) => m.role === 'user')
      .slice(-3)
      .forEach((m) => {
        memoryEpisodes.push(`- Previous question: "${m.content.slice(0, 80)}"`);
      });

    const optimizedPrompt = optimizePrompt(
      userPrompt,
      intent,
      'LearnForge Agent',
      {
        mode: aiMode,
        provider: aiMode === 'local' ? 'ollama' : 'cloud',
        model: selectedModel,
      },
      webContext,
      memoryEpisodes
    );

    setIsStreaming(true);
    setStreamingContent('');
    setGenerationStage('initializing');

    const historyPayload: ChatMessageType[] = [
      ...currentMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: optimizedPrompt },
    ];

    let fullAccumulatedResponse = '';
    setGenerationStage('understanding');
    setTimeout(() => {
      setGenerationStage('generating');
      updateThinkingTimelinePhase('generate');
    }, 300);

    const effectiveModel = selectedModel || (aiMode === 'local' ? 'qwen3:8b' : 'gpt-5.6-sol');

    try {
      await providerManager.streamChat(
        { intent, capabilities },
        effectiveModel,
        historyPayload,
        (chunk) => {
          if (chunk.message?.content) {
            fullAccumulatedResponse += chunk.message.content;
            if (!hasActiveTextSelection()) {
              setStreamingContent(filterResponseForIntent(fullAccumulatedResponse, intent));
            }
          }
        }
      );
    } catch (err) {
      console.warn('Streaming response fallback:', err);
      failThinkingTimelinePhase('generate');
      fullAccumulatedResponse =
        fullAccumulatedResponse ||
        `I encountered an issue connecting to the AI provider. Request: "${userPrompt}"`;
      setStreamingContent(fullAccumulatedResponse);
    } finally {
      setGenerationStage('finalizing');
      updateThinkingTimelinePhase('validate');
      fullAccumulatedResponse = filterResponseForIntent(fullAccumulatedResponse, intent);
      updateThinkingTimelinePhase('format');

      if (fullAccumulatedResponse.trim() && targetChatId) {
        const assistantMsg = await addMessage(
          targetChatId,
          'assistant',
          fullAccumulatedResponse,
          intent,
          {
            model_id: effectiveModel,
            model_name: effectiveModel,
            provider: getProviderIdForModel(effectiveModel) || (aiMode === 'local' ? 'ollama' : 'cloud'),
            mode: aiMode === 'local' ? 'local' : 'cloud',
          }
        );
        setMessages((prev) => [...prev, assistantMsg]);

        // Process interaction through PS6 Adaptive Engine to update learner model
        try {
          await processLearnerInteraction(userPrompt, fullAccumulatedResponse, activeProjectId);
        } catch (err) {
          console.warn('[PS6 Engine] Error updating learner state:', err);
        }
      }

      completeThinkingTimeline();
      setIsStreaming(false);
      setStreamingContent('');
      setGenerationStage('idle');
      await loadChats(targetChatId, activeProjectId);
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    setGenerationStage('idle');
    resetThinkingTimeline();
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleExportChat = async () => {
    if (!currentChatId) return;
    const activeChat = chats.find((c) => c.id === currentChatId);
    const title = activeChat?.title || 'LearnForge Export';
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;

    const markdownContent = `# ${title}\n\nExported on ${new Date().toLocaleString()}\n\n---\n\n${messages
      .map((m) => `### ${m.role === 'user' ? 'User' : 'LearnForge Agent'}\n\n${m.content}\n`)
      .join('\n---\n\n')}`;

    await saveWorkspaceFile('reports', filename, markdownContent);
  };

  if (storeView === 'welcome') {
    return <WelcomeScreen onContinue={() => setStoreView('setup')} />;
  }

  if (storeView === 'setup') {
    return <SetupWizard onComplete={() => setStoreView('chat')} />;
  }

  const activeChat = chats.find((c) => c.id === currentChatId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const projectChats = chats.filter((c) => c.project_id === activeProjectId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f6f8fb] dark:bg-[#0b0d10] text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      <Sidebar
        chats={chats}
        projects={projects}
        activeProjectId={activeProjectId}
        activeChatId={currentChatId}
        activeView={activeWorkspaceView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isPinned={isSidebarPinned}
        onTogglePinSidebar={() => setIsSidebarPinned(!isSidebarPinned)}
        onSelectView={(v) => {
          setActiveWorkspaceView(v);
          if (!isSidebarPinned) setIsSidebarOpen(false);
        }}
        onSelectProject={(projId) => {
          handleSelectProject(projId);
          if (projId) setActiveWorkspaceView('project_dashboard');
          if (!isSidebarPinned) setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          if (!isSidebarPinned) setIsSidebarOpen(false);
        }}
        onOpenNewProject={() => setShowNewProjectModal(true)}
        onSelectChat={(id) => {
          handleSelectChat(id);
          if (!isSidebarPinned) setIsSidebarOpen(false);
        }}
        onRenameChat={handleRenameChat}
        onTogglePin={handleTogglePin}
        onDeleteChat={handleDeleteChat}
        onDeleteProject={handleDeleteProject}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden bg-[#f6f8fb] dark:bg-[#0b0d10] text-zinc-900 dark:text-zinc-100 relative transition-colors">
        {activeWorkspaceView !== 'project_dashboard' && activeWorkspaceView !== 'projects' && (
          <ChatHeader
            chatTitle={
              activeWorkspaceView === 'chat'
                ? activeChat?.title || 'LearnForge'
                : activeWorkspaceView.toUpperCase().replace('_', ' ')
            }
            projectName={activeProject ? activeProject.name : null}
            onExport={handleExportChat}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        )}

        <div className="flex-1 flex overflow-hidden">
          {activeWorkspaceView === 'chat' && (
            <ChatArea
              chatTitle={activeChat?.title || 'LearnForge'}
              messages={messages}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onRegenerate={handleRegenerate}
              onExport={handleExportChat}
            />
          )}

          {activeWorkspaceView === 'projects' && (
            <ProjectsView
              projects={projects}
              onSelectProject={(projId) => {
                handleSelectProject(projId);
                setActiveWorkspaceView('project_dashboard');
              }}
              onOpenNewProject={() => setShowNewProjectModal(true)}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {activeWorkspaceView === 'project_dashboard' && activeProject && (
            <ProjectDashboardView
              project={activeProject}
              projectChats={projectChats}
              activeChatId={currentChatId}
              messages={messages}
              onBackToProjects={() => setActiveWorkspaceView('projects')}
              onSelectChat={handleSelectChat}
              onNewChat={() => handleNewChat()}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onRegenerate={handleRegenerate}
              onExport={handleExportChat}
            />
          )}

          {activeWorkspaceView === 'dashboard' && (
            <AdaptiveLearningDashboard
              activeProjectId={activeProjectId}
              projects={projects}
              onSelectProject={(projId) => handleSelectProject(projId)}
            />
          )}

          {activeWorkspaceView === 'learn' && (
            <LearnView onStartTopicChat={(topic) => handleNewChat(topic)} />
          )}

          {activeWorkspaceView === 'knowledge' && <KnowledgeView />}

          {activeWorkspaceView === 'research' && (
            <ResearchView onStartTopicChat={(topic) => handleNewChat(topic)} />
          )}

          {activeWorkspaceView === 'story_challenge' && <StoryChallengeView />}

          {activeWorkspaceView === 'analytics' && <AnalyticsView />}

          {activeWorkspaceView === 'evaluation_lab' && <EvaluationLabView />}

          {activeWorkspaceView === 'judge_control' && <JudgeControlView />}
        </div>
      </main>

      <CommandPaletteModal
        isOpen={false}
        onClose={() => {}}
        onNewChat={() => handleNewChat()}
        onOpenSettings={() => setShowSettings(true)}
      />

      <DebugPanel isOpen={false} onClose={() => {}} />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <ModelSwitchModal />
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}

export default App;
