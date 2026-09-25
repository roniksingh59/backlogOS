import { useState } from 'react';
import {
  AlertOctagon,
  X,
  Clock,
  Zap,
  Target,
  FileCheck2,
  Printer,
  Copy,
  Check,
  BookmarkPlus,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { chapters } from '@/lib/backlog-data';
import { saveNotes, readNotes } from '@/lib/storage';

interface EmergencyRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultChapterId?: string;
  onOpenBaxWithPrompt?: (prompt: string) => void;
}

interface RescueData {
  timeSplit: string;
  coreConcepts: string[];
  mustFormulas: string[];
  examTraps: string[];
  keyDerivations: string[];
  pyqArchetypes: { name: string; strategy: string }[];
}

function getRescueData(subject: string, title: string, hours: number): RescueData {
  const isPhysics = subject.toLowerCase().includes('phys');
  const isChem = subject.toLowerCase().includes('chem');

  if (isPhysics) {
    return {
      timeSplit: hours <= 3
        ? '40m Master Formulas · 70m Top 4 Numerical Archetypes · 40m Key Derivations · 30m Trap Review'
        : '60m Theory & Reference Frame · 90m 10 High-Yield Numericals · 60m Derivations · 30m Mock Drill',
      coreConcepts: [
        'Free Body Diagrams (FBD): Resolve all forces along chosen coordinate axes (+x along motion, +y normal to plane).',
        'Constraint Relations & Momentum: Internal forces cancel in pairs; isolate subsystems when finding tension/contact force.',
        'Energy Conservation vs Work-Energy Theorem: $W_{net} = \\Delta K$. Friction is non-conservative: $W_{nc} = \\Delta E_{mech}$.',
      ],
      mustFormulas: [
        'Kinematics: $v^2 = u^2 + 2as$ (valid ONLY for constant $a$). If $a(t)$, integrate: $v = \\int a\\,dt$.',
        'Newton II: $\\vec{F}_{net} = m\\vec{a}$. For inclined plane with friction: $a = g(\\sin\\theta - \\mu \\cos\\theta)$.',
        'Work & Power: $W = \\int \\vec{F} \\cdot d\\vec{r} = F d \\cos\\theta$; $P = \\vec{F} \\cdot \\vec{v}$.',
        'Center of Mass & Torque: $\\vec{\\tau} = \\vec{r} \\times \\vec{F} = I\\vec{\\alpha}$. Parallel axis theorem: $I = I_{cm} + Md^2$.',
      ],
      examTraps: [
        'Sign convention trap: forgetting that friction opposes relative tendency of motion, not always motion.',
        'Unit negligence: $km/h \\to m/s$ requires multiplying by $5/18$. Grams to $kg$ needs $\\times 10^{-3}$.',
        'Normal force assumption: $N$ is NOT always $mg$; on an incline, $N = mg\\cos\\theta$; in a lift accelerating up, $N = m(g+a)$.',
      ],
      keyDerivations: [
        'Banking of roads with & without friction: $v_{max} = \\sqrt{rg \\left(\\frac{\\tan\\theta + \\mu}{1 - \\mu\\tan\\theta}\\right)}$',
        'Work-Energy Theorem from Newton’s Second Law: $\\int F\\,dx = \\int m v\\,dv$',
        'Moment of Inertia of a uniform thin rod about center & end ($ML^2/12$ and $ML^2/3$)',
      ],
      pyqArchetypes: [
        { name: 'Pulley & Connected Masses', strategy: 'Write independent FBD equations for each block, use string length constraint $a_1 = 2a_2$.' },
        { name: 'Block on Incline with Friction', strategy: 'Check if applied force overcomes static friction $f_s \\le \\mu_s N$. If yes, use $\\mu_k$.' },
        { name: 'Variable Force Work Done', strategy: 'Express $F$ in terms of $x$ and evaluate the definite integral between initial and final position.' },
        { name: 'Pure Rolling on Horizontal Plane', strategy: 'Apply $v_{cm} = R\\omega$ and check if friction is required for constant velocity (friction is zero on smooth ground!).' },
      ],
    };
  }

  if (isChem) {
    return {
      timeSplit: hours <= 3
        ? '30m VSEPR & Hybridization · 60m Stoichiometry/Equilibrium Formulas · 50m Top Reactions · 40m Review'
        : '60m Structural Concepts · 90m Numerical Practice · 60m Exception Rules · 30m Rapid Flashcard Review',
      coreConcepts: [
        'Hybridization & Molecular Geometry: Steric number = $(\\text{Bond pairs} + \\text{Lone pairs})$. Lone pairs distort ideal angles (lp-lp > lp-bp > bp-bp).',
        'Le Chatelier’s Principle: Exothermic reactions shift backward with temperature increase; pressure increase shifts toward fewer gas moles.',
        'Mole Concept & Limiting Reagent: Always convert quantities to moles first; divide moles by stoichiometric coefficient to spot limiting reagent.',
      ],
      mustFormulas: [
        'Ideal Gas: $PV = nRT = \\frac{w}{M}RT$; Density $d = \\frac{PM}{RT}$.',
        'Equilibrium: $K_p = K_c (RT)^{\\Delta n_g}$. If $Q < K$, reaction proceeds forward.',
        'Thermodynamics: $\\Delta G = \\Delta H - T\\Delta S$; Spontaneous if $\\Delta G < 0$.',
        'pH & Buffer: $\\text{pH} = -\\log[H^+]$; Henderson: $\\text{pH} = pK_a + \\log\\frac{[\\text{Salt}]}{[\\text{Acid}]}$.',
      ],
      examTraps: [
        'Ignoring solids in $K_c$ and $K_p$: Pure solids ($s$) and pure liquids ($l$) have active mass = 1.',
        'Gas constant $R$ unit mismatch: Use $R = 8.314\\,\\text{J}/(\\text{mol}\\cdot\\text{K})$ for energy; $R = 0.0821\\,\\text{L}\\cdot\\text{atm}/(\\text{mol}\\cdot\\text{K})$ for pressure in atm.',
        'Odd-electron or expanded octet molecules: $NO_2$, $SF_6$, $PCl_5$ disobey normal octet rule.',
      ],
      keyDerivations: [
        'Relation between $K_p$ and $K_c$ using Dalton\'s partial pressure law.',
        'First Law of Thermodynamics differential form: $dq = du + dw = du + P\\,dv$.',
        'Bond Order calculation using Molecular Orbital Theory (MOT) configuration.',
      ],
      pyqArchetypes: [
        { name: 'Finding Hybridization & Shape', strategy: 'Calculate total valence electrons, divide by 8 and remainder by 2 to get steric number.' },
        { name: 'Limiting Reagent Stoichiometry', strategy: 'Convert grams to moles, identify lowest mole/coefficient ratio, calculate product yield.' },
        { name: 'Equilibrium Degree of Dissociation ($\\alpha$)', strategy: 'Set up ICE table (Initial, Change, Equilibrium) with $1-\\alpha, \\alpha, \\alpha$ and substitute into $K_c$.' },
      ],
    };
  }

  // Mathematics
  return {
    timeSplit: hours <= 3
      ? '35m Master Trigonometric Formulas · 65m Top 4 Calculus/Algebra Archetypes · 45m Formula Recitation · 35m Self-Test'
      : '60m Standard Identities · 90m 8 Key Solved Problems · 60m Graph Sketches & Sign Charts · 30m Trap Elimination',
    coreConcepts: [
      'Transformation Formulas: Convert sum/difference to product (and vice versa) to factorize tricky equations.',
      'Quadratic & Polynomial Analysis: Sign of quadratic $ax^2 + bx + c$ depends on $a$ and discriminant $D = b^2 - 4ac$.',
      'Limits & Continuity: Check $0/0$ indeterminate forms; apply L’Hôpital’s Rule or standard expansion ($e^x, \\ln(1+x), \\sin x$).',
    ],
    mustFormulas: [
      'Trig Double & Half Angles: $\\sin 2x = 2\\sin x \\cos x$; $\\cos 2x = 2\\cos^2 x - 1 = 1 - 2\\sin^2 x$.',
      'Sum to Product: $\\sin C + \\sin D = 2\\sin\\left(\\frac{C+D}{2}\\right)\\cos\\left(\\frac{C-D}{2}\\right)$.',
      'Standard Limits: $\\lim_{x\\to 0} \\frac{\\sin x}{x} = 1$; $\\lim_{x\\to 0} \\frac{e^x - 1}{x} = 1$; $\\lim_{x\\to 0} (1+x)^{1/x} = e$.',
      'Combinations: $^nC_r + ^nC_{r-1} = ^{n+1}C_r$. Total terms in $(a+b)^n$ is $n+1$.',
    ],
    examTraps: [
      'Squaring both sides introduces extraneous roots: always substitute answers back into the original trigonometric equation.',
      'Canceling terms containing $x$ loses roots: never divide both sides by $\\sin x$ or $(x-a)$ without setting it equal to zero first.',
      'Domain restrictions: $\\tan x$ is undefined at $(2n+1)\\pi/2$; logarithm $\\log_a b$ requires $a>0, a\\ne 1, b>0$.',
    ],
    keyDerivations: [
      'Formula for $\\cos(A+B) = \\cos A \\cos B - \\sin A \\sin B$ using unit circle projection.',
      'Derivative of $\\sin x$ from first principles definition: $\\lim_{h\\to 0} \\frac{\\sin(x+h) - \\sin x}{h}$.',
      'General term in Binomial expansion $T_{r+1} = ^nC_r a^{n-r} b^r$.',
    ],
    pyqArchetypes: [
      { name: 'Conditional Trigonometric Identity', strategy: 'Group terms in pairs with $C+D$ formula, factor out common term like $\\cos\\left(\\frac{A+B}{2}\\right)$.' },
      { name: 'Indeterminate Limit with Radicals', strategy: 'Multiply numerator and denominator by conjugate or expand using Binomial series for small $x$.' },
      { name: 'Roots of Quadratic with Parameter', strategy: 'Apply conditions for roots in interval $(k_1, k_2)$: $D \\ge 0$, $-b/2a \\in (k_1, k_2)$, $a f(k_1) > 0$.' },
    ],
  };
}

export function EmergencyRescueModal({
  isOpen,
  onClose,
  defaultChapterId,
  onOpenBaxWithPrompt,
}: EmergencyRescueModalProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    defaultChapterId || chapters[2]?.id || 'phy-vectors'
  );
  const [hoursRemaining, setHoursRemaining] = useState<number>(12);
  const [copied, setCopied] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  if (!isOpen) return null;

  const chapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  const rescue = getRescueData(chapter.subject, chapter.title, hoursRemaining);

  const handleCopyRescueSheet = () => {
    const text = `🚨 24-HOUR EMERGENCY TEST RESCUE: ${chapter.title} (${chapter.subject})
Hours Left: ${hoursRemaining}h
Focus Schedule: ${rescue.timeSplit}

--- NON-NEGOTIABLE CONCEPTS ---
${rescue.coreConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

--- MUST-MEMORIZE FORMULAS ---
${rescue.mustFormulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

--- COMMON EXAM TRAPS ---
${rescue.examTraps.map((t, i) => `⚠ ${t}`).join('\n')}

--- TOP PYQ ARCHETYPES ---
${rescue.pyqArchetypes.map((p, i) => `${i + 1}. ${p.name}: ${p.strategy}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToNotes = () => {
    const current = readNotes()[chapter.id] || '';
    const updated = `${current}\n\n=== 🚨 EMERGENCY 24H RESCUE CARD ===\n${rescue.mustFormulas.join('\n')}\nTraps to avoid:\n${rescue.examTraps.join('\n')}`;
    saveNotes(chapter.id, updated);
    setSavedNote(true);
    setTimeout(() => setSavedNote(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-3xl rounded-3xl border-2 border-amber-500/50 bg-[#0c1222] shadow-[0_0_60px_rgba(245,158,11,0.2)] flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/90 bg-slate-900/80 px-5 py-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
              <AlertOctagon size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-extrabold text-white tracking-tight">
                  Emergency 24h Test Rescue Mode
                </h3>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
                  CRUNCH TIME
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stripped-down, high-yield survival cheat sheet for urgent school & coaching tests.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chapter & Time Controls */}
        <div className="border-b border-slate-800 bg-slate-950/70 px-5 py-3 sm:px-6 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Select Test Chapter:
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {chapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  [{ch.subject}] {ch.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Time Left Until Exam:
            </label>
            <div className="flex items-center gap-1.5">
              {[3, 6, 12, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHoursRemaining(h)}
                  className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${
                    hoursRemaining === h
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {h}h Left
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Rescue Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5 print:p-0">
          
          {/* Rescue Schedule Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide font-mono">
              <Clock size={15} />
              <span>Recommended Time Allocation ({hoursRemaining}h Countdown)</span>
            </div>
            <p className="mt-1.5 text-xs sm:text-sm font-semibold text-white leading-relaxed">
              {rescue.timeSplit}
            </p>
          </div>

          {/* Core Non-Negotiable Concepts */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 font-mono">
              <Target size={15} />
              <span>3 NON-NEGOTIABLE CORE CONCEPTS</span>
            </div>
            <ul className="space-y-2">
              {rescue.coreConcepts.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-500/20 text-cyan-400 text-[11px] font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Must-Memorize Formulas */}
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary font-mono">
              <Zap size={15} />
              <span>MUST-MEMORIZE FORMULA SHEET</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rescue.mustFormulas.map((f, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-xs font-mono text-slate-100">
                  <span className="text-primary font-bold mr-1.5">[{idx + 1}]</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Traps & Pitfalls */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono">
              <span>⚠️ FREQUENT EXAM TRAPS (WHERE 80% LOSE MARKS)</span>
            </div>
            <ul className="space-y-1.5">
              {rescue.examTraps.map((trap, idx) => (
                <li key={idx} className="text-xs text-rose-200/90 leading-relaxed flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{trap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Derivations */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
              <FileCheck2 size={15} />
              <span>HIGH-PROBABILITY DERIVATIONS (BOARDS / SCHOOL)</span>
            </div>
            <div className="space-y-1.5">
              {rescue.keyDerivations.map((d, idx) => (
                <div key={idx} className="rounded-lg bg-slate-950/60 p-2.5 text-xs text-slate-300 font-medium">
                  {idx + 1}. {d}
                </div>
              ))}
            </div>
          </div>

          {/* Top PYQ Archetypes */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono">
              <BookOpen size={15} />
              <span>TOP QUESTION ARCHETYPES & SOLVING STRATEGY</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rescue.pyqArchetypes.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                  <p className="text-xs font-bold text-white">{p.name}</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{p.strategy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-slate-800 bg-slate-900/80 px-5 py-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRescueSheet}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Rescue Card' : 'Copy Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToNotes}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              {savedNote ? <Check size={14} className="text-emerald-400" /> : <BookmarkPlus size={14} />}
              <span>{savedNote ? 'Saved to Notes' : 'Save in Notes'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="focus-ring hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <Printer size={14} />
              <span>Print PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBaxWithPrompt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBaxWithPrompt(`I have an emergency test in ${chapter.title}. Explain the #1 most common trap problem step by step.`);
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/20 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/30"
              >
                <Sparkles size={14} />
                <span>Ask Bax for Help</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md transition"
            >
              Start 45m Rescue Sprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
