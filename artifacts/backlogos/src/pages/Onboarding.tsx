import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, Clock3, Flame, Info, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { chapters, makePlan, type Confidence, type Subject, type StudentPlanInput } from '@/lib/backlog-data';
import { readPlan, saveCompleted, savePlan } from '@/lib/storage';
import { CustomTimePicker } from '@/components/CustomTimePicker';
import { PlanGeneratingScreen } from '@/components/PlanGeneratingScreen';
import { getChapterSubtopics } from '@/lib/ncert-subtopics';
import studentRocketImg from '@/assets/images/student_on_rocket.jpg';

type Draft = StudentPlanInput;
const DRAFT_KEY = 'backlogos-draft-v1';
const boards = ['CBSE', 'ISC', 'State Board', 'Other'];
const goals = ['School exams', 'JEE Main', 'Boards', 'General improvement'];
const priorities = [
  { value: 'backlog recovery', label: 'Backlog recovery', note: 'Clear older chapters first' },
  { value: 'current syllabus', label: 'Current syllabus', note: 'Keep up while catching up' },
];
const confidenceOptions: { value: Confidence; label: string; note: string }[] = [
  { value: 'rusty', label: 'Rusty', note: 'I need a slower restart' },
  { value: 'mixed', label: 'Mixed', note: 'Some chapters are familiar' },
  { value: 'solid', label: 'Mostly solid', note: 'I need targeted practice' },
];
const subjects: Subject[] = ['Physics', 'Chemistry', 'Mathematics'];

const defaultDraft: Draft = {
  board: '',
  subjects: ['Physics'],
  chapterIds: [],
  minutesPerDay: 60,
  goal: '',
  priority: 'backlog recovery',
  confidence: 'mixed',
  examDate: '',
};

function getDraft(): Draft {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) return { ...defaultDraft, ...(JSON.parse(saved) as Partial<Draft>) };
    const plan = readPlan();
      return plan ? { board: plan.board, subjects: plan.subjects, chapterIds: plan.chapterIds, minutesPerDay: plan.minutesPerDay, goal: plan.goal, priority: plan.priority, confidence: plan.confidence ?? 'mixed', examDate: plan.examDate ?? '' } : defaultDraft;
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

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const visibleChapters = useMemo(() => chapters.filter((chapter) => draft.subjects.includes(chapter.subject) && (showAll || chapter.order <= 5)), [draft.subjects, showAll]);
  const chaptersBySubject = useMemo(() => subjects.map((subject) => ({ subject, items: visibleChapters.filter((chapter) => chapter.subject === subject) })).filter((group) => group.items.length), [visibleChapters]);

  const totalSelectedSubtopics = useMemo(() => {
    return draft.chapterIds.reduce((total, cid) => total + getChapterSubtopics(cid).length, 0);
  }, [draft.chapterIds]);

  const toggleSubject = (subject: Subject) => {
    setDraft((current) => {
      const nextSubjects = current.subjects.includes(subject) ? current.subjects.filter((item) => item !== subject) : [...current.subjects, subject];
      const allowed = new Set(chapters.filter((chapter) => nextSubjects.includes(chapter.subject)).map((chapter) => chapter.id));
      return { ...current, subjects: nextSubjects, chapterIds: current.chapterIds.filter((id) => allowed.has(id)) };
    });
  };

  const toggleChapter = (id: string) => {
    setDraft((current) => ({ ...current, chapterIds: current.chapterIds.includes(id) ? current.chapterIds.filter((chapterId) => chapterId !== id) : [...current.chapterIds, id] }));
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.board || !draft.goal || !draft.priority || !draft.subjects.length || !draft.chapterIds.length) {
      setError('Choose a board, goal, at least one subject, and at least one chapter to continue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
    <div className="human-layout mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="mb-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link href="/" className="focus-ring inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-home"><ArrowLeft size={16} /> Back home</Link>
        <span className="text-left text-xs font-bold uppercase tracking-[.16em] text-muted-foreground sm:text-right">Step 1 of 1 · Your starting point</span>
      </div>
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Make it personal enough to be useful</p>
        <h1 className="font-display mt-3 text-4xl leading-tight tracking-[-.03em] sm:text-6xl">Let’s turn the pile into a week.</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">There is no perfect input here. Give us the honest version of your week and we’ll give you a clear place to begin.</p>
      </div>

      {/* Student Encouragement Banner with Mascot */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-5 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-accent/10 p-4 sm:p-5 shadow-sm">
        <div className="relative h-20 w-20 sm:h-22 sm:w-22 shrink-0 rounded-xl overflow-hidden border border-primary/40 shadow-md bg-slate-950">
          <img
            src={studentRocketImg}
            alt="Nerdy student on rocket"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-primary">
            <span>🎒 PCM Aspirant Zone</span>
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
            Zero Judgement. 100% Calibrated Plan.
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Whether you have 2 chapters pending or 12, BacklogOS calculates realistic hours, prioritizes prerequisites (Vectors before Kinematics & Laws of Motion), and breaks everything into 40% learning, 40% PYQs, and 20% recall.
          </p>
        </div>
      </div>
      {error && <div role="alert" className="mt-8 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive" data-testid="status-onboarding-error"><Info size={18} className="mt-0.5 shrink-0" />{error}</div>}
      <form onSubmit={submit} className="mt-10 space-y-10">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">01 · Context</p><h2 className="mt-2 font-display text-2xl">What are you working toward?</h2></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">Class 11 PCM</span></div>
           <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <label className="text-sm font-semibold">Class<input value="Class 11" readOnly className="mt-2 w-full cursor-not-allowed rounded-xl border border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground" data-testid="input-class" /></label>
            <label className="text-sm font-semibold">Board<span className="text-destructive"> *</span><select value={draft.board} onChange={(event) => update('board', event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-normal" data-testid="select-board"><option value="">Select your board</option>{boards.map((board) => <option key={board} value={board}>{board}</option>)}</select></label>
            <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold">Subjects<span className="text-destructive"> *</span></legend><div className="mt-3 flex flex-wrap gap-2">{subjects.map((subject) => <button type="button" key={subject} onClick={() => toggleSubject(subject)} className={`focus-ring rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${draft.subjects.includes(subject) ? 'border-primary bg-secondary text-primary' : 'border-input text-muted-foreground hover:border-primary/50'}`} aria-pressed={draft.subjects.includes(subject)} data-testid={`button-subject-${subject.toLowerCase()}`}>{draft.subjects.includes(subject) && <Check size={15} className="mr-1.5 inline" />}{subject}</button>)}</div></fieldset>
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold block mb-2">
                Available study time each day<span className="text-destructive"> *</span>
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  Every student has a different schedule. Pick a preset or customize your exact hours and minutes.
                </span>
              </label>
              <CustomTimePicker
                value={draft.minutesPerDay}
                onChange={(minutes) => update('minutesPerDay', minutes)}
              />
            </div>
            <label className="text-sm font-semibold">Main goal<span className="text-destructive"> *</span><select value={draft.goal} onChange={(event) => update('goal', event.target.value)} className="focus-ring mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-normal" data-testid="select-goal"><option value="">Choose a goal</option>{goals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}</select></label>
             <label className="text-sm font-semibold">Exam or target date <span className="font-normal text-muted-foreground">(optional)</span><span className="relative mt-2 flex items-center"><CalendarDays size={17} className="pointer-events-none absolute left-4 text-muted-foreground" /><input type="date" value={draft.examDate} onChange={(event) => update('examDate', event.target.value)} className="focus-ring w-full rounded-xl border border-input bg-background px-11 py-3 text-sm font-normal" data-testid="input-exam-date" /></span></label>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">04 · The starting point</p><h2 className="mt-2 font-display text-2xl">How familiar does this feel?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">This changes the first action in each study block. It does not judge your ability.</p></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">{confidenceOptions.map((item) => <button type="button" key={item.value} onClick={() => update('confidence', item.value)} className={`focus-ring rounded-xl border p-4 text-left ${draft.confidence === item.value ? 'border-primary bg-secondary/70' : 'border-border hover:border-primary/40'}`} aria-pressed={draft.confidence === item.value} data-testid={`button-confidence-${item.value}`}><span className="flex items-center justify-between text-sm font-bold">{item.label}<span className={`grid h-5 w-5 place-items-center rounded-full border ${draft.confidence === item.value ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{draft.confidence === item.value && <Check size={12} />}</span></span><span className="mt-1 block text-xs text-muted-foreground">{item.note}</span></button>)}</div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">02 · The chapters</p><h2 className="mt-2 font-display text-2xl">What needs your attention?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Pick the chapters you want to move through this week. We’ll put prerequisites earlier.</p></div>
            {!draft.subjects.length ? (
              <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Choose a subject above to see chapters.
              </div>
            ) : (
              <div className="mt-7 space-y-7">
                {chaptersBySubject.map(({ subject, items }) => (
                  <div key={subject}>
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <h3 className="text-sm font-bold">{subject}</h3>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {items.reduce((acc, c) => acc + getChapterSubtopics(c.id).length, 0)} NCERT topics mapped
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((chapter) => {
                        const subtopics = getChapterSubtopics(chapter.id);
                        const isSelected = draft.chapterIds.includes(chapter.id);
                        const isInspecting = inspectedChapterId === chapter.id;

                        return (
                          <div
                            key={chapter.id}
                            className={`rounded-xl border transition-all ${
                              isSelected ? 'border-primary bg-secondary/70 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/40'
                            }`}
                          >
                            <div
                              onClick={() => toggleChapter(chapter.id)}
                              className="flex min-w-0 cursor-pointer items-start gap-3 p-4"
                              data-testid={`button-chapter-${chapter.id}`}
                            >
                              <span
                                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                                }`}
                              >
                                {isSelected && <Check size={13} strokeWidth={3} />}
                              </span>
                              <div className="min-w-0 flex-1 break-words">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="block text-sm font-bold text-foreground">{chapter.title}</span>
                                  <span className="hidden sm:inline-block rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                                    {subtopics.length} topics
                                  </span>
                                </div>
                                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{chapter.note}</span>

                                <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-border/50">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{chapter.tag}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectedChapterId(isInspecting ? null : chapter.id);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-primary transition"
                                  >
                                    <BookOpen size={11} />
                                    <span>{isInspecting ? 'Hide topics' : `${subtopics.length} NCERT topics`}</span>
                                    <ChevronDown size={11} className={`transition-transform ${isInspecting ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Collapsible NCERT subtopics list */}
                            {isInspecting && (
                              <div className="border-t border-border/80 bg-muted/40 p-3 text-xs space-y-1.5 animate-in fade-in-50 duration-150 rounded-b-xl">
                                <div className="flex items-center justify-between pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  <span>Official NCERT Breakdown</span>
                                  <span>{subtopics.filter((s) => s.highYield).length} High-Yield</span>
                                </div>
                                <div className="space-y-1">
                                  {subtopics.map((st) => (
                                    <div
                                      key={st.id}
                                      className="flex items-center justify-between gap-2 rounded-lg bg-card/90 px-2.5 py-1.5 border border-border/50 text-[11px]"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-mono text-[10px] text-muted-foreground font-semibold shrink-0">{st.code}</span>
                                        <span className="truncate font-medium text-foreground">{st.title}</span>
                                      </div>
                                      {st.highYield && (
                                        <span className="inline-flex items-center gap-0.5 shrink-0 rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-bold text-amber-500">
                                          <Flame size={9} />
                                          <span>High-Yield</span>
                                        </span>
                                      )}
                                    </div>
                                  ))}
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
            )}
            {draft.subjects.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                className="focus-ring mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                data-testid="button-toggle-chapters"
              >
                {showAll ? 'Show fewer chapters' : 'Show all sample chapters'}{' '}
                <ChevronDown size={16} className={showAll ? 'rotate-180' : ''} />
              </button>
            )}
            <p className="mt-5 text-xs text-muted-foreground" data-testid="text-selected-chapters">
              <strong className="text-foreground font-semibold">{draft.chapterIds.length} chapter{draft.chapterIds.length === 1 ? '' : 's'}</strong> selected · <strong className="text-primary font-semibold">{totalSelectedSubtopics} NCERT subtopics</strong> mapped for backlog recovery
            </p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">03 · The balance</p><h2 className="mt-2 font-display text-2xl">What should stay in front?</h2></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{priorities.map((item) => <button type="button" key={item.value} onClick={() => update('priority', item.value)} className={`focus-ring rounded-xl border p-4 text-left ${draft.priority === item.value ? 'border-primary bg-secondary/70' : 'border-border hover:border-primary/40'}`} aria-pressed={draft.priority === item.value} data-testid={`button-priority-${item.value.replace(' ', '-')}`}><span className="flex items-center justify-between text-sm font-bold">{item.label}<span className={`grid h-5 w-5 place-items-center rounded-full border ${draft.priority === item.value ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{draft.priority === item.value && <Check size={12} />}</span></span><span className="mt-1 block text-xs text-muted-foreground">{item.note}</span></button>)}</div>
        </section>
         <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-muted-foreground">Your selections stay in this browser. BacklogOS is a planning prototype, not professional academic advice.</p><button type="submit" className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_6px_0_hsl(171_38%_24%)] transition-transform hover:-translate-y-0.5 active:translate-y-0" data-testid="button-generate-plan">Make my 7-day plan <ArrowRight size={17} /></button></div>
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