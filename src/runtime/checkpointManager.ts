/**
 * Namma-Agent State Checkpointing Engine (FR-4.1 - FR-4.3)
 * Manages state snapshots, session manifests, and artifact persistence under data/checkpoints/<session_id>/
 */

import { saveWorkspaceFile } from '../services/workspace';

export interface CheckpointArtifact {
  file_id: string;
  path: string;
  mime_type: string;
}

export interface CheckpointManifest {
  checkpoint_id: string;
  session_id: string;
  timestamp: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  workflow: string;
  model_config: {
    provider: string;
    model: string;
  };
  messages: Array<{
    role: string;
    content: string;
    tool_calls?: any[];
  }>;
  artifacts: CheckpointArtifact[];
}

const memoryCheckpoints: Record<string, CheckpointManifest> = {};

/**
 * Creates or updates an active session checkpoint manifest.
 */
export async function createOrUpdateCheckpoint(
  sessionId: string,
  manifestData: Partial<CheckpointManifest>
): Promise<CheckpointManifest> {
  const now = new Date().toISOString();
  const checkpointId = manifestData.checkpoint_id || Math.random().toString(36).substring(2, 14);

  const existing = memoryCheckpoints[sessionId] || {
    checkpoint_id: checkpointId,
    session_id: sessionId,
    timestamp: now,
    status: 'IN_PROGRESS',
    workflow: 'graphify',
    model_config: {
      provider: 'ollama',
      model: 'qwen3:8b',
    },
    messages: [],
    artifacts: [],
  };

  const updatedManifest: CheckpointManifest = {
    ...existing,
    ...manifestData,
    checkpoint_id: checkpointId,
    session_id: sessionId,
    timestamp: now,
  };

  memoryCheckpoints[sessionId] = updatedManifest;

  // Persist manifest JSON snapshot to disk under data/checkpoints/<session_id>/manifest.json
  const manifestJson = JSON.stringify(updatedManifest, null, 2);

  try {
    await saveWorkspaceFile(`data/checkpoints/${sessionId}`, 'manifest.json', manifestJson);
  } catch (err) {
    console.warn(`[CheckpointManager] Saved to in-memory store (workspace filesystem offline):`, err);
  }

  return updatedManifest;
}

/**
 * Retrieves a checkpoint manifest by session ID.
 */
export function getCheckpointManifest(sessionId: string): CheckpointManifest | null {
  return memoryCheckpoints[sessionId] || null;
}

/**
 * Resumes a paused or interrupted workflow session from its checkpoint manifest.
 */
export async function resumeFromCheckpoint(sessionId: string): Promise<CheckpointManifest | null> {
  const manifest = getCheckpointManifest(sessionId);
  if (!manifest) return null;

  manifest.status = 'IN_PROGRESS';
  manifest.timestamp = new Date().toISOString();
  memoryCheckpoints[sessionId] = manifest;

  return manifest;
}
