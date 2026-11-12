import { useState, useMemo } from 'react';
import {
  GitFork,
  RotateCcw,
  BookOpen,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Play,
  Bookmark,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';

export function LinearFeatureInteractiveScreenshots() {
  const [activeFeatureTab, setActiveFeatureTab] = useState<'prereq' | 'recovery' | 'recall' | 'runway'>('prereq');

  // Feature 1 State: Selected Prerequisite Node
  const [selectedNode, setSelectedNode] = useState<number>(4); // Rotational Dynamics by default

  // Feature 2 State: Missed Hours Simulation
  const [missedHours, setMissedHours] = useState<number>(3);
  const [isRebalanced, setIsRebalanced] = useState<boolean>(true);

  // Feature 3 State: Visual Formula Branch Selection
  const [selectedBranch, setSelectedBranch] = useState<'flux' | 'sphere' | 'wire'>('flux');

  // Feature 4 State: Daily Target Slider
  const [dailyHours, setDailyHours] = useState<number>(3.5);

  // Derived calculations for Feature 4:
  const runwayCalculation = useMemo(() => {
    const totalBacklog = 84; // hours
    const daysNeeded = Math.ceil(totalBacklog / dailyHours);
    const examDaysRemaining = 32; // days to exam
    const bufferDays = examDaysRemaining - daysNeeded;
    const isOnTrack = bufferDays >= 0;

    const today = new Date();
    const completionDate = new Date(today);
    completionDate.setDate(today.getDate() + daysNeeded);

    const completionDateStr = completionDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      daysNeeded,
      bufferDays,
      isOnTrack,
      completionDateStr,
    };
  }, [dailyHours]);

  return (
    <section className="border-b border-border/80 bg-background py-16 sm:py-24 font-sans">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-10">
        {/* Section Header with Linear style tags */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Sparkles size={12} className="text-foreground" />
            <span>Interactive Feature Previews</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground font-sans">
            How BacklogOS helps you catch up.
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Try out interactive demos of how BacklogOS sorts your chapters, catches you up when you miss a day, and predicts your exact syllabus finish date.
          </p>
        </div>

        {/* Feature Selector Tabs (Linear style pill bar) */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 p-1 shadow-2xs shrink-0 mx-auto sm:mx-0 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveFeatureTab('prereq')}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all duration-150 ${
                activeFeatureTab === 'prereq'
                  ? 'bg-background text-foreground font-semibold shadow-xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <GitFork size={13} />
              <span>01. Chapter Order (Basics First)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFeatureTab('recovery')}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all duration-150 ${
                activeFeatureTab === 'recovery'
                  ? 'bg-background text-foreground font-semibold shadow-xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <RotateCcw size={13} />
              <span>02. Missed Day Catch-Up</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFeatureTab('recall')}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all duration-150 ${
                activeFeatureTab === 'recall'
                  ? 'bg-background text-foreground font-semibold shadow-xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Layers size={13} />
              <span>03. Best Lectures &amp; Mind Maps</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFeatureTab('runway')}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 font-medium transition-all duration-150 ${
                activeFeatureTab === 'runway'
                  ? 'bg-background text-foreground font-semibold shadow-xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <TrendingDown size={13} />
              <span>04. Exact Finish Date</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FEATURE 01: PREREQUISITE GRAPH (Interactive Animated Mockup Window) */}
        {/* ========================================================================= */}
        {activeFeatureTab === 'prereq' && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-page-enter">
            {/* Window Bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
                <div className="h-3 w-px bg-border mx-1" />
                <span>backlogos://graph-engine/cbse-physics-dependencies</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                Click any node to inspect foundations
              </span>
            </div>

            {/* Window Content */}
            <div className="p-5 sm:p-7 space-y-6">
              <div className="max-w-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Smart Chapter Order
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  Basics First: Learn Step-by-Step
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  Never jump into hard topics like Rotational Motion before mastering basic Vectors and Newton's Laws. BacklogOS puts chapters in the natural order so you learn faster without getting confused.
                </p>
              </div>

              {/* Interactive Node Graph */}
              <div className="rounded-lg border border-border/80 bg-background/60 p-4 sm:p-6 space-y-5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Foundational Dependency Pipeline</span>
                  <span className="text-foreground font-semibold">Physics Mechanics Core</span>
                </div>

                {/* Nodes Chain */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-center">
                  {[
                    { id: 1, title: 'Vectors & Calc', tag: 'Core Math', status: 'Completed', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                    { id: 2, title: 'Kinematics 1D/2D', tag: 'Prerequisite', status: 'Completed', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                    { id: 3, title: "Newton's Laws", tag: 'Foundation', status: 'In Progress', color: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                    { id: 4, title: 'Work, Energy', tag: 'Bridge', status: 'Ready', color: 'border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
                    { id: 5, title: 'Rotational Motion', tag: 'High-Debt', status: 'Locked', color: 'border-border bg-muted/40 text-muted-foreground' },
                  ].map((node, index) => {
                    const isSelected = selectedNode === node.id;
                    return (
                      <div key={node.id} className="relative flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setSelectedNode(node.id)}
                          className={`w-full rounded-md border p-3 text-left transition-all duration-200 card-interactive ${
                            isSelected
                              ? 'ring-2 ring-foreground border-foreground bg-card shadow-sm'
                              : 'border-border bg-card/80 hover:border-foreground/30'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-muted-foreground">0{node.id}</span>
                            <span className={`px-1 rounded text-[9px] font-bold border ${node.color}`}>
                              {node.status}
                            </span>
                          </div>
                          <div className="font-semibold text-xs text-foreground mt-1 truncate">
                            {node.title}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {node.tag}
                          </div>
                        </button>

                        {/* Connector arrow on mobile / tablet */}
                        {index < 4 && (
                          <div className="sm:hidden py-1 text-muted-foreground">
                            ↓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Node Inspector Callout */}
                <div className="rounded-md border border-border bg-muted/20 p-4 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-bold text-foreground">
                      Node Inspector: {selectedNode === 5 ? 'System of Particles & Rotational Dynamics' : selectedNode === 4 ? 'Work, Energy & Power' : selectedNode === 3 ? "Newton's Laws of Motion" : selectedNode === 2 ? 'Kinematics: Motion in a Straight Line' : 'Mathematical Tools: Vectors & Calculus'}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {selectedNode >= 3 ? 'Exam Weight: 7–8 Marks' : 'Tooling Foundation'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] leading-relaxed">
                    <div>
                      <span className="text-muted-foreground uppercase text-[10px] block">Prerequisite Requirements:</span>
                      <p className="text-foreground mt-0.5">
                        {selectedNode === 5
                          ? "⚠️ Requires: Torque vectors (Ch 1) and Center of mass calculus (Ch 4). Studied out of order leads to 78% failure rate in PYQs."
                          : selectedNode === 4
                          ? "✓ Vectors scalar dot product verified. Conservation laws ready to schedule."
                          : "Foundational baseline chapter. Safe to study without dependencies."}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground uppercase text-[10px] block">BacklogOS Algorithm Action:</span>
                      <p className="text-foreground mt-0.5">
                        {selectedNode === 5
                          ? "🛡️ Automatically held in queue until Work-Energy completed. Guarantees true comprehension."
                          : "Scheduled in today's daily 60-minute recovery block."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FEATURE 02: MISSED DAY REBALANCER (Interactive Animated Mockup Window) */}
        {/* ========================================================================= */}
        {activeFeatureTab === 'recovery' && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-page-enter">
            {/* Window Bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
                <div className="h-3 w-px bg-border mx-1" />
                <span>backlogos://rebalancer/adaptive-buffer-simulation</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                Interactive Catch-up Simulation
              </span>
            </div>

            {/* Window Content */}
            <div className="p-5 sm:p-7 space-y-6">
              <div className="max-w-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Stress-Free Catch-Up
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  Catch Up Easily When You Miss a Day
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  When you fall sick or have school exams, paper timetables expect you to study 14 hours the next day. BacklogOS gently spreads missed hours across upcoming days so you stay on track without burnout.
                </p>
              </div>

              {/* Simulation Controls */}
              <div className="rounded-lg border border-border bg-background p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                      Step 1: Choose Missed Study Session
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Simulate a Tuesday interruption (e.g. school exam or illness)
                    </span>
                  </div>

                  {/* Buttons to select missed hours */}
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    {[1.5, 3.0, 4.5].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => {
                          setMissedHours(hrs);
                          setIsRebalanced(true);
                        }}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                          missedHours === hrs
                            ? 'bg-foreground text-background font-bold'
                            : 'border border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {hrs}h Missed
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comparative Redistribution Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Old Static Apps */}
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                      <AlertCircle size={15} />
                      <span>Traditional Planners (Burnout)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Dumps {missedHours} hours on Wednesday. Student is expected to study 8–10 hours in one day. Plan breaks within 48 hours.
                    </p>
                    <div className="rounded border border-rose-500/20 bg-background/80 p-2.5 text-center">
                      <span className="text-[10px] text-muted-foreground block">WEDNESDAY LOAD</span>
                      <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {3.5 + missedHours} Hours (Unrealistic)
                      </span>
                    </div>
                  </div>

                  {/* BacklogOS Algorithm */}
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 size={15} />
                      <span>BacklogOS Algorithm (Guilt-Free)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Redistributes {missedHours}h smoothly as +{Math.round((missedHours * 60) / 7)} mins across 7 future buffer days. Exam date protected!
                    </p>
                    <div className="rounded border border-emerald-500/20 bg-background/80 p-2.5 text-center">
                      <span className="text-[10px] text-muted-foreground block">DAILY BUFFER SHIFT</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        +20 mins / day · 0 Days Lost
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Buffer Visualization */}
                <div className="rounded-md border border-border bg-muted/20 p-3.5 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground uppercase">7-Day Adaptive Schedule Runway:</span>
                    <span className="text-foreground font-bold">Exam Date: Feb 28, 2027 (On Schedule)</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 pt-1 text-center text-[10px]">
                    {['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'].map((day, idx) => (
                      <div key={day} className="rounded border border-border bg-card p-2">
                        <span className="text-muted-foreground block">{day}</span>
                        <span className="font-bold text-foreground mt-0.5 block">
                          3.5h <span className="text-emerald-500 text-[9px] font-normal">+{Math.round((missedHours * 60) / 7)}m</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FEATURE 03: LECTURES & 3D ACTIVE RECALL (Interactive Animated Mockup Window) */}
        {/* ========================================================================= */}
        {activeFeatureTab === 'recall' && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-page-enter">
            {/* Window Bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
                <div className="h-3 w-px bg-border mx-1" />
                <span>backlogos://learning/curated-lectures-and-spaced-cards</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                Click card to flip 3D derivation
              </span>
            </div>

            {/* Window Content */}
            <div className="p-5 sm:p-7 space-y-6">
              <div className="max-w-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  High-Yield Retention Layer
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  Curated Lectures & Spaced Recall Decks
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  Stop browsing YouTube for 40 minutes looking for a good explanation. Every task links directly to vetted one-shots and tests formula mastery at optimal forgetting curve decay points.
                </p>
              </div>

              {/* Interactive Dual Showcase: Left Lecture, Right Interactive Visual Formula & Concept Map */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Curated Free Lecture Card */}
                <div className="rounded-lg border border-border bg-card p-4 space-y-3.5 card-interactive">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Bookmark size={13} className="text-sky-500" />
                      In-Task NCERT Breakdown
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-muted/50 border border-border text-[10px] text-muted-foreground">
                      52 min · Verified
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      Physics Galaxy: Motion in a Straight Line Full Line-by-Line
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Curated by Ashish Arora · Covers CBSE board derivations, HC Verma concept traps, and NCERT exemplars.
                    </p>
                  </div>

                  {/* Timestamp Markers */}
                  <div className="rounded border border-border bg-muted/20 p-2.5 text-[11px] font-mono space-y-1.5 text-muted-foreground">
                    <div className="flex items-center justify-between hover:text-foreground cursor-pointer">
                      <span>▶ 00:00 Instantaneous vs Average Velocity</span>
                      <span className="text-[10px]">NCERT §3.2</span>
                    </div>
                    <div className="flex items-center justify-between hover:text-foreground cursor-pointer">
                      <span>▶ 18:40 Calculus Kinematic Equation Derivations</span>
                      <span className="text-[10px] font-semibold text-foreground">3 Marks Traps</span>
                    </div>
                    <div className="flex items-center justify-between hover:text-foreground cursor-pointer">
                      <span>▶ 38:15 Relative Velocity in 1D & Graphs</span>
                      <span className="text-[10px]">Exemplar PYQ</span>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground font-mono">Direct board focus</span>
                    <span className="inline-flex items-center gap-1 text-foreground font-medium hover:underline text-xs">
                      <span>Open in Study Room</span>
                      <ExternalLink size={11} />
                    </span>
                  </div>
                </div>

                {/* 2. Interactive Visual Formula & Concept Mind Map Preview */}
                <div className="rounded-lg border border-border bg-muted/15 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-border/60">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Layers size={13} className="text-amber-500" />
                      Visual Formula Map · Physics
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Electrostatics
                    </span>
                  </div>

                  <div className="my-3 rounded-lg border border-border bg-card p-4 space-y-2.5">
                    <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold block">
                      {selectedBranch === 'flux' && 'Gauss’s Law Core Relation'}
                      {selectedBranch === 'sphere' && 'Uniformly Charged Shell'}
                      {selectedBranch === 'wire' && 'Infinite Line Charge'}
                    </span>
                    <div className="font-mono text-sm sm:text-base font-bold text-foreground bg-muted/40 px-3 py-1.5 rounded border border-border">
                      {selectedBranch === 'flux' && 'Φ = ∮ E · dA = Q_enclosed / ε₀'}
                      {selectedBranch === 'sphere' && 'E_inside = 0  |  E_out = kQ / r²'}
                      {selectedBranch === 'wire' && 'E = λ / (2π ε₀ r)'}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedBranch === 'flux' && 'Trap: Flux depends only on enclosed charge, never on Gaussian surface shape.'}
                      {selectedBranch === 'sphere' && 'Trap: Electric field jumps discontinuously across the conducting surface at r = R.'}
                      {selectedBranch === 'wire' && 'Trap: Always use cylindrical symmetry for linear charge density λ.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 font-mono text-[10px] pt-1">
                    <span className="text-muted-foreground">Inspect Branch:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedBranch('flux')}
                        className={`rounded px-2 py-1 border border-border hover:bg-muted transition ${selectedBranch === 'flux' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold' : ''}`}
                      >
                        Gauss Flux
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBranch('sphere')}
                        className={`rounded px-2 py-1 border border-border hover:bg-muted transition ${selectedBranch === 'sphere' ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold' : ''}`}
                      >
                        Shell
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedBranch('wire')}
                        className={`rounded px-2 py-1 border border-border hover:bg-muted transition ${selectedBranch === 'wire' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold' : ''}`}
                      >
                        Wire
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FEATURE 04: VELOCITY COUNTDOWN DIAL (Interactive Animated Mockup Window) */}
        {/* ========================================================================= */}
        {activeFeatureTab === 'runway' && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-page-enter">
            {/* Window Bar */}
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
                <div className="h-3 w-px bg-border mx-1" />
                <span>backlogos://predictive-velocity/board-countdown-calculator</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                Drag slider to test completion pace
              </span>
            </div>

            {/* Window Content */}
            <div className="p-5 sm:p-7 space-y-6">
              <div className="max-w-xl">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Syllabus Finish Date
                </span>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                  When Will You Finish Your Syllabus?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  No guessing or false hopes. Move the slider below to see how many study hours per day you need to finish your entire backlog before board exams.
                </p>
              </div>

              {/* Interactive Velocity Dial Window */}
              <div className="rounded-lg border border-border bg-background p-4 sm:p-6 space-y-5">
                {/* Interactive Slider Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground uppercase text-[11px]">
                      Your Daily Study Commitment:
                    </span>
                    <span className="font-bold text-base text-foreground bg-muted/50 px-2.5 py-0.5 rounded border border-border">
                      {dailyHours.toFixed(1)} Hours / Day
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1.5"
                    max="5.0"
                    step="0.5"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground transition-all"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>1.5h (Light)</span>
                    <span>2.5h (Balanced)</span>
                    <span>3.5h (Recommended)</span>
                    <span>5.0h (Sprint)</span>
                  </div>
                </div>

                {/* Live Output Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs border-t border-border/60 pt-4">
                  <div className="rounded border border-border bg-card p-3 space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground block">Finish Date</span>
                    <span className="font-bold text-sm text-foreground block truncate">
                      {runwayCalculation.completionDateStr}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {runwayCalculation.daysNeeded} days needed
                    </span>
                  </div>

                  <div className="rounded border border-border bg-card p-3 space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground block">Buffer Margin</span>
                    <span className={`font-bold text-sm block ${runwayCalculation.isOnTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {runwayCalculation.bufferDays >= 0 ? `+${runwayCalculation.bufferDays} Days Buffer` : `${runwayCalculation.bufferDays} Days Behind`}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      vs Feb 28 Exam
                    </span>
                  </div>

                  <div className="rounded border border-border bg-card p-3 space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground block">Pace Status</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-2 w-2 rounded-full ${runwayCalculation.isOnTrack ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="font-bold text-xs text-foreground">
                        {runwayCalculation.isOnTrack ? 'ON TRACK' : 'AT RISK'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Real-time algorithm
                    </span>
                  </div>

                  <div className="rounded border border-border bg-card p-3 space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground block">Syllabus Runway</span>
                    <span className="font-bold text-sm text-foreground block">
                      84h / {Math.round(84 / dailyHours)} Blocks
                    </span>
                    <span className="text-[10px] text-emerald-500 block">
                      100% Cleared
                    </span>
                  </div>
                </div>

                {/* Visual Trajectory Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>CLEARANCE COMPLETION CURVE</span>
                    <span>TARGET: 0H BACKLOG</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((dailyHours / 5.0) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom CTA to start wizard */}
        <div className="pt-2 text-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 text-xs font-mono font-medium text-foreground hover:underline transition"
          >
            <span>Launch your personal BacklogOS syllabus map</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
