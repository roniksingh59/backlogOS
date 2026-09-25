import { useState } from 'react';
import {
  Printer,
  X,
  Copy,
  Check,
  FileDown,
  Sparkles,
  BookOpen,
  Filter,
} from 'lucide-react';
import { chapters } from '@/lib/backlog-data';

interface RevisionCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSubject?: string;
}

export function RevisionCheatSheetModal({
  isOpen,
  onClose,
  initialSubject = 'All',
}: RevisionCheatSheetModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} aria-label="Close modal" />

      <div className="relative w-full max-w-4xl rounded-3xl border border-primary/40 bg-[#080d1a] shadow-2xl p-5 sm:p-7 max-h-[94vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
              <Printer size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white">
                  PCM Revision Cheat-Sheet & Print Export
                </h3>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                  1-Page Pocket Card
                </span>
              </div>
              <p className="text-xs text-slate-400">
                High-density formulas, boundary conditions, and trap warnings formatted for clipboard or desk pasting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-primary/90 transition"
              data-testid="button-print-cheat-sheet"
            >
              <Printer size={14} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills (Hidden on Print) */}
        <div className="flex items-center gap-2 border-b border-slate-800 py-3 print:hidden">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Filter size={13} /> Filter:
          </span>
          {['All', 'Physics', 'Chemistry', 'Mathematics'].map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                selectedSubject === sub
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Printable High-Yield Sheet Container */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 print:p-0 print:overflow-visible print:text-black">
          
          {/* Print Title Header */}
          <div className="border-b border-slate-700 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-white print:text-black">
                BacklogOS · Class 11 PCM Master Recovery Sheet
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-600 font-mono mt-0.5">
                Target: High-Yield Formulas · Boundary Conditions · Negative Marking Traps
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-primary print:text-gray-800">
              Zero Backlog Cadet
            </span>
          </div>

          {/* Section 1: Physics */}
          {(selectedSubject === 'All' || selectedSubject === 'Physics') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 print:text-blue-700 uppercase font-mono tracking-wider">
                <span>⚡ PHYSICS: MECHANICS & DYNAMICS CORE</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Vectors & Relative Motion</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">$R = \sqrt{A^2 + B^2 + 2AB\cos\theta}$</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">$\tan\alpha = \frac{B\sin\theta}{A + B\cos\theta}$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Rain-Man: $\vec{v}_{rm} = \vec{v}_r - \vec{v}_m$. River-Boat: Drift $x = (v_r - v_b\sin\theta)\frac{d}{v_b\cos\theta}$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Newton’s Laws & Friction</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">$f_s \le \mu_s N$; $f_k = \mu_k N$</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">Banking: $v = \sqrt{rg\tan\theta}$ (frictionless)</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Trap: Static friction adjusts to applied force. Check if $F_{ext} > \mu_s N$ before using $\mu_k$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Work, Power, Energy</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">$W_{net} = \Delta K = \frac{1}{2}m(v_f^2 - v_i^2)$</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">$P = \vec{F}\cdot\vec{v} = \frac{dW}{dt}$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Spring: $U = \frac{1}{2}kx^2$; Work done by spring $= -\frac{1}{2}k(x_f^2 - x_i^2)$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Rotational Dynamics & Torque</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">$\tau = I\alpha = \vec{r}\times\vec{F}$; $L = I\omega$</p>
                  <p className="font-mono text-cyan-300 print:text-blue-900">Parallel Axis: $I = I_{cm} + Md^2$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Pure rolling: $v_{cm} = R\omega, a_{cm} = R\alpha$. Total $K = \frac{1}{2}Mv_{cm}^2(1 + k^2/R^2)$.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Chemistry */}
          {(selectedSubject === 'All' || selectedSubject === 'Chemistry') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 print:text-amber-800 uppercase font-mono tracking-wider">
                <span>🧪 CHEMISTRY: CORE LAWS & STRUCTURES</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Chemical Bonding & VSEPR</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">Steric No = $\sigma\text{ bonds} + \text{lone pairs}$</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">Bond Order $= \frac{1}{2}(N_b - N_a)$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Paramagnetic if unpaired electrons exist in MOT diagram ($O_2$ is paramagnetic with 2 unpaired $e^-$).</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Thermodynamics & Spontaneity</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">$\Delta U = q + w$ ($w = -P_{ext}\Delta V$)</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">$\Delta G = \Delta H - T\Delta S$ ($\Delta G < 0$ spontaneous)</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Isothermal free expansion into vacuum: $w = 0, q = 0, \Delta U = 0, \Delta T = 0$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Equilibrium & Buffers</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">$K_p = K_c(RT)^{\Delta n_g}$</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">$\text{pH} = pK_a + \log\frac{[\text{Salt}]}{[\text{Acid}]}$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Trap: Pure solids & liquids have active mass $= 1$. Do NOT include in $K_c$ or $K_p$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Redox & Oxidation States</p>
                  <p className="font-mono text-amber-300 print:text-amber-900">Eq. Wt $= \frac{\text{Molar Mass}}{n\text{-factor}}$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">$KMnO_4$ $n$-factor: acidic medium $= 5$, basic $= 1$, neutral/mild basic $= 3$.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Mathematics */}
          {(selectedSubject === 'All' || selectedSubject === 'Mathematics') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 print:text-green-800 uppercase font-mono tracking-wider">
                <span>📐 MATHEMATICS: IDENTITIES & CALCULUS ESSENTIALS</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Trigonometric Master Formulas</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$\sin 2\theta = 2\sin\theta\cos\theta = \frac{2\tan\theta}{1+\tan^2\theta}$</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$\cos 2\theta = 2\cos^2\theta - 1 = 1 - 2\sin^2\theta$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">$\sin C + \sin D = 2\sin\left(\frac{C+D}{2}\right)\cos\left(\frac{C-D}{2}\right)$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Quadratic & Sequence/Series</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$S_\infty = \frac{a}{1 - r}$ ($|r| < 1$)</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Sum of cubes: $\sum n^3 = \left(\frac{n(n+1)}{2}\right)^2$. Sum of squares: $\sum n^2 = \frac{n(n+1)(2n+1)}{6}$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Limits & Differentiation</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$\lim_{x\to 0}\frac{\sin x}{x} = 1$; $\lim_{x\to 0}\frac{a^x - 1}{x} = \ln a$</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$\frac{d}{dx}(\tan x) = \sec^2 x$; $\frac{d}{dx}(\sec x) = \sec x\tan x$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Product: $(uv)' = u'v + uv'$. Quotient: $(u/v)' = \frac{u'v - uv'}{v^2}$.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 print:bg-white print:border-gray-300 p-3 space-y-1">
                  <p className="font-bold text-white print:text-black">Binomial & Combinatorics</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$T_{r+1} = ^nC_r a^{n-r} b^r$</p>
                  <p className="font-mono text-emerald-300 print:text-green-900">$^nC_r + ^nC_{r-1} = ^{n+1}C_r$</p>
                  <p className="text-[11px] text-slate-400 print:text-gray-700">Number of terms in $(x+y)^n$ is $n+1$. Sum of binomial coefficients $= 2^n$.</p>
                </div>
              </div>
            </div>
          )}

          {/* Printable Footer */}
          <div className="border-t border-slate-800 pt-3 text-[10px] text-slate-500 print:text-gray-600 flex items-center justify-between">
            <span>Generated by BacklogOS for Class 11 PCM Aspirants</span>
            <span>Study with active recall · Test yourself every 45 minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
