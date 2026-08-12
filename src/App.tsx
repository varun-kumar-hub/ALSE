import { useEffect, useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { SetupWizard } from './components/setup/SetupWizard';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { DebugPanel } from './components/debug/DebugPanel';
import { CommandPaletteModal } from './components/palette/CommandPaletteModal';
import { useAppStore } from './stores/appStore';
import {
  getChats,
  createChat,
  updateChatTitle,
  togglePinChat,
  deleteChat as dbDeleteChat,
  getMessages,
  addMessage,
} from './services/database';
import { createProviderManager, getCapabilitiesForIntent } from './services/providers';
import { saveWorkspaceFile } from './services/workspace';
import { detectQueryIntent } from './lib/intentDetector';
import { optimizePrompt } from './lib/promptOptimizer';
import { filterResponseForIntent } from './lib/responseFilter';
import { buildThinkingTimeline } from './lib/thinkingTimeline';
import { webSearch, webExtract, webCrawl } from './services/webTools';
import { getFactGroundedSummary } from './services/wikipediaTool';
import { createOrUpdateCheckpoint } from './runtime/checkpointManager';
import { logProviderRequest } from './services/providerLogger';
import { Chat, ChatMessage as ChatMessageType } from './services/types';

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
    if (list.length > 0 && !currentChatId) {
      setCurrentChatId(list[0].id);
    }
  };

  const handleNewChat = async () => {
    const chat = await createChat('New Chat', selectedModel);
    await loadChats();
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

    const actualSourcesUsed: string[] = [];
    if (urlMatch) {
      const targetUrl = urlMatch[0];
      if (/\b(crawl|spider|follow links)\b/i.test(userPrompt)) {
        const crawlRes = await webCrawl(targetUrl, 2);
        if (crawlRes.ok) {
          webContext = `\n\n[Web Crawl Results for ${targetUrl}]:\n${crawlRes.content}\n\n`;
          actualSourcesUsed.push('Web Acquisition Engine');
        }
      } else {
        const extractRes = await webExtract(targetUrl, 4000);
        if (extractRes.ok) {
          webContext = `\n\n[Web Page Content for ${targetUrl}]:\n${extractRes.content}\n\n`;
          actualSourcesUsed.push('Web Acquisition Engine');
        }
      }
    } else {
      // Auto-fetch Wikipedia Grounding for entities, movies, people, actors, dates, biographies
      const wikiFact = await getFactGroundedSummary(userPrompt);
      if (wikiFact) {
        webContext += `\n\n${wikiFact}\n\n`;
        actualSourcesUsed.push('Wikipedia Grounding');
      }

      if (
        intent === 'research' ||
        /\b(search for|search|lookup|look up|find latest|what is the latest|news about|who is|tell me about|biography|movies|filmography)\b/i.test(userPrompt) ||
        !wikiFact
      ) {
        const searchQuery = userPrompt
          .replace(/\b(search for|search|lookup|look up|find latest|what is the latest|news about|who is|tell me about)\b/gi, '')
          .trim() || userPrompt;
        const searchRes = await webSearch(searchQuery, 5);
        if (searchRes.ok) {
          webContext += `\n\n[Live Web Search Results]:\n${searchRes.content}\n\n`;
          actualSourcesUsed.push('Web Search');
        }
      }
    }

    // 4. Prepare AI Prompt & Intent
    updateThinkingTimelinePhase(
      ['research', 'comparison', 'debugging', 'file-analysis', 'data-analysis'].includes(intent)
        ? 'gather'
        : 'plan'
    );
    // Build Episodic Memory from previous sessions & conversation history
    const memoryEpisodes: string[] = [];
    chats.slice(0, 6).forEach((c) => {
      if (c.id !== targetChatId && c.title && c.title !== 'New Chat') {
        const epDate = c.created_at ? c.created_at.split('T')[0] : 'recent';
        memoryEpisodes.push(`- [${epDate}] Memory episode from past session: "${c.title}"`);
      }
    });
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

    try {
      await providerManager.streamChat(
        { intent, capabilities },
        selectedModel,
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
        assistantMsg.provider_used = aiMode === 'local' ? 'ollama' : 'cloud';
        assistantMsg.model_used = selectedModel;
        assistantMsg.user_prompt = userPrompt;
        assistantMsg.sources_used = actualSourcesUsed.length > 0 ? actualSourcesUsed : ['Local Model Knowledge'];
        setMessages((prev) => [...prev, assistantMsg]);

        logProviderRequest({
          providerId: aiMode === 'local' ? 'ollama' : (defaultProvider || 'opencode'),
          providerName: aiMode === 'local' ? 'Local Ollama' : 'Cloud Provider',
          model: selectedModel || 'qwen3:8b',
          endpoint: aiMode === 'local' ? 'http://localhost:11434/api/chat' : 'https://opencode.ai/zen/v1/chat/completions',
          durationMs: Date.now() - startTime,
          success: true,
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

  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

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

      <Sidebar
        chats={chats}
        activeChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onRenameChat={handleRenameChat}
        onTogglePin={handleTogglePin}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ChatArea
        chatTitle={activeChat?.title || 'Nexus Agent'}
        messages={messages}
        onSendMessage={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onRegenerate={handleRegenerate}
        onExport={handleExportChat}
      />

      <CommandPaletteModal
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettings(true)}
      />

      <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;

