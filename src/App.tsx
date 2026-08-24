import { useEffect, useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { SetupWizard } from './components/setup/SetupWizard';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { DebugPanel } from './components/debug/DebugPanel';
import { CommandPaletteModal } from './components/palette/CommandPaletteModal';
import { ProjectDashboard } from './components/projects/ProjectDashboard';
import { ProjectModal } from './components/projects/ProjectModal';
import { useAppStore } from './stores/appStore';
import { useProjectStore } from './stores/projectStore';
import {
  getChats,
  createChat,
  updateChatTitle,
  togglePinChat,
  deleteChat as dbDeleteChat,
  getMessages,
  addMessage,
} from './services/database';
import { createProviderManager, getCapabilitiesForIntent, getProviderIdForModel } from './services/providers';
import { saveWorkspaceFile } from './services/workspace';
import { detectQueryIntent } from './lib/intentDetector';
import { optimizePrompt } from './lib/promptOptimizer';
import { filterResponseForIntent } from './lib/responseFilter';
import { buildThinkingTimeline } from './lib/thinkingTimeline';
import { webSearch, webExtract, WebSearchResult } from './services/webTools';
import { getFactGroundedSummary } from './services/wikipediaTool';
import { createOrUpdateCheckpoint } from './runtime/checkpointManager';
import { logProviderRequest } from './services/providerLogger';
import { urlIntelligenceEngine } from './services/urlIntelligenceService';
import { Chat, ChatMessage as ChatMessageType, SourceItem } from './services/types';

function hasActiveTextSelection(): boolean {
  const selection = window.getSelection?.();
  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
}

export function App() {
  const {
    activeView,
    setActiveView,
    currentChatId,
    setCurrentChatId,
    selectedModel,
    assistantName,
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

  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize app settings and local persistence.
  useEffect(() => {
    initApp();
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

  // Global Keyboard Shortcuts (Module 15)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewChat();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search everything"]');
        searchInput?.focus();
      } else if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        const chatInput = document.querySelector<HTMLTextAreaElement>('textarea');
        chatInput?.focus();
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const settingsBtn = document.querySelector<HTMLButtonElement>('button[title="Open Settings"]');
        settingsBtn?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadChats = async () => {
    const list = await getChats();
    setChats(list);
    
    const savedChatId = localStorage.getItem('ai_os_active_chat_id');
    const savedProjectId = localStorage.getItem('ai_os_active_project_id');
    
    if (savedProjectId) {
      useProjectStore.getState().setActiveProjectId(savedProjectId);
    }
    if (savedChatId && list.some((c) => c.id === savedChatId)) {
      setCurrentChatId(savedChatId);
    } else if (list.length > 0 && !currentChatId) {
      setCurrentChatId(list[0].id);
    }
    useProjectStore.getState().loadProjects();
  };

  const handleNewChat = async (projectId?: string) => {
    const chat = await createChat('New Chat', selectedModel, projectId);
    await loadChats();
    if (projectId) {
      useProjectStore.getState().setActiveProjectId(projectId);
    } else {
      useProjectStore.getState().setActiveProjectId(null);
    }
    setCurrentChatId(chat.id);
    setMessages([]);
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    await updateChatTitle(id, newTitle);
    await loadChats();
  };

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    await togglePinChat(id, !currentPin);
    await loadChats();
  };

  const handleDeleteChat = async (id: string) => {
    await dbDeleteChat(id);
    if (currentChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null);
    }
    await loadChats();
  };

  // Main streaming chat completion logic
  const handleSendMessage = async (userPrompt: string) => {
    const startTime = Date.now();
    let targetChatId = currentChatId;

    // Create chat automatically if none active
    if (!targetChatId) {
      const newChat = await createChat('New Chat', selectedModel);
      targetChatId = newChat.id;
      setCurrentChatId(targetChatId);
      await loadChats();
    }

    // 1. Add User Message
    const intent = detectQueryIntent(userPrompt);
    const providerManager = createProviderManager(providerConfigs, aiMode, defaultProvider);
    const capabilities = getCapabilitiesForIntent(intent);

    setThinkingTimeline(buildThinkingTimeline(intent, userPrompt, selectedModel));
    updateThinkingTimelinePhase('analyze');
    const userMsg = await addMessage(targetChatId, 'user', userPrompt, intent);
    setMessages((prev) => [...prev, userMsg]);

    // 2. Generate title if it's the first message
    const currentMsgs = await getMessages(targetChatId);
    if (currentMsgs.length <= 1) {
      providerManager.generateTitle(userPrompt, selectedModel).then((title) => {
        if (targetChatId) handleRenameChat(targetChatId, title);
      });
    }

    // 3. Fact Grounding & Web Tools Auto-Routing (Wikipedia, web_search, web_extract, web_crawl)
    updateThinkingTimelinePhase('gather');
    let webContext = '';
    const urlMatch = userPrompt.match(/https?:\/\/[^\s]+/i);

    const actualToolsUsed: string[] = [];
    const actualSourcesUsed: SourceItem[] = [];

    if (urlMatch) {
      const targetUrl = urlMatch[0];
      let domain = '';
      try {
        domain = new URL(targetUrl).hostname.replace(/^www\./, '');
      } catch {}

      updateThinkingTimelinePhase('gather');
      setThinkingTimeline((prev: ThinkingTimelineStep[]) =>
        prev.map((step) =>
          step.phase === 'gather'
            ? {
                ...step,
                status: 'in_progress',
                detail: `Crawling & analyzing ${domain || targetUrl}...`,
                subSteps: [
                  `Target Domain: ${domain || targetUrl}`,
                  `Fetching sitemaps & crawling endpoints`,
                  `Extracting page contents, projects & skills`,
                ],
              }
            : step
        )
      );

      try {
        const dataset = await urlIntelligenceEngine.runDeepResearch(
          targetUrl,
          { maxPages: 50, maxDepth: 5 },
          (progressMsg) => {
            setThinkingTimeline((prev: ThinkingTimelineStep[]) =>
              prev.map((step) =>
                step.phase === 'gather'
                  ? {
                      ...step,
                      status: 'in_progress',
                      detail: progressMsg,
                      subSteps: Array.from(new Set([...(step.subSteps || []), progressMsg])).slice(-4),
                    }
                  : step
              )
            );
          }
        );

        if (dataset && dataset.contextText) {
          webContext = `\n\n${dataset.contextText}\n\n`;
          actualToolsUsed.push(...dataset.toolsUsed);
          actualSourcesUsed.push(...dataset.sources);

          setThinkingTimeline((prev: ThinkingTimelineStep[]) =>
            prev.map((step) =>
              step.phase === 'gather'
                ? {
                    ...step,
                    status: 'completed',
                    detail: `Extracted ${dataset.stats.resourcesDiscovered} resources across ${dataset.stats.pagesScanned} pages in ${(dataset.stats.durationMs / 1000).toFixed(1)}s`,
                  }
                : step
            )
          );
        }
      } catch (err) {
        console.warn('[URL Intelligence Engine] Deep research fallback to single page extract:', err);
        const extractRes = await webExtract(targetUrl, 4000);
        if (extractRes.ok) {
          webContext = `\n\n[Web Page Content for ${targetUrl}]:\n${extractRes.content}\n\n`;
          actualToolsUsed.push('Web Page Extractor');
          actualSourcesUsed.push({
            title: targetUrl,
            url: targetUrl,
            domain: domain || 'web',
            type: 'web',
          });
        }
      }
    } else {
      // 1. Live Web Search: Auto-fetch live web results for real-time questions, movies, release dates, news, people
      const isSearchWorthy =
        intent === 'research' ||
        intent === 'biography' ||
        intent === 'general' ||
        /\b(when|who|what|where|release date|movie|film|news|latest|upcoming|update|cast|director|box office)\b/i.test(userPrompt);

      if (isSearchWorthy) {
        const cleanQuery = userPrompt
          .replace(/\b(search for|search|lookup|look up|find latest|what is the latest|news about|tell me about)\b/gi, '')
          .trim() || userPrompt;
        const searchRes = await webSearch(cleanQuery, 5);
        if (searchRes.ok && searchRes.content) {
          webContext += `\n\n[Live Web Search Results]:\n${searchRes.content}\n\n`;
          actualToolsUsed.push('Web Search');

          // Extract individual source items from search results
          const rawResults = (searchRes.data as { results?: WebSearchResult[] })?.results || [];
          rawResults.forEach((r) => {
            let dom = '';
            try {
              dom = new URL(r.url).hostname.replace(/^www\./, '');
            } catch {}
            actualSourcesUsed.push({
              title: r.title,
              url: r.url,
              domain: dom || 'web',
              type: dom.includes('wikipedia') ? 'wiki' : dom.includes('rfc-editor') ? 'rfc' : 'web',
              snippet: r.snippet,
            });
          });
        }
      }

      // 2. Wikipedia Grounding for encyclopedic biographies & entities
      if (intent === 'biography' || /\b(who is|who was|biography of|bio of|history of)\b/i.test(userPrompt)) {
        const wikiFact = await getFactGroundedSummary(userPrompt);
        if (wikiFact) {
          webContext += `\n\n${wikiFact}\n\n`;
          actualToolsUsed.push('Wikipedia Search');
          if (!actualSourcesUsed.some((s) => s.domain === 'wikipedia.org')) {
            actualSourcesUsed.push({
              title: `Wikipedia Summary for ${userPrompt.slice(0, 30)}`,
              url: 'https://en.wikipedia.org',
              domain: 'wikipedia.org',
              type: 'wiki',
            });
          }
        }
      }
    }

    // 4. Prepare AI Prompt & Intent
    updateThinkingTimelinePhase(
      ['research', 'comparison', 'debugging', 'file-analysis', 'data-analysis'].includes(intent)
        ? 'gather'
        : 'plan'
    );
    // Build Memory strictly from the current active chat session and project context
    const memoryEpisodes: string[] = [];
    const activeProject = currentChat?.project_id
      ? useProjectStore.getState().projects.find((p) => p.id === currentChat.project_id)
      : null;

    if (activeProject && activeProject.instructions) {
      memoryEpisodes.push(`- [Project Custom Instructions for "${activeProject.name}"]: ${activeProject.instructions}`);
    }

    currentMsgs
      .filter((m) => m.role === 'user')
      .slice(-3)
      .forEach((m) => {
        const epDate = m.created_at ? m.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
        memoryEpisodes.push(`- [${epDate}] Memory episode from current session: "${m.content.slice(0, 80)}"`);
      });

    const optimizedPrompt = optimizePrompt(
      userPrompt,
      intent,
      assistantName,
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

    // Build chat history context payload
    const historyPayload: ChatMessageType[] = [
      ...currentMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: optimizedPrompt },
    ];

    let fullAccumulatedResponse = '';

    setGenerationStage('understanding');
    setTimeout(() => {
      setGenerationStage('generating');
      updateThinkingTimelinePhase('generate');
    }, 400);

    const opencodeConfig = providerConfigs.find((p) => p.id === 'opencode');
    const configuredCloudConfig =
      providerConfigs.find((p) => p.kind === 'cloud' && Boolean(p.apiKey && p.apiKey.trim().length > 0)) ||
      opencodeConfig;
    const activeCloudModel = configuredCloudConfig?.defaultModel || 'gpt-5.6-sol';
    const effectiveModel =
      aiMode === 'cloud'
        ? (getProviderIdForModel(selectedModel) === 'ollama' || !selectedModel ? activeCloudModel : selectedModel)
        : (aiMode === 'local' ? (getProviderIdForModel(selectedModel) !== 'ollama' ? 'qwen3:8b' : selectedModel) : selectedModel);

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
        `I could not complete this response because the AI provider service is unavailable.\n\nRequest: "${userPrompt}"`;
      setStreamingContent(fullAccumulatedResponse);
    } finally {
      setGenerationStage('finalizing');
      updateThinkingTimelinePhase('validate');

      // Save final assistant message to SQLite
      fullAccumulatedResponse = filterResponseForIntent(fullAccumulatedResponse, intent);
      updateThinkingTimelinePhase('format');
      if (fullAccumulatedResponse.trim() && targetChatId) {
        const assistantMsg = await addMessage(
          targetChatId,
          'assistant',
          fullAccumulatedResponse,
          intent
        );
        const actualProviderId = getProviderIdForModel(selectedModel) || (aiMode === 'local' ? 'ollama' : 'opencode');
        const isLocal = actualProviderId === 'ollama';
        const providerName =
          actualProviderId === 'opencode'
            ? 'OpenCode Zen'
            : actualProviderId === 'openai'
            ? 'OpenAI'
            : actualProviderId === 'anthropic'
            ? 'Claude (Anthropic)'
            : actualProviderId === 'gemini'
            ? 'Google Gemini'
            : 'Local Ollama';

        assistantMsg.provider_used = actualProviderId;
        assistantMsg.model_used = selectedModel;
        assistantMsg.user_prompt = userPrompt;
        assistantMsg.tools_used = actualToolsUsed;
        assistantMsg.sources_used = actualSourcesUsed;
        assistantMsg.generation_time_ms = Date.now() - startTime;
        setMessages((prev) => [...prev, assistantMsg]);

        logProviderRequest({
          providerId: actualProviderId,
          providerName,
          model: selectedModel || 'opencode-zen-coder',
          endpoint: isLocal ? 'http://localhost:11434/api/chat' : 'https://opencode.ai/zen/v1/chat/completions',
          durationMs: Date.now() - startTime,
          success: !fullAccumulatedResponse.includes('Cloud Request Failed'),
          inputTokens: Math.ceil(userPrompt.length / 4),
          outputTokens: Math.ceil(fullAccumulatedResponse.length / 4),
        });

        // Persist Namma-Agent state checkpoint manifest (FR-4.1 - FR-4.3)
        await createOrUpdateCheckpoint(targetChatId, {
          status: 'COMPLETED',
          workflow: intent,
          model_config: {
            provider: aiMode === 'local' ? 'ollama' : 'cloud',
            model: selectedModel,
          },
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: fullAccumulatedResponse },
          ],
        });
      }

      completeThinkingTimeline();
      setIsStreaming(false);
      setStreamingContent('');
      setGenerationStage('idle');
      await loadChats();
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
    const title = activeChat?.title || 'Chat Export';
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;

    const markdownContent = `# ${title}\n\nExported on ${new Date().toLocaleString()}\n\n---\n\n${messages
      .map((m) => `### ${m.role === 'user' ? 'User' : assistantName}\n\n${m.content}\n`)
      .join('\n---\n\n')}`;

    await saveWorkspaceFile('reports', filename, markdownContent);
  };

  // Route Views
  if (activeView === 'welcome') {
    return <WelcomeScreen onContinue={() => setActiveView('setup')} />;
  }

  if (activeView === 'setup') {
    return <SetupWizard onComplete={() => setActiveView('chat')} />;
  }

  const activeChat = chats.find((c) => c.id === currentChatId);
  const { activeProjectId } = useProjectStore();

  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f6f5f2] text-zinc-950 font-sans">
      <button
        data-cmd-palette
        onClick={() => setIsCmdPaletteOpen(!isCmdPaletteOpen)}
        className="hidden"
      />
      <button
        data-debug-toggle
        onClick={() => setIsDebugOpen(!isDebugOpen)}
        className="hidden"
      />
      <button
        data-new-project
        onClick={() => setIsProjectModalOpen(true)}
        className="hidden"
      />

      <Sidebar
        chats={chats}
        activeChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={(id) => {
          const selectedChat = chats.find((c) => c.id === id);
          if (selectedChat?.project_id) {
            useProjectStore.getState().setActiveProjectId(selectedChat.project_id);
          } else {
            useProjectStore.getState().setActiveProjectId(null);
          }
          handleSelectChat(id);
        }}
        onRenameChat={handleRenameChat}
        onTogglePin={handleTogglePin}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
      />

      {activeProjectId ? (
        <ProjectDashboard
          projectId={activeProjectId}
          onNewProjectChat={(projId) => handleNewChat(projId)}
          onSelectChat={(chatId) => {
            if (chatId) {
              handleSelectChat(chatId);
            } else {
              setCurrentChatId(null);
            }
          }}
          chats={chats}
          activeChatId={currentChatId}
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          onRegenerate={handleRegenerate}
          onExport={handleExportChat}
        />
      ) : (
        <ChatArea
          chatTitle={activeChat?.title || 'Nexus Agent'}
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          onRegenerate={handleRegenerate}
          onExport={handleExportChat}
        />
      )}

      <CommandPaletteModal
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettings(true)}
      />

      <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />
      <ProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;

