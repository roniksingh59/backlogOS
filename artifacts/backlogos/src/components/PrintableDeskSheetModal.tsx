import { useState, useMemo } from 'react';
import {
  Printer,
  X,
  FileDown,
  CheckSquare,
  Sparkles,
  Calendar,
  Layers,
  Award,
  BookOpen,
} from 'lucide-react';
import { readPlan, readCompleted } from '@/lib/storage';
import { type StudentPlan, type PlanDay } from '@/lib/backlog-data';

interface PrintableDeskSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HIGH_YIELD_FORMULAS = [
  { name: 'Lens Maker’s', formula: '1/f = (μ - 1)(1/R₁ - 1/R₂)', sub: 'Physics' },
  { name: 'Nernst Eq (298K)', formula: 'E_cell = E° - (0.0591/n) log Q', sub: 'Chemistry' },
  { name: 'Electric Dipole', formula: 'E_axial = 2kp / r³', sub: 'Physics' },
  { name: '1st Order Rate', formula: 'k = (2.303 / t) log( [A]₀ / [A] )', sub: 'Chemistry' },
  { name: 'Skew Lines Dist', formula: 'd = |(b₁ × b₂) · (a₂ - a₁)| / |b₁ × b₂|', sub: 'Maths' },
  { name: 'Motional EMF', formula: 'ε = B · v · L', sub: 'Physics' },
  { name: 'Bayes’ Theorem', formula: 'P(E₁|A) = P(E₁)P(A|E₁) / Σ P(E_k)P(A|E_k)', sub: 'Maths' },
  { name: 'Osmotic Pressure', formula: 'π = i · C · R · T', sub: 'Chemistry' },
];

export function PrintableDeskSheetModal({ isOpen, onClose }: PrintableDeskSheetModalProps) {
  const plan = useMemo<StudentPlan | null>(() => readPlan(), [isOpen]);
  const completed = useMemo<Set<string>>(() => new Set(readCompleted()), [isOpen]);
  const [dayRange, setDayRange] = useState<'7' | '14' | 'all'>('7');
  const [includeFormulas, setIncludeFormulas] = useState(true);
  const [includeRules, setIncludeRules] = useState(true);

  const displayDays: PlanDay[] = useMemo(() => {
    if (!plan || !plan.days || plan.days.length === 0) {
      const fallbackPlan = makePlan({
        board: 'CBSE Class 12',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        chapterIds: ['phy-units', 'phy-laws', 'chem-basic', 'chem-bonding'],
        minutesPerDay: 240,
        goal: 'Complete Backlog Recovery',
        priority: 'backlog recovery',
        confidence: 'mixed',
        examDate: '',
        planDuration: 7,
      });
      return fallbackPlan.days.slice(0, 7);
    }
    if (dayRange === '7') return plan.days.slice(0, 7);
    if (dayRange === '14') return plan.days.slice(0, 14);
    return plan.days;
  }, [plan, dayRange]);

  if (!isOpen) return null;

  const dailyHours = plan
    ? Math.round((plan.minutesPerDay || ((plan as any).hoursPerDay ? (plan as any).hoursPerDay * 60 : 240)) / 60)
    : 4;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desk-sheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative my-8 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Printer size={18} />
            </div>
            <div>
              <h2 id="desk-sheet-title" className="text-base font-bold text-foreground font-display">
                Printable Desk Sheet (Physical Wall Blueprint)
              </h2>
              <p className="text-xs text-muted-foreground">
                High-contrast physical study checklist optimized for standard A4 printing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Options */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Days:</span>
              <button
                type="button"
                onClick={() => setDayRange('7')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  dayRange === '7' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setDayRange('14')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  dayRange === '14' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                14 Days
              </button>
              <button
                type="button"
                onClick={() => setDayRange('all')}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  dayRange === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                All
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs hover:bg-primary/90 transition"
            >
              <Printer size={14} /> Print Now
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Customization checkboxes (Hidden in Print) */}
        <div className="flex flex-wrap items-center gap-4 border-b border-border/60 bg-muted/30 px-6 py-2.5 text-xs text-muted-foreground print:hidden">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFormulas}
              onChange={(e) => setIncludeFormulas(e.target.checked)}
              className="rounded border-border text-primary"
            />
            <span>Include Must-Win Formula Box</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRules}
              onChange={(e) => setIncludeRules(e.target.checked)}
              className="rounded border-border text-primary"
            />
            <span>Include Daily Desk Discipline Rules</span>
          </label>
          <span className="ml-auto text-[11px] font-mono text-muted-foreground">
            {displayDays.length} Study Days Selected
          </span>
        </div>

        {/* Desk Sheet Document Preview Container */}
        <div className="overflow-y-auto p-6 sm:p-8 bg-background print:p-0 print:overflow-visible">
          <div
            id="desk-sheet-printable"
            className="desk-sheet-root mx-auto max-w-3xl rounded-lg border-2 border-border p-6 bg-card text-foreground print:border-black print:text-black print:bg-white print:p-4 print:shadow-none print:max-w-none"
          >
            {/* Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-border pb-4 print:border-black">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded border border-black/40 bg-black text-white font-mono text-[10px] font-bold print:bg-black print:text-white">
                    B
                  </div>
                  <span className="font-mono text-xs uppercase tracking-widest font-bold">
                    BacklogOS • Academic Recovery Blueprint
                  </span>
                </div>
                <h1 className="mt-1 text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground print:text-black font-display">
                  Physical Desk Study Sheet
                </h1>
                <p className="text-[11px] text-muted-foreground print:text-neutral-600">
                  Pin this sheet above your study table. Physically check off boxes upon session completion.
                </p>
              </div>

              <div className="mt-3 sm:mt-0 sm:text-right text-xs space-y-0.5">
                <div>
                  <span className="font-mono text-muted-foreground print:text-neutral-600">Target Board: </span>
                  <span className="font-bold">{plan?.board || 'CBSE Class 12'}</span>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground print:text-neutral-600">Daily Target: </span>
                  <span className="font-bold">{dailyHours} Hours / Day</span>
                </div>
                <div>
                  <span className="font-mono text-muted-foreground print:text-neutral-600">Goal: </span>
                  <span className="font-bold">{(plan as any)?.targetScore || 90}%+ Score</span>
                </div>
              </div>
            </div>

            {/* Daily Study Routine Checklist Table */}
            <div className="mt-5">
              <div className="flex items-center justify-between pb-2">
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-foreground print:text-black">
                  Day-by-Day Milestone Roadmap
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground print:text-neutral-600">
                  Concept [C] • Practice [P] • Recall [R]
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-y-2 border-border print:border-black bg-muted/40 print:bg-neutral-100 font-mono text-[10px] uppercase text-muted-foreground print:text-black">
                      <th className="py-2 px-2 w-12 text-center">Day</th>
                      <th className="py-2 px-3">Subject & Chapter Focus</th>
                      <th className="py-2 px-3 hidden sm:table-cell">Target Theme</th>
                      <th className="py-2 px-2 text-center w-16">Time</th>
                      <th className="py-2 px-2 text-center w-24">Sign-Off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 print:divide-neutral-300">
                    {displayDays.length > 0 ? (
                      displayDays.map((day) => {
                        const isDone = completed.has(day.chapterId);
                        return (
                          <tr
                            key={day.day}
                            className={`transition-colors ${
                              isDone ? 'bg-muted/20 print:bg-neutral-50' : ''
                            }`}
                          >
                            <td className="py-2.5 px-2 font-mono font-bold text-center">
                              D{day.day}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-foreground print:text-black block">
                                {day.chapterTitle}
                              </span>
                              <span className="text-[10px] text-muted-foreground print:text-neutral-600 font-mono">
                                {day.subject} {day.isPrerequisite ? '• Foundation Prerequisite' : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-muted-foreground print:text-neutral-700 hidden sm:table-cell">
                              {day.theme}
                            </td>
                            <td className="py-2.5 px-2 font-mono text-center text-[11px]">
                              {dailyHours}h
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {/* 3 physical checkboxes */}
                              <div className="inline-flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="inline-block h-4 w-4 border border-foreground print:border-black rounded-[2px] text-center leading-3 font-bold">
                                  {isDone ? '✓' : ''}
                                </span>
                                <span className="inline-block h-4 w-4 border border-foreground print:border-black rounded-[2px] text-center leading-3 font-bold">
                                  {isDone ? '✓' : ''}
                                </span>
                                <span className="inline-block h-4 w-4 border border-foreground print:border-black rounded-[2px] text-center leading-3 font-bold">
                                  {isDone ? '✓' : ''}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                          No active plan generated yet. Complete onboarding or backlog selector first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Must-Win Formula Box */}
            {includeFormulas && (
              <div className="mt-5 border-t-2 border-border pt-4 print:border-black">
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-foreground print:text-black">
                  High-Yield Formula Emergency Cheat Box
                </h3>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {HIGH_YIELD_FORMULAS.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-border print:border-neutral-400 p-2 bg-muted/20 print:bg-transparent"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground print:text-neutral-600">
                        <span>{item.name}</span>
                        <span>{item.sub}</span>
                      </div>
                      <div className="mt-1 font-mono font-bold text-foreground print:text-black">
                        {item.formula}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Discipline Protocol */}
            {includeRules && (
              <div className="mt-5 border-t-2 border-border pt-4 print:border-black">
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-foreground print:text-black">
                  Physical Desk Protocol • 3 Non-Negotiable Rules
                </h3>
                <ol className="mt-2 list-decimal list-inside space-y-1 text-xs text-muted-foreground print:text-neutral-700">
                  <li>
                    <strong className="text-foreground print:text-black">Zero-Phone Horizon:</strong> Phone stays in another room during study blocks. No music lyrics; ambient brown noise or silence only.
                  </li>
                  <li>
                    <strong className="text-foreground print:text-black">Paper Solving First:</strong> Derivations and 3M/5M board questions must be hand-written on paper without looking at back solutions.
                  </li>
                  <li>
                    <strong className="text-foreground print:text-black">Mistake Log Accountability:</strong> Every failed calculation or forgotten step gets penned into your Red Notebook before sleep.
                  </li>
                </ol>
              </div>
            )}

            {/* Signature & Commitment Box */}
            <div className="mt-6 border-t-2 border-dashed border-border pt-3 print:border-neutral-500 flex items-center justify-between text-[11px] text-muted-foreground print:text-neutral-700">
              <div>
                <span>Student Pledge: </span>
                <span className="italic font-serif">"I will protect my recovery hours every single day."</span>
              </div>
              <div className="font-mono">
                Date: _______________ | Signature: _______________
              </div>
            </div>
          </div>
        </div>

        {/* Print Stylesheet Hook */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #desk-sheet-printable, #desk-sheet-printable * {
                visibility: visible !important;
              }
              #desk-sheet-printable {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                box-shadow: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
            }
          `
        }} />
      </div>
    </div>
  );
}
