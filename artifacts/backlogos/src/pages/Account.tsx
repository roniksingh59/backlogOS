import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth, type StudentLearningPreferences } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  readPlan,
  readCompleted,
  readStudySessions,
  readNotes,
  type StudentPlan,
} from '@/lib/storage';
import { readProgression } from '@/lib/progression/progression-service';
import {
  readEducationProfile,
  saveEducationProfile,
} from '@/lib/curriculum/user-profile-storage';
import {
  CBSE_SUBJECTS_CATALOGUE,
  CBSE_ACADEMIC_SESSION,
} from '@/lib/curriculum/cbse-2027-database';
import {
  User as UserIcon,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Sparkles,
  Edit3,
  Save,
  X,
  Database,
  RefreshCw,
  Download,
  LogOut,
  Target,
  FileText,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  Check,
} from 'lucide-react';

const AVATAR_PRESETS = [
  {
    id: 'bax',
    label: 'Bax Mascot',
    url: '/brand/mark-transparent.svg',
    bg: 'bg-primary/10',
  },
  {
    id: 'scholar',
    label: 'The Scholar',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Scholar&backgroundColor=0284c7',
    bg: 'bg-sky-500/10',
  },
  {
    id: 'focus',
    label: 'Deep Focus',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FocusWorker&backgroundColor=6366f1',
    bg: 'bg-indigo-500/10',
  },
  {
    id: 'physics',
    label: 'Physics Ace',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NewtonAce&backgroundColor=10b981',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'math',
    label: 'Math Wizard',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=EulerMath&backgroundColor=f59e0b',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'bio',
    label: 'Bio Master',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=DarwinBio&backgroundColor=ec4899',
    bg: 'bg-pink-500/10',
  },
];

export function Account() {
  const [, setLocation] = useLocation();
  const { user, syncStatus, updateStudentProfile, syncDataNow, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for profile editing
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState<'11' | '12'>('11');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBoard, setEditBoard] = useState('CBSE');
  const [editAcademicSession, setEditAcademicSession] = useState(CBSE_ACADEMIC_SESSION);
  const [editEnrolledSubjectIds, setEditEnrolledSubjectIds] = useState<string[]>([]);
  const [editPreferences, setEditPreferences] = useState<StudentLearningPreferences>({
    dailyTargetHours: 4,
    studyIntensity: 'balanced',
    focusInterval: 25,
    targetExam: 'CBSE 2027 Board Exams',
  });

  // Local academic metrics
  const activeUserId = user?.uid;
  const userPlan: StudentPlan | null = useMemo(() => readPlan(activeUserId), [activeUserId]);
  const completedChapters = useMemo(() => readCompleted(activeUserId), [activeUserId]);
  const studySessions = useMemo(() => readStudySessions(activeUserId), [activeUserId]);
  const userNotes = useMemo(() => readNotes(activeUserId), [activeUserId]);
  const progression = useMemo(() => readProgression(activeUserId), [activeUserId]);
  const eduProfile = useMemo(() => readEducationProfile(activeUserId), [activeUserId]);

  // Sync form state when user changes or edit mode opens
  useEffect(() => {
    if (user) {
      setEditName(user.displayName || '');
      setEditGrade((user.grade as '11' | '12') || (eduProfile.grade as '11' | '12') || '11');
      setEditPhone(user.phone || '');
      setEditAvatarUrl(user.photoURL || '');
      setEditBoard(user.board || eduProfile.curriculum || 'CBSE');
      setEditAcademicSession(user.academicSession || eduProfile.academicSession || CBSE_ACADEMIC_SESSION);
      setEditEnrolledSubjectIds(
        user.subjects && user.subjects.length > 0
          ? user.subjects
          : eduProfile.enrolledSubjectIds || []
      );
      if (user.learningPreferences) {
        setEditPreferences(user.learningPreferences);
      }
    }
  }, [user, eduProfile, isEditing]);

  // Available subjects for the currently selected class
  const classSubjects = useMemo(() => {
    return CBSE_SUBJECTS_CATALOGUE.filter((s) => s.class === editGrade);
  }, [editGrade]);

  // Calculated study statistics
  const totalChaptersCount = userPlan?.chapterIds?.length || 0;
  const completedChaptersCount = completedChapters.length;
  const completionPercent = totalChaptersCount > 0
    ? Math.min(100, Math.round((completedChaptersCount / totalChaptersCount) * 100))
    : 0;

  const totalFocusMinutes = useMemo(() => {
    return studySessions.reduce((acc, sess) => acc + (sess.durationMinutes || sess.minutes || 0), 0);
  }, [studySessions]);

  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMessage(null);

    try {
      const res = await updateStudentProfile({
        displayName: editName.trim() || undefined,
        grade: editGrade,
        phone: editPhone.trim() || undefined,
        photoURL: editAvatarUrl.trim() || null,
        board: editBoard,
        academicSession: editAcademicSession,
        subjects: editEnrolledSubjectIds,
        learningPreferences: editPreferences,
      });

      if (res.success) {
        // Also ensure education profile storage is updated
        const updatedEdu = readEducationProfile(activeUserId);
        updatedEdu.grade = editGrade;
        updatedEdu.curriculum = editBoard;
        updatedEdu.academicSession = editAcademicSession;
        updatedEdu.enrolledSubjectIds = editEnrolledSubjectIds;
        saveEducationProfile(updatedEdu, activeUserId);

        setFeedbackMessage({ type: 'success', text: 'Profile & learning preferences updated in Cloud successfully!' });
        setTimeout(() => {
          setIsEditing(false);
          setFeedbackMessage(null);
        }, 1200);
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Unexpected error updating profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      await syncDataNow();
      setFeedbackMessage({ type: 'success', text: 'All local study progress synchronized with cloud database!' });
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Sync failed. Check your internet connection.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportData = () => {
    const backupData = {
      user: {
        uid: user?.uid,
        email: user?.email,
        name: user?.displayName,
        grade: user?.grade,
        board: user?.board,
      },
      plan: userPlan,
      completedChapters,
      studySessions,
      userNotes,
      progression,
      exportedAt: new Date().toISOString(),
      platform: 'BacklogOS EdTech',
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlogos-backup-${(user?.displayName || 'student').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSubjectEnrollment = (subjectId: string) => {
    setEditEnrolledSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 font-sans space-y-6">
      {/* Top Banner & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary font-mono">
              <Sparkles size={12} />
              <span>Student Workspace</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              <ShieldCheck size={12} />
              <span>Database Isolated</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Account & Workspace
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage your CBSE profile, enrolled subjects, and track your personalized academic progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="gap-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <X size={14} />
              <span>Cancel</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleTriggerSync}
            disabled={syncing}
            className="gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            title="Force synchronization with Academic Cloud"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden xs:inline">Sync Cloud</span>
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-3 text-xs font-medium ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <X size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* SECTION A & B: PROFILE CARD (VIEW OR EDIT MODE) */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs backdrop-blur-md">
        {!isEditing ? (
          /* VIEW MODE */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Student Avatar'}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-primary/30 shadow-md bg-muted"
                    />
                  ) : (
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold text-2xl grid place-items-center shadow-md">
                      {(user?.displayName || user?.email || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1.5 -right-1.5 rounded-lg bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-mono font-bold shadow-xs">
                    Cl {user?.grade || '11'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      {user?.displayName || 'Student Aspirant'}
                    </h2>
                    {user?.isGuest && (
                      <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5">
                        Guest Mode
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                    {user?.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-primary" />
                        <span>{user.email}</span>
                      </span>
                    )}
                    {user?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="text-emerald-500" />
                        <span>{user.phone}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <GraduationCap size={12} className="text-indigo-500" />
                      <span>{user?.board || 'CBSE'} · Class {user?.grade || '11'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-muted-foreground" />
                      <span>Session {user?.academicSession || CBSE_ACADEMIC_SESSION}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs gap-1.5 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Update Details</span>
                </Button>
              </div>
            </div>

            {/* Enrolled Subjects & Badges */}
            <div className="pt-4 border-t border-border/60">
              <div className="text-xs font-semibold text-foreground mb-2.5 flex items-center justify-between">
                <span className="uppercase tracking-wider font-mono text-[11px] text-muted-foreground">
                  Enrolled CBSE Subjects
                </span>
                <span className="text-[11px] font-mono text-primary">
                  {(user?.subjects?.length || eduProfile.enrolledSubjectIds?.length || 0)} Enrolled
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(user?.subjects && user.subjects.length > 0
                  ? user.subjects
                  : eduProfile.enrolledSubjectIds || []
                ).map((subId) => {
                  const subjectMeta = CBSE_SUBJECTS_CATALOGUE.find((s) => s.id === subId);
                  const name = subjectMeta?.name || subId.replace(/^(cbse-\d+-|custom-)/, '').replace(/-/g, ' ');
                  const code = subjectMeta?.code ? `(${subjectMeta.code})` : '';

                  return (
                    <span
                      key={subId}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 transition"
                    >
                      <BookOpen size={12} className="text-primary" />
                      <span className="capitalize">{name}</span>
                      {code && <span className="text-[10px] font-mono text-muted-foreground">{code}</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Learning Preferences Snapshot */}
            <div className="pt-4 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Daily Target</div>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  {user?.learningPreferences?.dailyTargetHours || 4} Hours/Day
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Study Intensity</div>
                <div className="text-sm font-bold capitalize text-foreground mt-0.5">
                  {user?.learningPreferences?.studyIntensity || 'Balanced'}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Focus Interval</div>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  {user?.learningPreferences?.focusInterval || 25} Min Pomodoro
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Target Exam</div>
                <div className="text-sm font-bold text-foreground mt-0.5 truncate">
                  {user?.learningPreferences?.targetExam || 'CBSE 2027'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">Edit Student Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Avatar Selection */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Select Profile Avatar or Paste Image URL
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {AVATAR_PRESETS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => setEditAvatarUrl(av.url)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition cursor-pointer ${
                      editAvatarUrl === av.url
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl ${av.bg} grid place-items-center overflow-hidden`}>
                      <img src={av.url} alt={av.label} className="h-8 w-8 object-contain" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground truncate max-w-full">
                      {av.label}
                    </span>
                  </button>
                ))}
              </div>
              <Input
                type="url"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="Or custom photo URL (https://...)"
                className="h-8 text-xs rounded-xl"
              />
            </div>

            {/* Basic Info (Name, Phone, Grade, Board) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Ronik Sharma"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number (Optional)
                </label>
                <Input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  CBSE Class / Grade
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['11', '12'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setEditGrade(g)}
                      className={`py-2 text-xs font-mono font-medium rounded-xl border transition cursor-pointer ${
                        editGrade === g
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      CBSE Class {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Academic Session & Board
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    value={editBoard}
                    onChange={(e) => setEditBoard(e.target.value)}
                    placeholder="Board (e.g. CBSE)"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                  <Input
                    type="text"
                    value={editAcademicSession}
                    onChange={(e) => setEditAcademicSession(e.target.value)}
                    placeholder="Session (e.g. 2026-27)"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Enrolled Subjects Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-foreground">
                  Select Enrolled CBSE Class {editGrade} Subjects
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {editEnrolledSubjectIds.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-border/70 rounded-xl bg-muted/20">
                {classSubjects.map((sub) => {
                  const isSelected = editEnrolledSubjectIds.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSubjectEnrollment(sub.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-foreground font-semibold'
                          : 'bg-card border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="truncate">{sub.name}</div>
                        <div className="text-[10px] font-mono opacity-70">Code {sub.code}</div>
                      </div>
                      {isSelected ? (
                        <Check size={14} className="text-primary shrink-0" />
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Learning Preferences */}
            <div className="pt-3 border-t border-border/70 space-y-3">
              <div className="text-xs font-semibold text-foreground font-mono uppercase tracking-wider">
                Study & Focus Preferences
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    Daily Study Target (Hours)
                  </label>
                  <select
                    value={editPreferences.dailyTargetHours || 4}
                    onChange={(e) =>
                      setEditPreferences((prev) => ({ ...prev, dailyTargetHours: Number(e.target.value) }))
                    }
                    className="w-full h-9 rounded-xl border border-input bg-card px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value={2}>2 Hours / Day</option>
                    <option value={3}>3 Hours / Day</option>
                    <option value={4}>4 Hours / Day (Recommended)</option>
                    <option value={5}>5 Hours / Day</option>
                    <option value={6}>6 Hours / Day</option>
                    <option value={8}>8 Hours / Day (Exam Mode)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    Study Intensity
                  </label>
                  <select
                    value={editPreferences.studyIntensity || 'balanced'}
                    onChange={(e) =>
                      setEditPreferences((prev) => ({ ...prev, studyIntensity: e.target.value as any }))
                    }
                    className="w-full h-9 rounded-xl border border-input bg-card px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="balanced">Balanced (Regular paced study)</option>
                    <option value="rigorous">Rigorous (Daily deep backlog recovery)</option>
                    <option value="exam-rush">Exam Rush (High speed coverage)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">
                    Focus Timer Duration
                  </label>
                  <select
                    value={editPreferences.focusInterval || 25}
                    onChange={(e) =>
                      setEditPreferences((prev) => ({ ...prev, focusInterval: Number(e.target.value) }))
                    }
                    className="w-full h-9 rounded-xl border border-input bg-card px-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value={25}>25 Minutes (Standard Pomodoro)</option>
                    <option value={45}>45 Minutes (NCERT Deep Dive)</option>
                    <option value={60}>60 Minutes (Full Chapter Block)</option>
                    <option value={90}>90 Minutes (Mock Test Session)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-1.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Save Profile to Cloud</span>
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* SECTION C: STUDENT WORKSPACE METRICS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
            <Target size={14} className="text-primary" />
            <span>Academic Performance & Metrics</span>
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground">
            Isolated per Student UID
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Syllabus Progress */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Syllabus Recovery</span>
              <BookOpen size={14} className="text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {completionPercent}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>{completedChaptersCount} Done</span>
              <span>{totalChaptersCount} Total Units</span>
            </div>
          </div>

          {/* Card 2: Focus Hours */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Focus Room Time</span>
              <Clock size={14} className="text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {totalFocusHours} <span className="text-xs font-normal text-muted-foreground">hrs</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Zap size={11} className="text-amber-500 shrink-0" />
              <span>{studySessions.length} Study sessions completed</span>
            </div>
          </div>

          {/* Card 3: Saved Notes */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Study Notes & Formulas</span>
              <FileText size={14} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-foreground">
              {Object.keys(userNotes).length}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
              <span>Encrypted local and cloud notes</span>
            </div>
          </div>

          {/* Card 4: Daily Streak & XP */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Streak & Mastery</span>
              <Flame size={14} className="text-amber-500" />
            </div>
            <div className="text-2xl font-black text-foreground flex items-center gap-2">
              <span>{progression.currentStreak} Days</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                {progression.xp} XP
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Award size={11} className="text-primary shrink-0" />
              <span>Level {progression.level} · Rank {progression.rankTitle}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: QUICK ACTION LAUNCHPAD */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Compass size={14} className="text-primary" />
          <span>Quick Workspace Shortcuts</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted hover:border-primary/40 transition text-center group cursor-pointer"
          >
            <Target size={18} className="text-primary mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-foreground">Backlog Plan</span>
            <span className="text-[10px] text-muted-foreground">Manage units</span>
          </Link>

          <Link
            href="/study"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted hover:border-primary/40 transition text-center group cursor-pointer"
          >
            <Clock size={18} className="text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-foreground">Focus Room</span>
            <span className="text-[10px] text-muted-foreground">Deep timer</span>
          </Link>

          <Link
            href="/roadmap"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted hover:border-primary/40 transition text-center group cursor-pointer"
          >
            <Calendar size={18} className="text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-foreground">Recovery Route</span>
            <span className="text-[10px] text-muted-foreground">Daily schedule</span>
          </Link>

          <Link
            href="/curriculum"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted hover:border-primary/40 transition text-center group cursor-pointer"
          >
            <GraduationCap size={18} className="text-sky-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-foreground">Curriculum</span>
            <span className="text-[10px] text-muted-foreground">NCERT index</span>
          </Link>

          <Link
            href="/drills"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted hover:border-primary/40 transition text-center group cursor-pointer"
          >
            <Zap size={18} className="text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-foreground">Rapid Drills</span>
            <span className="text-[10px] text-muted-foreground">Active recall</span>
          </Link>

          <Link
            href="/pyq"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted hover:border-primary/40 transition text-center group cursor-pointer"
          >
            <Award size={18} className="text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-foreground">PYQ Bank</span>
            <span className="text-[10px] text-muted-foreground">10-Yr board</span>
          </Link>
        </div>
      </div>

      {/* SECTION E: CLOUD DATABASE & ACCOUNT SECURITY */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Database size={15} className="text-emerald-500" />
              <span>Secure Student Cloud Sync & Vault</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Your chapter checklist, focus timer records, and notes are encrypted and isolated in your private student cloud vault.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {syncStatus === 'synced' ? 'Synced with Cloud' : 'Sync Active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Authenticated Student UID</div>
            <div className="font-mono text-[11px] font-bold text-foreground truncate mt-1 select-all" title={user?.uid}>
              {user?.uid || 'guest-session'}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Data Isolation</div>
            <div className="font-semibold text-foreground mt-1 flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>Strict RLS Enforced</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Account Member Since</div>
            <div className="font-semibold text-foreground mt-1">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Session'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportData}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Download size={13} />
              <span>Export My Study Data (.json)</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                await signOut();
                setLocation('/');
              }}
              variant="destructive"
              size="sm"
              className="gap-1.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
