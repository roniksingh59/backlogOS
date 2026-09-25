import { useState } from 'react';
import {
  ClipboardCheck,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  TrendingDown,
  BookOpen,
} from 'lucide-react';
import { chapters, type Subject } from '@/lib/backlog-data';
import {
  type TestLog,
  type MistakeCategory,
  MISTAKE_LABELS,
  generateTestRecommendations,
} from '@/lib/test-log';
import { getChapterTitle } from '@/lib/prerequisites-graph';

interface TestErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TestLog[];
  onSaveLog: (log: TestLog) => void;
  onDeleteLog: (id: string) => void;
  onSelectChapterForStudy?: (chapterId: string) => void;
}

export function TestErrorLogModal({
  isOpen,
  onClose,
  logs,
  onSaveLog,
  onDeleteLog,
  onSelectChapterForStudy,
}: TestErrorLogModalProps) {
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [testName, setTestName] = useState('JEE Main Mock Test 1');
  const [subject, setSubject] = useState<Subject | 'PCM Combined'>('PCM Combined');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([
    'phy-vectors',
    'chem-basic',
  ]);
  const [score, setScore] = useState<number>(142);
  const [maxMarks, setMaxMarks] = useState<number>(300);
  const [testDate, setTestDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Mistake counts
  const [mistakes, setMistakes] = useState<Record<MistakeCategory, number>>({
    conceptual: 4,
    calculation: 3,
    silly: 2,
    time_management: 2,
    unattempted: 3,
  });

  if (!isOpen) return null;

  const recommendations = generateTestRecommendations(logs);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: TestLog = {
      id: `test-${Date.now()}`,
      testName,
      subject,
      chapterIds: selectedChapters,
      score: Number(score),
      maxMarks: Number(maxMarks),
      date: testDate,
      mistakes,
      notes,
      createdAt: new Date().toISOString(),
    };
    onSaveLog(newLog);
    setIsAdding(false);
  };

  const toggleChapter = (chId: string) => {
    if (selectedChapters.includes(chId)) {
      if (selectedChapters.length > 1) {
        setSelectedChapters(selectedChapters.filter((id) => id !== chId));
      }
    } else {
      setSelectedChapters([...selectedChapters, chId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">
                Test & Error Analysis Log
              </h2>
              <p className="text-xs text-muted-foreground">
                Convert mock exam mistakes into prioritized backlog revisions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/90"
              >
                <Plus size={14} />
                <span>Log New Test</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[600px]">
          {/* Smart Mistake Recommendations Section */}
          {recommendations.length > 0 && !isAdding && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={18} className="text-primary" />
                <h4 className="font-display text-sm font-bold text-foreground">
                  AI Error Analysis & Recommended Revisions
                </h4>
              </div>

              <div className="space-y-2.5">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-border/70 bg-card p-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500 border border-rose-500/20 shrink-0">
                        {MISTAKE_LABELS[rec.dominantMistakeCategory].label}
                      </span>
                      <p className="text-foreground/90 font-medium">
                        {rec.recommendationText}
                      </p>
                    </div>

                    {onSelectChapterForStudy && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectChapterForStudy(rec.chapterId);
                        }}
                        className="rounded-lg bg-primary/10 border border-primary/25 px-3 py-1 font-bold text-primary hover:bg-primary/20 shrink-0 self-end sm:self-center"
                      >
                        Revise Chapter
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form to log a test */}
          {isAdding ? (
            <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-border bg-muted/20 p-5 text-xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h4 className="font-display font-bold text-sm">Record Mock Test Performance</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-foreground mb-1">Test Name</label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="e.g. Allen Minor Test 4, JEE Main Mock 1"
                    className="w-full rounded-xl border border-border bg-background p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 font-medium"
                  >
                    <option value="PCM Combined">PCM Combined (Full Length)</option>
                    <option value="Physics">Physics Only</option>
                    <option value="Chemistry">Chemistry Only</option>
                    <option value="Mathematics">Mathematics Only</option>
                  </select>
                </div>
              </div>

              {/* Score & Max Marks & Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">Score Obtained</label>
                  <input
                    type="number"
                    min="0"
                    max={maxMarks}
                    value={score}
                    onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Max Marks</label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(parseFloat(e.target.value) || 300)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">Date</label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-2.5 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Chapters Tested Checklist */}
              <div>
                <label className="block font-bold text-foreground mb-1.5">
                  Chapters Tested (Select to link mistake recommendations):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border border-border bg-background">
                  {chapters.map((ch) => {
                    const isSelected = selectedChapters.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChapter(ch.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        [{ch.subject.slice(0, 3)}] {ch.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mistake Categories Breakdown */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="font-bold text-foreground text-xs">
                  Detailed Error Breakdown (Count of lost questions):
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(MISTAKE_LABELS) as MistakeCategory[]).map((cat) => (
                    <div key={cat} className="rounded-lg border border-border/80 p-2.5 bg-background">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11px] text-foreground">
                          {MISTAKE_LABELS[cat].label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={mistakes[cat]}
                          onChange={(e) =>
                            setMistakes({
                              ...mistakes,
                              [cat]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-14 rounded-md border border-border text-center font-bold text-xs p-1"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {MISTAKE_LABELS[cat].desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl border border-border bg-muted/40 px-4 py-2 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2 font-bold text-primary-foreground shadow-2xs hover:bg-primary/90"
                >
                  Save Test & Error Log
                </button>
              </div>
            </form>
          ) : null}

          {/* Past Logged Tests */}
          <div>
            <h4 className="font-display font-bold text-sm mb-3">
              Recorded Tests ({logs.length})
            </h4>

            {logs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                No mock tests logged yet. Record your latest chapter or full mock to identify patterns in conceptual vs calculation mistakes.
              </p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const percentage = Math.round((log.score / log.maxMarks) * 100);
                  const totalMistakes = Object.values(log.mistakes).reduce(
                    (a, b) => a + b,
                    0
                  );

                  return (
                    <div
                      key={log.id}
                      className="rounded-xl border border-border/80 bg-background p-4 text-xs space-y-3 hover:border-primary/40 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-foreground">
                              {log.testName}
                            </span>
                            <span className="rounded bg-muted px-2 py-0.2 font-mono text-[10px] text-muted-foreground">
                              {log.subject}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {log.date} · {log.chapterIds.map((cid) => getChapterTitle(cid)).join(', ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-mono text-base font-bold text-primary">
                              {log.score} / {log.maxMarks}
                            </span>
                            <span className="block text-[10px] text-muted-foreground font-bold">
                              {percentage}% score
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeleteLog(log.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                            title="Delete log"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Mistakes pill row */}
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        {(Object.entries(log.mistakes) as [MistakeCategory, number][]).map(
                          ([cat, count]) => {
                            if (count === 0) return null;
                            return (
                              <span
                                key={cat}
                                className={`rounded-md px-2 py-0.5 font-bold ${MISTAKE_LABELS[cat].color}`}
                              >
                                {MISTAKE_LABELS[cat].label}: {count}
                              </span>
                            );
                          }
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border/80 bg-muted/20 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
