import React, { useState, useEffect } from 'react';
import {
  User,
  Copy,
  Check,
  Edit2,
  Download,
  X,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import {
  UserProfile,
  getUserProfile,
  updateUserProfile,
  getSharedWithMeSubjects,
  acceptSharedSubject,
  SharedSubjectItem,
} from '../../services/userService';
import { getProjects, ProjectItem } from '../../services/database';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
}

const EMOJI_OPTIONS = ['⚡', '🧠', '🔬', '🚀', '💻', '🌌', '💡', '🤖', '🎯', '📚'];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'inbox'>('profile');
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.displayName);
  const [editUsername, setEditUsername] = useState(profile.username);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatarEmoji);
  const [copiedId, setCopiedId] = useState(false);
  const [inboxShares, setInboxShares] = useState<SharedSubjectItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [acceptedShareId, setAcceptedShareId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const p = getUserProfile();
      setProfile(p);
      setEditName(p.displayName);
      setEditUsername(p.username);
      setEditBio(p.bio);
      setEditAvatar(p.avatarEmoji);
      setInboxShares(getSharedWithMeSubjects());
      getProjects().then(setProjects);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(profile.userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleSaveProfile = () => {
    const updated = updateUserProfile({
      displayName: editName.trim() || profile.displayName,
      username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || profile.username,
      bio: editBio.trim() || profile.bio,
      avatarEmoji: editAvatar,
    });
    setProfile(updated);
    setIsEditing(false);
  };

  const handleAcceptShare = async (item: SharedSubjectItem) => {
    const newProject = await acceptSharedSubject(item);
    setAcceptedShareId(item.id);
    setInboxShares(getSharedWithMeSubjects());
    if (onSelectProject) {
      setTimeout(() => {
        onSelectProject(newProject.id);
        onClose();
      }, 500);
    }
  };

  const publicCount = projects.filter((p) => p.is_public).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-sm shadow-2xs">
              {profile.avatarEmoji}
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <span>{profile.displayName}</span>
                <span className="text-[11px] font-mono text-zinc-400 font-normal">@{profile.username}</span>
              </h2>
              <p className="text-[11px] font-mono text-zinc-500">Learner Profile & Peer Direct Shares</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-zinc-100 dark:border-zinc-850">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile & ID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Shared with Me ({inboxShares.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* User ID Highlight Card */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-zinc-500 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    Unique Peer Sharing ID
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Share this ID to receive subjects</span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#121215] p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <span className="font-mono font-bold text-xs text-zinc-950 dark:text-white tracking-wide">
                    {profile.userId}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="px-2.5 py-1 rounded bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                  </button>
                </div>
              </div>

              {/* Profile Details / Edit Form */}
              {!isEditing ? (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">Profile Details</span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-2 py-1 rounded text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">{profile.bio}</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="block text-sm font-bold text-zinc-950 dark:text-white">{projects.length}</span>
                      <span className="text-[10px] text-zinc-500">Subjects</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="block text-sm font-bold text-zinc-950 dark:text-white">{publicCount}</span>
                      <span className="text-[10px] text-zinc-500">Public</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="block text-sm font-bold text-zinc-950 dark:text-white">{profile.reputation}</span>
                      <span className="text-[10px] text-zinc-500">Score</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-500">Avatar</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditAvatar(emoji)}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                            editAvatar === emoji
                              ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border border-zinc-950'
                              : 'bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-500">Display Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-zinc-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-500">Username Handle</label>
                    <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2">
                      <span className="text-zinc-400">@</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full p-2 bg-transparent text-zinc-950 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-500">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={2}
                      className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-zinc-400 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold transition cursor-pointer shadow-2xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                Subjects Sent Directly to Your ID ({inboxShares.length})
              </span>

              {inboxShares.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-xs font-mono space-y-1">
                  <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p>Your sharing inbox is empty.</p>
                  <p className="text-[10px] text-zinc-500">Give your User ID to peers so they can send subjects here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {inboxShares.map((item) => {
                    const isAccepted = acceptedShareId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
                              {item.subject.name}
                            </h4>
                            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                              From {item.fromUserName} ({item.fromUserId})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAcceptShare(item)}
                            disabled={isAccepted}
                            className="px-3 py-1 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                          >
                            {isAccepted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                            <span>{isAccepted ? 'Imported!' : 'Import Subject'}</span>
                          </button>
                        </div>

                        {item.note && (
                          <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-sans italic">
                            "{item.note}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
