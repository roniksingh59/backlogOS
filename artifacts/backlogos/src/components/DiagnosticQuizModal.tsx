import { useState } from 'react';
import {
  HelpCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { chapters } from '@/lib/backlog-data';

interface DiagnosticQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId?: string;
  onApplyDiagnosis?: (diagnosis: 'concepts' | 'flashcards' | 'pyqs') => void;
}

interface DiagnosticQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function getDiagnosticQuestions(subject: string, title: string): DiagnosticQuestion[] {
  const isPhysics = subject.toLowerCase().includes('phys');
  const isChem = subject.toLowerCase().includes('chem');

  if (isPhysics) {
    return [
      {
        question: 'Under what specific condition is the equation v² = u² + 2as valid?',
        options: [
          'For all 1D rectilinear motions without exception',
          'Only when acceleration `a` is strictly constant in both magnitude and direction',
          'Whenever frictional force is negligible',
          'Only when initial velocity `u = 0`',
        ],
        correctIndex: 1,
        explanation: 'The standard kinematic formulas are derived assuming constant acceleration. If acceleration is variable (function of t or x), calculus integration is mandatory.',
      },
      {
        question: 'A 2 kg block rests on a rough horizontal surface with μ_s = 0.4. If a horizontal force of 5 N is applied (take g = 10 m/s²), the friction force is:',
        options: [
          '8 N',
          '5 N',
          '0 N',
          '3 N',
        ],
        correctIndex: 1,
        explanation: 'Max static friction f_s(max) = μ_s * N = 0.4 * 20 = 8 N. Since applied force (5 N) < 8 N, the block does not move, so self-adjusting static friction is exactly equal to applied force (5 N).',
      },
      {
        question: 'In a conservative force field, what is the mathematical relationship between force F and potential energy U?',
        options: [
          'F = dU/dx',
          'F = -dU/dx',
          'F = ∫ U dx',
          'F = U / x',
        ],
        correctIndex: 1,
        explanation: 'A conservative force points in the direction of decreasing potential energy, so F = -dU/dx (or F = -∇U).',
      },
      {
        question: 'When an object undergoes pure rolling without slipping on a horizontal rough surface with constant velocity:',
        options: [
          'Static friction does positive work',
          'Kinetic friction opposes the motion',
          'The friction force is zero',
          'Friction depends solely on normal reaction',
        ],
        correctIndex: 2,
        explanation: 'For pure rolling at constant velocity on a horizontal surface, no external force is attempting to cause relative slipping at the contact point, so friction is zero!',
      },
    ];
  }

  if (isChem) {
    return [
      {
        question: 'What is the hybridization and molecular shape of SF4 according to VSEPR theory?',
        options: [
          'sp³d, See-saw shape with 1 lone pair',
          'sp³d², Square planar with 2 lone pairs',
          'sp³, Tetrahedral with 0 lone pairs',
          'dsp², Square planar',
        ],
        correctIndex: 0,
        explanation: 'Sulfur has 6 valence electrons + 4 from fluorines = 10 electrons (5 pairs). Steric number 5 gives sp³d hybridization with 1 equatorial lone pair resulting in a see-saw geometry.',
      },
      {
        question: 'Which condition will shift the equilibrium N2(g) + 3H2(g) ⇌ 2NH3(g) (ΔH < 0) toward products?',
        options: [
          'Increasing temperature',
          'Decreasing pressure',
          'Increasing pressure or decreasing temperature',
          'Adding an inert gas at constant volume',
        ],
        correctIndex: 2,
        explanation: 'The reaction is exothermic (shifts forward upon cooling) and forward direction decreases gas moles from 4 to 2 (shifts forward under increased pressure).',
      },
      {
        question: 'What is the oxidation state of Chromium in CrO5 (Chromium peroxide)?',
        options: [
          '+10',
          '+6',
          '+5',
          '+3',
        ],
        correctIndex: 1,
        explanation: 'CrO5 has a butterfly structure with four peroxide oxygens (-1 each) and one oxo oxygen (-2). Therefore Cr + 4(-1) + 1(-2) = 0 => Cr = +6.',
      },
      {
        question: 'For an ideal gas undergoing isothermal expansion into vacuum (free expansion):',
        options: [
          'ΔT > 0 and q > 0',
          'ΔU = 0, w = 0, and q = 0',
          'w = -P_ext ΔV and ΔU < 0',
          'ΔH is non-zero',
        ],
        correctIndex: 1,
        explanation: 'In vacuum P_ext = 0, so work w = 0. Since expansion is isothermal (T is const), ΔU = 0 for ideal gas. By 1st law, q = ΔU - w = 0.',
      },
    ];
  }

  // Mathematics
  return [
    {
      question: 'What is the value of sin(75°) * cos(15°)?',
      options: [
        '(2 + √3) / 4',
        '(√3 - 1) / 4',
        '1 / 2',
        '(1 + √3) / 4',
      ],
      correctIndex: 0,
      explanation: 'Notice sin(75°) = cos(15°). So sin(75°)*cos(15°) = cos²(15°) = (1 + cos 30°)/2 = (1 + √3/2)/2 = (2 + √3)/4.',
    },
    {
      question: 'If the roots of ax² + bx + c = 0 are both positive real numbers, which conditions must hold?',
      options: [
        'D ≥ 0, -b/a > 0, and c/a > 0',
        'D > 0 and b > 0',
        'c/a < 0 only',
        'D = 0 and b = 0',
      ],
      correctIndex: 0,
      explanation: 'Both roots positive requires real roots (D ≥ 0), positive sum of roots (-b/a > 0), and positive product of roots (c/a > 0).',
    },
    {
      question: 'What is the limit: lim (x → 0) (e^(3x) - 1) / sin(2x)?',
      options: [
        '1',
        '3 / 2',
        '2 / 3',
        'Does not exist',
      ],
      correctIndex: 1,
      explanation: 'Multiply & divide by 3x and 2x: [(e^(3x)-1)/(3x)] * [(2x)/sin(2x)] * (3/2) = 1 * 1 * (3/2) = 3/2.',
    },
    {
      question: 'The number of terms in the expansion of (x + y + z)¹⁰ is:',
      options: [
        '11',
        '66',
        '55',
        '120',
      ],
      correctIndex: 1,
      explanation: 'For multinomial expansion (x_1 + x_2 + ... + x_r)^n, number of terms is ^(n+r-1)C_(r-1). Here ^(10+3-1)C_(3-1) = ¹²C₂ = (12 * 11)/2 = 66.',
    },
  ];
}

export function DiagnosticQuizModal({
  isOpen,
  onClose,
  chapterId,
  onApplyDiagnosis,
}: DiagnosticQuizModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const targetChapter = chapters.find((c) => c.id === chapterId) || chapters[2] || chapters[0];
  const questions = getDiagnosticQuestions(targetChapter.subject, targetChapter.title);

  const answeredCount = Object.keys(selectedAnswers).length;
  const score = Object.entries(selectedAnswers).filter(
    ([qIdx, ansIdx]) => questions[Number(qIdx)].correctIndex === ansIdx
  ).length;

  const percentage = Math.round((score / questions.length) * 100);

  const getDiagnosis = () => {
    if (percentage <= 50) {
      return {
        level: 'Concept Deficit',
        badge: 'Priority: Foundation',
        color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
        advice:
          'You are losing marks on fundamental definitions, boundary conditions, and sign conventions. Jumping straight to advanced PYQs right now will only cause frustration.',
        actionLabel: 'Assign 40% Concept + Derivations Block First',
        actionType: 'concepts' as const,
      };
    }
    if (percentage <= 75) {
      return {
        level: 'Formula Amnesia',
        badge: 'Priority: Active Recall',
        color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
        advice:
          'Your theoretical intuition is good, but hesitation with exact algebraic formulas and constraints is holding you back. 15 minutes of flashcards will unlock quick speed.',
        actionLabel: 'Assign 15m Flashcards + Formula Sheet Drill',
        actionType: 'flashcards' as const,
      };
    }
    return {
      level: 'Exam Ready & High Momentum',
      badge: 'Priority: Speed & PYQs',
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      advice:
        'Outstanding! Your core concepts and constraints are rock-solid. Do NOT waste time re-reading passive theory. Jump straight into timed 15-question numerical sets.',
      actionLabel: 'Jump Straight to High-Yield PYQ Set',
      actionType: 'pyqs' as const,
    };
  };

  const diag = getDiagnosis();

  const handleReset = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-2xl rounded-3xl border border-primary/40 bg-[#0a101f] shadow-2xl p-5 sm:p-7 max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
              <HelpCircle size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">
                  5-Minute Reality Check Quiz
                </h3>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                  {targetChapter.subject}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                Diagnosing {targetChapter.title} — Are you concept deficient or ready for PYQs?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quiz Questions or Diagnosis Outcome */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {!submitted ? (
            <div className="space-y-6">
              {questions.map((q, qIndex) => {
                const selected = selectedAnswers[qIndex];
                return (
                  <div key={qIndex} className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 space-y-3">
                    <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                      <span className="text-primary font-bold mr-1.5 font-mono">Q{qIndex + 1}.</span>
                      {q.question}
                    </p>

                    <div className="grid gap-2">
                      {q.options.map((opt, optIndex) => {
                        const isChosen = selected === optIndex;
                        return (
                          <button
                            key={optIndex}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }))
                            }
                            className={`focus-ring w-full text-left rounded-xl border p-2.5 sm:p-3 text-xs font-medium transition flex items-center gap-2.5 ${
                              isChosen
                                ? 'border-primary bg-primary/20 text-white shadow-xs'
                                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span
                              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isChosen ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Results & Prescription */
            <div className="space-y-5 animate-in fade-in zoom-in-95">
              {/* Scorecard banner */}
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-[#0d162d] to-slate-900 p-5 text-center">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold font-mono ${diag.color}`}>
                  <span>{diag.badge}</span>
                </div>

                <h4 className="font-display text-3xl font-extrabold text-white mt-3">
                  Score: {score} / {questions.length} ({percentage}%)
                </h4>
                <p className="font-semibold text-sm text-cyan-300 mt-1">
                  Diagnosis: {diag.level}
                </p>
                <p className="text-xs text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
                  {diag.advice}
                </p>
              </div>

              {/* Explanations Accordion */}
              <div className="space-y-3">
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Detailed Answer Review:
                </p>
                {questions.map((q, idx) => {
                  const userAns = selectedAnswers[idx];
                  const isCorrect = userAns === q.correctIndex;
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-3.5 text-xs space-y-1.5 ${
                        isCorrect
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-rose-500/30 bg-rose-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">Q{idx + 1}. {q.question}</span>
                        <span className="font-bold shrink-0">
                          {isCorrect ? '✓ Correct' : '✗ Missed'}
                        </span>
                      </div>
                      <p className="text-slate-300">
                        <strong className="text-white">Answer:</strong> {q.options[q.correctIndex]}
                      </p>
                      <p className="text-slate-400 italic">
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between gap-3">
          {!submitted ? (
            <>
              <span className="text-xs text-slate-400">
                {answeredCount} of {questions.length} answered
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-700 px-3.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={answeredCount < questions.length}
                  onClick={() => setSubmitted(true)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-primary disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white shadow-md transition"
                >
                  <span>See Diagnosis</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw size={14} />
                <span>Retake Quiz</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onApplyDiagnosis?.(diag.actionType);
                  onClose();
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition"
              >
                <span>{diag.actionLabel}</span>
                <Sparkles size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
