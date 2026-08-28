import React from 'react';
import { ShieldAlert, Zap, X, Cpu, Globe } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

export const ModelSwitchModal: React.FC = () => {
  const { modelSwitchModalOptions, closeModelSwitchModal, activateModelAtomically } =
    useAppStore();

  if (!modelSwitchModalOptions) return null;

  const {
    actionType,
    providerId,
    providerName,
    targetModel,
    currentActiveModel,
    currentActiveProvider,
    targetMode,
    currentMode,
    chatTitle,
  } = modelSwitchModalOptions;

  const handleConnectAsInactive = () => {
    closeModelSwitchModal();
  };

  const handleMakeActive = () => {
    activateModelAtomically(providerId, targetModel, targetMode);
    closeModelSwitchModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 max-w-md w-full p-6 space-y-5 text-zinc-100">
        {/* Header Title */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">
                {actionType === 'add_inactive_or_active' && 'Model Already Active'}
                {actionType === 'switch_active_model' && 'Switch Active Model?'}
                {actionType === 'switch_execution_mode' && `Switch to ${targetMode === 'local' ? 'Local' : 'Cloud'} Mode?`}
                {actionType === 'switch_chat_model' && 'Change Conversation Model?'}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">Model Connection Confirmation</p>
            </div>
          </div>
          <button
            onClick={closeModelSwitchModal}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Context Description */}
        <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-850 space-y-2 text-xs text-zinc-300 font-sans">
          {actionType === 'add_inactive_or_active' && (
            <>
              <p>
                <strong className="text-white">{currentActiveModel}</strong> (<em className="text-zinc-400">{currentActiveProvider}</em>) is currently active.
              </p>
              <p>
                How would you like to configure <strong className="text-white">{targetModel}</strong> from <strong className="text-white">{providerName}</strong>?
              </p>
            </>
          )}

          {actionType === 'switch_active_model' && (
            <>
              <p>
                You are switching the global AI execution model from <strong className="text-white">{currentActiveModel}</strong> to{' '}
                <strong className="text-white">{targetModel}</strong> (<em className="text-zinc-400">{providerName}</em>).
              </p>
              <p className="text-zinc-400">Future requests will use {targetModel} as your primary intelligence engine.</p>
            </>
          )}

          {actionType === 'switch_execution_mode' && (
            <>
              <div className="flex items-center gap-2 font-bold text-white font-mono">
                {targetMode === 'local' ? <Cpu className="w-4 h-4 text-emerald-400" /> : <Globe className="w-4 h-4 text-blue-400" />}
                <span>
                  Execution Mode: {currentMode?.toUpperCase()} &rarr; {targetMode?.toUpperCase()}
                </span>
              </div>
              <p>
                Future prompts will execute in <strong className="text-white">{targetMode === 'local' ? '100% Offline Local Mode' : 'Cloud Mode'}</strong> using{' '}
                <strong className="text-white">{targetModel}</strong>.
              </p>
            </>
          )}

          {actionType === 'switch_chat_model' && (
            <>
              <p>
                Change active model for conversation <strong className="text-white">"{chatTitle}"</strong> to{' '}
                <strong className="text-white">{targetModel}</strong>.
              </p>
            </>
          )}
        </div>

        {/* Active vs Inactive Action Choice */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {actionType === 'add_inactive_or_active' && (
            <button
              onClick={handleConnectAsInactive}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs transition"
            >
              Keep Connected (Inactive)
            </button>
          )}

          <button
            onClick={closeModelSwitchModal}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl text-xs transition"
          >
            Cancel
          </button>

          <button
            onClick={handleMakeActive}
            className="px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-zinc-900" />
            <span>Make Active Model</span>
          </button>
        </div>
      </div>
    </div>
  );
};
