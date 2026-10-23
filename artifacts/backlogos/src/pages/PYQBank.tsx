import { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
  BookOpen,
  HelpCircle,
  BookmarkPlus,
  Printer,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { PYQ_DATABASE, type PYQQuestion } from '@/lib/pyq-data';
import { logMistake } from '@/lib/test-log';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

const STORAGE_MASTERED_KEY = 'backlogos-mastered-pyqs';

export function PYQBank() {
  const { toast } = useToast();
  const [selectedSubject, setSelectedSubject] = useState<'All' | 'Physics' | 'Chemistry' | 'Mathematics'>('All');
  const [selectedMarks, setSelectedMarks] = useState<number | 'All'>('All');
  const [selectedClass, setSelectedClass] = useState<11 | 12 | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('pyq-phy-12-01');
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTERED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MASTERED_KEY, JSON.stringify(Array.from(masteredIds)));
    } catch {
      // ignore
    }
  }, [masteredIds]);

  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: 'Removed from Mastered', description: 'Question moved back to active practice queue.' });
      } else {
        next.add(id);
        toast({ title: 'Marked as Mastered! 🎯', description: 'Great job! Question archived under mastered items.' });
      }
      return next;
    });
  };

  const handleAddToMistakeNotebook = (q: PYQQuestion) => {
    logMistake({
      id: `pyq-mistake-${Date.now()}`,
      testName: `PYQ Practice · ${q.year}`,
      subject: q.subject,
      chapterIds: [q.chapterId],
      score: 0,
      maxMarks: q.marks,
      date: new Date().toISOString().split('T')[0],
      mistakes: {
        conceptual: 1,
        calculation: 0,
        silly: 0,
        time_management: 0,
        unattempted: 0,
      },
      notes: `PYQ Question: ${q.question.slice(0, 100)}... | Trap: ${q.examinerTrap}`,
      createdAt: new Date().toISOString(),
    });
    toast({
      title: 'Added to Test Error Notebook! 📓',
      description: `Tracked in your Mistake Notebook to review before the board exam.`,
    });
  };

  const filteredQuestions = useMemo(() => {
    return PYQ_DATABASE.filter((q) => {
      if (selectedSubject !== 'All' && q.subject !== selectedSubject) return false;
      if (selectedMarks !== 'All' && q.marks !== selectedMarks) return false;
      if (selectedClass !== 'All' && q.classNum !== selectedClass) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText =
          q.question.toLowerCase().includes(query) ||
          q.chapterTitle.toLowerCase().includes(query) ||
          q.year.toLowerCase().includes(query) ||
          q.examinerTrap.toLowerCase().includes(query) ||
          (q.formulaUsed && q.formulaUsed.toLowerCase().includes(query));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [selectedSubject, selectedMarks, selectedClass, searchQuery]);

  const stats = useMemo(() => {
    const total = PYQ_DATABASE.length;
    const mastered = masteredIds.size;
    const highYieldTotal = PYQ_DATABASE.filter((q) => q.frequency.includes('Guaranteed')).length;
    return { total, mastered, highYieldTotal };
  }, [masteredIds]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 border-b border-border/80 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <Award size={12} />
              CBSE Official Board Archive (2020–2024)
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {stats.mastered}/{stats.total} Mastered
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Official PYQ Bank & Step-Marking Blueprint
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Real board questions broken down with exact CBSE examiner marking schemes. See precisely where marks are
            awarded for formulas, substitutions, and correct units—and avoid classic examiner traps.
          </p>
        </div>

        {/* Quick Links / Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Printer size={13} />
            <span>Print Sheet</span>
          </button>
          <Link
            href="/mock-exam"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span>Timed Board Mock</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by topic, formula (e.g. Gauss, Lens Maker, Nernst, By Parts)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-mono">Class:</span>
            {(['All', 12, 11] as const).map((cls) => (
              <button
                key={String(cls)}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedClass === cls
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cls === 'All' ? 'All' : `Class ${cls}`}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 mr-2 text-xs text-muted-foreground font-mono">
            <Filter size={12} />
            <span>Subject:</span>
          </div>
          {(['All', 'Physics', 'Chemistry', 'Mathematics'] as const).map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedSubject === sub
                  ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {sub}
            </button>
          ))}

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          <div className="flex items-center gap-1 mr-1 text-xs text-muted-foreground font-mono">
            <span>Marks:</span>
          </div>
          {(['All', 1, 2, 3, 5] as const).map((m) => (
            <button
              key={String(m)}
              type="button"
              onClick={() => setSelectedMarks(m)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedMarks === m
                  ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {m === 'All' ? 'All Marks' : `${m} Mark${m > 1 ? 's' : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>
          Showing {filteredQuestions.length} CBSE Board Question{filteredQuestions.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 size={13} /> Mastered: {filteredQuestions.filter((q) => masteredIds.has(q.id)).length}
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
            <BookOpen size={32} className="mx-auto text-muted-foreground/60" />
            <h3 className="text-base font-semibold text-foreground">No questions found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No PYQ entries match your filter criteria. Try clearing the search or choosing "All Subjects".
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('All');
                setSelectedMarks('All');
                setSelectedClass('All');
                setSearchQuery('');
              }}
              className="inline-flex rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isExpanded = expandedId === q.id;
            const isMastered = masteredIds.has(q.id);

            return (
              <div
                key={q.id}
                className={`rounded-xl border transition-all ${
                  isMastered
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : isExpanded
                      ? 'border-primary/50 bg-card shadow-sm'
                      : 'border-border/80 bg-card hover:border-border'
                }`}
              >
                {/* Header Card */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                        {q.subject}
                      </span>
                      <span className="rounded-md border border-border/80 bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                        {q.chapterTitle}
                      </span>
                      <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                        {q.marks} Mark{q.marks > 1 ? 's' : ''}
                      </span>
                      <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                        {q.year} · {q.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          q.frequency.includes('Guaranteed')
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {q.frequency}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleMastered(q.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isMastered
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                        title={isMastered ? 'Mark as Not Mastered' : 'Mark as Mastered'}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-line">
                    {q.question}
                  </div>

                  {/* MCQ Options (if applicable) */}
                  {q.type === 'mcq' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, idx) => {
                        const isChosen = selectedOptions[q.id] === idx;
                        const isCorrect = q.correctOption === idx;
                        const hasAnswered = selectedOptions[q.id] !== undefined;

                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [q.id]: idx,
                              }))
                            }
                            className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs text-left transition-all ${
                              hasAnswered && isCorrect
                                ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300 font-semibold'
                                : hasAnswered && isChosen && !isCorrect
                                  ? 'border-rose-500/80 bg-rose-500/15 text-rose-300'
                                  : 'border-border/80 bg-background text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <span className="font-mono font-bold text-muted-foreground">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Toggle Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>{isExpanded ? 'Hide CBSE Step Marking' : 'View CBSE Step-Marking Scheme'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddToMistakeNotebook(q)}
                        className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <BookmarkPlus size={12} />
                        <span>Add to Error Log</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Step-Marking & Answer Blueprint */}
                {isExpanded && (
                  <div className="border-t border-border/80 bg-muted/20 p-4 sm:p-5 space-y-4">
                    {/* Step-by-Step Marking Rubric */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <FileText size={13} className="text-primary" />
                        <span>CBSE Examiner Marking Scheme Breakdown</span>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border bg-muted/60 text-muted-foreground font-mono">
                            <tr>
                              <th className="p-2.5 w-16">Step</th>
                              <th className="p-2.5">Specific Working / Required Equation</th>
                              <th className="p-2.5 w-24 text-right">CBSE Marks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {q.cbseStepMarking.map((stepItem, idx) => (
                              <tr key={stepItem.step} className="hover:bg-muted/30">
                                <td className="p-2.5 font-mono text-muted-foreground">0{idx + 1}</td>
                                <td className="p-2.5 text-foreground leading-relaxed">{stepItem.step}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                  +{stepItem.marks}M
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Examiner Trap Warning */}
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                        <AlertTriangle size={13} />
                        <span>Classic Examiner Trap & Why Students Lose Marks</span>
                      </div>
                      <p className="text-xs text-rose-200/90 leading-relaxed">{q.examinerTrap}</p>
                    </div>

                    {/* Official Ideal Board Answer */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Official Complete Board Answer</span>
                      </div>
                      <div className="rounded-lg border border-border/80 bg-background p-3 text-xs font-mono text-muted-foreground whitespace-pre-line leading-relaxed">
                        {q.officialAnswer}
                      </div>
                    </div>

                    {q.formulaUsed && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-muted-foreground">Master Formula:</span>
                        <code className="rounded bg-muted px-2 py-0.5 font-mono font-semibold text-foreground">
                          {q.formulaUsed}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
