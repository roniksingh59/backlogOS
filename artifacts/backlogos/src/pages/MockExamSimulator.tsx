import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  BarChart3,
  Flame,
  Award,
  RefreshCw,
  FileText,
  Clock,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';
import { readPlan, savePlan } from '@/lib/storage';
import { makePlan } from '@/lib/backlog-data';
import { logMistake } from '@/lib/test-log';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

export interface MockQuestion {
  id: string;
  section: 'A (MCQs)' | 'B (2M VSA)' | 'C (3M SA)' | 'D (4M Case Study)' | 'E (5M Long/Derivations)';
  marks: number;
  chapterId: string;
  chapterTitle: string;
  question: string;
  options?: string[];
  correctOption?: number;
  markingGuide: string;
  modelAnswer: string;
}

export interface MockPaper {
  id: string;
  title: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  classNum: 12;
  totalMarks: number;
  durationMinutes: number; // 180 for standard 3 hours, 45 for quick
  questions: MockQuestion[];
}

const SAMPLE_PAPERS: MockPaper[] = [
  {
    id: 'phy-board-full',
    title: 'CBSE Class 12 Physics Full Board Simulator',
    subject: 'Physics',
    classNum: 12,
    totalMarks: 70,
    durationMinutes: 180,
    questions: [
      {
        id: 'q1',
        section: 'A (MCQs)',
        marks: 1,
        chapterId: 'c12-phy-01',
        chapterTitle: 'Electric Charges and Fields',
        question:
          'Two charges +q and -q are separated by distance 2a. The electric potential at any point on the equatorial plane of the dipole is:',
        options: ['Zero', 'kq / a', '2kq / a', 'kq / (2a)'],
        correctOption: 0,
        markingGuide: '1 Mark for choosing (A) Zero. On equatorial plane, distances from +q and -q are identical: V = kq/r - kq/r = 0.',
        modelAnswer: 'Zero. Since equatorial points are equidistant from both equal and opposite charges, V_total = 0.',
      },
      {
        id: 'q2',
        section: 'A (MCQs)',
        marks: 1,
        chapterId: 'c12-phy-03',
        chapterTitle: 'Current Electricity',
        question:
          'When temperature of a metallic conductor is increased, its resistance increases primarily because:',
        options: [
          'Electron density n increases',
          'Relaxation time τ decreases due to more frequent lattice collisions',
          'Electron mass decreases',
          'Conductor length increases significantly',
        ],
        correctOption: 1,
        markingGuide: '1 Mark for Option B. ρ = m / (n e² τ). As T increases, lattice vibrations increase, reducing relaxation time τ.',
        modelAnswer: 'Relaxation time τ decreases due to increased lattice thermal vibration collisions.',
      },
      {
        id: 'q3',
        section: 'A (MCQs)',
        marks: 1,
        chapterId: 'c12-phy-09',
        chapterTitle: 'Ray Optics and Optical Instruments',
        question:
          'A convex lens of refractive index 1.5 is immersed in a liquid of refractive index 1.6. The lens will behave as:',
        options: ['A converging lens of greater focal length', 'A diverging lens', 'A glass slab without refraction', 'A mirror'],
        correctOption: 1,
        markingGuide: '1 Mark for (B). Since μ_medium > μ_lens, (μ_lens/μ_medium - 1) is negative, inverting lens power to diverging.',
        modelAnswer: 'A diverging lens. In Lens Maker’s formula, (μ₂/μ₁ - 1) becomes (1.5/1.6 - 1) < 0, flipping sign of focal length.',
      },
      {
        id: 'q4',
        section: 'B (2M VSA)',
        marks: 2,
        chapterId: 'c12-phy-04',
        chapterTitle: 'Moving Charges and Magnetism',
        question:
          'State Biot-Savart Law in vector form. Identify the direction of the magnetic field dB produced by an infinitesimal current element I dl at position r.',
        markingGuide: '1 Mark for dB = (μ₀/4π) · (I dl × r̂) / r²; 1 Mark for specifying direction perpendicular to the plane containing dl and r.',
        modelAnswer:
          'Biot-Savart Law vector form: dB = (μ₀ / 4π) · (I dl × r̂) / r².\nDirection is perpendicular to the plane containing dl and r, given by the right-hand screw rule.',
      },
      {
        id: 'q5',
        section: 'C (3M SA)',
        marks: 3,
        chapterId: 'c12-phy-06',
        chapterTitle: 'Electromagnetic Induction',
        question:
          'A rectangular coil of N turns and area A rotates with uniform angular velocity ω in a uniform magnetic field B. Derive an expression for the instantaneous induced EMF in the coil.',
        markingGuide: '1M for magnetic flux Φ = NBA cos(ωt); 1M for applying Faraday law ε = -dΦ/dt; 1M for ε = NBAω sin(ωt) with peak EMF ε₀ = NBAω.',
        modelAnswer:
          'Magnetic flux through coil at time t: Φ = NBA cos(θ) = NBA cos(ωt).\nBy Faraday’s law of induction: ε = -dΦ/dt = -d/dt [ NBA cos(ωt) ] = NBAω sin(ωt).\nMaximum induced EMF ε₀ = NBAω.',
      },
      {
        id: 'q6',
        section: 'D (4M Case Study)',
        marks: 4,
        chapterId: 'c12-phy-14',
        chapterTitle: 'Semiconductor Electronics',
        question:
          'Case Study: A p-n junction diode is formed when p-type and n-type silicon crystals are metallurgically fused. In a half-wave rectifier, an AC voltage is applied across the diode in series with load resistance R_L.\n(a) Explain the formation of depletion region and barrier potential (2M).\n(b) Sketch the input and output waveforms across R_L (2M).',
        markingGuide: '1M for diffusion of holes & electrons creating immobile ions; 1M for electric field opposing further diffusion; 2M for input/output waveform sketches.',
        modelAnswer:
          '(a) Majority carriers diffuse across the junction (electrons from n to p, holes from p to n), leaving behind uncompensated immobile positive ions in n-region and negative ions in p-region. This builds a space-charge depletion region and barrier potential.\n(b) Input AC oscillates symmetrically; output across R_L conducts only during positive half-cycles.',
      },
      {
        id: 'q7',
        section: 'E (5M Long/Derivations)',
        marks: 5,
        chapterId: 'c12-phy-09',
        chapterTitle: 'Ray Optics and Optical Instruments',
        question:
          'Draw a labeled ray diagram of a compound microscope showing image formation at least distance of distinct vision D. Deduce an expression for its total magnifying power.',
        markingGuide: '2M for accurate ray diagram with objective and eyepiece lenses; 2M for m = m_o * m_e = (v_o/u_o)(1 + D/f_e); 1M for approximation m ≈ -(L/f_o)(D/f_e).',
        modelAnswer:
          'Objective produces real, inverted, magnified image A’B’. Eyepiece acts as simple magnifier producing virtual, erect, highly magnified final image A”B” at distance D.\nMagnifying power m = m_objective · m_eyepiece.\nm_o = v_o / u_o; m_e = (1 + D / f_e).\nTotal magnification m = (v_o / u_o) · (1 + D / f_e) ≈ -(L / f_o)(D / f_e), where L is tube length.',
      },
    ],
  },
  {
    id: 'chm-board-sprint',
    title: 'CBSE Class 12 Chemistry High-Yield Mock',
    subject: 'Chemistry',
    classNum: 12,
    totalMarks: 70,
    durationMinutes: 180,
    questions: [
      {
        id: 'cq1',
        section: 'A (MCQs)',
        marks: 1,
        chapterId: 'c12-chm-01',
        chapterTitle: 'Solutions',
        question: 'Which of the following aqueous solutions will exhibit the highest boiling point elevation?',
        options: ['0.1 M Glucose', '0.1 M NaCl', '0.1 M BaCl₂', '0.1 M Al₂(SO₄)₃'],
        correctOption: 3,
        markingGuide: '1 Mark for (D). ΔT_b = i · K_b · m. Al₂(SO₄)₃ produces 5 ions (i = 5), producing maximum boiling point elevation.',
        modelAnswer: '0.1 M Al₂(SO₄)₃ has van ’t Hoff factor i = 5 (2 Al³⁺ + 3 SO₄²⁻), giving the highest effective particle concentration.',
      },
      {
        id: 'cq2',
        section: 'B (2M VSA)',
        marks: 2,
        chapterId: 'c12-chm-03',
        chapterTitle: 'Chemical Kinetics',
        question: 'Define pseudo first order reaction with a suitable chemical equation.',
        markingGuide: '1M for definition (higher order reaction behaving as 1st order due to excess reactant); 1M for acid hydrolysis of ester equation.',
        modelAnswer:
          'A reaction that is of higher order under general kinetics but behaves as first order because one of the reactants is in large excess.\nExample: Acid hydrolysis of ethyl acetate: CH₃COOC₂H₅ + H₂O (excess) -> CH₃COOH + C₂H₅OH. Rate = k’ [CH₃COOC₂H₅].',
      },
      {
        id: 'cq3',
        section: 'C (3M SA)',
        marks: 3,
        chapterId: 'c12-chm-02',
        chapterTitle: 'Electrochemistry',
        question:
          'Calculate the EMF of the following cell at 298 K:\nMg(s) | Mg²⁺(0.001 M) || Cu²⁺(0.0001 M) | Cu(s)\nGiven: E°(Mg²⁺/Mg) = -2.37 V, E°(Cu²⁺/Cu) = +0.34 V.',
        markingGuide: '1M for E°_cell = 0.34 - (-2.37) = 2.71 V; 1M for Nernst equation E_cell = E° - (0.0591/2) log([Mg²⁺]/[Cu²⁺]); 1M for calculating E_cell = 2.68 V.',
        modelAnswer:
          'E°_cell = E°_cathode - E°_anode = +0.34 - (-2.37) = +2.71 V.\nCell reaction: Mg + Cu²⁺ -> Mg²⁺ + Cu (n = 2 electrons).\nNernst Equation: E_cell = E°_cell - (0.0591 / 2) log₁₀([Mg²⁺] / [Cu²⁺])\n= 2.71 - 0.02955 log₁₀(10⁻³ / 10⁻⁴) = 2.71 - 0.02955 log₁₀(10) = 2.71 - 0.02955 = 2.68 V.',
      },
      {
        id: 'cq4',
        section: 'E (5M Long/Derivations)',
        marks: 5,
        chapterId: 'c12-chm-08',
        chapterTitle: 'Aldehydes, Ketones and Carboxylic Acids',
        question:
          '(a) Write chemical equations and mechanisms for Aldol Condensation using Ethanal (3M).\n(b) How does Benzoic acid differ in acidity from 4-Nitrobenzoic acid? Explain with resonance structures (2M).',
        markingGuide: '2M for base-catalyzed enolate formation and nucleophilic attack; 1M for dehydration to crotonaldehyde; 2M for -NO₂ electron-withdrawing stabilization of carboxylate.',
        modelAnswer:
          '(a) 2 CH₃CHO + dil. NaOH -> CH₃-CH(OH)-CH₂-CHO (3-hydroxybutanal) --(heat)--> CH₃-CH=CH-CHO (But-2-enal + H₂O).\nMechanism: OH⁻ abstracts α-H forming resonance-stabilized enolate ion [:CH₂-CHO]⁻, which nucleophilically attacks carbonyl carbon of second ethanal.\n(b) 4-Nitrobenzoic acid is more acidic than Benzoic acid because the strongly electron-withdrawing nitro group (-I and -R effect) disperses negative charge on the carboxylate anion, stabilizing it.',
      },
    ],
  },
];

type QuestionStatus = 'unvisited' | 'not_answered' | 'answered' | 'review';

export function MockExamSimulator() {
  const { toast } = useToast();
  const [selectedPaper, setSelectedPaper] = useState<MockPaper>(SAMPLE_PAPERS[0]);
  const [examState, setExamState] = useState<'setup' | 'reading_time' | 'testing' | 'prescription'>('setup');
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // User answers
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [writtenNotes, setWrittenNotes] = useState<Record<string, string>>({});
  const [questionStatus, setQuestionStatus] = useState<Record<string, QuestionStatus>>({});

  // Timing
  const [secondsRemaining, setSecondsRemaining] = useState(180 * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [readingSecondsRemaining, setReadingSecondsRemaining] = useState(15 * 60);

  // Self Evaluation during prescription
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startExam = (fastMode = false) => {
    const duration = fastMode ? 45 * 60 : selectedPaper.durationMinutes * 60;
    setSecondsRemaining(duration);
    setExamState('testing');
    setIsPaused(false);

    // Initial question status
    const initialStatus: Record<string, QuestionStatus> = {};
    selectedPaper.questions.forEach((q, idx) => {
      initialStatus[q.id] = idx === 0 ? 'not_answered' : 'unvisited';
    });
    setQuestionStatus(initialStatus);
    setCurrentQIndex(0);
  };

  const startReadingTime = () => {
    setExamState('reading_time');
    setReadingSecondsRemaining(15 * 60);
  };

  // Timer effect
  useEffect(() => {
    if (examState === 'testing' && !isPaused) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (examState === 'reading_time') {
      timerRef.current = setInterval(() => {
        setReadingSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            startExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, isPaused]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const currentQuestion = selectedPaper.questions[currentQIndex];

  const handleSelectOption = (qId: string, optIdx: number) => {
    setMcqAnswers((prev) => ({ ...prev, [qId]: optIdx }));
    setQuestionStatus((prev) => ({
      ...prev,
      [qId]: 'answered',
    }));
  };

  const handleToggleReview = (qId: string) => {
    setQuestionStatus((prev) => {
      const current = prev[qId];
      const hasAnswer = mcqAnswers[qId] !== undefined || (writtenNotes[qId] && writtenNotes[qId].trim().length > 0);
      return {
        ...prev,
        [qId]: current === 'review' ? (hasAnswer ? 'answered' : 'not_answered') : 'review',
      };
    });
  };

  const handleNavigate = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= selectedPaper.questions.length) return;
    const targetQ = selectedPaper.questions[newIdx];
    setQuestionStatus((prev) => {
      if (prev[targetQ.id] === 'unvisited') {
        return { ...prev, [targetQ.id]: 'not_answered' };
      }
      return prev;
    });
    setCurrentQIndex(newIdx);
  };

  const handleSubmitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Initial scoring: MCQs auto-graded, subjective pre-filled with 50% for user self-grading
    const initialScores: Record<string, number> = {};
    selectedPaper.questions.forEach((q) => {
      if (q.type === 'mcq' || q.options) {
        const isCorrect = mcqAnswers[q.id] === q.correctOption;
        initialScores[q.id] = isCorrect ? q.marks : 0;
      } else {
        initialScores[q.id] = writtenNotes[q.id]?.trim() ? Math.round(q.marks * 0.7) : 0;
      }
    });

    setSelfScores(initialScores);
    setExamState('prescription');
    toast({
      title: 'Mock Exam Submitted! 📝',
      description: 'Your diagnostic results and post-exam recovery prescription are ready.',
    });
  };

  // Prescription Calculations
  const prescription = useMemo(() => {
    const totalMax = selectedPaper.questions.reduce((sum, q) => sum + q.marks, 0);
    const scored = selectedPaper.questions.reduce((sum, q) => sum + (selfScores[q.id] || 0), 0);
    const percentage = Math.round((scored / totalMax) * 100);

    // Chapter breakdowns
    const chapterLoss: Record<string, { title: string; lostMarks: number; maxMarks: number }> = {};
    selectedPaper.questions.forEach((q) => {
      const lost = q.marks - (selfScores[q.id] || 0);
      if (!chapterLoss[q.chapterId]) {
        chapterLoss[q.chapterId] = { title: q.chapterTitle, lostMarks: 0, maxMarks: 0 };
      }
      chapterLoss[q.chapterId].lostMarks += lost;
      chapterLoss[q.chapterId].maxMarks += q.marks;
    });

    const weakChapters = Object.entries(chapterLoss)
      .filter(([_, data]) => data.lostMarks > 0)
      .sort((a, b) => b[1].lostMarks - a[1].lostMarks);

    let predictedGrade = 'A1 (91-100%)';
    if (percentage < 33) predictedGrade = 'Essential Repeat (Fail)';
    else if (percentage < 50) predictedGrade = 'C2 / C1 (Passing)';
    else if (percentage < 70) predictedGrade = 'B2 / B1 (Moderate)';
    else if (percentage < 90) predictedGrade = 'A2 (Distinction)';

    return { totalMax, scored, percentage, weakChapters, predictedGrade };
  }, [selectedPaper, selfScores]);

  // Inject weak chapters into active BacklogOS Plan
  const handleInjectIntoPlan = () => {
    const activePlan = readPlan();
    if (!activePlan) {
      toast({
        title: 'No Active Plan Found',
        description: 'Create a plan in Onboarding first, or start a new recovery plan.',
        variant: 'destructive',
      });
      return;
    }

    const weakChapterIds = prescription.weakChapters.map(([id]) => id);
    const rawIds = activePlan.chapterIds || activePlan.plannedChapterIds || [];
    const updatedIds = Array.from(new Set([...rawIds, ...weakChapterIds]));

    const regenerated = makePlan({
      board: activePlan.board || 'CBSE Class 12',
      goal: activePlan.goal || 'Board Mock Recovery',
      priority: activePlan.priority || 'backlog recovery',
      confidence: activePlan.confidence || 'mixed',
      examDate: activePlan.examDate || '',
      minutesPerDay: activePlan.minutesPerDay || 240,
      subjects: activePlan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
      chapterIds: updatedIds,
      planDuration: activePlan.planDuration || 14,
    });

    savePlan(regenerated);

    // Also record test in Mistake Notebook
    logMistake({
      id: `mock-log-${Date.now()}`,
      testName: selectedPaper.title,
      subject: selectedPaper.subject,
      chapterIds: weakChapterIds,
      score: prescription.scored,
      maxMarks: prescription.totalMax,
      date: new Date().toISOString().split('T')[0],
      mistakes: {
        conceptual: Math.max(1, Math.round(prescription.weakChapters.length * 0.5)),
        calculation: 1,
        silly: 1,
        time_management: 1,
        unattempted: 0,
      },
      notes: `Automated Post-Mock diagnostic: ${prescription.percentage}% score. Weakest: ${prescription.weakChapters.map((w) => w[1].title).join(', ')}`,
      createdAt: new Date().toISOString(),
    });

    toast({
      title: 'Plan Updated! 🚀',
      description: `Injected ${weakChapterIds.length} weak chapters into your daily BacklogOS roadmap.`,
    });
  };

  // ----------------------------------------------------
  // RENDER: SETUP SCREEN
  // ----------------------------------------------------
  if (examState === 'setup') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
        <div className="space-y-3 text-center sm:text-left border-b border-border/80 pb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Timer size={13} />
            Official 3-Hour Board Mock Environment
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Timed Board Mock Simulator
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Simulate the exact pressure, question distribution, and marking structure of official CBSE board exams.
            Submitting generates an instant Post-Exam Prescription that injects your leaked points directly into your daily
            backlog roadmap.
          </p>
        </div>

        {/* Paper Selection Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Choose Your Board Paper
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_PAPERS.map((paper) => {
              const isSelected = selectedPaper.id === paper.id;
              return (
                <div
                  key={paper.id}
                  onClick={() => setSelectedPaper(paper)}
                  className={`rounded-xl border p-5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                      {paper.subject}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {paper.totalMarks} Marks · {paper.questions.length} Questions
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-foreground">{paper.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sections A–E with authentic step marking, MCQs, derivations, and case study questions.
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs font-mono text-muted-foreground border-t border-border/60 pt-3">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Standard: 3 Hours (180m)
                    </span>
                    <span className="text-emerald-400 font-semibold">CBSE 2025 Blueprint</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Launch Mode Buttons */}
        <div className="rounded-xl border border-border/80 bg-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Choose Simulation Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => startReadingTime()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-4 text-center hover:bg-muted/60 transition-colors"
            >
              <FileText size={20} className="text-amber-400" />
              <div className="font-semibold text-xs text-foreground">Official 15m Reading + 3h Exam</div>
              <div className="text-[11px] text-muted-foreground">Simulate CBSE 10:15 AM reading phase</div>
            </button>

            <button
              type="button"
              onClick={() => startExam(false)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 p-4 text-center hover:bg-primary/20 transition-colors"
            >
              <Play size={20} className="text-primary" />
              <div className="font-semibold text-xs text-foreground">Standard 3-Hour Exam</div>
              <div className="text-[11px] text-muted-foreground">Jump directly to 180m writing phase</div>
            </button>

            <button
              type="button"
              onClick={() => startExam(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-4 text-center hover:bg-muted/60 transition-colors"
            >
              <Flame size={20} className="text-rose-400" />
              <div className="font-semibold text-xs text-foreground">45-Minute Power Drill</div>
              <div className="text-[11px] text-muted-foreground">High-pressure sprint diagnostic</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: 15-MINUTE READING PHASE
  // ----------------------------------------------------
  if (examState === 'reading_time') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <Clock size={14} />
          Official CBSE 15-Minute Question Paper Reading Time
        </div>

        <div className="text-5xl sm:text-6xl font-mono font-extrabold text-foreground tracking-tight">
          {formatTime(readingSecondsRemaining)}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-3">
          <h3 className="text-sm font-bold text-foreground">Board Reading Protocol Checklist:</h3>
          <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
            <li>Read all 5 sections without writing to spot internal choices in Section B and Section E.</li>
            <li>Select the easier derivation option in 5-mark long answer questions.</li>
            <li>Formulate an order of attack (e.g. Section A &rarr; Section E &rarr; Section C).</li>
          </ul>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => startExam(false)}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span>Skip Reading Phase & Begin Writing Now</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: TESTING ACTIVE SCREEN
  // ----------------------------------------------------
  if (examState === 'testing') {
    const isUnder15Mins = secondsRemaining < 15 * 60;

    return (
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 space-y-4">
        {/* Sticky Exam Top Bar */}
        <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/95 backdrop-blur-md p-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs text-foreground hidden sm:inline">{selectedPaper.title}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
              Q{currentQIndex + 1}/{selectedPaper.questions.length}
            </span>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1 font-mono font-bold text-xs sm:text-sm ${
                isUnder15Mins
                  ? 'border border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse'
                  : 'border border-border bg-card text-foreground'
              }`}
            >
              <Timer size={14} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              title={isPaused ? 'Resume Exam' : 'Pause Exam'}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>

            <button
              type="button"
              onClick={handleSubmitExam}
              className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-2xs"
            >
              Submit Paper
            </button>
          </div>
        </div>

        {isPaused && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-300 font-medium">
            Exam timer is currently paused. Take a deep breath and press Play when ready.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Panel (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                    Section {currentQuestion.section}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{currentQuestion.chapterTitle}</span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                </span>
              </div>

              {/* Question Statement */}
              <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed whitespace-pre-line">
                {currentQuestion.question}
              </div>

              {/* MCQ Options */}
              {currentQuestion.options && (
                <div className="space-y-2 pt-2">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = mcqAnswers[currentQuestion.id] === idx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, idx)}
                        className={`w-full flex items-center gap-3 rounded-lg border p-3 text-xs sm:text-sm text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/15 text-primary-foreground font-semibold ring-1 ring-primary'
                            : 'border-border/80 bg-background text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs font-bold">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Subjective Working Scratchpad */}
              {!currentQuestion.options && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>Key Equations & Working Outline (Subjective Question):</span>
                    <span>Self-evaluates during submission</span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Type your derivation steps, formula references, or final answer here..."
                    value={writtenNotes[currentQuestion.id] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWrittenNotes((prev) => ({ ...prev, [currentQuestion.id]: val }));
                      if (val.trim()) {
                        setQuestionStatus((prev) => ({
                          ...prev,
                          [currentQuestion.id]: 'answered',
                        }));
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {/* Bottom Navigation Toolbar */}
              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => handleToggleReview(currentQuestion.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    questionStatus[currentQuestion.id] === 'review'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bookmark size={13} />
                  <span>
                    {questionStatus[currentQuestion.id] === 'review' ? 'Marked for Review' : 'Mark for Review'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentQIndex === 0}
                    onClick={() => handleNavigate(currentQIndex - 1)}
                    className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <button
                    type="button"
                    disabled={currentQIndex === selectedPaper.questions.length - 1}
                    onClick={() => handleNavigate(currentQIndex + 1)}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Question Palette & Status (1 col) */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Question Palette
              </h3>

              <div className="grid grid-cols-5 gap-1.5">
                {selectedPaper.questions.map((q, idx) => {
                  const status = questionStatus[q.id] || 'unvisited';
                  const isCurrent = idx === currentQIndex;

                  let colorClass = 'bg-muted/40 text-muted-foreground border-border/60';
                  if (status === 'answered') colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold';
                  if (status === 'review') colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold';
                  if (status === 'not_answered') colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleNavigate(idx)}
                      className={`h-9 rounded-md border text-xs font-mono transition-all flex items-center justify-center ${colorClass} ${
                        isCurrent ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  <span>Unvisited</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: POST-EXAM PRESCRIPTION SCREEN
  // ----------------------------------------------------
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Banner */}
      <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 size={13} />
              CBSE Mock Diagnostic Completed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{selectedPaper.title}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              Scored {prescription.scored} / {prescription.totalMax} Marks ({prescription.percentage}%) · Projected Grade:{' '}
              <span className="text-foreground font-semibold">{prescription.predictedGrade}</span>
            </p>
          </div>

          {/* Quick Score Circle */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
              <span className="text-2xl sm:text-3xl font-black font-mono text-primary">{prescription.percentage}%</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Board Accuracy</span>
            </div>
          </div>
        </div>

        {/* Prescription Call to Action */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300">Automated Post-Exam Prescription</h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                BacklogOS detected leaked points in{' '}
                <span className="font-semibold">{prescription.weakChapters.length} chapter(s)</span>. Injecting them will
                prioritize derivations and formula checks in your active daily roadmap.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleInjectIntoPlan}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-xs"
            >
              <BookOpenCheck size={14} />
              <span>Inject Weak Chapters into Recovery Plan</span>
            </button>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span>View Dashboard</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Weak Chapter Diagnostics */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Chapter Leakage Diagnostic
          </h3>

          <div className="space-y-2">
            {prescription.weakChapters.map(([chId, data]) => {
              const accuracy = Math.round(((data.maxMarks - data.lostMarks) / data.maxMarks) * 100);
              return (
                <div key={chId} className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{data.title}</span>
                    <span className="ml-2 font-mono text-muted-foreground text-[11px]">
                      (Lost {data.lostMarks} / {data.maxMarks} marks)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.max(10, accuracy)}%` }}
                      />
                    </div>
                    <span className="font-mono text-rose-400 font-bold w-10 text-right">{accuracy}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question-by-Question Marking Verification */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <h3 className="text-sm font-bold text-foreground">Step-Marking Verification & Model Answers</h3>

          <div className="space-y-4">
            {selectedPaper.questions.map((q, idx) => {
              const isCorrect = (selfScores[q.id] || 0) === q.marks;

              return (
                <div key={q.id} className="rounded-lg border border-border/80 bg-background p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground font-mono">
                      Q{idx + 1}. Section {q.section} ({q.marks}M)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono">Awarded:</span>
                      <select
                        value={selfScores[q.id] || 0}
                        onChange={(e) =>
                          setSelfScores((prev) => ({
                            ...prev,
                            [q.id]: Number(e.target.value),
                          }))
                        }
                        className="rounded border border-border bg-card px-2 py-0.5 font-mono font-bold text-foreground"
                      >
                        {Array.from({ length: q.marks + 1 }, (_, i) => i).map((score) => (
                          <option key={score} value={score}>
                            {score} / {q.marks} M
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-foreground leading-relaxed whitespace-pre-line">{q.question}</p>

                  <div className="rounded bg-muted/30 p-2.5 text-muted-foreground space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-foreground">Official Marking Scheme:</div>
                    <div>{q.markingGuide}</div>
                  </div>

                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-emerald-300 font-mono text-[11px] whitespace-pre-line">
                    <div className="font-bold text-emerald-400">Model Answer:</div>
                    {q.modelAnswer}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restart Action */}
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setExamState('setup')}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={13} />
            <span>Retake or Select Another Mock Paper</span>
          </button>
        </div>
      </div>
    </div>
  );
}
