import { useState } from 'react';
import {
  X,
  BookOpen,
  ExternalLink,
  Plus,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle,
  FileText,
  RotateCcw,
  CalendarCheck,
} from 'lucide-react';
import { type CurriculumChapter } from '@/lib/curriculum/types';
import {
  addBacklogItem,
  readBacklogItems,
  saveBacklogItems,
  readSmartDailyPlan,
  saveSmartDailyPlan,
  readSpacedRevisions,
  saveSpacedRevisions,
  type BacklogItem,
  type SpacedRevision,
} from '@/lib/storage';
import { toBacklogItem } from '@/lib/curriculum/registry';

interface ChapterDetailModalProps {
  chapter: CurriculumChapter;
  onClose: () => void;
  onActionComplete?: () => void;
}

export function ChapterDetailModal({ chapter, onClose, onActionComplete }: ChapterDetailModalProps) {
  const existingItems = readBacklogItems();
  const existingItem = existingItems.find((i) => i.chapterId === chapter.id);

  const [status, setStatus] = useState<BacklogItem['status']>(
    existingItem?.status || 'not_started'
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddToBacklog = () => {
    if (existingItem) {
      setSuccessMsg('This chapter is already in your backlog!');
      return;
    }
    const item = toBacklogItem(chapter);
    addBacklogItem(item);
    setSuccessMsg('Added to Backlog successfully!');
    if (onActionComplete) onActionComplete();
  };

  const handleAddToTodayPlan = () => {
    const today = new Date().toISOString().split('T')[0];
    const existingPlan = readSmartDailyPlan();
    const newSlot = {
      id: `slot-${Date.now()}`,
      backlogItemId: existingItem?.id || `item-${chapter.id}`,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      subject: chapter.subjectName as any,
      topic: chapter.title,
      durationMinutes: 60,
      kind: 'theory' as const,
      isPrerequisiteBlock: false,
      priorityScore: chapter.examWeightage === 'critical' ? 95 : 80,
      reason: 'Scheduled manually from CBSE Chapter Database',
      completed: false,
    };

    if (existingPlan) {
      const updated = {
        ...existingPlan,
        totalMinutes: existingPlan.totalMinutes + 60,
        slots: [...existingPlan.slots, newSlot],
      };
      saveSmartDailyPlan(updated);
    } else {
      saveSmartDailyPlan({
        date: today,
        totalMinutes: 60,
        availableHours: 2,
        slots: [newSlot],
        prerequisiteWarnings: [],
        isRecoveryPlan: false,
        generatedAt: new Date().toISOString(),
      });
    }

    if (!existingItem) {
      addBacklogItem(toBacklogItem(chapter));
    }
    setSuccessMsg('Added to Today\'s Plan successfully!');
    if (onActionComplete) onActionComplete();
  };

  const handleScheduleRevision = () => {
    const revisions = readSpacedRevisions();
    const today = new Date();
    const revDate = new Date(today);
    revDate.setDate(today.getDate() + 3); // 3-day spaced revision interval
    const dueDateStr = revDate.toISOString().split('T')[0];

    const newRev: SpacedRevision = {
      id: `rev-${Date.now()}`,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      subject: chapter.subjectName as any,
      intervalStep: 1,
      dueDate: dueDateStr,
      status: 'due',
    };

    saveSpacedRevisions([...revisions, newRev]);
    handleUpdateStatus('revision');
    setSuccessMsg(`Revision scheduled for ${dueDateStr}!`);
    if (onActionComplete) onActionComplete();
  };

  const handleUpdateStatus = (newStatus: BacklogItem['status']) => {
    setStatus(newStatus);
    const items = readBacklogItems();
    const idx = items.findIndex((i) => i.chapterId === chapter.id);
    if (idx >= 0) {
      items[idx].status = newStatus;
      if (newStatus === 'completed') {
        items[idx].completedAt = new Date().toISOString();
        items[idx].hoursSpent = items[idx].estimatedHours;
      }
      saveBacklogItems(items);
      setSuccessMsg(`Status updated to ${newStatus}!`);
      if (onActionComplete) onActionComplete();
    } else {
      // Add and set status
      const item = toBacklogItem(chapter);
      item.status = newStatus;
      if (newStatus === 'completed') {
        item.completedAt = new Date().toISOString();
        item.hoursSpent = item.estimatedHours;
      }
      addBacklogItem(item);
      setSuccessMsg(`Added to Backlog with status: ${newStatus}!`);
      if (onActionComplete) onActionComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase">
              <span>Class {chapter.class}</span>
              <span>·</span>
              <span>CBSE · {chapter.academicSession}</span>
              <span>·</span>
              <span className="font-bold text-foreground">{chapter.subjectName}</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mt-1">
              Chapter {chapter.chapterNumber}: {chapter.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message notification */}
        {successMsg && (
          <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Vital Info Strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border border-border bg-muted/20 p-3 text-xs font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Weightage</span>
            <span className="font-bold text-foreground capitalize">{chapter.examWeightage} Yield</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Estimated Effort</span>
            <span className="font-bold text-foreground">{chapter.defaultEstimatedHours} Hours</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Difficulty</span>
            <span className="font-bold text-foreground capitalize">{chapter.difficulty}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Current Status</span>
            <span className="font-bold text-foreground capitalize">{status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Syllabus Relevance Alert if Rationalized */}
        {!chapter.inCbseSyllabus && (
          <div className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">CBSE 2026-27 Syllabus Note:</strong>
              This textbook chapter is rationalized / not examinable in the current CBSE board curriculum.
            </div>
          </div>
        )}

        {/* Prescribed Syllabus Topics */}
        <div className="mt-5 space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Official CBSE Syllabus Prescribed Topics
          </h4>
          <div className="border border-border divide-y divide-border/60 bg-background text-xs">
            {chapter.topics.map((t, idx) => (
              <div key={t.id || idx} className="p-2.5 flex items-center justify-between">
                <span className="text-foreground">{t.name}</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Examinable
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Official Resources */}
        <div className="mt-5 space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Official Curriculum & Textbook Resources
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
            <a
              href={chapter.officialNcertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border border-border p-3 hover:bg-muted transition"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-primary" />
                <span className="font-medium text-foreground">NCERT Official Textbook</span>
              </div>
              <ExternalLink size={13} className="text-muted-foreground" />
            </a>

            <a
              href={chapter.officialCbseSyllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border border-border p-3 hover:bg-muted transition"
            >
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-primary" />
                <span className="font-medium text-foreground">CBSE 2026-27 Curriculum</span>
              </div>
              <ExternalLink size={13} className="text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mt-6 border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <label className="text-muted-foreground">Status:</label>
            <select
              value={status}
              onChange={(e) => handleUpdateStatus(e.target.value as BacklogItem['status'])}
              className="rounded border border-border bg-background px-2.5 py-1 text-xs font-mono text-foreground focus:outline-hidden"
            >
              <option value="not_started">Not Started</option>
              <option value="learning">Learning</option>
              <option value="practicing">Practicing</option>
              <option value="revision">Revision</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddToBacklog}
              className={`rounded border border-border px-3 py-1.5 font-bold transition flex items-center gap-1.5 ${
                existingItem
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-card hover:bg-muted text-foreground'
              }`}
            >
              <Plus size={13} />
              <span>{existingItem ? 'In Backlog' : 'Add to Backlog'}</span>
            </button>

            <button
              type="button"
              onClick={handleAddToTodayPlan}
              className="rounded border border-border bg-card px-3 py-1.5 font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5"
            >
              <CalendarCheck size={13} className="text-primary" />
              <span>Add to Today's Plan</span>
            </button>

            <button
              type="button"
              onClick={handleScheduleRevision}
              className="rounded border border-border bg-card px-3 py-1.5 font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5"
            >
              <RotateCcw size={13} className="text-primary" />
              <span>Schedule Revision</span>
            </button>

            {status !== 'completed' && (
              <button
                type="button"
                onClick={() => handleUpdateStatus('completed')}
                className="rounded bg-foreground text-background px-3 py-1.5 font-bold hover:bg-foreground/90 transition flex items-center gap-1.5"
              >
                <CheckCircle2 size={13} />
                <span>Mark Completed</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
