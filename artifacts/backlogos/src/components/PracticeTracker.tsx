import { useState, useEffect } from 'react';
import { CheckSquare, Square, CheckCircle2, BookOpen, PenTool, Target, Sparkles } from 'lucide-react';
import { getCurrentSessionToken } from '@/lib/supabase';
import { getChapterSubtopics, readClearedSubtopics } from '@/lib/ncert-subtopics';

export interface ChapterPracticeStatus {
  theory: boolean;
  ncert: boolean;
  pyq: boolean;
}

const STORAGE_KEY = 'backlogos-practice-tracker-v1';

export function readPracticeData(): Record<string, ChapterPracticeStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePracticeData(data: Record<string, ChapterPracticeStatus>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface PracticeTrackerProps {
  chapterId: string;
  chapterTitle: string;
  subject?: string;
  onMasteryChange?: (isMastered: boolean) => void;
}

export function PracticeTracker({
  chapterId,
  chapterTitle,
  subject,
  onMasteryChange,
}: PracticeTrackerProps) {
  const [data, setData] = useState<Record<string, ChapterPracticeStatus>>(() => readPracticeData());

  const current = data[chapterId] || { theory: false, ncert: false, pyq: false };

  const count = (current.theory ? 1 : 0) + (current.ncert ? 1 : 0) + (current.pyq ? 1 : 0);
  const pct = Math.round((count / 3) * 100);

  const toggleCheck = async (field: 'theory' | 'ncert' | 'pyq') => {
    const updated = {
      ...current,
      [field]: !current[field],
    };

    const nextData = {
      ...data,
      [chapterId]: updated,
    };

    setData(nextData);
    savePracticeData(nextData);

    const isMastered = updated.theory && updated.ncert && updated.pyq;
    if (onMasteryChange) {
      onMasteryChange(isMastered);
    }

    // Sync to cloud if user is signed in
    try {
      const token = await getCurrentSessionToken();
      if (token) {
        await fetch('/api/practice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chapterId,
            theory: updated.theory,
            ncert: updated.ncert,
            pyq: updated.pyq,
          }),
        });
      }
    } catch {
      // Offline fallback
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">3-Phase Chapter Mastery</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                pct === 100
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : pct > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {pct === 100 ? 'Mastered 🎉' : pct === 67 ? 'Practicing' : pct === 33 ? 'Learning' : 'Not started'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Complete all 3 stages to cement your backlog recovery
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span>{count}/3</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all duration-300 ${
            pct === 100 ? 'bg-emerald-500' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* 3 Steps */}
      <div className="mt-3.5 space-y-2">
        <button
          type="button"
          onClick={() => toggleCheck('theory')}
          className={`focus-ring flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
            current.theory
              ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
              : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`grid h-7 w-7 place-items-center rounded-lg ${
                current.theory ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <BookOpen size={14} />
            </div>
            <div>
              <div className={`text-xs font-semibold ${current.theory ? 'text-foreground' : ''}`}>
                1. Concept Theory & Notes
              </div>
              <div className="text-[10px] text-muted-foreground">
                Watched lecture or reviewed one-shot revision notes
              </div>
            </div>
          </div>
          {current.theory ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <Square size={16} className="text-muted-foreground/60" />
          )}
        </button>

        <button
          type="button"
          onClick={() => toggleCheck('ncert')}
          className={`focus-ring flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
            current.ncert
              ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
              : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`grid h-7 w-7 place-items-center rounded-lg ${
                current.ncert ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <PenTool size={14} />
            </div>
            <div>
              <div className={`text-xs font-semibold ${current.ncert ? 'text-foreground' : ''}`}>
                2. NCERT / Exemplar Core Problems
              </div>
              <div className="text-[10px] text-muted-foreground">
                Solved textbook solved examples and key exercise questions
              </div>
            </div>
          </div>
          {current.ncert ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <Square size={16} className="text-muted-foreground/60" />
          )}
        </button>

        <button
          type="button"
          onClick={() => toggleCheck('pyq')}
          className={`focus-ring flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition ${
            current.pyq
              ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground'
              : 'border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`grid h-7 w-7 place-items-center rounded-lg ${
                current.pyq ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Target size={14} />
            </div>
            <div>
              <div className={`text-xs font-semibold ${current.pyq ? 'text-foreground' : ''}`}>
                3. 10+ Exam PYQ Questions
              </div>
              <div className="text-[10px] text-muted-foreground">
                Timed problem solving of previous year exam questions
              </div>
            </div>
          </div>
          {current.pyq ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <Square size={16} className="text-muted-foreground/60" />
          )}
        </button>
      </div>

      {/* NCERT Subtopics Progress footer */}
      {(() => {
        const subtopics = getChapterSubtopics(chapterId);
        const clearedSubtopicIds = readClearedSubtopics()[chapterId] || [];
        const clearedSubtopicsCount = clearedSubtopicIds.filter((id) => subtopics.some((s) => s.id === id)).length;
        const subtopicPct = subtopics.length > 0 ? Math.round((clearedSubtopicsCount / subtopics.length) * 100) : 0;

        return (
          <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen size={12} className="text-primary" />
              <span>NCERT Subtopics:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-semibold text-foreground">
                {clearedSubtopicsCount}/{subtopics.length}
              </span>
              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {subtopicPct}%
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

