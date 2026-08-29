import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  ShieldCheck,
  KeyRound,
  Smartphone,
  Laptop,
  Cloud,
  Download,
  Upload,
  Copy,
  Check,
  Edit2,
  RefreshCw,
  LogOut,
  LogIn,
  Sliders,
  Bell,
  Volume2,
  Inbox,
  X,
  Flame,
  Clock,
  BookOpen,
  Award,
  Mail,
  Building,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  UserProfile,
  getUserProfile,
  updateUserProfile,
  updateLearningPreferences,
  loginWithCredentials,
  loginWithPasskey,
  registerAccount,
  logoutAccount,
  regeneratePasskey,
  revokeDeviceSession,
  exportCompleteLearningBackup,
  importCompleteLearningBackup,
  getSharedWithMeSubjects,
  acceptSharedSubject,
  SharedSubjectItem,
  calculateRealUserStats,
  RealUserStats,
} from '../../services/userService';
import { getProjects, ProjectItem } from '../../services/database';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
}

const EMOJI_AVATARS = ['⚡', '🧠', '🔬', '🚀', '💻', '🌌', '💡', '🤖', '🎯', '📚', '🧬', '⚛️', '🏆', '🌿'];

type ModalTab = 'profile' | 'security' | 'sync' | 'preferences' | 'inbox';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('profile');
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [inboxShares, setInboxShares] = useState<SharedSubjectItem[]>([]);
  const [acceptedShareId, setAcceptedShareId] = useState<string | null>(null);
  const [realStats, setRealStats] = useState<RealUserStats>(() => calculateRealUserStats(0));

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName);
  const [editUsername, setEditUsername] = useState(profile.username);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editRole, setEditRole] = useState(profile.role);
  const [editInstitution, setEditInstitution] = useState(profile.institution);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editAvatar, setEditAvatar] = useState(profile.avatarEmoji);

  // Copy Feedback
  const [copiedPasskey, setCopiedPasskey] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Auth / Login Modal States
  const [authMode, setAuthMode] = useState<'view' | 'login' | 'passkey_login' | 'register'>('view');
  const [loginEmailOrUser, setLoginEmailOrUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasskeyInput, setLoginPasskeyInput] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regInstitution, setRegInstitution] = useState('');
  const [authStatusMessage, setAuthStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync / Backup States
  const [isExporting, setIsExporting] = useState(false);
  const [backupJsonText, setBackupJsonText] = useState('');
  const [importStatusMessage, setImportStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const p = getUserProfile();
      setProfile(p);
      setEditDisplayName(p.displayName);
      setEditUsername(p.username);
      setEditEmail(p.email);
      setEditRole(p.role);
      setEditInstitution(p.institution);
      setEditBio(p.bio);
      setEditAvatar(p.avatarEmoji);
      setInboxShares(getSharedWithMeSubjects());
      getProjects().then((projs) => {
        setProjects(projs);
        const liveStats = calculateRealUserStats(projs.length);
        setRealStats(liveStats);
      });
      setAuthStatusMessage(null);
      setImportStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyPasskey = async () => {
    await navigator.clipboard.writeText(profile.passkey);
    setCopiedPasskey(true);
    setTimeout(() => setCopiedPasskey(false), 2000);
  };

  const handleCopyUserId = async () => {
    await navigator.clipboard.writeText(profile.userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const handleSaveProfileChanges = () => {
    const updated = updateUserProfile({
      displayName: editDisplayName.trim() || profile.displayName,
      username: editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || profile.username,
      email: editEmail.trim().toLowerCase() || profile.email,
      role: editRole.trim() || profile.role,
      institution: editInstitution.trim() || profile.institution,
      bio: editBio.trim() || profile.bio,
      avatarEmoji: editAvatar,
    });
    setProfile(updated);
    setIsEditingProfile(false);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWithCredentials(loginEmailOrUser, loginPassword);
    if (res.success && res.profile) {
      setProfile(res.profile);
      setAuthStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setAuthMode('view');
        setAuthStatusMessage(null);
      }, 1500);
    } else {
      setAuthStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handlePasskeyLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWithPasskey(loginPasskeyInput);
    if (res.success && res.profile) {
      setProfile(res.profile);
      setAuthStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setAuthMode('view');
        setAuthStatusMessage(null);
      }, 1500);
    } else {
      setAuthStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = registerAccount(regEmail, regUsername, regDisplayName, regRole, regInstitution);
    if (res.success && res.profile) {
      setProfile(res.profile);
      setAuthStatusMessage({ type: 'success', text: res.message });
      setTimeout(() => {
        setAuthMode('view');
        setAuthStatusMessage(null);
      }, 1800);
    } else {
      setAuthStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleLogout = () => {
    logoutAccount();
    const p = getUserProfile();
    setProfile(p);
    setAuthMode('login');
  };

  const handleRegenerateKey = () => {
    if (confirm('Regenerating your Passkey will revoke older keys on other devices. Continue?')) {
      const newKey = regeneratePasskey();
      setProfile((prev) => ({ ...prev, passkey: newKey }));
    }
  };

  const handleRevokeDevice = (id: string) => {
    const updated = revokeDeviceSession(id);
    setProfile(updated);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await exportCompleteLearningBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LearnForge_Backup_${profile.username}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const res = await importCompleteLearningBackup(content);
      if (res.success) {
        setImportStatusMessage({ type: 'success', text: res.message });
        setProfile(getUserProfile());
        getProjects().then(setProjects);
      } else {
        setImportStatusMessage({ type: 'error', text: res.message });
      }
    };
    reader.readAsText(file);
  };

  const handleImportTextSubmit = async () => {
    if (!backupJsonText.trim()) return;
    const res = await importCompleteLearningBackup(backupJsonText.trim());
    if (res.success) {
      setImportStatusMessage({ type: 'success', text: res.message });
      setProfile(getUserProfile());
      getProjects().then(setProjects);
      setBackupJsonText('');
    } else {
      setImportStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleAcceptShare = async (item: SharedSubjectItem) => {
    const newProject = await acceptSharedSubject(item);
    setAcceptedShareId(item.id);
    setInboxShares(getSharedWithMeSubjects());
    if (onSelectProject) {
      setTimeout(() => {
        onSelectProject(newProject.id);
        onClose();
      }, 400);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0e1015] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] font-sans">
        {/* ── LEFT SIDEBAR NAVIGATION ────────────────────────────────────────── */}
        <div className="w-full md:w-64 bg-zinc-50 dark:bg-[#12141a] border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800/80 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            {/* User Profile Mini Header */}
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xl shadow-xs shrink-0">
                {profile.avatarEmoji}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                  {profile.displayName}
                </h3>
                <span className="text-[11px] font-mono text-zinc-400 block truncate">
                  @{profile.username}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setAuthMode('view');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                }`}
              >
                <User className="w-4 h-4" />
                <span>My Profile & Identity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('security');
                  setAuthMode('view');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Multi-Device Login</span>
                </div>
                {profile.connectedDevices.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {profile.connectedDevices.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sync');
                  setAuthMode('view');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'sync'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Cloud className="w-4 h-4 text-blue-500" />
                <span>Cloud Sync & Backup</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('preferences');
                  setAuthMode('view');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'preferences'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Learning Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('inbox');
                  setAuthMode('view');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'inbox'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4 text-emerald-500" />
                  <span>Peer Inbox</span>
                </div>
                {inboxShares.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                    {inboxShares.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* User ID Card */}
          <div className="mt-4 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Learner ID</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </div>
            <div className="flex items-center justify-between gap-1 text-xs font-mono font-bold text-zinc-900 dark:text-white">
              <span>{profile.userId}</span>
              <button
                type="button"
                onClick={handleCopyUserId}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                title="Copy Unique ID"
              >
                {copiedUserId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar Header */}
          <div className="p-4 md:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-zinc-950 dark:text-white flex items-center gap-2">
                {activeTab === 'profile' && <span>👤 Learner Identity & Profile</span>}
                {activeTab === 'security' && <span>🔐 Multi-Device Login & Credentials</span>}
                {activeTab === 'sync' && <span>☁️ Cloud Sync & Data Portability</span>}
                {activeTab === 'preferences' && <span>⚙️ Learning Preferences & Engine</span>}
                {activeTab === 'inbox' && <span>📬 Direct Peer Shared Subjects</span>}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                {activeTab === 'profile' && 'Manage your public persona, academic role, and achievement stats'}
                {activeTab === 'security' && 'Log in on any computer, phone, or tablet with credentials or sync passkey'}
                {activeTab === 'sync' && 'Export and restore your complete subjects and study history anywhere'}
                {activeTab === 'preferences' && 'Fine-tune adaptive teaching style, difficulty, and study reminders'}
                {activeTab === 'inbox' && 'View study modules sent to your unique ID by peers'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
            {/* ── TAB 1: PROFILE & IDENTITY ─────────────────────────────────── */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                {/* Stats Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Subjects</span>
                    </div>
                    <div className="text-lg font-extrabold text-zinc-950 dark:text-white font-mono mt-1">
                      {realStats.subjectsCount}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Study Streak</span>
                    </div>
                    <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
                      {realStats.streakDays} <span className="text-xs font-normal">days</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Study Time</span>
                    </div>
                    <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                      {realStats.studyTimeDisplay}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Mastery Score</span>
                    </div>
                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                      {realStats.reputation}
                    </div>
                  </div>
                </div>

                {/* Profile Information Card */}
                {!isEditingProfile ? (
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-2xl shadow-xs">
                          {profile.avatarEmoji}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                            <span>{profile.displayName}</span>
                            <span className="text-xs font-mono font-normal text-zinc-400">@{profile.username}</span>
                          </h3>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{profile.role}</p>
                          <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-zinc-400" />
                            <span>{profile.institution}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Bio & Focus Areas</span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">{profile.bio}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-zinc-700 dark:text-zinc-300 font-sans">{profile.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Member since {profile.joinedDate}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                      <span className="font-bold text-zinc-950 dark:text-white">Edit Learner Profile</span>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Avatar Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500">Choose Avatar Emoji</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {EMOJI_AVATARS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditAvatar(emoji)}
                            className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition cursor-pointer ${
                              editAvatar === emoji
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 ring-2 ring-blue-500'
                                : 'bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">Display Name</label>
                        <input
                          type="text"
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">Username (@handle)</label>
                        <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3">
                          <span className="text-zinc-400">@</span>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full p-2.5 bg-transparent text-zinc-950 dark:text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">Academic / Professional Role</label>
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          placeholder="e.g. CS Student, Researcher, Engineer"
                          className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-blue-500 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-zinc-500">Institution / University</label>
                        <input
                          type="text"
                          value={editInstitution}
                          onChange={(e) => setEditInstitution(e.target.value)}
                          placeholder="e.g. Stanford University / Tech Collective"
                          className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-blue-500 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-500">Email Address (Login ID)</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-blue-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-500">Bio & Research Interests</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-white outline-none focus:border-blue-500 transition resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfileChanges}
                        className="px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-bold transition cursor-pointer shadow-xs"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: SECURITY & MULTI-DEVICE LOGIN ──────────────────────── */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                {/* 1-Click Multi-Device Passkey Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider font-mono">
                        Instant Multi-Device Sync Passkey
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                      Zero-Password Login
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans">
                    Use this secret Passkey to log in to your LearnForge workspace on any mobile phone, tablet, or secondary computer without typing passwords.
                  </p>

                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#12141a] p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <span className="font-mono font-bold text-xs text-zinc-950 dark:text-white tracking-widest truncate">
                      {profile.passkey}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyPasskey}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {copiedPasskey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPasskey ? 'Copied!' : 'Copy Key'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerateKey}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        title="Regenerate Passkey"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Status / Login Switcher Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 dark:text-white">Account Status</h4>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Logged in as <span className="font-bold text-zinc-900 dark:text-zinc-200">{profile.email}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthMode(authMode === 'login' ? 'view' : 'login')}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Switch Account</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Feedback Notification */}
                  {authStatusMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        authStatusMessage.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {authStatusMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{authStatusMessage.text}</span>
                    </div>
                  )}

                  {/* Login with Email/Password Form */}
                  {authMode === 'login' && (
                    <form onSubmit={handleLoginSubmit} className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white">Log in with Credentials</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAuthMode('passkey_login')}
                            className="text-amber-600 dark:text-amber-400 font-mono text-[11px] hover:underline"
                          >
                            Use Passkey
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuthMode('register')}
                            className="text-blue-600 dark:text-blue-400 font-mono text-[11px] hover:underline"
                          >
                            Create Account
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Email or @username"
                          value={loginEmailOrUser}
                          onChange={(e) => setLoginEmailOrUser(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        Sign In to Workspace
                      </button>
                    </form>
                  )}

                  {/* Login with Passkey Form */}
                  {authMode === 'passkey_login' && (
                    <form onSubmit={handlePasskeyLoginSubmit} className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white">Instant Passkey Sign In</span>
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className="text-blue-600 dark:text-blue-400 font-mono text-[11px] hover:underline"
                        >
                          Use Email/Password
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Paste Passkey (e.g. LKEY-8842-AF92-331B)"
                        value={loginPasskeyInput}
                        onChange={(e) => setLoginPasskeyInput(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-950 dark:text-white outline-none focus:border-amber-500"
                      />

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        Verify Passkey & Sync Session
                      </button>
                    </form>
                  )}

                  {/* Register Account Form */}
                  {authMode === 'register' && (
                    <form onSubmit={handleRegisterSubmit} className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white">Register New Learning Profile</span>
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className="text-blue-600 dark:text-blue-400 font-mono text-[11px] hover:underline"
                        >
                          Already have an account? Sign In
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="email"
                          placeholder="Email Address"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Username (e.g. jane_ai)"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          placeholder="Display Name"
                          value={regDisplayName}
                          onChange={(e) => setRegDisplayName(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Role / Title"
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Institution / Org"
                          value={regInstitution}
                          onChange={(e) => setRegInstitution(e.target.value)}
                          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-950 dark:text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        Create Account & Generate Passkey
                      </button>
                    </form>
                  )}
                </div>

                {/* Connected Devices & Active Sessions */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">
                      Connected Devices & Active Sessions ({profile.connectedDevices.length})
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Multi-Device Synchronization</span>
                  </div>

                  <div className="space-y-2">
                    {profile.connectedDevices.map((device) => (
                      <div
                        key={device.id}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                            {device.deviceType === 'mobile' ? (
                              <Smartphone className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Laptop className="w-4 h-4 text-emerald-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 dark:text-white">{device.deviceName}</span>
                              {device.isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  THIS DEVICE
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono block">{device.ipLocation}</span>
                          </div>
                        </div>

                        {!device.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeDevice(device.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            title="Disconnect Device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: CLOUD SYNC & DATA PORTABILITY ──────────────────────── */}
            {activeTab === 'sync' && (
              <div className="space-y-5">
                {/* Cloud Sync Status Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-950 dark:text-white">Cloud State Synchronization</h4>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          Last synchronized: {new Date(profile.lastSyncAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>REAL-TIME SYNC ACTIVE</span>
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                    All your subjects, custom tasks, adaptive concept masteries, and chat history are mirrored to your multi-device encrypted storage node.
                  </p>
                </div>

                {/* Backup / Export Learning Data */}
                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">Export Learning Backup</span>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={isExporting}
                      className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExporting ? 'Packaging...' : 'Download Backup (.json)'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 font-sans">
                    Download your complete learning package containing {projects.length} subjects, tasks, and telemetry to load onto any offline device.
                  </p>
                </div>

                {/* Restore / Import Learning Data */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">Restore from Another Device</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      <span>Upload Backup File</span>
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFileChange}
                    accept=".json"
                    className="hidden"
                  />

                  {importStatusMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        importStatusMessage.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {importStatusMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{importStatusMessage.text}</span>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-bold text-zinc-400">Or Paste Backup JSON Directly</label>
                    <textarea
                      placeholder="Paste backup JSON string here..."
                      value={backupJsonText}
                      onChange={(e) => setBackupJsonText(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleImportTextSubmit}
                      disabled={!backupJsonText.trim()}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 disabled:opacity-30 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
                    >
                      Restore Data
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: LEARNING PREFERENCES ──────────────────────────────── */}
            {activeTab === 'preferences' && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-4 text-xs">
                  <span className="font-bold text-zinc-950 dark:text-white block">Pedagogical Tutoring Style</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        {
                          id: 'adaptive_socratic',
                          title: 'Adaptive Socratic Dialogue',
                          desc: 'Guides through reflective inquiry, guided questions, and step-by-step intuition.',
                        },
                        {
                          id: 'rigorous_formal',
                          title: 'Rigorous Formal Proofs',
                          desc: 'Axiomatic precision, formal theorem proofs, and deep mathematical derivations.',
                        },
                        {
                          id: 'code_first',
                          title: 'Code-First & Applied Systems',
                          desc: 'Demonstrates concepts via runnable code snippets, trace simulations, and hands-on drills.',
                        },
                        {
                          id: 'visual_intuitive',
                          title: 'Visual & Mental Models',
                          desc: 'Emphasizes physical analogies, balance scales, diagrams, and geometric intuition.',
                        },
                      ] as const
                    ).map((style) => (
                      <div
                        key={style.id}
                        onClick={() => {
                          const updated = updateLearningPreferences({ learningStyle: style.id });
                          setProfile(updated);
                        }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                          profile.preferences.learningStyle === style.id
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-950 dark:text-blue-200 font-medium'
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                        }`}
                      >
                        <span className="font-bold">{style.title}</span>
                        <span className="text-[11px] text-zinc-500 mt-1 leading-normal font-sans">{style.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Difficulty & Session Duration */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-4 text-xs">
                  <span className="font-bold text-zinc-950 dark:text-white block">Adaptive Engine & Session Settings</span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500">Default Study Session Duration</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([15, 25, 45, 60] as const).map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              const updated = updateLearningPreferences({ defaultSessionDuration: mins });
                              setProfile(updated);
                            }}
                            className={`py-2 rounded-lg font-mono font-bold transition cursor-pointer ${
                              profile.preferences.defaultSessionDuration === mins
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs'
                                : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500">Preferred Diagnostic Challenge Level</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              const updated = updateLearningPreferences({ preferredDifficulty: lvl });
                              setProfile(updated);
                            }}
                            className={`py-2 rounded-lg font-mono capitalize text-[11px] font-bold transition cursor-pointer ${
                              profile.preferences.preferredDifficulty === lvl
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-2xs'
                                : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications & Toggles */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#12141a] border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
                  <span className="font-bold text-zinc-950 dark:text-white block">Notifications & Audio</span>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <Volume2 className="w-4 h-4 text-blue-500" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white block">Interactive Audio & Milestones</span>
                          <span className="text-[11px] text-zinc-500">Play subtle sound feedback on task completion and concept mastery</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.preferences.soundEffects}
                        onChange={(e) => {
                          const updated = updateLearningPreferences({ soundEffects: e.target.checked });
                          setProfile(updated);
                        }}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="font-bold text-zinc-900 dark:text-white block">Daily Study & Retention Reminders</span>
                          <span className="text-[11px] text-zinc-500">Alerts based on spaced repetition forgetting curves for weak concepts</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.preferences.dailyStudyReminder}
                        onChange={(e) => {
                          const updated = updateLearningPreferences({ dailyStudyReminder: e.target.checked });
                          setProfile(updated);
                        }}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 5: PEER INBOX ────────────────────────────────────────── */}
            {activeTab === 'inbox' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                    Subjects Sent Directly to Your ID ({inboxShares.length})
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Direct Peer P2P Sharing</span>
                </div>

                {inboxShares.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 text-xs font-mono space-y-2 bg-zinc-50 dark:bg-zinc-900/40">
                    <Inbox className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600" />
                    <p className="font-bold text-zinc-800 dark:text-zinc-300">Your sharing inbox is empty.</p>
                    <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                      Give your Unique Learner ID (<span className="font-bold text-blue-500">{profile.userId}</span>) to fellow students or instructors to receive curated modules directly here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inboxShares.map((item) => {
                      const isAccepted = acceptedShareId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12141a] space-y-3 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                                {item.subject.name}
                              </h4>
                              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                                Sent by <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.fromUserName}</span> ({item.fromUserId})
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAcceptShare(item)}
                              disabled={isAccepted}
                              className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                            >
                              {isAccepted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                              <span>{isAccepted ? 'Imported!' : 'Import Subject'}</span>
                            </button>
                          </div>

                          {item.note && (
                            <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 font-sans italic">
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
    </div>
  );
};
