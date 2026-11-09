import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Layers,
  Flame,
  ShieldCheck,
  User,
  School,
  Compass,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { type GradeLevel, type StreamId, type CurriculumChapter } from '@/lib/curriculum/types';
import { getAvailableSubjectsForGrade, getChaptersForSubject } from '@/lib/curriculum/registry';
import { computeBacklogEstimates, type BacklogChapterInput } from '@/lib/backlog-estimator';
import { savePlan, saveBacklogItems, saveCompleted } from '@/lib/storage';
import { makePlan } from '@/lib/backlog-data';
import {
  saveStudentProfileDirect,
  saveStudyPlanDirect,
  saveAllBacklogItemsDirect,
} from '@/lib/supabase-service';

interface OnboardingDraft {
  step: number;
  fullName: string;
  preferredName: string;
  phone: string;
  grade: GradeLevel;
  schoolName: string;
  stream: StreamId;
  additionalSubjects: string[];
  backlogChapters: Record<string, { difficulty: 'easy' | 'medium' | 'hard'; status: 'untouched' | 'partially_completed' | 'needs_revision' }>;
  dailyHours: number;
  targetExamDate: string;
  planDurationDays: number;
}

const LOCAL_DRAFT_KEY = 'backlogos_onboarding_draft_v2';

const DEFAULT_DRAFT: OnboardingDraft = {
  step: 1,
  fullName: '',
  preferredName: '',
  phone: '',
  grade: '11',
  schoolName: '',
  stream: 'pcm',
  additionalSubjects: ['cbse-11-english', 'cbse-11-pe'],
  backlogChapters: {},
  dailyHours: 2.5,
  targetExamDate: '',
  planDurationDays: 7,
};

export function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, token, syncStatus, updateStudentProfile } = useAuth();

  // If student is already completed and not in reset mode, redirect to dashboard immediately
  useEffect(() => {
    const isExplicitReset = typeof window !== 'undefined' && window.location.search.includes('reset=true');
    if (!isExplicitReset && user && user.onboardingCompleted) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    try {
      const local = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (local) {
        return { ...DEFAULT_DRAFT, ...JSON.parse(local) };
      }
    } catch {}
    return {
      ...DEFAULT_DRAFT,
      fullName: user?.displayName || '',
      preferredName: user?.preferredName || '',
      phone: user?.phone || '',
      grade: (user?.grade as GradeLevel) || '11',
      stream: (user?.stream as StreamId) || 'pcm',
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Persist draft on changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  // Load available subjects for chosen grade
  const availableSubjects = useMemo(() => {
    return getAvailableSubjectsForGrade(draft.grade);
  }, [draft.grade]);

  // Determine active subjects based on stream + additional subjects
  const enrolledSubjectIds = useMemo(() => {
    const streamSubs: Record<StreamId, string[]> = {
      pcm: [`cbse-${draft.grade}-physics`, `cbse-${draft.grade}-chemistry`, `cbse-${draft.grade}-mathematics`],
      pcb: [`cbse-${draft.grade}-physics`, `cbse-${draft.grade}-chemistry`, `cbse-${draft.grade}-biology`],
      pcmb: [
        `cbse-${draft.grade}-physics`,
        `cbse-${draft.grade}-chemistry`,
        `cbse-${draft.grade}-mathematics`,
        `cbse-${draft.grade}-biology`,
      ],
    };

    const core = streamSubs[draft.stream] || streamSubs.pcm;
    return Array.from(new Set([...core, ...draft.additionalSubjects]));
  }, [draft.stream, draft.grade, draft.additionalSubjects]);

  // Query chapters for all enrolled subjects
  const enrolledChaptersBySubject = useMemo(() => {
    const map: Record<string, { subjectName: string; chapters: CurriculumChapter[] }> = {};
    enrolledSubjectIds.forEach((sId) => {
      const subjectObj = availableSubjects.find((s) => s.id === sId);
      if (subjectObj) {
        map[sId] = {
          subjectName: subjectObj.name,
          chapters: getChaptersForSubject(sId),
        };
      }
    });
    return map;
  }, [enrolledSubjectIds, availableSubjects]);

  // Calculate intelligent backlog estimate in real-time
  const backlogEstimate = useMemo(() => {
    const chapterInputs: BacklogChapterInput[] = [];

    Object.entries(draft.backlogChapters).forEach(([chapterId, info]) => {
      // Find chapter meta
      let found: CurriculumChapter | undefined;
      for (const group of Object.values(enrolledChaptersBySubject)) {
        found = group.chapters.find((c) => c.id === chapterId);
        if (found) break;
      }

      chapterInputs.push({
        id: chapterId,
        title: found?.title || chapterId,
        subject: found?.subjectName || 'Science',
        estimatedHours: found?.defaultEstimatedHours || 5,
        difficulty: info.difficulty,
        status: info.status,
      });
    });

    return computeBacklogEstimates(chapterInputs, {
      dailyTargetHours: draft.dailyHours,
      targetExamDate: draft.targetExamDate,
    });
  }, [draft.backlogChapters, enrolledChaptersBySubject, draft.dailyHours, draft.targetExamDate]);

  // Navigation handlers
  const goToNextStep = () => {
    setErrorMsg('');
    if (draft.step === 1 && !draft.fullName.trim()) {
      setErrorMsg('Please enter your full name to proceed.');
      return;
    }
    setDraft((prev) => ({ ...prev, step: Math.min(6, prev.step + 1) }));
  };

  const goToPrevStep = () => {
    setErrorMsg('');
    setDraft((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  };

  const toggleBacklogChapter = (chapterId: string) => {
    setDraft((prev) => {
      const current = { ...prev.backlogChapters };
      if (current[chapterId]) {
        delete current[chapterId];
      } else {
        current[chapterId] = { difficulty: 'medium', status: 'untouched' };
      }
      return { ...prev, backlogChapters: current };
    });
  };

  const updateChapterDetails = (
    chapterId: string,
    updates: Partial<{ difficulty: 'easy' | 'medium' | 'hard'; status: 'untouched' | 'partially_completed' | 'needs_revision' }>
  ) => {
    setDraft((prev) => {
      const existing = prev.backlogChapters[chapterId] || { difficulty: 'medium', status: 'untouched' };
      return {
        ...prev,
        backlogChapters: {
          ...prev.backlogChapters,
          [chapterId]: { ...existing, ...updates },
        },
      };
    });
  };

  const toggleAdditionalSubject = (subjectId: string) => {
    setDraft((prev) => {
      const current = prev.additionalSubjects || [];
      const exists = current.includes(subjectId);
      return {
        ...prev,
        additionalSubjects: exists ? current.filter((id) => id !== subjectId) : [...current, subjectId],
      };
    });
  };

  // Submit and finalize student onboarding
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Gather all selected chapter IDs
      const selectedChapterIds = Object.keys(draft.backlogChapters);
      const fallbackChapterIds = selectedChapterIds.length > 0 ? selectedChapterIds : ['phy-units', 'phy-vectors'];

      // Extract subject names
      const subjectNames = enrolledSubjectIds
        .map((sId) => availableSubjects.find((s) => s.id === sId)?.name)
        .filter(Boolean) as string[];

      // 2. Generate Primary Study Plan
      const generatedPlan = makePlan({
        board: 'CBSE',
        subjects: subjectNames.length > 0 ? (subjectNames as any) : ['Physics', 'Chemistry', 'Mathematics'],
        chapterIds: fallbackChapterIds,
        minutesPerDay: Math.round(draft.dailyHours * 60),
        goal: 'Complete CBSE Backlog Recovery',
        priority: 'backlog recovery',
        confidence: 'mixed',
        examDate: draft.targetExamDate || '',
        planDuration: draft.planDurationDays as any,
      });

      // 3. Save locally first for instant offline readiness
      if (user?.uid) {
        savePlan(generatedPlan, user.uid);
      } else {
        savePlan(generatedPlan);
      }

      // Convert backlog items for local manager
      const backlogItemList = selectedChapterIds.map((chId) => {
        let meta: CurriculumChapter | undefined;
        for (const group of Object.values(enrolledChaptersBySubject)) {
          meta = group.chapters.find((c) => c.id === chId);
          if (meta) break;
        }
        const info = draft.backlogChapters[chId];
        return {
          id: `item-${chId}`,
          chapterId: chId,
          subject: meta?.subjectName || 'Science',
          topic: meta?.title || chId,
          estimatedHours: meta?.defaultEstimatedHours || 5,
          hoursSpent: 0,
          difficulty: info?.difficulty || 'medium',
          status: (info?.status === 'partially_completed' ? 'in_progress' : info?.status === 'needs_revision' ? 'review' : 'not_started') as any,
          confidence: 'medium' as any,
          examRelevance: (meta?.examWeightage || 'high') as any,
          prerequisites: meta?.prerequisites || [],
          createdAt: new Date().toISOString(),
        };
      });

      if (user?.uid) {
        saveBacklogItems(backlogItemList, user.uid);
      } else {
        saveBacklogItems(backlogItemList);
      }

      // 4. Save directly to Supabase if authenticated with a real Supabase UUID
      if (user?.uid && !user.isGuest) {
        try {
          await saveStudentProfileDirect(
            {
              board: 'CBSE',
              subjects: subjectNames,
              goal: 'Complete CBSE Backlog Recovery',
              priority: 'backlog recovery',
              confidence: 'mixed',
              exam_date: draft.targetExamDate,
              minutes_per_day: Math.round(draft.dailyHours * 60),
            },
            user.uid
          );

          await saveStudyPlanDirect(generatedPlan, user.uid);
          await saveAllBacklogItemsDirect(backlogItemList, user.uid);
        } catch (dbErr) {
          console.warn('[Onboarding] Non-blocking Supabase direct write warning:', dbErr);
        }
      }

      // Clear local onboarding draft
      try {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
      } catch {}

      // Update student profile in auth context
      await updateStudentProfile({
        displayName: draft.fullName,
        preferredName: draft.preferredName || draft.fullName.split(' ')[0],
        schoolName: draft.schoolName,
        grade: draft.grade,
        phone: draft.phone,
        board: 'CBSE',
        academicSession: '2026-27',
        stream: draft.stream,
        additionalSubjects: draft.additionalSubjects,
      });

      // Redirect student to Dashboard
      setLocation('/dashboard');
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setErrorMsg(err?.message || 'Something went wrong saving your study setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { number: 1, title: 'Student Info', icon: User },
    { number: 2, title: 'Class & School', icon: School },
    { number: 3, title: 'Stream', icon: Compass },
    { number: 4, title: 'Subjects', icon: Layers },
    { number: 5, title: 'Backlog Chapters', icon: BookOpen },
    { number: 6, title: 'Review & Launch', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/20 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Progress Header */}
        <div className="mb-8 border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-mono font-bold text-primary">
                OS
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                CBSE STUDENT ONBOARDING · SESSION 2026–27
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-primary">
              Step {draft.step} of 6
            </span>
          </div>

          {/* Stepper Dots */}
          <div className="mt-4 grid grid-cols-6 gap-2">
            {stepsList.map((s) => {
              const Icon = s.icon;
              const isPast = draft.step > s.number;
              const isCurrent = draft.step === s.number;
              return (
                <div key={s.number} className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-md font-mono text-xs transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'border border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {isPast ? <Check size={14} /> : <Icon size={14} />}
                  </div>
                  <span className={`mt-1.5 hidden text-[11px] sm:inline font-medium ${isCurrent ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Personal Info */}
        {draft.step === 1 && (
          <div className="border border-border bg-card p-6 shadow-2xs space-y-5 animate-page-enter">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Step 1</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Welcome to BacklogOS</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Let’s personalize your academic workspace and study targets.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block font-mono text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={draft.fullName}
                  onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                  placeholder="e.g. Arun Sharma"
                  className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-foreground">
                  Preferred / Display Name <span className="text-muted-foreground text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.preferredName}
                  onChange={(e) => setDraft({ ...draft, preferredName: e.target.value })}
                  placeholder="e.g. Arun"
                  className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-foreground">
                  Contact Mobile Number <span className="text-muted-foreground text-[10px]">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-primary font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: School & Class Info */}
        {draft.step === 2 && (
          <div className="border border-border bg-card p-6 shadow-2xs space-y-5 animate-page-enter">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Step 2</span>
              <h2 className="font-display text-2xl font-bold text-foreground">School & Academic Profile</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                BacklogOS strictly supports official CBSE Session 2026–27 curriculum.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block font-mono text-xs font-semibold text-foreground">Examination Board</label>
                <div className="mt-1.5 rounded border border-border bg-muted/30 px-3 py-2.5 text-xs font-mono font-medium text-foreground flex items-center justify-between">
                  <span>Central Board of Secondary Education (CBSE)</span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    Verified 2026–27
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-foreground">
                  Select Your Class <span className="text-destructive">*</span>
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-3">
                  {(['11', '12'] as const).map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setDraft({ ...draft, grade })}
                      className={`p-4 rounded border text-left transition-all ${
                        draft.grade === grade
                          ? 'border-primary bg-primary/5 text-primary shadow-xs'
                          : 'border-border bg-background text-foreground hover:bg-muted/30'
                      }`}
                    >
                      <div className="font-display text-lg font-bold">Class {grade}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {grade === '11' ? 'Foundation Year · 2026–27' : 'Board Exam Year · 2026–27'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-foreground">
                  School Name <span className="text-muted-foreground text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draft.schoolName}
                  onChange={(e) => setDraft({ ...draft, schoolName: e.target.value })}
                  placeholder="e.g. Delhi Public School, R.K. Puram"
                  className="mt-1.5 w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Stream Selection */}
        {draft.step === 3 && (
          <div className="border border-border bg-card p-6 shadow-2xs space-y-5 animate-page-enter">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Step 3</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Choose Your Science Stream</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Select your core academic subject combination.
              </p>
            </div>

            <div className="grid gap-3 pt-2">
              {[
                {
                  id: 'pcm' as StreamId,
                  title: 'Science (PCM)',
                  subtitle: 'Physics, Chemistry, Mathematics',
                  note: 'Ideal for Engineering, Architecture, Research, and JEE aspirants.',
                },
                {
                  id: 'pcb' as StreamId,
                  title: 'Science (PCB)',
                  subtitle: 'Physics, Chemistry, Biology',
                  note: 'Ideal for Medicine, Biotechnology, Life Sciences, and NEET aspirants.',
                },
                {
                  id: 'pcmb' as StreamId,
                  title: 'Science (PCMB)',
                  subtitle: 'Physics, Chemistry, Mathematics, Biology',
                  note: 'Complete core science combination covering both Engineering & Medical pathways.',
                },
              ].map((s) => (
                <div
                  key={s.id}
                  onClick={() => setDraft({ ...draft, stream: s.id })}
                  className={`p-4 rounded border cursor-pointer transition-all ${
                    draft.stream === s.id
                      ? 'border-primary bg-primary/5 text-foreground shadow-xs'
                      : 'border-border bg-background text-foreground hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-base font-bold">{s.title}</div>
                      <div className="text-xs font-mono text-primary font-semibold mt-0.5">{s.subtitle}</div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                        draft.stream === s.id ? 'border-primary bg-primary text-white' : 'border-border'
                      }`}
                    >
                      {draft.stream === s.id && <Check size={12} />}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Additional Subjects */}
        {draft.step === 4 && (
          <div className="border border-border bg-card p-6 shadow-2xs space-y-5 animate-page-enter">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Step 4</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Additional & Language Subjects</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Select your additional elective and language subjects for Class {draft.grade}.
              </p>
            </div>

            <div className="grid gap-3 pt-2">
              {[
                { id: `cbse-${draft.grade}-english`, name: 'English Core (301)', tag: 'Compulsory Language' },
                { id: `cbse-${draft.grade}-cs`, name: 'Computer Science with Python (083)', tag: 'Elective' },
                { id: `cbse-${draft.grade}-pe`, name: 'Physical Education (048)', tag: 'Elective' },
                { id: `cbse-${draft.grade}-hindi`, name: 'Hindi Core (302)', tag: 'Regional Language' },
                { id: `cbse-${draft.grade}-bengali`, name: 'Bengali Core (105)', tag: 'Regional Language' },
              ].map((item) => {
                const isSelected = draft.additionalSubjects.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleAdditionalSubject(item.id)}
                    className={`p-3.5 rounded border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted/30'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{item.tag}</div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary text-white' : 'border-border'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Backlog Selection */}
        {draft.step === 5 && (
          <div className="border border-border bg-card p-6 shadow-2xs space-y-6 animate-page-enter">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Step 5</span>
                <h2 className="font-display text-2xl font-bold text-foreground">Select Your Backlog Chapters</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tick every chapter you need to learn or revise. Set difficulty & current readiness.
                </p>
              </div>

              {/* Dynamic workload counter */}
              <div className="rounded border border-primary/30 bg-primary/5 p-3 text-right self-start sm:self-auto">
                <div className="text-[10px] font-mono uppercase tracking-wider text-primary">Backlog Load</div>
                <div className="text-lg font-mono font-bold text-foreground">
                  {backlogEstimate.totalBacklogHours} <span className="text-xs font-normal">hrs</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {backlogEstimate.totalChapters} chapters pending
                </div>
              </div>
            </div>

            {/* Target study hours input */}
            <div className="grid sm:grid-cols-2 gap-4 rounded border border-border bg-muted/20 p-4 font-mono text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">Daily Study Target</label>
                <select
                  value={draft.dailyHours}
                  onChange={(e) => setDraft({ ...draft, dailyHours: Number(e.target.value) })}
                  className="w-full rounded border border-border bg-background p-2 text-xs"
                >
                  <option value={1.5}>1.5 hours / day (Moderate)</option>
                  <option value={2.5}>2.5 hours / day (Standard)</option>
                  <option value={4.0}>4.0 hours / day (Accelerated)</option>
                  <option value={6.0}>6.0 hours / day (Exam Rush)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">Target Exam Date (Optional)</label>
                <input
                  type="date"
                  value={draft.targetExamDate}
                  onChange={(e) => setDraft({ ...draft, targetExamDate: e.target.value })}
                  className="w-full rounded border border-border bg-background p-2 text-xs"
                />
              </div>
            </div>

            {/* Chapter Checklist grouped by enrolled subject */}
            <div className="space-y-6 pt-2">
              {Object.entries(enrolledChaptersBySubject).map(([subjectId, group]) => (
                <div key={subjectId} className="border border-border/80 rounded-md overflow-hidden bg-background">
                  <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{group.subjectName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {group.chapters.length} total chapters
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    {group.chapters.map((ch) => {
                      const isSelected = Boolean(draft.backlogChapters[ch.id]);
                      const info = draft.backlogChapters[ch.id];

                      return (
                        <div
                          key={ch.id}
                          className={`p-3 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBacklogChapter(ch.id)}
                                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-0"
                              />
                              <div>
                                <div className="text-xs font-semibold text-foreground">
                                  Ch {ch.chapterNumber}: {ch.title}
                                </div>
                                <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                  {ch.description}
                                </div>
                              </div>
                            </label>

                            <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              ~{ch.defaultEstimatedHours || 5}h
                            </span>
                          </div>

                          {/* Extra controls if selected */}
                          {isSelected && (
                            <div className="mt-2.5 ml-6.5 flex flex-wrap items-center gap-3 font-mono text-[11px] pt-1 border-t border-border/50">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Difficulty:</span>
                                <select
                                  value={info?.difficulty || 'medium'}
                                  onChange={(e) =>
                                    updateChapterDetails(ch.id, {
                                      difficulty: e.target.value as any,
                                    })
                                  }
                                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]"
                                >
                                  <option value="easy">Easy (x0.8)</option>
                                  <option value="medium">Medium (x1.0)</option>
                                  <option value="hard">Hard (x1.3)</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Status:</span>
                                <select
                                  value={info?.status || 'untouched'}
                                  onChange={(e) =>
                                    updateChapterDetails(ch.id, {
                                      status: e.target.value as any,
                                    })
                                  }
                                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px]"
                                >
                                  <option value="untouched">Untouched (100%)</option>
                                  <option value="partially_completed">Partially Done (60%)</option>
                                  <option value="needs_revision">Needs Revision (40%)</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Review & Confirmation */}
        {draft.step === 6 && (
          <div className="border border-border bg-card p-6 shadow-2xs space-y-6 animate-page-enter">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Step 6</span>
              <h2 className="font-display text-2xl font-bold text-foreground">Review & Confirm Your Study Plan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Verify your academic setup before BacklogOS synthesizes your primary schedule.
              </p>
            </div>

            {/* Student Overview Card */}
            <div className="rounded border border-border bg-muted/20 p-4 space-y-3 font-sans text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground font-mono text-[10px] uppercase">Student Name:</span>
                  <div className="font-bold text-sm text-foreground">{draft.fullName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground font-mono text-[10px] uppercase">CBSE Academic Class:</span>
                  <div className="font-bold text-sm text-foreground">
                    Class {draft.grade} · {draft.stream.toUpperCase()}
                  </div>
                </div>
                {draft.schoolName && (
                  <div>
                    <span className="text-muted-foreground font-mono text-[10px] uppercase">School:</span>
                    <div className="font-medium text-foreground">{draft.schoolName}</div>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground font-mono text-[10px] uppercase">Academic Session:</span>
                  <div className="font-medium text-foreground">CBSE 2026–27</div>
                </div>
              </div>
            </div>

            {/* Backlog Estimator Result Card */}
            <div className="rounded border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                <span className="font-mono text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles size={14} />
                  INTELLIGENT TIME ESTIMATOR FORECAST
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    backlogEstimate.urgencyLevel === 'critical'
                      ? 'bg-destructive text-destructive-foreground'
                      : backlogEstimate.urgencyLevel === 'demanding'
                      ? 'bg-amber-500/20 text-amber-600'
                      : 'bg-emerald-500/20 text-emerald-600'
                  }`}
                >
                  {backlogEstimate.urgencyLevel} PACE
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="border border-border/80 bg-background p-3 rounded">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Backlog Workload</div>
                  <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {backlogEstimate.totalBacklogHours} <span className="text-xs font-normal">h</span>
                  </div>
                </div>

                <div className="border border-border/80 bg-background p-3 rounded">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Pending Chapters</div>
                  <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                    {backlogEstimate.totalChapters}
                  </div>
                </div>

                <div className="border border-border/80 bg-background p-3 rounded">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Daily Target</div>
                  <div className="text-xl font-bold font-mono text-primary mt-0.5">
                    {backlogEstimate.dailyHoursNeeded} <span className="text-xs font-normal">h/d</span>
                  </div>
                </div>

                <div className="border border-border/80 bg-background p-3 rounded">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Est. Finish Date</div>
                  <div className="text-sm font-bold font-mono text-emerald-600 mt-1">
                    {backlogEstimate.estimatedCompletionDate}
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Bars */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-mono font-bold text-foreground">Subject-wise Workload Breakdown:</div>
                <div className="space-y-1.5">
                  {backlogEstimate.subjectWiseBreakdown.map((item) => (
                    <div key={item.subject} className="text-xs">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
                        <span className="font-medium text-foreground">{item.subject}</span>
                        <span className="font-mono">
                          {item.hours} hrs ({item.chaptersCount} chapters)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${
                              backlogEstimate.totalBacklogHours > 0
                                ? (item.hours / backlogEstimate.totalBacklogHours) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border border-border bg-card p-4 shadow-2xs">
          {draft.step > 1 ? (
            <button
              type="button"
              onClick={goToPrevStep}
              disabled={isSubmitting}
              className="rounded border border-border px-4 py-2 text-xs font-bold font-mono hover:bg-muted flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <div />
          )}

          {draft.step < 6 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="rounded bg-primary px-5 py-2 text-xs font-bold font-mono text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-all shadow-xs"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="rounded bg-emerald-600 px-6 py-2.5 text-xs font-bold font-mono text-white hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Synthesizing Primary Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Confirm & Generate Primary Plan</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
