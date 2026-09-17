import { ArrowRight, BookOpenCheck, CalendarDays, Check, Flame, Play, RotateCcw, TimerReset } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { chapters, type PlanDay, type StudentPlan } from '@/lib/backlog-data';
import { readCompleted, readPlan, readRestDates, readStudySessions, toggleRestDate, type StudySession } from '@/lib/storage';

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStreak(sessions: StudySession[]) {
  const days = new Set(sessions.map((session) => dayKey(new Date(session.completedAt))));
  let cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function EmptyDashboard() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary"><BookOpenCheck size={28} /></div>
      <p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-primary">Your study home</p>
      <h1 className="font-display mt-3 text-4xl tracking-[-.03em] sm:text-5xl">A calmer week starts here.</h1>
      <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-muted-foreground">Build a plan first. Your dashboard will then show today’s focus, your progress, and the study time you have actually put in.</p>
      <Link href="/onboarding" className="focus-ring mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground" data-testid="link-dashboard-create-plan">Build my plan <ArrowRight size={17} /></Link>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} /></div>;
}

function FocusCard({ day }: { day: PlanDay }) {
  return (
    <section className="border-y border-border py-6 sm:py-8" data-testid="card-today-focus">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Today’s focus · Day {day.day}</p><h2 className="font-display mt-2 text-3xl">{day.chapterTitle}</h2></div>
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">{day.subject}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{chapters.find((chapter) => chapter.id === day.chapterId)?.note ?? 'Build one clear understanding before moving on.'}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {day.tasks.map((task) => <div key={task.id} className="border-l-2 border-primary/25 pl-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary">{task.kind === 'revision' ? 'Review' : task.kind}</p><p className="mt-1 text-xs font-semibold leading-5">{task.minutes} min · {task.label}</p></div>)}
      </div>
      <Link href={`/study?chapter=${day.chapterId}`} className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-start-today-study"><Play size={16} /> Open study room</Link>
    </section>
  );
}

function RestDayCard({ onUndo }: { onUndo: () => void }) {
  return <section className="border-y border-accent/50 bg-accent/10 py-6 sm:py-8" data-testid="card-rest-day"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Today’s plan</p><h2 className="font-display mt-2 text-3xl">Recovery day, on purpose.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Your next study focus has not disappeared. It moves forward when you are ready, so one difficult day does not turn into a lost week.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/study" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-rest-day-light-review"><BookOpenCheck size={16} /> Do a light review</Link><button type="button" onClick={onUndo} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-bold" data-testid="button-undo-rest-day"><RotateCcw size={15} /> Use today as planned</button></div></section>;
}

export function Dashboard() {
  const plan = readPlan();
  const [restDates, setRestDates] = useState(readRestDates);
  if (!plan) return <EmptyDashboard />;

  const completed = new Set(readCompleted());
  const sessions = readStudySessions();
  const tasks = plan.days.flatMap((day) => day.tasks);
  const completedCount = tasks.filter((task) => completed.has(task.id)).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const created = new Date(plan.createdAt);
  const today = new Date();
  const todayDate = dayKey(today);
  const elapsedDays = Number.isFinite(created.getTime()) ? Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000)) : 0;
  const pastRestDays = restDates.filter((date) => date < todayDate).length;
  const currentDay = plan.days[Math.min(6, Math.max(0, elapsedDays - pastRestDays))] ?? plan.days[0];
  const todayIsRest = restDates.includes(todayDate);
  const weekAgo = Date.now() - 7 * 86400000;
  const weeklyMinutes = sessions.filter((session) => new Date(session.completedAt).getTime() >= weekAgo).reduce((sum, session) => sum + session.minutes, 0);
  const streak = getStreak(sessions);
  const recentSessions = sessions.slice(0, 4);
  const examDate = plan.examDate ? new Date(`${plan.examDate}T12:00:00`) : null;
  const daysToExam = examDate && !Number.isNaN(examDate.getTime()) ? Math.ceil((examDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;

  return (
    <div className="human-layout mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your week, in view</p><h1 className="font-display mt-3 text-4xl leading-tight tracking-[-.03em] sm:text-6xl">What can you finish today?</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{plan.board} · {plan.goal} · {plan.minutesPerDay} minutes/day · {plan.confidence === 'rusty' ? 'gentle restart' : plan.confidence === 'solid' ? 'targeted practice' : 'balanced pace'}</p></div>
        <Link href="/onboarding" className="focus-ring inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-muted sm:self-auto" data-testid="link-dashboard-edit-plan"><RotateCcw size={16} /> Adjust plan</Link>
      </div>

      <div className="mt-8 grid border-y border-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Route complete', value: `${progress}%`, note: `${completedCount} / ${tasks.length} steps`, icon: Check },
          { label: 'Current streak', value: `${streak} day${streak === 1 ? '' : 's'}`, note: streak ? 'Keep the chain kind' : 'Log a study block today', icon: Flame },
          { label: 'Study this week', value: `${weeklyMinutes} min`, note: `${sessions.length} logged block${sessions.length === 1 ? '' : 's'} total`, icon: TimerReset },
          { label: daysToExam !== null ? 'Days to target' : 'Daily time', value: daysToExam !== null ? `${Math.max(0, daysToExam)}` : `${plan.minutesPerDay} min`, note: daysToExam !== null ? (daysToExam >= 0 ? 'Use the runway, not panic' : 'Target date has passed') : 'A realistic daily promise', icon: CalendarDays },
        ].map(({ label, value, note, icon: Icon }, index) => <div key={label} className={`border-b border-border p-4 last:border-b-0 sm:border-b-0 lg:border-l first:lg:border-l-0 ${index === 0 ? 'sm:border-r' : index === 1 ? 'sm:border-r' : ''}`} data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</p><Icon size={17} className="text-primary" /></div><p className="mt-4 font-display text-3xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>)}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {todayIsRest ? <RestDayCard onUndo={() => setRestDates(toggleRestDate(todayDate))} /> : <><FocusCard day={currentDay} /><button type="button" onClick={() => setRestDates(toggleRestDate(todayDate))} className="focus-ring inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground" data-testid="button-take-rest-day"><RotateCcw size={15} /> Need a recovery day? Move today’s focus to tomorrow.</button></>}
          <section className="border-t-2 border-foreground/15 pt-5" data-testid="card-week-overview">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">This week</p><h2 className="font-display mt-2 text-2xl">Seven days, in order.</h2></div><Link href="/roadmap" className="focus-ring text-sm font-bold text-primary hover:underline" data-testid="link-dashboard-roadmap">View full roadmap <ArrowRight size={14} className="ml-1 inline" /></Link></div>
            <div className="mt-6 space-y-3">{plan.days.map((day) => { const dayDone = day.tasks.filter((task) => completed.has(task.id)).length; const value = Math.round((dayDone / day.tasks.length) * 100); return <div key={day.day} className="grid grid-cols-[52px_minmax(0,1fr)_44px] items-center gap-3"><span className="text-xs font-bold text-muted-foreground">Day {day.day}</span><div><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-semibold">{day.chapterTitle}</span><span className="shrink-0 text-muted-foreground">{dayDone}/{day.tasks.length}</span></div><ProgressBar value={value} /></div><span className="text-right text-xs font-bold text-primary">{value}%</span></div>; })}</div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="border-t-2 border-foreground/15 pt-5" data-testid="card-quick-actions"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Go straight to</p><div className="mt-4 grid gap-2"><Link href={`/study?chapter=${currentDay.chapterId}`} className="focus-ring flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="link-quick-study"><Play size={16} /> Start a focus block</Link><Link href="/study" className="focus-ring flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-background" data-testid="link-quick-revise"><BookOpenCheck size={16} className="text-primary" /> Revise a chapter</Link><Link href="/roadmap" className="focus-ring flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-background" data-testid="link-quick-check"><Check size={16} className="text-primary" /> Check off progress</Link></div></section>
          <section className="border-t-2 border-foreground/15 pt-5" data-testid="card-recent-sessions"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Logged this week</p><TimerReset size={16} className="text-primary" /></div>{recentSessions.length ? <div className="mt-4 space-y-3">{recentSessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold">{chapters.find((chapter) => chapter.id === session.chapterId)?.title ?? 'Study block'}</p><p className="text-xs text-muted-foreground">{new Date(session.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {session.mode}</p></div><span className="shrink-0 text-xs font-bold text-primary">{session.minutes}m</span></div>)}</div> : <p className="mt-4 text-sm leading-6 text-muted-foreground">No study blocks logged yet. Your first focused session will appear here.</p>}</section>
        </aside>
      </div>
    </div>
  );
}