import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowUpDown,
  Filter,
  Flame,
  Clock,
  Sparkles,
  GitFork,
  BookOpen,
  Calendar,
  X,
  Search,
} from 'lucide-react';
import { chapters, type Subject } from '@/lib/backlog-data';
import {
  type BacklogItem,
  type BacklogStatus,
  type BacklogDifficulty,
  type BacklogConfidence,
  type ExamRelevance,
  STATUS_LABELS,
  DIFFICULTY_LABELS,
  CONFIDENCE_LABELS,
  RELEVANCE_LABELS,
  calculatePriorityScore,
  calculateBacklogMetrics,
} from '@/lib/backlog-items';
import {
  PREREQUISITE_GRAPH,
  checkUnfinishedPrerequisites,
  getChapterTitle,
} from '@/lib/prerequisites-graph';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { getAvailableSubjectsForGrade, getChaptersForSubject } from '@/lib/curriculum/registry';
import { ALL_CBSE_CHAPTERS } from '@/lib/curriculum/chapters-index';

interface SmartBacklogManagerProps {
  items: BacklogItem[];
  onAddItem: (item: BacklogItem) => void;
  onUpdateItem: (id: string, updates: Partial<BacklogItem>) => void;
  onDeleteItem: (id: string) => void;
  onOpenPrerequisiteMap?: () => void;
  onStartFocusChapter?: (chapterId: string) => void;
  dailyHoursTarget?: number;
}

export function SmartBacklogManager({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onOpenPrerequisiteMap,
  onStartFocusChapter,
  dailyHoursTarget = 3.5,
}: SmartBacklogManagerProps) {
  const profile = useMemo(() => readEducationProfile(), []);
  const availableGradeSubjects = useMemo(
    () => getAvailableSubjectsForGrade(profile.grade),
    [profile.grade]
  );

  // All subject names present in items or enrolled in profile
  const filterSubjectNames = useMemo(() => {
    const fromItems = items.map((i) => i.subject);
    const fromProfile = profile.enrolledSubjectIds
      .map((id) => availableGradeSubjects.find((s) => s.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return ['All', ...Array.from(new Set([...fromItems, ...fromProfile]))];
  }, [items, profile.enrolledSubjectIds, availableGradeSubjects]);

  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<BacklogStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    subject: Subject;
    chapterId: string;
    topic: string;
    estimatedHours: number;
    difficulty: BacklogDifficulty;
    status: BacklogStatus;
    confidence: BacklogConfidence;
    examRelevance: ExamRelevance;
    deadline?: string;
    notes?: string;
  }>({
    subject: 'Physics',
    chapterId: 'phy-vectors',
    topic: 'Motion in a Straight Line',
    estimatedHours: 6,
    difficulty: 'medium',
    status: 'not_started',
    confidence: 'medium',
    examRelevance: 'high',
    deadline: '',
    notes: '',
  });

  // Dynamically resolve chapters for the currently selected modal subject
  const modalChaptersForSubject = useMemo(() => {
    const matched = availableGradeSubjects.find(
      (s) => s.name.toLowerCase() === formData.subject.toLowerCase()
    );
    if (matched) {
      const chs = getChaptersForSubject(matched.id);
      if (chs.length > 0) return chs;
    }
    const fromCatalogue = ALL_CBSE_CHAPTERS.filter(
      (c) =>
        c.subjectName.toLowerCase() === formData.subject.toLowerCase() &&
        c.class === profile.grade
    );
    if (fromCatalogue.length > 0) return fromCatalogue;
    return chapters
      .filter((c) => c.subject.toLowerCase() === formData.subject.toLowerCase())
      .map((c) => ({
        id: c.id,
        title: c.title,
        chapterNumber: c.order,
        defaultEstimatedHours: 6,
        difficulty: 'medium' as const,
        examWeightage: 'high' as const,
        prerequisites: [],
      }));
  }, [formData.subject, availableGradeSubjects, profile.grade]);

  const completedChapterIds = useMemo(
    () => items.filter((i) => i.status === 'completed').map((i) => i.chapterId),
    [items]
  );

  const metrics = useMemo(
    () => calculateBacklogMetrics(items, dailyHoursTarget),
    [items, dailyHoursTarget]
  );

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSubject = selectedSubject === 'All' || item.subject === selectedSubject;
      const matchStatus = selectedStatus === 'All' || item.status === selectedStatus;
      const matchSearch =
        !searchQuery ||
        item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchStatus && matchSearch;
    });
  }, [items, selectedSubject, selectedStatus, searchQuery]);

  // Handle open add modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      subject: 'Physics',
      chapterId: chapters[0].id,
      topic: chapters[0].title,
      estimatedHours: 6,
      difficulty: 'medium',
      status: 'not_started',
      confidence: 'medium',
      examRelevance: 'high',
      deadline: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (item: BacklogItem) => {
    setEditingItem(item);
    setFormData({
      subject: item.subject,
      chapterId: item.chapterId,
      topic: item.topic,
      estimatedHours: item.estimatedHours,
      difficulty: item.difficulty,
      status: item.status,
      confidence: item.confidence,
      examRelevance: item.examRelevance,
      deadline: item.deadline || '',
      notes: item.notes || '',
    });
    setIsAddModalOpen(true);
  };

  // Save form handler
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateItem(editingItem.id, {
        subject: formData.subject,
        chapterId: formData.chapterId,
        topic: formData.topic,
        estimatedHours: Number(formData.estimatedHours),
        difficulty: formData.difficulty,
        status: formData.status,
        confidence: formData.confidence,
        examRelevance: formData.examRelevance,
        deadline: formData.deadline || undefined,
        notes: formData.notes,
        prerequisites: PREREQUISITE_GRAPH[formData.chapterId] || [],
      });
    } else {
      const newItem: BacklogItem = {
        id: `backlog-${Date.now()}-${formData.chapterId}`,
        chapterId: formData.chapterId,
        subject: formData.subject,
        topic: formData.topic,
        estimatedHours: Number(formData.estimatedHours),
        hoursSpent: 0,
        difficulty: formData.difficulty,
        status: formData.status,
        confidence: formData.confidence,
        examRelevance: formData.examRelevance,
        prerequisites: PREREQUISITE_GRAPH[formData.chapterId] || [],
        deadline: formData.deadline || undefined,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
      };
      onAddItem(newItem);
    }
    setIsAddModalOpen(false);
  };

  return (
    <section className="space-y-4" data-testid="section-smart-backlog">
      {/* Unified Academic Metrics Strip - Hairline Divided */}
      <div className="border border-border bg-card divide-y sm:divide-y-0 sm:divide-x divide-border grid grid-cols-2 lg:grid-cols-5">
        <div className="p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Total Syllabus
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-bold text-foreground">{metrics.totalBacklogHours}</span>
            <span className="text-xs text-muted-foreground">hrs</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
            {items.length} chapters
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Completed
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.completedHours}
            </span>
            <span className="text-xs text-muted-foreground">hrs</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
            {metrics.percentageCompleted}% cleared
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Remaining
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {metrics.remainingHours}
            </span>
            <span className="text-xs text-muted-foreground">hrs</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
            {100 - metrics.percentageCompleted}% backlog
          </span>
        </div>

        <div className="p-3.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Recovered
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono">
            <span className="text-2xl font-bold text-foreground">{metrics.hoursRecovered}</span>
            <span className="text-xs text-muted-foreground">hrs</span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
            logged focus time
          </span>
        </div>

        <div className="p-3.5 col-span-2 lg:col-span-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
            Est. Clearance
          </span>
          <div className="mt-1 font-mono">
            <span className="text-lg font-bold text-foreground">
              {metrics.estimatedCompletionDate}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
            ~{metrics.daysToComplete}d @ {dailyHoursTarget}h/day
          </span>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Add Chapter, Dependency Map */}
      <div className="border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <div className="flex items-center gap-1 font-mono">
            {filterSubjectNames.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded border px-2 py-1 text-xs transition ${
                  selectedSubject === sub
                    ? 'bg-foreground text-background border-foreground font-bold'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`filter-subject-${sub.toLowerCase()}`}
              >
                {sub === 'Mathematics' ? 'Maths' : sub}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="rounded border border-border bg-card px-2 py-1 font-mono text-xs text-foreground focus:outline-hidden"
            data-testid="select-status-filter"
          >
            <option value="All">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="learning">Learning</option>
            <option value="practicing">Practicing</option>
            <option value="revision">Revision</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* Search */}
          <div className="relative flex-1 sm:w-44">
            <Search size={13} className="absolute left-2.5 top-2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full rounded border border-border bg-background pl-7 pr-2 text-xs focus:outline-hidden"
            />
          </div>

          {/* Dependency Map Trigger */}
          {onOpenPrerequisiteMap && (
            <button
              type="button"
              onClick={onOpenPrerequisiteMap}
              className="focus-ring flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-muted"
              data-testid="button-open-prereq-map"
            >
              <GitFork size={13} />
              <span>Prerequisites</span>
            </button>
          )}

          {/* Add Backlog Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="focus-ring flex items-center gap-1.5 rounded bg-foreground text-background px-3 py-1 text-xs font-bold hover:bg-foreground/90 transition shadow-xs"
            data-testid="button-add-backlog-item"
          >
            <Plus size={13} />
            <span>ADD CHAPTER</span>
          </button>
        </div>
      </div>

      {/* Backlog Items List */}
      <div className="border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/20 px-4 py-2.5 text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Backlog Syllabus ({filteredItems.length} items)</span>
          <span className="text-[10px] normal-case font-mono hidden sm:inline">
            Automated scoring: Exam relevance + Prerequisites + Confidence deficit
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8 text-center font-mono">
            <p className="font-bold text-foreground text-sm">No backlog items match your filter.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery || selectedSubject !== 'All' || selectedStatus !== 'All'
                ? 'Reset your active filters to see all chapters.'
                : 'No backlog yet. Add your first subject and chapter to generate your recovery plan.'}
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded bg-foreground text-background px-3 py-1 text-xs font-mono font-medium"
            >
              <Plus size={13} /> Add Chapter
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => {
              const priority = calculatePriorityScore(item, completedChapterIds);
              const prereqCheck = checkUnfinishedPrerequisites(
                item.chapterId,
                completedChapterIds
              );

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/15 transition"
                  data-testid={`backlog-row-${item.id}`}
                >
                  {/* Left: Checkmark + Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateItem(item.id, {
                          status: item.status === 'completed' ? 'not_started' : 'completed',
                          hoursSpent:
                            item.status === 'completed' ? 0 : item.estimatedHours,
                        })
                      }
                      className="mt-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground transition"
                      aria-label="Toggle completion"
                      data-testid={`button-toggle-complete-${item.id}`}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle size={17} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium text-sm text-foreground truncate ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {item.topic}
                        </span>

                        <span className="rounded border border-border bg-muted/40 px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                          {item.subject}
                        </span>

                        {/* Priority Tag */}
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold border ${
                            priority.level === 'critical'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : priority.level === 'high'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : priority.level === 'medium'
                              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                          title={priority.primaryReason}
                        >
                          {priority.badgeLabel.toUpperCase()}
                        </span>

                        {/* Status selector */}
                        <select
                          value={item.status}
                          onChange={(e) =>
                            onUpdateItem(item.id, {
                              status: e.target.value as BacklogStatus,
                              hoursSpent:
                                e.target.value === 'completed'
                                  ? item.estimatedHours
                                  : item.hoursSpent,
                            })
                          }
                          className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-foreground focus:outline-hidden"
                          data-testid={`select-status-${item.id}`}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="learning">Learning</option>
                          <option value="practicing">Practicing</option>
                          <option value="revision">Revision</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      {/* Transparent Priority Reason */}
                      <p className="mt-1 text-xs text-muted-foreground font-mono text-[11px]">
                        <span className="text-foreground font-medium">Calculation:</span>{' '}
                        {priority.primaryReason}
                      </p>

                      {/* Unfinished Prerequisite Warning */}
                      {prereqCheck.hasUnfinished && item.status !== 'completed' && (
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-amber-700 dark:text-amber-400">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>
                            Unfinished prerequisite: {prereqCheck.unfinishedPrereqs.map((u) => u.title).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Metadata row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono text-muted-foreground">
                        <span>{item.estimatedHours}h est. {item.hoursSpent > 0 ? `(${item.hoursSpent}h spent)` : ''}</span>
                        <span>·</span>
                        <span>Diff: {DIFFICULTY_LABELS[item.difficulty]}</span>
                        <span>·</span>
                        <span>Conf: {CONFIDENCE_LABELS[item.confidence]}</span>
                        <span>·</span>
                        <span>Exam: {RELEVANCE_LABELS[item.examRelevance]}</span>
                        {item.deadline && (
                          <>
                            <span>·</span>
                            <span className="text-rose-600 dark:text-rose-400">Target: {item.deadline}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono text-xs">
                    {onStartFocusChapter && item.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => onStartFocusChapter(item.chapterId)}
                        className="rounded border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-muted"
                        title="Open in Study Room"
                      >
                        Study
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Edit chapter"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-muted-foreground hover:text-rose-500"
                      title="Delete chapter"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Backlog Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
                  Syllabus Inventory
                </span>
                <h3 className="font-display text-base font-bold text-foreground">
                  {editingItem ? 'Edit Backlog Item' : 'Add Chapter to Backlog'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="mt-4 space-y-3.5 text-xs font-mono">
              {/* Subject */}
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <label className="text-muted-foreground">Subject</label>
                  <span className="text-[10px] text-muted-foreground">Class {profile.grade} CBSE · 2026–27</span>
                </div>
                <select
                  value={formData.subject}
                  onChange={(e) => {
                    const sub = e.target.value as Subject;
                    // Find first chapter for this subject
                    const matched = availableGradeSubjects.find(
                      (s) => s.name.toLowerCase() === sub.toLowerCase()
                    );
                    const subChs = matched
                      ? getChaptersForSubject(matched.id)
                      : chapters.filter((c) => c.subject.toLowerCase() === sub.toLowerCase());
                    const firstCh = subChs[0];

                    setFormData({
                      ...formData,
                      subject: sub,
                      chapterId: firstCh ? firstCh.id : formData.chapterId,
                      topic: firstCh ? firstCh.title : formData.topic,
                      estimatedHours: (firstCh as any)?.defaultEstimatedHours || 6,
                      difficulty: (firstCh as any)?.difficulty || 'medium',
                      examRelevance: (firstCh as any)?.examWeightage || 'high',
                    });
                  }}
                  className="w-full rounded border border-border bg-background p-2 text-xs font-sans font-medium text-foreground focus:outline-hidden"
                >
                  {filterSubjectNames
                    .filter((s) => s !== 'All')
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  {/* Also show any unenrolled grade subjects if user wants to add from curriculum */}
                  {availableGradeSubjects
                    .filter((s) => !filterSubjectNames.includes(s.name))
                    .map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (CBSE Code {s.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Chapter selector */}
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <label className="text-muted-foreground">Select Chapter / Syllabus Unit</label>
                  <span className="text-[10px] text-muted-foreground">
                    {modalChaptersForSubject.length} chapters available
                  </span>
                </div>
                <select
                  value={formData.chapterId}
                  onChange={(e) => {
                    const ch = modalChaptersForSubject.find((c) => c.id === e.target.value);
                    if (ch) {
                      setFormData({
                        ...formData,
                        chapterId: ch.id,
                        topic: ch.title,
                        estimatedHours: (ch as any).defaultEstimatedHours || formData.estimatedHours,
                        difficulty: (ch as any).difficulty || formData.difficulty,
                        examRelevance: (ch as any).examWeightage || formData.examRelevance,
                      });
                    }
                  }}
                  className="w-full rounded border border-border bg-background p-2 text-xs font-sans font-medium text-foreground focus:outline-hidden"
                >
                  {modalChaptersForSubject.map((c) => (
                    <option key={c.id} value={c.id}>
                      Ch {(c as any).chapterNumber ?? ''}: {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Hours & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 text-[11px]">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.5"
                    value={formData.estimatedHours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedHours: parseFloat(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 text-[11px]">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: e.target.value as BacklogDifficulty,
                      })
                    }
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans font-medium text-foreground focus:outline-hidden"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Confidence & Exam Relevance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 text-[11px]">
                    Your Confidence Level
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confidence: e.target.value as BacklogConfidence,
                      })
                    }
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans font-medium text-foreground focus:outline-hidden"
                  >
                    <option value="low">Low (Struggling / Forgotten)</option>
                    <option value="medium">Medium (Partially Clear)</option>
                    <option value="high">High (Confident)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 text-[11px]">
                    Exam Weightage
                  </label>
                  <select
                    value={formData.examRelevance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        examRelevance: e.target.value as ExamRelevance,
                      })
                    }
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans font-medium text-foreground focus:outline-hidden"
                  >
                    <option value="critical">Critical (High Weightage)</option>
                    <option value="high">High Yield</option>
                    <option value="medium">Medium Yield</option>
                    <option value="low">Low Yield</option>
                  </select>
                </div>
              </div>

              {/* Status & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 text-[11px]">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as BacklogStatus,
                      })
                    }
                    className="w-full rounded border border-border bg-background p-2 text-xs font-sans font-medium text-foreground focus:outline-hidden"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="learning">Learning</option>
                    <option value="practicing">Practicing</option>
                    <option value="revision">Revision</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 text-[11px]">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="w-full rounded border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-foreground text-background px-4 py-1.5 text-xs font-bold hover:bg-foreground/90 transition shadow-xs"
                  data-testid="button-save-backlog-modal"
                >
                  {editingItem ? 'Save Changes' : 'Add Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
