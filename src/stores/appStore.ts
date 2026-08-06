import { create } from 'zustand';
import { OllamaModel, StartupResult, AppSettings } from '../services/types';
import { listModels } from '../services/ollama';
import { getAllSettings, setSetting } from '../services/database';

interface AppState {
  sidebarOpen: boolean;
  activeView: 'welcome' | 'setup' | 'chat' | 'settings';
  currentChatId: string | null;
  selectedModel: string;
  models: OllamaModel[];
  assistantName: string;
  theme: 'dark' | 'light' | 'system';
  isBackendReady: boolean;
  backendStatus: StartupResult | null;
  isStreaming: boolean;
  streamingContent: string;
  generationStage: 'idle' | 'initializing' | 'understanding' | 'generating' | 'finalizing';
  searchQuery: string;
  workspaceLocation: string;
  responseStyle: AppSettings['responseStyle'];
  autoStartOllama: boolean;
  keepOllamaRunning: boolean;
  onboardingComplete: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveView: (view: 'welcome' | 'setup' | 'chat' | 'settings') => void;
  setCurrentChatId: (id: string | null) => void;
  setSelectedModel: (model: string) => void;
  setAssistantName: (name: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string | ((prev: string) => string)) => void;
  setGenerationStage: (stage: AppState['generationStage']) => void;
  setSearchQuery: (query: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setRuntimeReady: (ready: boolean) => void;
  
  // Async loaders
  initApp: () => Promise<void>;
  refreshModels: () => Promise<void>;
  updateSetting: (key: keyof AppSettings, value: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeView: 'chat',
  currentChatId: null,
  selectedModel: 'llama3.2',
  models: [],
  assistantName: 'AI OS',
  theme: 'dark',
  isBackendReady: false,
  backendStatus: null,
  isStreaming: false,
  streamingContent: '',
  generationStage: 'idle',
  searchQuery: '',
  workspaceLocation: '',
  responseStyle: 'adaptive',
  autoStartOllama: true,
  keepOllamaRunning: true,
  onboardingComplete: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setCurrentChatId: (id) => set({ currentChatId: id }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setAssistantName: (name) => set({ assistantName: name }),
  setTheme: (theme) => set({ theme }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) =>
    set((state) => ({
      streamingContent:
        typeof content === 'function' ? content(state.streamingContent) : content,
    })),
  setGenerationStage: (stage) => set({ generationStage: stage }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  setRuntimeReady: (ready) => set({ isBackendReady: ready }),

  initApp: async () => {
    // 1. Load settings from SQLite / storage
    const settings = await getAllSettings();
    set({
      assistantName: settings.assistantName,
      theme: settings.theme,
      selectedModel: settings.defaultModel,
      workspaceLocation: settings.workspaceLocation,
      responseStyle: settings.responseStyle,
      autoStartOllama: settings.autoStartOllama,
      keepOllamaRunning: settings.keepOllamaRunning,
      onboardingComplete: settings.onboardingComplete,
      activeView: settings.onboardingComplete ? 'setup' : 'welcome',
    });
  },

  refreshModels: async () => {
    const availableModels = await listModels();
    set({ models: availableModels });
  },

  updateSetting: async (key, value) => {
    await setSetting(key, value);
    if (key === 'assistantName') set({ assistantName: value });
    if (key === 'theme') set({ theme: value as 'dark' | 'light' | 'system' });
    if (key === 'defaultModel') set({ selectedModel: value });
    if (key === 'workspaceLocation') set({ workspaceLocation: value });
    if (key === 'responseStyle') set({ responseStyle: value as AppSettings['responseStyle'] });
    if (key === 'autoStartOllama') set({ autoStartOllama: value === 'true' });
    if (key === 'keepOllamaRunning') set({ keepOllamaRunning: value === 'true' });
    if (key === 'onboardingComplete') set({ onboardingComplete: value === 'true' });
  },
}));
