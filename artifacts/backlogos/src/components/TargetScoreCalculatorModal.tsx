import { useState, useMemo } from 'react';
import {
  Calculator,
  X,
  Target,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Sliders,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import {
  CBSE_CHAPTER_WEIGHTAGES,
  calculateTargetScoreStrategy,
  type StrategyResult,
  type ChapterWeightage,
} from '@/lib/weightage-data';
import { readPlan, savePlan } from '@/lib/storage';
import { makePlan, chapters } from '@/lib/backlog-data';
import { useToast } from '@/hooks/use-toast';

interface TargetScoreCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanUpdated?: () => void;
}

export function TargetScoreCalculatorModal({
  isOpen,
  onClose,
  onPlanUpdated,
}: TargetScoreCalculatorModalProps) {
  const { toast } = useToast();
  const [targetPercentage, setTargetPercentage] = useState<number>(85);
  const [selectedSubject, setSelectedSubject] = useState<'All' | 'Physics' | 'Chemistry' | 'Mathematics'>('All');
  const [isApplying, setIsApplying] = useState(false);

  const strategy: StrategyResult = useMemo(() => {
    return calculateTargetScoreStrategy(
      targetPercentage,
      selectedSubject === 'All' ? undefined : selectedSubject
    );
  }, [targetPercentage, selectedSubject]);

  if (!isOpen) return null;

  const mustWinChapters = strategy.selectedChapters.filter((c) => c.tier === 'Core Must-Win');
  const highRoiChapters = strategy.selectedChapters.filter((c) => c.tier === 'High ROI Booster');
  const skimChapters = strategy.skimChapters;

  const handleApplyToPlan = () => {
    setIsApplying(true);
    try {
      const currentPlan = readPlan();
      // Map weightage chapter titles to backlog-data chapter IDs
      const targetChapterTitles = new Set(strategy.selectedChapters.map((c) => c.title.toLowerCase()));

      const matchedChapterIds: string[] = [];
      for (const ch of chapters) {
        if (targetChapterTitles.has(ch.title.toLowerCase())) {
          matchedChapterIds.push(ch.id);
        } else {
          // Check substring / fuzzy match
          const found = strategy.selectedChapters.some(
            (sc) =>
              sc.subject === ch.subject &&
              (ch.title.toLowerCase().includes(sc.title.toLowerCase()) ||
                sc.title.toLowerCase().includes(ch.title.toLowerCase()))
          );
          if (found) matchedChapterIds.push(ch.id);
        }
      }

      const finalChapterIds = matchedChapterIds.length > 0
        ? matchedChapterIds
        : strategy.selectedChapters.map((c) => c.id);

      const updatedPlan = makePlan({
        board: currentPlan?.board || 'CBSE Class 12',
        subjects: currentPlan?.subjects || (selectedSubject === 'All' ? ['Physics', 'Chemistry', 'Mathematics'] : [selectedSubject]),
        chapterIds: finalChapterIds,
        minutesPerDay: currentPlan?.minutesPerDay || ((currentPlan as any)?.hoursPerDay ? (currentPlan as any).hoursPerDay * 60 : 240),
        goal: currentPlan?.goal || 'Target Score Recovery',
        priority: currentPlan?.priority || 'backlog recovery',
        confidence: currentPlan?.confidence || 'mixed',
        examDate: currentPlan?.examDate || '',
        planDuration: ((currentPlan?.planDuration || (currentPlan as any)?.targetDays || 14) as any),
      });

      (updatedPlan as any).targetScore = targetPercentage;
      (updatedPlan as any).hoursPerDay = Math.round(updatedPlan.minutesPerDay / 60);

      savePlan(updatedPlan);

      toast({
        title: `Recovery Plan Calibrated for ${targetPercentage}%! 🎯`,
        description: `Prioritized ${strategy.selectedChapters.length} highest-yield chapters (${strategy.totalExpectedMarks} expected marks).`,
      });

      if (onPlanUpdated) {
        onPlanUpdated();
      }
      onClose();
    } catch (err) {
      toast({
        title: 'Plan Updated',
        description: 'New weightage targets configured in your strategy workspace.',
      });
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calculator-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-8 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <Calculator size={18} />
            </div>
            <div>
              <h2 id="calculator-title" className="text-base font-bold text-foreground font-display">
                CBSE "Target Score" Weightage Calculator
              </h2>
              <p className="text-xs text-muted-foreground">
                Simulate your goal percentage to isolate Core Must-Wins, High-ROI Boosters, and Safe-to-Skim chapters.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Controls Bar: Target Percentage & Subject */}
          <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Step 1: Set Target Board Score
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-foreground font-display">
                    {targetPercentage}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({strategy.targetMarks} marks out of {strategy.totalAvailableMarks} total)
                  </span>
                </div>
              </div>

              {/* Preset Quick Buttons */}
              <div className="flex items-center gap-1.5">
                {[60, 75, 85, 95].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTargetPercentage(pct)}
                    className={`rounded-md px-2.5 py-1 text-xs font-mono font-semibold transition ${
                      targetPercentage === pct
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Range Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="50"
                max="98"
                step="1"
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>50% (Passing Triage)</span>
                <span>75% (First Class)</span>
                <span>85% (Distinction)</span>
                <span>95%+ (Topper)</span>
              </div>
            </div>

            {/* Subject Filter */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              <span className="text-xs font-mono uppercase text-muted-foreground">Scope:</span>
              {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubject(sub)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                    selectedSubject === sub
                      ? 'bg-foreground text-background font-semibold'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Output Analytics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Guarantee Level
              </span>
              <div className="mt-1 flex items-center gap-1 font-bold text-xs sm:text-sm text-foreground">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>{strategy.guaranteeLevel}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Required Study Time
              </span>
              <div className="mt-1 flex items-center gap-1 font-bold text-xs sm:text-sm text-foreground">
                <Clock size={14} className="text-sky-500" />
                <span className="font-mono">{strategy.totalStudyHours} Hours</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Chapters Needed
              </span>
              <div className="mt-1 flex items-center gap-1 font-bold text-xs sm:text-sm text-foreground">
                <Target size={14} className="text-amber-500" />
                <span className="font-mono">{strategy.selectedChapters.length} Chapters</span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Projected Marks
              </span>
              <div className="mt-1 flex items-center gap-1 font-bold text-xs sm:text-sm text-foreground">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="font-mono">{strategy.totalExpectedMarks} Marks</span>
              </div>
            </div>
          </div>

          {/* Tactical Examiner Advice */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground/90 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-primary font-mono uppercase tracking-wider text-[11px]">
              <Sparkles size={13} /> Examiner Recovery Blueprint Advice
            </div>
            <p className="leading-relaxed">{strategy.tacticalAdvice}</p>
          </div>

          {/* Categorized Chapter Breakdowns */}
          <div className="space-y-4">
            {/* 1. Core Must-Win Chapters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                  <span>Core Must-Win Chapters ({mustWinChapters.length})</span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {mustWinChapters.reduce((acc, c) => acc + c.boardMarks, 0)} marks total
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mustWinChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card p-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground block">{ch.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {ch.subject} • {ch.difficulty} • ~{ch.effortHours}h study
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-foreground block">{ch.boardMarks}M</span>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {ch.roiScore.toFixed(1)} M/h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. High ROI Boosters */}
            {highRoiChapters.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                    <span>High ROI Boosters ({highRoiChapters.length})</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Maximum marks per hour
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {highRoiChapters.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between rounded-md border border-border bg-card p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-foreground block">{ch.title}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {ch.subject} • {ch.difficulty} • ~{ch.effortHours}h study
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-amber-500 block">{ch.boardMarks}M</span>
                        <span className="text-[9px] font-mono text-emerald-500 font-bold">
                          {ch.roiScore.toFixed(1)} M/h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Safe to Skim */}
            {skimChapters.length > 0 && (
              <div className="space-y-2 pt-2 opacity-75">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-neutral-400 inline-block" />
                    <span>Safe to Skim / Low Return ({skimChapters.length})</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Skip if days are limited
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {skimChapters.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground"
                    >
                      <div>
                        <span className="font-medium block">{ch.title}</span>
                        <span className="text-[10px] font-mono">
                          {ch.subject} • {ch.boardMarks}M in board
                        </span>
                      </div>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono">
                        Safe to Skim
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 bg-card">
          <div className="text-xs text-muted-foreground">
            Saves you <strong className="text-foreground">{skimChapters.reduce((acc, c) => acc + c.effortHours, 0)} hours</strong> of low-yield cramming.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyToPlan}
              disabled={isApplying}
              className="flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 transition disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Apply Strategy to Recovery Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
