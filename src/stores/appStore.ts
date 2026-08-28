import { create } from 'zustand';
import {
  OllamaModel,
  StartupResult,
  AppSettings,
  ModelSwitchModalOptions,
  ThinkingTimelineStep,
  TimelinePhase,
} from '../services/types';
import { listModels } from '../services/ollama';
import { getAllSettings, setSetting } from '../services/database';
import {
  completeTimeline,
  failTimelinePhase,
  updateTimelinePhase,
} from '../lib/thinkingTimeline';

import { isDevMode } from '../lib/env';

import { buildAuthoritativeExecutionConfig, AuthoritativeExecutionConfig } from '../services/executionConfig';

interface AppState {
  sidebarOpen: boolean; 
  activeView: 'welcome' | 'setup' | 'chat' | 'settings';
  currentChatId: string | null;
  activeProjectId: string | null;
  selectedModel: string;
  executionConfig: AuthoritativeExecutionConfig;
  models: OllamaModel[];
  assistantName: string;
  aiMode: AppSettings['aiMode'];
  defaultProvider: string;
  providerConfigs: AppSettings['providerConfigs'];
  theme: 'dark' | 'light' | 'system';
  isBackendReady: boolean;
  backendStatus: StartupResult | null;
  isStreaming: boolean;
  streamingContent: string;
  generationStage: 'idle' | 'initializing' | 'understanding' | 'generating' | 'finalizing';
  thinkingTimeline: ThinkingTimelineStep[];
  searchQuery: string;
  workspaceLocation: string;
  responseStyle: AppSettings['responseStyle'];
  autoStartOllama: boolean;
  keepOllamaRunning: boolean;
  onboardingComplete: boolean;
  skipLauncherInDev: boolean;

  // Multi-Model Management Confirmation State
  modelSwitchModalOptions: ModelSwitchModalOptions | null;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveView: (view: 'welcome' | 'setup' | 'chat' | 'settings') => void;
  setCurrentChatId: (id: string | null) => void;
  setActiveProjectId: (id: string | null) => void;
  setSelectedModel: (model: string) => void;
  setAssistantName: (name: string) => void;
  setAiMode: (mode: AppSettings['aiMode']) => void;
  setDefaultProvider: (provider: string) => void;
  setProviderConfigs: (configs: AppSettings['providerConfigs']) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string | ((prev: string) => string)) => void;
  setGenerationStage: (stage: AppState['generationStage']) => void;
  setThinkingTimeline: (steps: ThinkingTimelineStep[] | ((prev: ThinkingTimelineStep[]) => ThinkingTimelineStep[])) => void;
  updateThinkingTimelinePhase: (phase: TimelinePhase) => void;
  completeThinkingTimeline: () => void;
  failThinkingTimelinePhase: (phase: TimelinePhase) => void;
  resetThinkingTimeline: () => void;
  setSearchQuery: (query: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setRuntimeReady: (ready: boolean) => void;
  
  // Model Management Actions
  openModelSwitchModal: (options: ModelSwitchModalOptions) => void;
  closeModelSwitchModal: () => void;
  activateModelAtomically: (providerId: string, targetModel: string, targetMode?: 'cloud' | 'local') => void;
  
  // Async loaders
  initApp: () => Promise<void>;
  refreshModels: () => Promise<void>;
  updateSetting: (key: keyof AppSettings, value: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeView: 'chat',
  currentChatId: null,
  activeProjectId: localStorage.getItem('ai_os_active_project_id') || null,
  selectedModel: 'gpt-5.6-sol',
  executionConfig: buildAuthoritativeExecutionConfig('cloud', 'gpt-5.6-sol', []),
  models: [],
  assistantName: 'Nexus Agent',
  aiMode: 'cloud',
  defaultProvider: 'opencode',
  providerConfigs: [],
  theme: 'dark',
  isBackendReady: false,
  backendStatus: null,
  isStreaming: false,
  streamingContent: '',
  generationStage: 'idle',
  thinkingTimeline: [],
  searchQuery: '',
  workspaceLocation: '',
  responseStyle: 'adaptive',
  autoStartOllama: true,
  keepOllamaRunning: true,
  onboardingComplete: false,
  skipLauncherInDev: true,

  modelSwitchModalOptions: null,

  openModelSwitchModal: (options) => set({ modelSwitchModalOptions: options }),
  closeModelSwitchModal: () => set({ modelSwitchModalOptions: null }),
  activateModelAtomically: (providerId, targetModel, targetMode) =>
    set((state) => {
      const modeToSet = targetMode || state.aiMode;
      const updatedConfigs = state.providerConfigs.map((p) => {
        if (p.id === providerId) {
          return { ...p, enabled: true, defaultModel: targetModel };
        }
        return p;
      });

      return {
        aiMode: modeToSet,
        selectedModel: targetModel,
        defaultProvider: providerId,
        providerConfigs: updatedConfigs,
        modelSwitchModalOptions: null,
        executionConfig: buildAuthoritativeExecutionConfig(
          modeToSet,
          targetModel,
          updatedConfigs,
          state.isBackendReady
        ),
      };
    }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setCurrentChatId: (id) => {
    if (id) {
      localStorage.setItem('ai_os_active_chat_id', id);
    } else {
      localStorage.removeItem('ai_os_active_chat_id');
    }
    set({ currentChatId: id });
  },
  setActiveProjectId: (id) => {
    if (id) {
      localStorage.setItem('ai_os_active_project_id', id);
    } else {
      localStorage.removeItem('ai_os_active_project_id');
    }
    set({ activeProjectId: id });
  },
  setSelectedModel: (model) =>
    set((state) => ({
      selectedModel: model,
      executionConfig: buildAuthoritativeExecutionConfig(
        state.aiMode,
        model,
        state.providerConfigs,
        state.isBackendReady
      ),
    })),
  setAssistantName: (name) => set({ assistantName: name }),
  setAiMode: (mode) =>
    set((state) => {
      let targetModel = state.selectedModel;
      if (mode === 'cloud') {
        const opencodeConfig = state.providerConfigs.find((p) => p.id === 'opencode');
        targetModel = opencodeConfig?.defaultModel || 'gpt-5.6-sol';
      } else if (mode === 'local') {
        targetModel = state.models.length > 0 ? state.models[0].name : 'qwen3:8b';
      }
      return {
        aiMode: mode,
        selectedModel: targetModel,
        executionConfig: buildAuthoritativeExecutionConfig(
          mode,
          targetModel,
          state.providerConfigs,
          state.isBackendReady
        ),
      };
    }),
  setDefaultProvider: (provider) => set({ defaultProvider: provider }),
  setProviderConfigs: (configs) =>
    set((state) => ({
      providerConfigs: configs,
      executionConfig: buildAuthoritativeExecutionConfig(
        state.aiMode,
        state.selectedModel,
        configs,
        state.isBackendReady
      ),
    })),
  setTheme: (theme) => {
    localStorage.setItem('ai_os_theme', theme);
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
    setSetting('theme', theme);
  },
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setStreamingContent: (content) =>
    set((state) => ({
      streamingContent:
        typeof content === 'function' ? content(state.streamingContent) : content,
    })),
  setGenerationStage: (stage) => set({ generationStage: stage }),
  setThinkingTimeline: (steps) =>
    set((state) => ({
      thinkingTimeline: typeof steps === 'function' ? steps(state.thinkingTimeline) : steps,
    })),
  updateThinkingTimelinePhase: (phase) =>
    set((state) => ({ thinkingTimeline: updateTimelinePhase(state.thinkingTimeline, phase) })),
  completeThinkingTimeline: () =>
    set((state) => ({ thinkingTimeline: completeTimeline(state.thinkingTimeline) })),
  failThinkingTimelinePhase: (phase) =>
    set((state) => ({ thinkingTimeline: failTimelinePhase(state.thinkingTimeline, phase) })),
  resetThinkingTimeline: () => set({ thinkingTimeline: [] }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  setRuntimeReady: (ready) => set({ isBackendReady: ready }),

  initApp: async () => {
    // 1. Load settings from SQLite / storage
    const settings = await getAllSettings();
    const savedTheme =
      (localStorage.getItem('ai_os_theme') as 'dark' | 'light' | 'system') || settings.theme || 'dark';

    const isDark =
      savedTheme === 'dark' ||
      (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const isCloudMode = settings.aiMode === 'cloud';

    // 2. Fetch local models ONLY if not strictly in Cloud Mode
    const availableModels = isCloudMode ? [] : await listModels();
    const inDev = isDevMode();
    const skipDev = settings.skipLauncherInDev ?? true;

    const configuredCloudConfig =
      settings.providerConfigs.find((p) => p.kind === 'cloud' && Boolean(p.apiKey && p.apiKey.trim().length > 0)) ||
      settings.providerConfigs.find((p) => p.id === 'opencode');
    const cloudDefaultModel = configuredCloudConfig?.defaultModel || 'gpt-5.6-sol';

    const initialModel = isCloudMode
      ? settings.defaultModel || cloudDefaultModel
      : settings.defaultModel || (availableModels.length > 0 ? availableModels[0].name : 'qwen3:8b');

    set({
      assistantName: settings.assistantName,
      theme: settings.theme,
      selectedModel: initialModel,
      aiMode: settings.aiMode,
      defaultProvider: settings.defaultProvider,
      providerConfigs: settings.providerConfigs,
      workspaceLocation: settings.workspaceLocation,
      responseStyle: settings.responseStyle,
      autoStartOllama: settings.autoStartOllama,
      keepOllamaRunning: settings.keepOllamaRunning,
      onboardingComplete: settings.onboardingComplete,
      skipLauncherInDev: skipDev,
      models: availableModels,
      executionConfig: buildAuthoritativeExecutionConfig(
        settings.aiMode,
        initialModel,
        settings.providerConfigs,
        availableModels.length > 0
      ),
    });

    if (inDev && skipDev) {
      // Development Mode: SKIP LAUNCHER COMPLETELY
      set({ activeView: 'chat' });
    } else {
      // Production Mode: Determine if launcher is needed
      if (!settings.onboardingComplete) {
        set({ activeView: 'welcome' });
      } else if (availableModels.length === 0 && settings.aiMode === 'local') {
        set({ activeView: 'setup' });
      } else {
        set({ activeView: 'chat' });
      }
    }
  },

  refreshModels: async () => {
    const currentMode = useAppStore.getState().aiMode;
    if (currentMode === 'cloud') {
      set({ models: [] });
      return;
    }
    const availableModels = await listModels();
    set({ models: availableModels });
  },

  updateSetting: async (key, value) => {
    await setSetting(key, value);
    if (key === 'assistantName') set({ assistantName: value });
    if (key === 'theme') set({ theme: value as 'dark' | 'light' | 'system' });
    if (key === 'defaultModel') set({ selectedModel: value });
    if (key === 'aiMode') set({ aiMode: value as AppSettings['aiMode'] });
    if (key === 'defaultProvider') set({ defaultProvider: value });
    if (key === 'providerConfigs') {
      set({ providerConfigs: JSON.parse(value) as AppSettings['providerConfigs'] });
    }
    if (key === 'workspaceLocation') set({ workspaceLocation: value });
    if (key === 'responseStyle') set({ responseStyle: value as AppSettings['responseStyle'] });
    if (key === 'autoStartOllama') set({ autoStartOllama: value === 'true' });
    if (key === 'keepOllamaRunning') set({ keepOllamaRunning: value === 'true' });
    if (key === 'onboardingComplete') set({ onboardingComplete: value === 'true' });
    if (key === 'skipLauncherInDev') set({ skipLauncherInDev: value === 'true' });
  },
}));
