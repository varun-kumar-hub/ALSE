import { useEffect, useState } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { WelcomeScreen } from './components/welcome/WelcomeScreen';
import { SetupWizard } from './components/setup/SetupWizard';
import { SettingsPanel } from './components/settings/SettingsPanel';
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
    models,
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

    // 3. Prepare AI Prompt & Intent
    updateThinkingTimelinePhase(
      ['research', 'comparison', 'debugging', 'file-analysis', 'data-analysis'].includes(intent)
        ? 'gather'
        : 'plan'
    );
    const optimizedPrompt = optimizePrompt(userPrompt, intent, assistantName);

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
        },
        models.map((m) => m.name)
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
        setMessages((prev) => [...prev, assistantMsg]);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f6f5f2] text-zinc-950 font-sans">
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

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;

