import React from 'react';
import { ShieldAlert, Zap, CheckCircle2, X, Cpu, Globe, Layers } from 'lucide-react';
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
    // Keep target provider connected without switching current global active model
    closeModelSwitchModal();
  };

  const handleMakeActive = () => {
    activateModelAtomically(providerId, targetModel, targetMode);
    closeModelSwitchModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 max-w-md w-full p-6 space-y-5 text-zinc-900 select-none">
        {/* Header Title */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-950">
                {actionType === 'add_inactive_or_active' && 'Model Already Active'}
                {actionType === 'switch_active_model' && 'Switch Active Model?'}
                {actionType === 'switch_execution_mode' && `Switch to ${targetMode === 'local' ? 'Local' : 'Cloud'} Mode?`}
                {actionType === 'switch_chat_model' && 'Change Conversation Model?'}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">Model Connection Confirmation</p>
            </div>
          </div>
          <button
            onClick={closeModelSwitchModal}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Context Description */}
        <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 space-y-2 text-xs text-zinc-700">
          {actionType === 'add_inactive_or_active' && (
            <>
              <p>
                <strong>{currentActiveModel}</strong> (<em>{currentActiveProvider}</em>) is currently active.
              </p>
              <p>
                How would you like to configure <strong>{targetModel}</strong> from <strong>{providerName}</strong>?
              </p>
            </>
          )}

          {actionType === 'switch_active_model' && (
            <>
              <p>
                You are switching the global AI execution model from <strong>{currentActiveModel}</strong> to{' '}
                <strong>{targetModel}</strong> (<em>{providerName}</em>).
              </p>
              <p className="text-zinc-500">Future requests will use {targetModel} as your primary intelligence engine.</p>
            </>
          )}

          {actionType === 'switch_execution_mode' && (
            <>
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                {targetMode === 'local' ? <Cpu className="w-4 h-4 text-emerald-600" /> : <Globe className="w-4 h-4 text-blue-600" />}
                <span>
                  Switching Execution Mode: {currentMode?.toUpperCase()} &rarr; {targetMode?.toUpperCase()}
                </span>
              </div>
              <p>
                Future prompts will execute in <strong>{targetMode === 'local' ? '100% Offline Local Mode' : 'Cloud Mode'}</strong> using{' '}
                <strong>{targetModel}</strong>.
              </p>
            </>
          )}

          {actionType === 'switch_chat_model' && (
            <>
              <p>
                This conversation (<em>"{chatTitle || 'Current Chat'}"</em>) was using <strong>{currentActiveModel}</strong>.
              </p>
              <p>
                Would you like to switch this conversation to <strong>{targetModel}</strong> or update globally?
              </p>
            </>
          )}
        </div>

        {/* Actions Button Bar */}
        <div className="flex flex-col gap-2 pt-1">
          {actionType === 'add_inactive_or_active' && (
            <>
              <button
                onClick={handleMakeActive}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Connect & Make Active Model</span>
              </button>
              <button
                onClick={handleConnectAsInactive}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Connect as Inactive (Keep {currentActiveModel})</span>
              </button>
            </>
          )}

          {(actionType === 'switch_active_model' || actionType === 'switch_execution_mode') && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeModelSwitchModal}
                className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeActive}
                className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Confirm & Switch Model</span>
              </button>
            </div>
          )}

          {actionType === 'switch_chat_model' && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={closeModelSwitchModal}
                className="py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeActive}
                className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Switch Model</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
