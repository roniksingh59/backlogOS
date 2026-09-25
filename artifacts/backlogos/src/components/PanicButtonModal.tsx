import { useState } from 'react';
import {
  ShieldAlert,
  X,
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  Zap,
  CheckCircle2,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { chapters, type StudentPlan, type PlanDay } from '@/lib/backlog-data';
import { savePlan, readCompleted, toggleRestDate } from '@/lib/storage';

interface PanicButtonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: StudentPlan | null;
  onPlanRebalanced: (updatedPlan: StudentPlan) => void;
}

type RebalanceAction = 'missed_days' | 'test_urgent' | 'low_energy' | 'rest_day';

export function PanicButtonModal({
  isOpen,
  onClose,
  currentPlan,
  onPlanRebalanced,
}: PanicButtonModalProps) {
  const [selectedAction, setSelectedAction] = useState<RebalanceAction>('missed_days');
  const [selectedUrgentChapter, setSelectedUrgentChapter] = useState<string>(
    currentPlan?.chapterIds[0] || chapters[0].id
  );
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  if (!isOpen || !currentPlan) return null;

  const completedIds = readCompleted();

  const handleApplyRebalance = () => {
    // Clone plan deeply
    const updated: StudentPlan = JSON.parse(JSON.stringify(currentPlan));

    if (selectedAction === 'rest_day') {
      // Mark today as rest date
      toggleRestDate(new Date());
      setAppliedMessage('🛡️ Rest day marked with Zero Guilt! Your consistency streak is 100% protected.');
      setTimeout(() => {
        setAppliedMessage(null);
        onClose();
      }, 1800);
      return;
    }

    if (selectedAction === 'missed_days') {
      // Find incomplete chapters and shift them to start from today
      const remainingChapterIds = updated.plannedChapterIds.filter(
        (id) => !completedIds.includes(id)
      );

      if (remainingChapterIds.length > 0) {
        // Distribute remaining across updated.days
        const daysCount = updated.days.length;
        const newDays: PlanDay[] = updated.days.map((d, index) => {
          const chIndex = index % remainingChapterIds.length;
          const assignedId = remainingChapterIds[chIndex];
          const chData = chapters.find((c) => c.id === assignedId) || chapters[0];

          return {
            ...d,
            chapterId: assignedId,
            focus: `Active Recovery: ${chData.title}`,
            conceptPill: `${chData.subject} High Yield`,
            pyqPill: '10 Core Numericals',
            recallPill: 'Formula Flashcards',
          };
        });

        updated.days = newDays;
      }

      savePlan(updated);
      onPlanRebalanced(updated);
      setAppliedMessage('✨ Plan redistributed forward! No guilt, no backlog overwhelm.');
      setTimeout(() => {
        setAppliedMessage(null);
        onClose();
      }, 1600);
      return;
    }

    if (selectedAction === 'test_urgent') {
      // Pin selected chapter to Day 1 & Day 2
      const chData = chapters.find((c) => c.id === selectedUrgentChapter) || chapters[0];

      if (updated.days.length > 0) {
        updated.days[0] = {
          ...updated.days[0],
          chapterId: chData.id,
          focus: `🔥 EMERGENCY TEST FOCUS: ${chData.title} (Derivations + PYQs)`,
          conceptPill: 'Core Formulas & Traps',
          pyqPill: '15 High-Frequency PYQs',
          recallPill: 'Formula Sheet Recite',
        };
      }
      if (updated.days.length > 1) {
        updated.days[1] = {
          ...updated.days[1],
          chapterId: chData.id,
          focus: `⚡ SPEED & ACCURACY: ${chData.title} Mock Test Drill`,
          conceptPill: 'Speed Numerical Run',
          pyqPill: 'Timed Mock Practice',
          recallPill: 'Error Log Review',
        };
      }

      // Ensure it is in planned chapters
      if (!updated.plannedChapterIds.includes(chData.id)) {
        updated.plannedChapterIds.unshift(chData.id);
      }

      savePlan(updated);
      onPlanRebalanced(updated);
      setAppliedMessage(`🎯 Prioritized ${chData.title} for your upcoming test!`);
      setTimeout(() => {
        setAppliedMessage(null);
        onClose();
      }, 1600);
      return;
    }

    if (selectedAction === 'low_energy') {
      // Compress today to 45 mins high-yield essentials
      if (updated.days.length > 0) {
        const todayDay = updated.days[0];
        const chData = chapters.find((c) => c.id === todayDay.chapterId) || chapters[0];
        todayDay.focus = `☕ Chai-Sized 45m Sprint: ${chData.title} (Formulas & 3 PYQs only)`;
        todayDay.conceptPill = '15m Quick Formula Check';
        todayDay.pyqPill = '20m 3 Top PYQs';
        todayDay.recallPill = '10m Card Flip';
      }

      savePlan(updated);
      onPlanRebalanced(updated);
      setAppliedMessage('☕ Today compressed to a cozy 45-minute sprint. Easy win!');
      setTimeout(() => {
        setAppliedMessage(null);
        onClose();
      }, 1600);
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-xl rounded-3xl border border-rose-500/40 bg-card shadow-2xl p-5 sm:p-7 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Glow Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <ShieldAlert size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-foreground">
                  The Panic Button
                </h3>
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400 font-mono">
                  Zero Guilt Sync
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Real life happened? Recalibrate your study plan in 1 click without shame.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Message Banner */}
        {appliedMessage && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{appliedMessage}</span>
          </div>
        )}

        {/* Action Options */}
        <div className="mt-5 space-y-3">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
            What happened? Select your current situation:
          </p>

          {[
            {
              id: 'missed_days' as RebalanceAction,
              icon: RotateCcw,
              title: 'I fell behind / Missed 1-2 study days',
              desc: 'Slide unfinished backlog chapters forward calmly without breaking your overall sequence.',
              badge: 'Most Popular',
            },
            {
              id: 'test_urgent' as RebalanceAction,
              icon: Zap,
              title: 'School or Coaching Test got moved up!',
              desc: 'Prioritize a specific chapter to Today & Tomorrow with emergency derivation & PYQ focus.',
              badge: 'Test Mode',
            },
            {
              id: 'low_energy' as RebalanceAction,
              icon: Clock,
              title: 'Exhausted / Only 45-60 minutes available today',
              desc: 'Convert today into an ultra-high yield chai sprint (Formulas + 3 key numericals only).',
              badge: 'Chai Sprint',
            },
            {
              id: 'rest_day' as RebalanceAction,
              icon: Heart,
              title: 'Take a guilt-free mental recovery day',
              desc: 'Protect your study streak, recharge your mind, and let BacklogOS carry the plan smoothly.',
              badge: 'Zero Guilt',
            },
          ].map((item) => {
            const isSelected = selectedAction === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedAction(item.id)}
                className={`focus-ring w-full text-left rounded-2xl border p-3.5 sm:p-4 transition flex items-start gap-3.5 ${
                  isSelected
                    ? 'border-rose-500/60 bg-rose-500/10 shadow-sm'
                    : 'border-border/80 bg-background/60 hover:bg-muted/40 hover:border-border'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-rose-500 text-white shadow-xs' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground">{item.title}</h4>
                    <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Chapter picker if test_urgent is selected */}
        {selectedAction === 'test_urgent' && (
          <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3.5 space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>Which chapter is on your urgent test?</span>
            </label>
            <select
              value={selectedUrgentChapter}
              onChange={(e) => setSelectedUrgentChapter(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:ring-1 focus:ring-rose-500"
            >
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  [{ch.subject}] {ch.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 border-t border-border/80 pt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground italic hidden sm:block">
            "Backlogs happen to everyone. What matters is starting again."
          </p>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyRebalance}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/25 transition"
              data-testid="button-apply-rebalance"
            >
              <span>Recalculate Calmly</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
