/**
 * LearnForge User Profile & Direct Peer Sharing Service
 */
import { ProjectItem, addProject } from './database';

export interface UserProfile {
  userId: string; // e.g. "USR-8821-FORGE"
  username: string; // e.g. "alex_learner"
  displayName: string;
  avatarEmoji: string;
  bio: string;
  joinedDate: string;
  reputation: number;
}

export interface SharedSubjectItem {
  id: string;
  subject: ProjectItem;
  fromUserId: string;
  fromUserName: string;
  sharedAt: string;
  note?: string;
}

const DEFAULT_USER_PROFILE: UserProfile = {
  userId: 'USR-8842-FORGE',
  username: 'alex_learner',
  displayName: 'Alex Learner',
  avatarEmoji: '⚡',
  bio: 'Computer Science & Machine Learning Explorer',
  joinedDate: 'August 2026',
  reputation: 1420,
};

export function getUserProfile(): UserProfile {
  const raw = localStorage.getItem('learnforge_user_profile');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fallback
    }
  }
  localStorage.setItem('learnforge_user_profile', JSON.stringify(DEFAULT_USER_PROFILE));
  return DEFAULT_USER_PROFILE;
}

export function updateUserProfile(updates: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated: UserProfile = { ...current, ...updates };
  localStorage.setItem('learnforge_user_profile', JSON.stringify(updated));
  return updated;
}

export function getSharedWithMeSubjects(): SharedSubjectItem[] {
  const raw = localStorage.getItem('learnforge_shared_inbox');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // Pre-populate with realistic peer shares for demonstration
  const initialShares: SharedSubjectItem[] = [
    {
      id: 'share_seed_1',
      subject: {
        id: 'seed_proj_distrib',
        name: 'Raft Consensus & Distributed Systems',
        topic: 'Distributed Systems',
        goal: 'Understand Leader Election and Log Replication mechanics',
        description: 'Comprehensive study module on the Raft consensus algorithm, split-brain recovery, and quorum states.',
        created_at: new Date().toISOString(),
        author: 'Dr. Evelyn Reed (USR-4019-STAN)',
        is_public: true,
        likes_count: 89,
        clones_count: 312,
        tags: ['Distributed Systems', 'Consensus', 'Raft', 'Networking'],
      },
      fromUserId: 'USR-4019-STAN',
      fromUserName: 'Dr. Evelyn Reed',
      sharedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      note: 'Here is the peer-reviewed Raft consensus module we reviewed in lab.',
    },
    {
      id: 'share_seed_2',
      subject: {
        id: 'seed_proj_quant',
        name: 'Quantum Computing & Qubit Gates',
        topic: 'Quantum Information',
        goal: 'Master Superposition, Entanglement, and Quantum Circuits',
        description: 'Mathematical and conceptual exploration of Hadamard gates, CNOT, Bell states, and Shor algorithm foundations.',
        created_at: new Date().toISOString(),
        author: 'Marcus Vance (USR-1104-MIT)',
        is_public: true,
        likes_count: 64,
        clones_count: 178,
        tags: ['Quantum', 'Physics', 'Linear Algebra', 'Algorithms'],
      },
      fromUserId: 'USR-1104-MIT',
      fromUserName: 'Marcus Vance',
      sharedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
      note: 'Check out these quantum circuit decision scenarios!',
    },
  ];

  localStorage.setItem('learnforge_shared_inbox', JSON.stringify(initialShares));
  return initialShares;
}

export function shareSubjectToUserId(
  targetUserId: string,
  project: ProjectItem,
  note?: string
): { success: boolean; message: string } {
  const cleanId = targetUserId.trim().toUpperCase();
  if (!cleanId) {
    return { success: false, message: 'Please enter a valid User ID or handle.' };
  }

  const myProfile = getUserProfile();

  const shareItem: SharedSubjectItem = {
    id: `share_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    subject: project,
    fromUserId: myProfile.userId,
    fromUserName: myProfile.displayName,
    sharedAt: new Date().toISOString(),
    note: note?.trim() || undefined,
  };

  const existing = getSharedWithMeSubjects();
  localStorage.setItem('learnforge_shared_inbox', JSON.stringify([shareItem, ...existing]));

  return {
    success: true,
    message: `Subject "${project.name}" was successfully shared with ${cleanId}!`,
  };
}

export async function acceptSharedSubject(sharedItem: SharedSubjectItem): Promise<ProjectItem> {
  const newProject = await addProject(
    `${sharedItem.subject.name} (from ${sharedItem.fromUserName})`,
    sharedItem.subject.topic,
    sharedItem.subject.goal,
    sharedItem.subject.description,
    30,
    sharedItem.subject.instructions
  );

  // Remove from inbox once imported
  const existing = getSharedWithMeSubjects();
  const updated = existing.filter((s) => s.id !== sharedItem.id);
  localStorage.setItem('learnforge_shared_inbox', JSON.stringify(updated));

  return newProject;
}
