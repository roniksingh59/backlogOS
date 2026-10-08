import { useState, useMemo } from 'react';
import { Search, RotateCw, CheckCircle2, AlertCircle, BookOpen, Sparkles, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Flashcard {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  chapter: string;
  title: string;
  question: string;
  formula: string;
  explanation: string;
  trap: string;
}

const PCM_FLASHCARDS: Flashcard[] = [
  // Physics
  {
    id: 'phy-1',
    subject: 'Physics',
    chapter: 'Kinematics',
    title: 'Displacement in nth second',
    question: 'What is the formula for displacement traveled during the nth second under constant acceleration?',
    formula: 'S_n = u + (a / 2) * (2n - 1)',
    explanation: 'u is initial velocity, a is uniform acceleration, n is the specific second (e.g., 5th second).',
    trap: 'Only valid when acceleration is strictly CONSTANT. Units of (2n - 1) implicitly carry 1 second dimension.',
  },
  {
    id: 'phy-2',
    subject: 'Physics',
    chapter: 'Kinematics',
    title: 'Range of Projectile on Flat Ground',
    question: 'What is the horizontal range of a projectile fired at velocity u and angle θ?',
    formula: 'R = (u² * sin(2θ)) / g',
    explanation: 'Maximum range occurs at θ = 45°, where R_max = u² / g. Complementary angles (θ and 90°-θ) yield equal range.',
    trap: 'Only valid when launch and landing heights are the same. On inclined planes, this formula does not apply.',
  },
  {
    id: 'phy-3',
    subject: 'Physics',
    chapter: 'Laws of Motion',
    title: 'Banking of Roads without Friction',
    question: 'What is the ideal safe speed of a vehicle on a road banked at angle θ with curvature radius r?',
    formula: 'v = √(r * g * tan(θ))',
    explanation: 'The horizontal component of the normal force (N * sin(θ)) provides the entire centripetal force required.',
    trap: 'If road has friction coefficient μ, maximum speed is v_max = √[ r * g * (tan(θ) + μ) / (1 - μ * tan(θ)) ].',
  },
  {
    id: 'phy-4',
    subject: 'Physics',
    chapter: 'Work, Energy & Power',
    title: 'Work-Energy Theorem',
    question: 'What is the net work done on a particle equal to?',
    formula: 'W_net = ΔK = (1/2) * m * (v_f² - v_i²)',
    explanation: 'W_net includes work done by ALL forces: conservative, non-conservative, internal, and external.',
    trap: 'Do not neglect negative work done by friction. Work is frame-dependent because displacement depends on frame.',
  },
  {
    id: 'phy-5',
    subject: 'Physics',
    chapter: 'Gravitation',
    title: 'Escape Velocity from Planet Surface',
    question: 'What velocity is required for an object to escape the gravitational pull of mass M and radius R?',
    formula: 'v_e = √(2 * G * M / R) = √(2 * g * R)',
    explanation: 'Derived by equating total mechanical energy (Kinetic + Gravitational Potential) to zero at infinity.',
    trap: 'Escape velocity is completely independent of the projected object’s mass or launch angle (ignoring atmosphere).',
  },
  {
    id: 'phy-6',
    subject: 'Physics',
    chapter: 'Oscillations',
    title: 'Time Period of Simple Pendulum',
    question: 'What is the time period of a simple pendulum of length L in gravitational field g?',
    formula: 'T = 2π * √(L / g)',
    explanation: 'Independent of mass of bob and amplitude, as long as angular displacement θ remains small (< 10°).',
    trap: 'In an accelerating elevator with upward acceleration a, effective gravity is g_eff = (g + a).',
  },

  // Chemistry
  {
    id: 'chem-1',
    subject: 'Chemistry',
    chapter: 'Some Basic Concepts',
    title: 'Molarity vs Molality',
    question: 'What are the defining formulas for Molarity (M) and Molality (m)?',
    formula: 'M = moles of solute / Volume of solution (L)\nm = moles of solute / Mass of solvent (kg)',
    explanation: 'Molarity depends on temperature because solution volume expands with heat. Molality is temperature-independent.',
    trap: 'Remember the denominator in Molality is mass of SOLVENT in kg, NOT mass of the solution!',
  },
  {
    id: 'chem-2',
    subject: 'Chemistry',
    chapter: 'Structure of Atom',
    title: 'De Broglie Wavelength',
    question: 'What is the wavelength associated with a particle of mass m moving with velocity v (or momentum p)?',
    formula: 'λ = h / p = h / (m * v) = h / √(2 * m * K)',
    explanation: 'h is Planck’s constant (6.626 × 10⁻³⁴ J·s). K is kinetic energy of the charged particle.',
    trap: 'For an electron accelerated through potential difference V volts: λ ≈ 1.227 / √V nm (or 12.27 / √V Å).',
  },
  {
    id: 'chem-3',
    subject: 'Chemistry',
    chapter: 'Thermodynamics',
    title: 'Gibbs Free Energy & Spontaneity',
    question: 'What is the criterion for spontaneity at constant temperature and pressure?',
    formula: 'ΔG = ΔH - T * ΔS',
    explanation: 'ΔG < 0 (spontaneous process), ΔG = 0 (equilibrium), ΔG > 0 (non-spontaneous process).',
    trap: 'T must be expressed in absolute Kelvin. Watch unit mismatches: ΔH is often in kJ/mol, but ΔS in J/(mol·K).',
  },
  {
    id: 'chem-4',
    subject: 'Chemistry',
    chapter: 'Equilibrium',
    title: 'Relationship Between Kp and Kc',
    question: 'How are the gaseous equilibrium constants Kp and Kc related?',
    formula: 'K_p = K_c * (R * T)^(Δn_g)',
    explanation: 'Δn_g = (moles of gaseous products) - (moles of gaseous reactants). R = 0.0821 L·atm/(mol·K).',
    trap: 'Pure solids (s) and pure liquids (l) are omitted from Δn_g calculation! If Δn_g = 0, then K_p = K_c.',
  },
  {
    id: 'chem-5',
    subject: 'Chemistry',
    chapter: 'Equilibrium',
    title: 'pH of Weak Acid Solution',
    question: 'What is the approximate formula for [H+] and pH of weak monobasic acid with concentration C and dissociation constant Ka?',
    formula: '[H⁺] = √(K_a * C)  ⟹  pH = (1/2) * (pK_a - log(C))',
    explanation: 'Degree of dissociation α = √(K_a / C), valid when α < 0.05 (Ostwald’s dilution law approximation).',
    trap: 'If calculated α > 0.05, you must use the full quadratic equation: K_a = C * α² / (1 - α).',
  },

  // Mathematics
  {
    id: 'math-1',
    subject: 'Mathematics',
    chapter: 'Trigonometric Functions',
    title: 'Sum & Difference Formulas',
    question: 'What is the expansion for sin(A + B) and cos(A + B)?',
    formula: 'sin(A + B) = sin(A)cos(B) + cos(A)sin(B)\ncos(A + B) = cos(A)cos(B) - sin(A)sin(B)',
    explanation: 'Note the sign switch in cosine: cos(A + B) features a minus sign, while cos(A - B) features a plus.',
    trap: 'tan(A + B) = [tan(A) + tan(B)] / [1 - tan(A)tan(B)]. Valid only when neither A, B, nor (A+B) is (2n+1)π/2.',
  },
  {
    id: 'math-2',
    subject: 'Mathematics',
    chapter: 'Trigonometric Functions',
    title: 'Half-Angle Transformation in Terms of Tan',
    question: 'How do you express sin(2θ) and cos(2θ) purely in terms of tan(θ)?',
    formula: 'sin(2θ) = 2tan(θ) / (1 + tan²(θ))\ncos(2θ) = (1 - tan²(θ)) / (1 + tan²(θ))',
    explanation: 'Invaluable for algebraic substitutions in calculus and solving trigonometric equations.',
    trap: 'Note the denominator sign: tan(2θ) has (1 - tan²(θ)) in denominator, whereas sin(2θ) has (1 + tan²(θ)).',
  },
  {
    id: 'math-3',
    subject: 'Mathematics',
    chapter: 'Complex Numbers',
    title: 'Euler’s Form & Modulus-Amplitude Form',
    question: 'How is a complex number z = x + iy represented in exponential polar form?',
    formula: 'z = r * e^(iθ) = r * (cos(θ) + i * sin(θ))',
    explanation: 'r = |z| = √(x² + y²). θ = arg(z) ∈ (-π, π] is the principal argument.',
    trap: 'Always check which quadrant (x, y) falls in before writing θ = arctan(y/x). Q2 is π - α, Q3 is -π + α, Q4 is -α.',
  },
  {
    id: 'math-4',
    subject: 'Mathematics',
    chapter: 'Permutations & Combinations',
    title: 'Pascal’s Identity',
    question: 'What is the sum of two consecutive binomial coefficients n_C_r + n_C_(r-1)?',
    formula: 'ⁿC_r + ⁿC_(r-1) = ⁿ⁺¹C_r',
    explanation: 'Combinatorial interpretation: dividing choices into groups containing a specific object vs excluding it.',
    trap: 'The upper index increments to n+1, while the lower index takes the MAXIMUM of {r, r-1} = r.',
  },
  {
    id: 'math-5',
    subject: 'Mathematics',
    chapter: 'Limits & Derivatives',
    title: 'Standard Trigonometric Limit',
    question: 'What is the limit of sin(x) / x as x approaches 0, and what must x be measured in?',
    formula: 'lim_(x → 0) [sin(x) / x] = 1',
    explanation: 'Similarly: lim_(x → 0) [tan(x) / x] = 1, and lim_(x → 0) [(1 - cos(x)) / x²] = 1/2.',
    trap: 'x MUST be in RADIANS! If x is given in degrees: lim_(x° → 0) [sin(x°) / x°] = π / 180.',
  },
];

const STORAGE_KEY = 'backlogos-mastered-flashcards-v1';

export function Flashcards() {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Mastered' | 'Practicing'>('All');
  const [search, setSearch] = useState('');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Mastered state stored in localStorage
  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggleMastered = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMasteredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCards = useMemo(() => {
    return PCM_FLASHCARDS.filter((card) => {
      const matchSub = selectedSubject === 'All' || card.subject === selectedSubject;
      const isMastered = masteredIds.includes(card.id);
      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Mastered' && isMastered) ||
        (statusFilter === 'Practicing' && !isMastered);

      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        card.title.toLowerCase().includes(q) ||
        card.chapter.toLowerCase().includes(q) ||
        card.formula.toLowerCase().includes(q) ||
        card.question.toLowerCase().includes(q);

      return matchSub && matchStatus && matchSearch;
    });
  }, [selectedSubject, statusFilter, search, masteredIds]);

  const stats = useMemo(() => {
    const total = PCM_FLASHCARDS.length;
    const mastered = masteredIds.length;
    return {
      total,
      mastered,
      pct: Math.round((mastered / total) * 100),
    };
  }, [masteredIds]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 font-sans">
      {/* Header */}
      <div className="border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                Active Recall Engine
              </span>
              <span className="rounded border border-border bg-muted/40 px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                CBSE Core Formulas
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
              Smart Formula Flashcards
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Spaced repetition formula cards with derivations, unit hygiene, and frequent test traps.
            </p>
          </div>

          {/* Mastery meter */}
          <div className="border border-border bg-background p-3.5 text-xs font-mono shrink-0 sm:min-w-[180px] space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground block font-bold">Formula Mastery</span>
              <span className="font-bold text-xs text-foreground flex items-center gap-1">
                {stats.pct}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full progress-bar-smooth"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground block text-right font-normal">
              {stats.mastered} of {stats.total} Mastered
            </span>
          </div>
        </div>

        {/* Controls: Search & Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between font-mono text-xs">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search formula or chapter..."
              className="h-8 pl-8 text-xs font-mono rounded border border-border bg-background text-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Subject buttons */}
            {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded px-2.5 py-1 text-xs transition active:scale-95 ${
                  selectedSubject === sub
                    ? 'bg-foreground text-background font-bold shadow-2xs'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {sub}
              </button>
            ))}

            <div className="h-3 w-px bg-border mx-1" />

            {/* Status buttons */}
            {(['All', 'Mastered', 'Practicing'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded px-2 py-1 text-xs transition active:scale-95 ${
                  statusFilter === st
                    ? 'bg-foreground text-background font-bold shadow-2xs'
                    : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards Grid with True 3D Flip */}
      {filteredCards.length === 0 ? (
        <div className="border border-border bg-card p-12 text-center text-muted-foreground font-mono">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-semibold text-foreground">No flashcards found</p>
          <p className="text-xs text-muted-foreground mt-1">Try resetting your search query or subject filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => {
            const isFlipped = flippedCards[card.id];
            const isMastered = masteredIds.includes(card.id);

            return (
              <div
                key={card.id}
                className="flashcard-scene min-h-[250px] select-none"
              >
                <div
                  onClick={() => toggleFlip(card.id)}
                  className={`flashcard-inner relative w-full h-full cursor-pointer rounded-md card-interactive ${
                    isFlipped ? 'is-flipped' : ''
                  }`}
                >
                  {/* FRONT FACE (Prompt / Question) */}
                  <div
                    className={`flashcard-face absolute inset-0 flex flex-col justify-between rounded-md border p-4.5 transition-all duration-200 ${
                      isMastered
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-border bg-card hover:border-foreground/35'
                    }`}
                  >
                    <div>
                      {/* Card Top badges */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] uppercase font-bold text-foreground">
                            {card.subject}
                          </span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[130px]">
                            {card.chapter}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => toggleMastered(card.id, e)}
                          className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono transition-all duration-150 active:scale-90 ${
                            isMastered
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <CheckCircle2 size={12} className={isMastered ? 'text-emerald-500 animate-check-pop' : ''} />
                          <span>{isMastered ? 'Mastered' : 'Mark done'}</span>
                        </button>
                      </div>

                      {/* Question */}
                      <div className="py-3">
                        <h4 className="text-xs font-bold text-foreground mb-1.5">
                          {card.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {card.question}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/50 pt-2">
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Prompt
                      </span>
                      <span className="flex items-center gap-1 group-hover:text-foreground transition font-medium">
                        <RotateCw size={10} /> Click to flip 3D
                      </span>
                    </div>
                  </div>

                  {/* BACK FACE (Formula & Explanation) */}
                  <div
                    className={`flashcard-face flashcard-face-back absolute inset-0 flex flex-col justify-between rounded-md border p-4.5 transition-all duration-200 ${
                      isMastered
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-foreground/30 bg-muted/20'
                    }`}
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={11} />
                          <span>ANSWER & DERIVATION</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => toggleMastered(card.id, e)}
                          className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-mono transition-all duration-150 active:scale-90 ${
                            isMastered
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <CheckCircle2 size={12} className={isMastered ? 'text-emerald-500 animate-check-pop' : ''} />
                          <span>{isMastered ? 'Mastered' : 'Mark done'}</span>
                        </button>
                      </div>

                      {/* Formula & Explanation */}
                      <div className="py-2.5 space-y-2">
                        <div className="rounded border border-border bg-background p-2 font-mono text-xs font-bold text-foreground whitespace-pre-line shadow-2xs">
                          {card.formula}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {card.explanation}
                        </p>
                        {card.trap && (
                          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-1.5 text-[10px] font-mono text-amber-700 dark:text-amber-300">
                            ⚠️ Trap: {card.trap}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/50 pt-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Answer revealed</span>
                      <span className="flex items-center gap-1 hover:text-foreground transition font-medium">
                        <RotateCw size={10} /> Flip back
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
