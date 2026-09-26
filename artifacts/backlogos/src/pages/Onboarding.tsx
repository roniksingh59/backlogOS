import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Clock3, Flame, Info, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { chapters as legacyChapters, makePlan, type Confidence, type Subject, type StudentPlanInput } from '@/lib/backlog-data';
import { readPlan, saveCompleted, savePlan } from '@/lib/storage';
import { CustomTimePicker } from '@/components/CustomTimePicker';
import { PlanGeneratingScreen } from '@/components/PlanGeneratingScreen';
import { getChapterSubtopics } from '@/lib/ncert-subtopics';
import studentRocketImg from '@/assets/images/student_on_rocket.jpg';
import {
  type GradeLevel,
  type StreamId,
  type CurriculumSubject,
  type CurriculumChapter,
} from '@/lib/curriculum/types';
import {
  getSubjectRecommendations,
  getAvailableSubjectsForGrade,
  getChaptersForSubject,
  toBacklogOSChapter,
} from '@/lib/curriculum/registry';
import {
  readEducationProfile,
  saveEducationProfile,
  addCustomSubject,
} from '@/lib/curriculum/user-profile-storage';

type Draft = StudentPlanInput & {
  grade?: GradeLevel;
  stream?: StreamId;
};

const DRAFT_KEY = 'backlogos-draft-v1';
const boards = ['CBSE (Session 2026–27)', 'ISC', 'State Board', 'Other'];
const goals = ['School exams', 'JEE Main', 'NEET', 'Board Exams', 'General Improvement'];
const priorities = [
  { value: 'backlog recovery', label: 'Backlog recovery', note: 'Clear older chapters first' },
  { value: 'current syllabus', label: 'Current syllabus', note: 'Keep up while catching up' },
];
const confidenceOptions: { value: Confidence; label: string; note: string }[] = [
  { value: 'rusty', label: 'Rusty', note: 'I need a slower restart' },
  { value: 'mixed', label: 'Mixed', note: 'Some chapters are familiar' },
  { value: 'solid', label: 'Mostly solid', note: 'I need targeted practice' },
];

const defaultDraft: Draft = {
  board: 'CBSE (Session 2026–27)',
  grade: '11',
  stream: 'pcm',
  subjects: ['Physics', 'Chemistry', 'Mathematics'],
  chapterIds: ['phy-units', 'phy-vectors', 'chem-basic', 'chem-structure', 'math-sets'],
  minutesPerDay: 60,
  goal: 'School exams',
  priority: 'backlog recovery',
  confidence: 'mixed',
  examDate: '',
};

function getDraft(): Draft {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) return { ...defaultDraft, ...(JSON.parse(saved) as Partial<Draft>) };
    const plan = readPlan();
    const profile = readEducationProfile();
    return plan
      ? {
          board: plan.board || 'CBSE (Session 2026–27)',
          grade: profile.grade || '11',
          stream: profile.stream || 'pcm',
          subjects: plan.subjects,
          chapterIds: plan.chapterIds,
          minutesPerDay: plan.minutesPerDay,
          goal: plan.goal,
          priority: plan.priority,
          confidence: plan.confidence ?? 'mixed',
          examDate: plan.examDate ?? '',
        }
      : defaultDraft;
  } catch {
    return defaultDraft;
  }
}

export function Onboarding() {
  const [, setLocation] = useLocation();
  const [draft, setDraft] = useState<Draft>(getDraft);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inspectedChapterId, setInspectedChapterId] = useState<string | null>(null);

  // Custom subject inline modal
  const [isAddingCustomSubject, setIsAddingCustomSubject] = useState(false);
  const [customSubName, setCustomSubName] = useState('');

  const grade: GradeLevel = draft.grade || '11';
  const stream: StreamId = draft.stream || 'pcm';

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  // Query official subjects from curriculum registry
  const { recommended, optional } = useMemo(
    () => getSubjectRecommendations(grade, stream),
    [grade, stream]
  );

  const allAvailableSubjects = useMemo(
    () => getAvailableSubjectsForGrade(grade),
    [grade]
  );

  // Dynamically load chapters for chosen grade & subjects
  const chaptersForDraftSubjects = useMemo(() => {
    const list: { subject: Subject; items: { id: string; title: string; note: string; tag: string; order: number }[] }[] = [];

    draft.subjects.forEach((subName) => {
      // Find matching curriculum subject
      const currSub = allAvailableSubjects.find(
        (s) => s.name.toLowerCase() === subName.toLowerCase()
      );

      if (currSub) {
        const chs = getChaptersForSubject(currSub.id);
        const mapped = chs.map((c) => toBacklogOSChapter(c));
        list.push({
          subject: subName,
          items: showAll ? mapped : mapped.slice(0, 7),
        });
      } else {
        // Fallback to legacy chapters
        const legacy = legacyChapters.filter((c) => c.subject === subName);
        if (legacy.length > 0) {
          list.push({
            subject: subName,
            items: showAll ? legacy : legacy.slice(0, 7),
          });
        }
      }
    });

    return list;
  }, [draft.subjects, allAvailableSubjects, showAll]);

  const toggleSubject = (subjectName: Subject) => {
    setDraft((current) => {
      const exists = current.subjects.includes(subjectName);
      const nextSubjects = exists
        ? current.subjects.filter((s) => s !== subjectName)
        : [...current.subjects, subjectName];
      return { ...current, subjects: nextSubjects };
    });
  };

  const handleGradeChange = (newGrade: GradeLevel) => {
    const newStream = newGrade === '9' || newGrade === '10' ? 'none' : stream === 'none' ? 'pcm' : stream;
    const { recommended } = getSubjectRecommendations(newGrade, newStream);
    const initialSubs = recommended.map((r) => r.name);
    setDraft((current) => ({
      ...current,
      grade: newGrade,
      stream: newStream,
      subjects: initialSubs.length > 0 ? initialSubs : ['Mathematics', 'Science'],
      chapterIds: [],
    }));
  };

  const handleStreamChange = (newStream: StreamId) => {
    const { recommended } = getSubjectRecommendations(grade, newStream);
    const initialSubs = recommended.map((r) => r.name);
    setDraft((current) => ({
      ...current,
      stream: newStream,
      subjects: initialSubs,
      chapterIds: [],
    }));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubName.trim()) return;
    const created = addCustomSubject({
      name: customSubName.trim(),
      class: grade,
      initialChapters: [{ title: `${customSubName.trim()} Unit 1`, estimatedHours: 6 }],
    });
    toggleSubject(created.name);
    setCustomSubName('');
    setIsAddingCustomSubject(false);
  };

  const toggleChapter = (id: string) => {
    setDraft((current) => ({
      ...current,
      chapterIds: current.chapterIds.includes(id)
        ? current.chapterIds.filter((cid) => cid !== id)
        : [...current.chapterIds, id],
    }));
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.board || !draft.goal || !draft.priority || !draft.subjects.length || !draft.chapterIds.length) {
      setError('Choose a board, class, at least one subject, and at least one chapter to continue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Save education profile
    const profile = readEducationProfile();
    const enrolledIds = allAvailableSubjects
      .filter((s) => draft.subjects.includes(s.name))
      .map((s) => s.id);

    saveEducationProfile({
      ...profile,
      curriculum: 'CBSE',
      academicSession: '2026-27',
      grade: draft.grade || '11',
      stream: draft.stream || 'pcm',
      enrolledSubjectIds: enrolledIds.length > 0 ? enrolledIds : profile.enrolledSubjectIds,
    });

    const plan = makePlan(draft);
    saveCompleted([]);
    savePlan(plan);
    setIsGenerating(true);
  }

  const handleComplete = () => {
    setIsGenerating(false);
    setLocation('/roadmap');
  };

  return (
    <div className="human-layout mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 font-sans">
      <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground"
          data-testid="link-back-home"
        >
          <ArrowLeft size={14} /> Back home
        </Link>
        <span className="text-left text-xs font-mono uppercase tracking-[.16em] text-muted-foreground sm:text-right">
          CBSE Curriculum Setup · Session 2026–27
        </span>
      </div>

      <div className="max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary block">
          CURRICULUM SETUP & CALIBRATION
        </span>
        <h1 className="font-display mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl text-foreground">
          Calibrate your academic backlog recovery plan.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Select your class, stream, and official CBSE subjects. BacklogOS maps the prescribed 2026–27 syllabus, detects prerequisite blockers, and schedules executable focus blocks.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded border border-destructive/30 bg-destructive/5 p-4 text-xs font-mono text-destructive"
          data-testid="status-onboarding-error"
        >
          <Info size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="mt-8 space-y-8">
        {/* STEP 1 & 2: Curriculum, Class & Stream */}
        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary block">
                STEP 1 & 2
              </span>
              <h2 className="font-display text-lg font-bold text-foreground">
                Class, Board & Stream Selection
              </h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              CBSE 2026–27
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 text-xs font-mono">
            {/* Class Level */}
            <div>
              <label className="block text-muted-foreground uppercase text-[10px] mb-1.5 font-bold">
                Class / Grade Level <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1 border border-border p-1 bg-background">
                {(['9', '10', '11', '12'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGradeChange(g)}
                    className={`py-2 rounded text-center transition ${
                      grade === g
                        ? 'bg-foreground text-background font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Class {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Board */}
            <div>
              <label className="block text-muted-foreground uppercase text-[10px] mb-1.5 font-bold">
                Curriculum Board <span className="text-destructive">*</span>
              </label>
              <select
                value={draft.board}
                onChange={(e) => update('board', e.target.value)}
                className="w-full rounded border border-border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-hidden"
                data-testid="select-board"
              >
                {boards.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Stream Selector (Class 11 & 12 only) */}
            {(grade === '11' || grade === '12') && (
              <div className="sm:col-span-2">
                <label className="block text-muted-foreground uppercase text-[10px] mb-1.5 font-bold">
                  Academic Stream (Determines Recommended Subjects) <span className="text-destructive">*</span>
                </label>
                <select
                  value={stream}
                  onChange={(e) => handleStreamChange(e.target.value as StreamId)}
                  className="w-full rounded border border-border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-hidden"
                >
                  <optgroup label="Science Streams">
                    <option value="pcm">Science: PCM (Physics, Chemistry, Maths, English Core)</option>
                    <option value="pcb">Science: PCB (Physics, Chemistry, Biology, English Core)</option>
                    <option value="pcmb">Science: PCMB (Physics, Chemistry, Maths, Biology, English Core)</option>
                    <option value="science_cs">Science + Computer Science (Physics, Chemistry, Maths, CS)</option>
                  </optgroup>
                  <optgroup label="Commerce Streams">
                    <option value="commerce_math">Commerce with Mathematics (Accountancy, BST, Eco, Maths)</option>
                    <option value="commerce_no_math">Commerce without Mathematics (Accountancy, BST, Eco)</option>
                  </optgroup>
                  <optgroup label="Humanities Streams">
                    <option value="humanities">Humanities (History, Political Science, Economics, English)</option>
                    <option value="humanities_math">Humanities with Mathematics (History, Pol Sci, Eco, Maths)</option>
                  </optgroup>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* STEP 3 & 4: Subject Selection */}
        <section className="border border-border bg-card p-5 sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary block">
                STEP 3 & 4
              </span>
              <h2 className="font-display text-lg font-bold text-foreground">
                Select Your Subjects (Class {grade})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingCustomSubject(true)}
              className="text-xs font-mono text-foreground font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add Custom Subject
            </button>
          </div>

          {/* Recommended Subjects */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
              Recommended for your stream:
            </span>
            <div className="flex flex-wrap gap-2">
              {recommended.map((sub) => {
                const isSelected = draft.subjects.includes(sub.name);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => toggleSubject(sub.name)}
                    className={`rounded border px-3 py-2 text-xs font-mono transition flex items-center gap-2 ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background font-bold'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                    <span>{sub.name}</span>
                    <span className="text-[10px] opacity-75">({sub.code})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional / Elective Subjects */}
          {optional.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Optional & Elective subjects:
              </span>
              <div className="flex flex-wrap gap-2">
                {optional.map((sub) => {
                  const isSelected = draft.subjects.includes(sub.name);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSubject(sub.name)}
                      className={`rounded border px-3 py-2 text-xs font-mono transition flex items-center gap-2 ${
                        isSelected
                          ? 'border-foreground bg-foreground text-background font-bold'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                      <span>{sub.name}</span>
                      <span className="text-[10px] opacity-75">({sub.code})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inline Add Custom Subject Drawer */}
          {isAddingCustomSubject && (
            <div className="border border-border bg-muted/20 p-4 font-mono text-xs space-y-3">
              <span className="font-bold text-foreground block">
                + Add Custom Subject (State Board / International / Elective)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Legal Studies, Fine Arts, Sanskrit"
                  value={customSubName}
                  onChange={(e) => setCustomSubName(e.target.value)}
                  className="flex-1 rounded border border-border bg-background p-2 text-xs font-sans text-foreground focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="rounded bg-foreground text-background px-4 py-2 font-bold hover:bg-foreground/90 transition"
                >
                  Add Subject
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomSubject(false)}
                  className="rounded border border-border px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* STEP 5: Official Chapters Backlog Selection */}
        <section className="border border-border bg-card p-5 sm:p-7 space-y-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary block">
              STEP 5
            </span>
            <h2 className="font-display text-lg font-bold text-foreground">
              Select Chapters for Your Backlog
            </h2>
            <p className="mt-1 text-xs text-muted-foreground font-sans">
              Choose the chapters you are behind on. BacklogOS structures prerequisite foundations first.
            </p>
          </div>

          {!draft.subjects.length ? (
            <div className="border border-dashed border-border p-6 text-center text-xs font-mono text-muted-foreground">
              Select at least one subject above to view official CBSE chapters.
            </div>
          ) : (
            <div className="space-y-6">
              {chaptersForDraftSubjects.map(({ subject, items }) => (
                <div key={subject} className="space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-xs border-b border-border pb-1">
                    <span className="font-bold text-foreground">{subject}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {items.length} chapters available
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((chapter) => {
                      const isSelected = draft.chapterIds.includes(chapter.id);
                      return (
                        <div
                          key={chapter.id}
                          onClick={() => toggleChapter(chapter.id)}
                          className={`p-3 rounded border cursor-pointer transition flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'border-foreground bg-foreground/5 ring-1 ring-foreground'
                              : 'border-border bg-background hover:border-foreground/40'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[10px] text-muted-foreground block">
                              Ch {chapter.order} · {chapter.tag}
                            </span>
                            <span className="font-bold text-foreground text-xs block truncate mt-0.5">
                              {chapter.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground block line-clamp-1 mt-0.5">
                              {chapter.note}
                            </span>
                          </div>
                          <span
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                              isSelected
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border'
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{draft.chapterIds.length}</strong> chapter(s) marked for backlog
            </span>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-muted-foreground hover:text-foreground underline"
            >
              {showAll ? 'Show fewer chapters' : 'Show full curriculum'}
            </button>
          </div>
        </section>

        {/* Study Parameters: Time, Goal, Confidence, Exam Date */}
        <section className="border border-border bg-card p-5 sm:p-7 space-y-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary block">
              FINAL STEP
            </span>
            <h2 className="font-display text-lg font-bold text-foreground">
              Daily Target Pace & Runway
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs font-mono">
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase text-muted-foreground mb-2 font-bold">
                Daily Study Time Commitment <span className="text-destructive">*</span>
              </label>
              <CustomTimePicker
                value={draft.minutesPerDay}
                onChange={(minutes) => update('minutesPerDay', minutes)}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1.5 font-bold">
                Primary Goal <span className="text-destructive">*</span>
              </label>
              <select
                value={draft.goal}
                onChange={(e) => update('goal', e.target.value)}
                className="w-full rounded border border-border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-hidden"
              >
                {goals.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-muted-foreground mb-1.5 font-bold">
                Target Exam Date (Optional)
              </label>
              <input
                type="date"
                value={draft.examDate}
                onChange={(e) => update('examDate', e.target.value)}
                className="w-full rounded border border-border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-hidden"
              />
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-mono text-xs">
          <p className="text-muted-foreground">
            Saves to your browser & synchronizes with your personal BacklogOS dashboard.
          </p>
          <button
            type="submit"
            className="rounded bg-foreground text-background px-6 py-3 font-bold hover:bg-foreground/90 transition shadow-xs flex items-center justify-center gap-2"
            data-testid="button-generate-plan"
          >
            <span>GENERATE RECOVERY PLAN</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {isGenerating && (
        <PlanGeneratingScreen
          minutesPerDay={draft.minutesPerDay}
          subjectCount={draft.subjects.length}
          chapterCount={draft.chapterIds.length}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
