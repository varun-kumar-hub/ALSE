import { useEffect, useState, useRef } from 'react';
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
import { AssessmentModal } from './components/modals/AssessmentModal';
import { UserProfileModal } from './components/modals/UserProfileModal';

import { LearnView } from './components/views/LearnView';
import { KnowledgeView } from './components/views/KnowledgeView';
import { ResearchView } from './components/views/ResearchView';
import { StoryChallengeView } from './components/views/StoryChallengeView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { EvaluationLabView } from './components/views/EvaluationLabView';
import { JudgeControlView } from './components/views/JudgeControlView';
import { ProjectsView } from './components/views/ProjectsView';
import { ProjectDashboardView } from './components/views/ProjectDashboardView';
import { CustomAssessmentView } from './components/views/CustomAssessmentView';
import { CommunityView } from './components/views/CommunityView';
import { AdaptiveLearningDashboard } from './components/dashboard/AdaptiveLearningDashboard';
import { OSDashboard } from './components/dashboard/OSDashboard';

import { useAppStore } from './stores/appStore';
import {
  getChats,
  createChat,
  updateChatTitle,
  togglePinChat,
  deleteChat as dbDeleteChat,
  getMessages,
  addMessage,
  deleteMessage,
  getProjects,
  addProject,
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
import { parseCurrentRoute, navigateToRoute, WorkspaceView } from './services/router';
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

  const initialRoute = parseCurrentRoute();
  const [activeWorkspaceView, setActiveWorkspaceViewState] = useState<string>(initialRoute.view);
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_pinned') === 'true';
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper to switch view and synchronously update URL & LocalStorage
  const switchWorkspaceView = (
    view: string,
    targetProjectId?: string | null,
    targetChatId?: string | null,
    replace = false
  ) => {
    const finalProjId = targetProjectId !== undefined ? targetProjectId : activeProjectId;
    const finalChatId = targetChatId !== undefined ? targetChatId : currentChatId;
    setActiveWorkspaceViewState(view);
    navigateToRoute(view as WorkspaceView, finalProjId, finalChatId, replace);
  };

  // Initialize app settings, projects, and local persistence with exact route restoration.
  useEffect(() => {
    initApp();
    loadProjects();

    const route = parseCurrentRoute();
    setActiveWorkspaceViewState(route.view);
    if (route.projectId) {
      setActiveProjectId(route.projectId);
    }
    if (route.chatId) {
      setCurrentChatId(route.chatId);
    }

    loadChats(route.chatId || undefined, route.projectId || undefined);
    navigateToRoute(route.view as WorkspaceView, route.projectId, route.chatId, true);
  }, []);

  // Listen for browser Back/Forward or manual URL Hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseCurrentRoute();
      setActiveWorkspaceViewState(route.view);
      if (route.projectId !== undefined && route.projectId !== activeProjectId) {
        setActiveProjectId(route.projectId);
      }
      if (route.chatId !== undefined && route.chatId !== currentChatId) {
        setCurrentChatId(route.chatId);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [currentChatId, activeProjectId]);

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
    const targetView = activeWorkspaceView === 'projects' ? 'project_dashboard' : activeWorkspaceView;
    switchWorkspaceView(targetView, projectId, currentChatId);
  };

  const handleNewChat = async (initialPrompt?: string, targetProjectId?: string | null) => {
    const projId = targetProjectId !== undefined ? targetProjectId : activeProjectId;
    const title = initialPrompt ? initialPrompt.slice(0, 40) : 'New Chat';
    const chat = await createChat(title, selectedModel, projId || undefined);
    setActiveProjectId(projId);
    setCurrentChatId(chat.id);
    setMessages([]);
    switchWorkspaceView('chat', projId, chat.id);
    await loadChats(chat.id, projId);

    if (initialPrompt) {
      handleSendMessage(initialPrompt, chat.id);
    }
  };

  const handleSelectChat = (id: string) => {
    const targetChat = chats.find((c) => c.id === id);
    const targetProjId = targetChat ? targetChat.project_id || null : activeProjectId;
    if (targetChat) {
      setActiveProjectId(targetProjId);
    }
    setCurrentChatId(id);
    switchWorkspaceView('chat', targetProjId, id);
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
    setActiveProjectId(newProj.id);
    switchWorkspaceView('project_dashboard', newProj.id);
  };

  const handleConvertResearchToSubject = async (
    query: string,
    summary: string,
    extractedConcepts: string[]
  ) => {
    const cleanTopic = query.trim().replace(/^(research|explain|what is|learn about|teach me)\s+/i, '');
    const subjectName = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

    const newProj = await addProject(
      subjectName,
      subjectName,
      `Mastery of ${subjectName}`,
      summary.slice(0, 180)
    );
    await loadProjects();
    setActiveProjectId(newProj.id);

    const initialTitle = `${subjectName} Essentials`;
    const chat = await createChat(initialTitle, selectedModel, newProj.id);
    setCurrentChatId(chat.id);
    setMessages([]);
    switchWorkspaceView('chat', newProj.id, chat.id);
    await loadChats(chat.id, newProj.id);

    const conceptsText = extractedConcepts.length > 0 ? `\n\nTarget Concepts to Master:\n${extractedConcepts.map((c) => `- ${c}`).join('\n')}` : '';
    const kickoffPrompt = `Let's begin an adaptive learning session on ${subjectName}.${conceptsText}\n\nResearch Summary:\n${summary}`;
    handleSendMessage(kickoffPrompt, chat.id);
  };

  // Main streaming chat completion logic connected to PS6 engine
  const handleSendMessage = async (userPrompt: string, overrideChatId?: string) => {
    let targetChatId = overrideChatId || currentChatId;

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
        /\b(search the web|live search|latest news|current price|today's news|recent update|who is currently|in 2025|in 2026)\b/i.test(userPrompt);

      if (isSearchWorthy) {
        const searchRes = await webSearch(userPrompt, 4);
        if (searchRes.ok && searchRes.content) {
          webContext += `\n\n[Web Search Reference]:\n${searchRes.content}\n\n`;
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

    const systemPrompt = optimizePrompt(
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

    // Build clean history payload: System instruction first, then prior history, then current user turn
    const priorMsgs = currentMsgs.slice(0, -1);
    const userPromptWithContext = webContext
      ? `${webContext}\n\n${userPrompt}`
      : userPrompt;

    const historyPayload: ChatMessageType[] = [
      { role: 'system', content: systemPrompt },
      ...priorMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userPromptWithContext },
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
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        console.warn('Error aborting stream:', e);
      }
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingContent('');
    setGenerationStage('idle');
    resetThinkingTimeline();
  };

  const handleRegenerate = async () => {
    if (!currentChatId || messages.length === 0) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    handleStopStreaming();

    // If last message was assistant response, remove it before generating new one
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.id) {
      await deleteMessage(lastMsg.id);
      setMessages((prev) => prev.slice(0, -1));
    }

    handleSendMessage(lastUserMsg.content);
  };

  const handleEditMessage = async (messageId: string, newPrompt: string) => {
    if (!currentChatId) return;

    const msgIndex = messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) {
      handleSendMessage(newPrompt);
      return;
    }

    handleStopStreaming();

    // Delete the target message and all subsequent messages to maintain conversation continuity
    const messagesToDelete = messages.slice(msgIndex);
    for (const m of messagesToDelete) {
      if (m.id) {
        await deleteMessage(m.id);
      }
    }

    const preserved = messages.slice(0, msgIndex);
    setMessages(preserved);

    // Re-submit updated prompt
    await handleSendMessage(newPrompt);
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      <Sidebar
        chats={chats}
        projects={projects}
        activeProjectId={activeProjectId}
        activeChatId={currentChatId}
        activeView={activeWorkspaceView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isPinned={isSidebarPinned}
        onTogglePinSidebar={() => {
          setIsSidebarPinned((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_pinned', String(next));
            return next;
          });
        }}
        onRefreshData={() => {
          loadChats();
          loadProjects();
        }}
        onSelectView={(v) => {
          switchWorkspaceView(v);
          if (!isSidebarPinned) setIsSidebarOpen(false);
        }}
        onSelectProject={(projId) => {
          handleSelectProject(projId);
          if (projId) switchWorkspaceView('project_dashboard', projId);
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
        onOpenProfile={() => setShowUserProfileModal(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 relative transition-colors">
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
            onBackToSubjectChats={
              activeProject ? () => switchWorkspaceView('project_dashboard', activeProject.id) : undefined
            }
          />
        )}

        <div className="flex-1 flex overflow-hidden">
          {activeWorkspaceView === 'welcome' && (
            <OSDashboard
              onNewChat={() => handleNewChat()}
              onOpenSettings={() => setShowSettings(true)}
            />
          )}

          {activeWorkspaceView === 'chat' && (
            <ChatArea
              chatTitle={activeChat?.title || 'LearnForge'}
              projectName={activeProject ? activeProject.name : null}
              messages={messages}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onRegenerate={handleRegenerate}
              onExport={handleExportChat}
              onEditMessage={handleEditMessage}
            />
          )}

          {activeWorkspaceView === 'projects' && (
            <ProjectsView
              projects={projects}
              onSelectProject={(projId) => {
                handleSelectProject(projId);
                switchWorkspaceView('project_dashboard', projId);
              }}
              onOpenNewProject={() => setShowNewProjectModal(true)}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {activeWorkspaceView === 'project_dashboard' && (
            activeProject ? (
              <ProjectDashboardView
                project={activeProject}
                projectChats={projectChats}
                activeChatId={currentChatId}
                onBackToProjects={() => switchWorkspaceView('projects')}
                onSelectChat={handleSelectChat}
                onNewChat={(prompt) => handleNewChat(prompt, activeProject.id)}
                onDeleteChat={handleDeleteChat}
                onOpenAssessment={() => setIsAssessmentOpen(true)}
                onSendMessage={handleSendMessage}
                onExport={handleExportChat}
              />
            ) : (
              <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Loading subject workspace...</p>
              </div>
            )
          )}

          {activeWorkspaceView === 'dashboard' && (
            <AdaptiveLearningDashboard
              activeProjectId={activeProjectId}
              projects={projects}
              onSelectProject={(projId) => handleSelectProject(projId)}
            />
          )}

          {activeWorkspaceView === 'custom_assessment' && (
            <CustomAssessmentView
              onStartRemediationChat={(prompt) => {
                handleNewChat(prompt, null);
              }}
            />
          )}

          {activeWorkspaceView === 'learn' && (
            <LearnView onStartTopicChat={(topic) => handleNewChat(topic, activeProjectId)} />
          )}

          {activeWorkspaceView === 'knowledge' && <KnowledgeView projectId={activeProjectId} />}

          {activeWorkspaceView === 'research' && (
            <ResearchView
              onStartTopicChat={(topic) => handleNewChat(topic, activeProjectId)}
              onConvertToSubject={handleConvertResearchToSubject}
            />
          )}

          {activeWorkspaceView === 'story_challenge' && (
            <StoryChallengeView
              projectId={activeProjectId}
              onExplainInChat={(prompt) => handleNewChat(prompt, activeProjectId)}
            />
          )}

          {activeWorkspaceView === 'analytics' && (
            <AnalyticsView
              projectId={activeProjectId}
              projects={projects}
              onSelectProject={(projId) => {
                handleSelectProject(projId);
                switchWorkspaceView('project_dashboard', projId);
              }}
            />
          )}

          {activeWorkspaceView === 'evaluation_lab' && <EvaluationLabView />}

          {activeWorkspaceView === 'judge_control' && <JudgeControlView />}

          {activeWorkspaceView === 'community' && (
            <CommunityView
              onSelectProject={(projId) => {
                handleSelectProject(projId);
                switchWorkspaceView('project_dashboard', projId);
              }}
              onRefreshProjects={loadProjects}
            />
          )}
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
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        onSelectProject={(projId) => {
          handleSelectProject(projId);
          switchWorkspaceView('project_dashboard', projId);
        }}
      />
      <ModelSwitchModal />
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={handleProjectCreated}
      />
      <AssessmentModal
        isOpen={isAssessmentOpen}
        topicTitle={activeProject ? activeProject.name : activeChat?.title || 'Core Concepts'}
        extractedConcepts={messages.map((m) => m.content.slice(0, 120)).filter(Boolean)}
        onClose={() => setIsAssessmentOpen(false)}
        onStartRemediationChat={(prompt) => {
          setIsAssessmentOpen(false);
          const targetProjectId = activeProjectId || (activeProject ? activeProject.id : null);
          handleNewChat(prompt, targetProjectId);
        }}
      />
    </div>
  );
}

export default App;
