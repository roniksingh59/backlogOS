import { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  ExternalLink,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  FileText,
  Clock,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { type CurriculumSubject, type CurriculumChapter } from '@/lib/curriculum/types';
import { getChaptersForSubject } from '@/lib/curriculum/registry';
import { readBacklogItems, type BacklogItem } from '@/lib/storage';
import { ChapterDetailModal } from './ChapterDetailModal';

interface SubjectDetailModalProps {
  subject: CurriculumSubject;
  onClose: () => void;
  onBacklogChanged?: () => void;
}

export function SubjectDetailModal({ subject, onClose, onBacklogChanged }: SubjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'chapters' | 'curriculum' | 'resources' | 'backlog'>('chapters');
  const [selectedChapter, setSelectedChapter] = useState<CurriculumChapter | null>(null);

  const chapters = useMemo(() => getChaptersForSubject(subject.id), [subject.id]);
  const backlogItems = useMemo(() => readBacklogItems(), []);

  // Compute progress for this subject
  const subjectBacklogItems = useMemo(
    () => backlogItems.filter((i) => i.subject.toLowerCase() === subject.name.toLowerCase()),
    [backlogItems, subject.name]
  );

  const completedCount = subjectBacklogItems.filter((i) => i.status === 'completed').length;
  const progressPercent = chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded border border-border bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto font-sans">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
              <span>Class {subject.class}</span>
              <span>·</span>
              <span>CBSE · {subject.academicSession}</span>
              <span>·</span>
              <span>Code: {subject.code}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">
              {subject.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground font-sans">
              {subject.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Strip */}
        <div className="mt-4 border border-border bg-muted/20 p-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground uppercase">Subject Syllabus Mastery</span>
            <span className="font-bold text-foreground">{progressPercent}% Completed</span>
          </div>
          <div className="mt-2 h-2 w-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{completedCount} chapters completed</span>
            <span>{chapters.length} total chapters in syllabus</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex items-center gap-1 border-b border-border pb-1 text-xs font-mono">
          {(['chapters', 'curriculum', 'resources', 'backlog'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded uppercase tracking-wider transition ${
                activeTab === tab
                  ? 'bg-foreground text-background font-bold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab === 'chapters' && `Chapters (${chapters.length})`}
              {tab === 'curriculum' && 'Syllabus Units'}
              {tab === 'resources' && 'NCERT & CBSE Links'}
              {tab === 'backlog' && `Incomplete Backlog (${subjectBacklogItems.filter((i) => i.status !== 'completed').length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-4 min-h-[260px]">
          {/* TAB 1: CHAPTERS LIST */}
          {activeTab === 'chapters' && (
            <div className="divide-y divide-border border border-border bg-background">
              {chapters.map((ch) => {
                const item = backlogItems.find((i) => i.chapterId === ch.id);
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChapter(ch)}
                    className="p-3 flex items-center justify-between hover:bg-muted/40 transition cursor-pointer text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        <span>Ch {ch.chapterNumber}</span>
                        <span>·</span>
                        <span className="capitalize">{ch.examWeightage} Yield</span>
                        <span>·</span>
                        <span>{ch.defaultEstimatedHours}h effort</span>
                      </div>
                      <p className="font-bold text-foreground text-sm truncate mt-0.5">
                        {ch.title}
                      </p>
                      <p className="text-muted-foreground text-xs truncate mt-0.5">
                        {ch.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize border ${
                          item?.status === 'completed'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : item
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'border-border bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        {item ? item.status.replace('_', ' ') : 'Not in Backlog'}
                      </span>
                      <ArrowRight size={13} className="text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CURRICULUM SYLLABUS UNITS */}
          {activeTab === 'curriculum' && (
            <div className="space-y-4">
              {subject.units.map((unit) => (
                <div key={unit.unitNumber} className="border border-border p-4 bg-background space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-foreground">
                      Unit {unit.unitNumber}: {unit.title}
                    </span>
                    {unit.marksWeightage && (
                      <span className="text-muted-foreground">
                        {unit.marksWeightage} Marks in Board Exam
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-1">
                    <p>Includes {unit.chapterIds.length} syllabus chapter(s).</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: OFFICIAL RESOURCES */}
          {activeTab === 'resources' && (
            <div className="space-y-3 font-mono text-xs">
              <a
                href={subject.officialTextbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-border p-3 hover:bg-muted transition"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={16} className="text-primary" />
                  <div>
                    <span className="font-bold text-foreground block">
                      NCERT Official Textbook: {subject.ncertBookTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Official digital portal at ncert.nic.in
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>

              <a
                href={subject.officialSyllabusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border border-border p-3 hover:bg-muted transition"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-primary" />
                  <div>
                    <span className="font-bold text-foreground block">
                      CBSE Academic Curriculum 2026-27 Syllabus Portal
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Verified guidelines at cbseacademic.nic.in
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-muted-foreground" />
              </a>
            </div>
          )}

          {/* TAB 4: INCOMPLETE BACKLOG */}
          {activeTab === 'backlog' && (
            <div className="space-y-2">
              {subjectBacklogItems.filter((i) => i.status !== 'completed').length > 0 ? (
                <div className="divide-y divide-border border border-border bg-background text-xs font-mono">
                  {subjectBacklogItems
                    .filter((i) => i.status !== 'completed')
                    .map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground font-sans text-sm">
                            {item.topic}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.estimatedHours}h estimated · {item.hoursSpent}h spent · Status: {item.status}
                          </p>
                        </div>
                        <span className="capitalize text-[10px] px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {item.difficulty}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="border border-border p-8 text-center text-xs font-mono text-muted-foreground">
                  No pending backlog for {subject.name}! All registered items are clear.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chapter Detail Sub-modal */}
      {selectedChapter && (
        <ChapterDetailModal
          chapter={selectedChapter}
          onClose={() => setSelectedChapter(null)}
          onActionComplete={() => {
            if (onBacklogChanged) onBacklogChanged();
          }}
        />
      )}
    </div>
  );
}
