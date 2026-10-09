import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Share2,
  Compass,
} from 'lucide-react';
import { type EducationalResource } from '@/lib/resources/types';
import {
  ncertSubtopicsData,
  getChapterSubtopics,
  readClearedSubtopics,
  saveClearedSubtopic,
  type NCERTSubtopic,
} from '@/lib/ncert-subtopics';
import {
  isResourceSaved,
  toggleSaveResource,
  isResourceCompleted,
  markResourceCompleted,
} from '@/lib/resources/resource-service';
import { getCurriculumChapterById, ALL_CBSE_CHAPTERS } from '@/lib/curriculum/chapters-index';
import { useToast } from '@/hooks/use-toast';
import { ChapterShortNotesModal } from './ChapterShortNotesModal';

interface MindMapModalProps {
  resource?: EducationalResource | null;
  chapterId?: string;
  chapterTitle?: string;
  subject?: string;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export function MindMapModal({
  resource,
  chapterId: propChapterId,
  chapterTitle: propChapterTitle,
  subject: propSubject,
  isOpen,
  onClose,
  onCompleted,
}: MindMapModalProps) {
  const { toast } = useToast();

  const initialChapterId = resource?.chapterId || propChapterId || 'phy-units';
  const initialChapterTitle = resource?.chapterTitle || propChapterTitle || 'Chapter Overview';
  const initialSubject = resource?.subject || propSubject || 'Physics';

  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedChapterId, setSelectedChapterId] = useState(initialChapterId);

  // Sync if props change
  useEffect(() => {
    if (initialChapterId) setSelectedChapterId(initialChapterId);
    if (initialSubject) setSelectedSubject(initialSubject);
  }, [initialChapterId, initialSubject]);

  const activeChapterMeta = useMemo(() => {
    return ALL_CBSE_CHAPTERS.find((c) => c.id === selectedChapterId);
  }, [selectedChapterId]);

  const activeChapterTitle =
    activeChapterMeta?.title || (selectedChapterId === initialChapterId ? initialChapterTitle : 'Chapter Overview');

  const availableSubjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

  const chaptersForSubject = useMemo(() => {
    const list = ALL_CBSE_CHAPTERS.filter(
      (c) =>
        c.subjectName === selectedSubject ||
        (selectedSubject === 'Biology' && c.subjectName?.toLowerCase().includes('bio'))
    );
    return list.length > 0 ? list : ALL_CBSE_CHAPTERS.slice(0, 15);
  }, [selectedSubject]);

  // Subtopics data from NCERT catalogue & dynamic curriculum synthesizer
  const rawSubtopics = useMemo(() => {
    return getChapterSubtopics(selectedChapterId, activeChapterTitle, selectedSubject);
  }, [selectedChapterId, activeChapterTitle, selectedSubject]);

  // Cleared/mastered subtopics tracking
  const [clearedMap, setClearedMap] = useState<Record<string, string[]>>(() => readClearedSubtopics());
  const clearedForChapter = useMemo(() => new Set(clearedMap[selectedChapterId] || []), [clearedMap, selectedChapterId]);

  // Active view tab: 'visual' | 'concepts' | 'formulas' | 'traps' | 'checklist'
  const [activeTab, setActiveTab] = useState<'visual' | 'concepts' | 'formulas' | 'traps' | 'checklist'>('visual');
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [showBookletModal, setShowBookletModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'highYield' | 'formulas' | 'traps'>('all');
  const [expandedSubtopics, setExpandedSubtopics] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    rawSubtopics.forEach((s) => {
      init[s.id] = true; // start expanded for instant visibility
    });
    return init;
  });

  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  // Persistence status
  const resourceId = resource?.id || `formula-mindmap-${chapterId}`;
  const [isSaved, setIsSaved] = useState(() => isResourceSaved(resourceId));
  const [isDone, setIsDone] = useState(() => isResourceCompleted(resourceId));

  if (!isOpen) return null;

  // Filter subtopics
  const filteredSubtopics = rawSubtopics.filter((sub) => {
    if (filterMode === 'highYield' && !sub.highYield) return false;
    if (filterMode === 'formulas' && !sub.keyFormula) return false;
    if (filterMode === 'traps' && !sub.trapNote) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = sub.title.toLowerCase().includes(q) || sub.code.toLowerCase().includes(q);
      const inConcepts = sub.coreConcepts.some((c) => c.toLowerCase().includes(q));
      const inFormula = sub.keyFormula?.toLowerCase().includes(q);
      const inTrap = sub.trapNote?.toLowerCase().includes(q);
      return inTitle || inConcepts || inFormula || inTrap;
    }
    return true;
  });

  const toggleSubtopicExpansion = (id: string) => {
    setExpandedSubtopics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    rawSubtopics.forEach((s) => {
      next[s.id] = expand;
    });
    setExpandedSubtopics(next);
  };

  const handleCopyFormula = (formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedFormula(formula);
    toast({
      title: 'Formula Copied to Clipboard',
      description: formula,
    });
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const handleToggleCleared = (subtopicId: string) => {
    const isCurrentlyCleared = clearedForChapter.has(subtopicId);
    const updated = saveClearedSubtopic(chapterId, subtopicId, !isCurrentlyCleared);
    setClearedMap({ ...updated });
    toast({
      title: !isCurrentlyCleared ? 'Subtopic Mastered!' : 'Marked for Review',
      description: !isCurrentlyCleared
        ? 'Great retention progress towards your backlog recovery!'
        : 'Subtopic will be highlighted in your daily revisions.',
    });
  };

  const handleToggleSave = () => {
    if (resource) {
      const next = toggleSaveResource(resource, {
        chapterId,
        chapterTitle,
        subject,
      });
      setIsSaved(next);
      toast({
        title: next ? 'Saved to Study Library' : 'Removed from Library',
        description: next ? 'Available offline for rapid revision.' : 'Resource removed.',
      });
    } else {
      setIsSaved((prev) => !prev);
      toast({
        title: !isSaved ? 'Saved to Study Library' : 'Removed from Library',
        description: 'Available offline for rapid revision.',
      });
    }
  };

  const handleToggleComplete = () => {
    const next = !isDone;
    markResourceCompleted(resourceId, next, {
      chapterId,
      chapterTitle,
      durationMinutes: resource?.durationMinutes || 15,
      resourceType: 'mindmap',
      logStudySessionToBacklog: next,
    });
    setIsDone(next);
    toast({
      title: next ? 'Mind Map Completed! (+15 XP)' : 'Marked Incomplete',
      description: next
        ? `Logged 15m revision for ${chapterTitle} into your daily study tracker.`
        : 'Status updated.',
    });
    if (onCompleted) onCompleted();
  };

  // Color theme by subject
  const subjectTheme = {
    Physics: {
      badge: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
      rootBorder: 'border-blue-500/40 bg-blue-500/5',
      rootGlow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      accentText: 'text-blue-500',
      branchLine: 'stroke-blue-500/30 dark:stroke-blue-400/20',
      nodeBorder: 'border-blue-500/30 hover:border-blue-500/60',
    },
    Chemistry: {
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      rootBorder: 'border-emerald-500/40 bg-emerald-500/5',
      rootGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      accentText: 'text-emerald-500',
      branchLine: 'stroke-emerald-500/30 dark:stroke-emerald-400/20',
      nodeBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
    },
    Mathematics: {
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      rootBorder: 'border-amber-500/40 bg-amber-500/5',
      rootGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      accentText: 'text-amber-500',
      branchLine: 'stroke-amber-500/30 dark:stroke-amber-400/20',
      nodeBorder: 'border-amber-500/30 hover:border-amber-500/60',
    },
    Biology: {
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      rootBorder: 'border-emerald-500/40 bg-emerald-500/5',
      rootGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
      accentText: 'text-emerald-500',
      branchLine: 'stroke-emerald-500/30 dark:stroke-emerald-400/20',
      nodeBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
    },
  }[selectedSubject as 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology'] || {
    badge: 'border-primary/30 bg-primary/10 text-primary',
    rootBorder: 'border-primary/40 bg-primary/5',
    rootGlow: 'shadow-[0_0_30px_rgba(99,102,241,0.15)]',
    accentText: 'text-primary',
    branchLine: 'stroke-primary/30',
    nodeBorder: 'border-primary/30 hover:border-primary/60',
  };

  const masteryPercent = rawSubtopics.length > 0
    ? Math.round((clearedForChapter.size / rawSubtopics.length) * 100)
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col h-full max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between border-b border-border p-4 sm:p-5 bg-muted/20 gap-3">
          <div className="space-y-1.5 pr-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${subjectTheme.badge}`}>
                <Compass size={12} />
                Visual Formula Mind Map
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {selectedSubject} · NCERT Blueprint
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                <CheckCircle2 size={10} className={masteryPercent === 100 ? 'text-emerald-500' : ''} />
                {masteryPercent}% Subtopics Mastered
              </span>
            </div>

            <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
              {activeChapterTitle} — Visual Mind Map & Formula Architecture
            </h2>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Hierarchical curriculum mind map with governing formulas, high-yield examination branches, and board examiner pitfalls.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Subject Selector */}
            <select
              value={selectedSubject}
              onChange={(e) => {
                const newSub = e.target.value;
                setSelectedSubject(newSub);
                const subChapters = ALL_CBSE_CHAPTERS.filter(
                  (c) => c.subjectName === newSub || (newSub === 'Biology' && c.subjectName?.toLowerCase().includes('bio'))
                );
                if (subChapters.length > 0) {
                  setSelectedChapterId(subChapters[0].id);
                }
              }}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono font-bold text-foreground focus:outline-hidden"
              title="Switch Subject"
            >
              {availableSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Chapter Selector */}
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="max-w-[150px] sm:max-w-[180px] rounded-lg border border-border bg-card px-2 py-1 text-xs font-mono text-foreground truncate focus:outline-hidden"
              title="Switch Chapter"
            >
              {chaptersForSubject.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.chapterNumber ? `Ch ${c.chapterNumber}: ` : ''}{c.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowBookletModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-mono font-bold text-primary hover:bg-primary/20 transition shadow-2xs whitespace-nowrap"
            >
              <BookOpen size={13} />
              <span>14-Page Notes</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition ml-1"
              aria-label="Close Mind Map"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border px-4 sm:px-5 py-2.5 bg-muted/10">
          {/* Main Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg self-start overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-bold transition whitespace-nowrap ${
                activeTab === 'visual'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass size={13} className="text-primary" />
              <span>Interactive Mind Map</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('concepts')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-bold transition whitespace-nowrap ${
                activeTab === 'concepts'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen size={13} className="text-cyan-500" />
              <span>Detailed Concepts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('formulas')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-bold transition whitespace-nowrap ${
                activeTab === 'formulas'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Copy size={13} className="text-amber-500" />
              <span>Formula Cheatsheet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('traps')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-bold transition whitespace-nowrap ${
                activeTab === 'traps'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AlertTriangle size={13} className="text-rose-500" />
              <span>Board Traps</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-bold transition whitespace-nowrap ${
                activeTab === 'checklist'
                  ? 'bg-card text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Mastery Checklist</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBookletModal(true)}
              className="sm:hidden flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold text-primary bg-primary/10 whitespace-nowrap"
            >
              <BookOpen size={12} />
              <span>12-Page Notes</span>
            </button>
          </div>

          {/* Quick Search & Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches & formulas..."
                className="w-full rounded-md border border-border bg-card pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {activeTab === 'visual' && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExpandAll(true)}
                  className="rounded border border-border bg-card px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                  title="Expand All Nodes"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => handleExpandAll(false)}
                  className="rounded border border-border bg-card px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                  title="Collapse All Nodes"
                >
                  Collapse
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: INTERACTIVE VISUAL MIND MAP */}
          {activeTab === 'visual' && (
            <div className="space-y-6">
              {/* Quick Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                <span className="text-muted-foreground text-[11px] mr-1 flex items-center gap-1">
                  <Filter size={11} /> Filter:
                </span>
                {[
                  { id: 'all', label: `All (${rawSubtopics.length})` },
                  { id: 'highYield', label: `🔥 High-Yield (${rawSubtopics.filter((s) => s.highYield).length})` },
                  { id: 'formulas', label: `📐 Formulas (${rawSubtopics.filter((s) => s.keyFormula).length})` },
                  { id: 'traps', label: `⚠️ Exam Traps (${rawSubtopics.filter((s) => s.trapNote).length})` },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setFilterMode(pill.id as any)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                      filterMode === pill.id
                        ? 'bg-foreground text-background font-bold shadow-2xs'
                        : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Central Root Mind Map Node */}
              <div className={`relative mx-auto max-w-xl rounded-2xl border-2 p-5 text-center transition ${subjectTheme.rootBorder} ${subjectTheme.rootGlow}`}>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground shadow-2xs">
                  <Sparkles size={12} className={subjectTheme.accentText} />
                  <span>CENTRAL CORE CONCEPT</span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-extrabold text-foreground mt-2">
                  {activeChapterTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {resource?.interactiveContent?.summary ||
                    `Governing physical laws, vector relations, derivations and problem-solving strategies.`}
                </p>

                {/* Root Meta Chips */}
                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-[11px] font-mono">
                  <span className="rounded bg-muted/60 px-2 py-0.5 text-muted-foreground">
                    {rawSubtopics.length} Major Branches
                  </span>
                  <span className="rounded bg-muted/60 px-2 py-0.5 text-muted-foreground">
                    {rawSubtopics.filter((s) => s.keyFormula).length} Core Formulas
                  </span>
                  <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-bold">
                    🔥 {rawSubtopics.filter((s) => s.highYield).length} High-Yield Branches
                  </span>
                </div>
              </div>

              {/* Visual Branch Connectors / Tree Representation */}
              <div className="relative space-y-4">
                {/* Visual Branch Line Indicator */}
                <div className="text-center font-mono text-[11px] text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2 my-2">
                  <div className="h-px w-12 bg-border" />
                  <span>Radiating Syllabus Branches ({filteredSubtopics.length})</span>
                  <div className="h-px w-12 bg-border" />
                </div>

                {/* Subtopic Branch Nodes Grid */}
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {filteredSubtopics.map((sub, idx) => {
                    const isExpanded = expandedSubtopics[sub.id] ?? true;
                    const isCleared = clearedForChapter.has(sub.id);

                    return (
                      <div
                        key={sub.id}
                        className={`group rounded-xl border bg-card p-4 transition ${
                          isCleared
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : subjectTheme.nodeBorder
                        }`}
                      >
                        {/* Branch Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-foreground">
                              {sub.code}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition">
                                  {sub.title}
                                </h4>
                                {sub.highYield && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                                    <Flame size={10} />
                                    HIGH YIELD
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Mastery Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleCleared(sub.id)}
                              className={`p-1 rounded transition ${
                                isCleared
                                  ? 'text-emerald-500 hover:text-emerald-600'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              title={isCleared ? 'Marked as Mastered' : 'Mark subtopic as Mastered'}
                            >
                              <CheckCircle2 size={16} className={isCleared ? 'fill-emerald-500/20' : ''} />
                            </button>

                            {/* Collapse/Expand Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleSubtopicExpansion(sub.id)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              title={isExpanded ? 'Collapse node' : 'Expand node'}
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Branch Details */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2.5 pt-2 border-t border-border/60 text-xs">
                            {/* Core Concepts Sub-branches */}
                            {sub.coreConcepts && sub.coreConcepts.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                                  Key Conceptual Branches:
                                </span>
                                <ul className="space-y-1 pl-1">
                                  {sub.coreConcepts.map((concept, cIdx) => (
                                    <li
                                      key={cIdx}
                                      className="flex items-start gap-1.5 text-muted-foreground text-xs leading-relaxed"
                                    >
                                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                      <span>{concept}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Governing Formula Branch */}
                            {sub.keyFormula && (
                              <div
                                onClick={() => handleCopyFormula(sub.keyFormula!)}
                                className="group/formula flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5 hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition"
                              >
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block font-bold">
                                    Governing Formula (Click to copy):
                                  </span>
                                  <code className="font-mono text-xs font-bold text-foreground">
                                    {sub.keyFormula}
                                  </code>
                                </div>
                                <button
                                  type="button"
                                  className="text-muted-foreground group-hover/formula:text-primary transition shrink-0 ml-2"
                                  title="Copy Formula"
                                >
                                  {copiedFormula === sub.keyFormula ? (
                                    <Check size={14} className="text-emerald-500" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Common Board Trap Branch */}
                            {sub.trapNote && (
                              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-amber-700 dark:text-amber-300">
                                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">
                                    Examiner Trap Warning:
                                  </span>
                                  <p className="text-[11px] leading-tight text-amber-800/90 dark:text-amber-200/90">
                                    {sub.trapNote}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Deep-Dive Concept Action */}
                            <div className="pt-2 flex items-center justify-between border-t border-border/40 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedConceptId(sub.id);
                                  setActiveTab('concepts');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-primary hover:underline"
                              >
                                <span>Detailed Concept Breakdown</span>
                                <ChevronRight size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setShowBookletModal(true)}
                                className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
                              >
                                View in 14-Page Booklet
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DETAILED CONCEPTS DEEP-DIVE */}
          {activeTab === 'concepts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Comprehensive Subtopic Concepts & Physical Intuition ({rawSubtopics.length} Modules)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Detailed step-by-step explanations, key derivations, variables breakdown, and board exam archetypes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBookletModal(true)}
                  className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-mono font-bold text-primary hover:bg-primary/20 transition flex items-center gap-1.5"
                >
                  <BookOpen size={13} />
                  <span>Open 14-Page Revision Booklet</span>
                </button>
              </div>

              <div className="space-y-6">
                {rawSubtopics.map((sub, idx) => (
                  <div
                    key={sub.id}
                    id={`concept-${sub.id}`}
                    className={`rounded-2xl border bg-card p-5 space-y-4 transition ${
                      selectedConceptId === sub.id
                        ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                        : 'border-border'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                          {sub.code}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-base font-bold text-foreground">
                              {sub.title}
                            </h4>
                            {sub.highYield && (
                              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-500">
                                🔥 HIGH YIELD
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Module {idx + 1} of {rawSubtopics.length} · CBSE {activeChapterTitle}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCleared(sub.id)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                          clearedForChapter.has(sub.id)
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'border border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <CheckCircle2 size={13} className={clearedForChapter.has(sub.id) ? 'fill-emerald-500/20' : ''} />
                        <span>{clearedForChapter.has(sub.id) ? 'Mastered' : 'Mark Cleared'}</span>
                      </button>
                    </div>

                    {/* Conceptual Intuition & Explanation */}
                    <div className="space-y-2">
                      <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider block">
                        1. Theoretical Intuition & Core Principles
                      </span>
                      <div className="rounded-xl bg-muted/30 p-4 text-xs sm:text-sm leading-relaxed text-foreground/90 space-y-2">
                        {sub.coreConcepts.map((concept, cIdx) => (
                          <div key={cIdx} className="flex items-start gap-2">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-mono font-bold text-primary mt-0.5">
                              {cIdx + 1}
                            </span>
                            <p>{concept}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Governing Equation Breakdown */}
                    {sub.keyFormula && (
                      <div className="space-y-2">
                        <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider block">
                          2. Mathematical Formulation & Parameter Definitions
                        </span>
                        <div
                          onClick={() => handleCopyFormula(sub.keyFormula!)}
                          className="group/form flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 cursor-pointer transition"
                        >
                          <div className="space-y-1">
                            <code className="font-mono text-sm sm:text-base font-bold text-primary break-all">
                              {sub.keyFormula}
                            </code>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              Click equation to copy in standard formatting for derivations.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="p-2 rounded-lg border border-border text-muted-foreground group-hover/form:text-primary transition shrink-0 ml-3"
                          >
                            {copiedFormula === sub.keyFormula ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Board Derivation / Mechanism Insight */}
                    <div className="space-y-2">
                      <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider block">
                        3. Step-by-Step Derivation & Board Examination Mechanics
                      </span>
                      <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs space-y-2 text-muted-foreground">
                        <p><strong>Step 1:</strong> State all boundary conditions and coordinate assumptions clearly.</p>
                        <p><strong>Step 2:</strong> Formulate the differential or conservation balance equation for this subtopic.</p>
                        <p><strong>Step 3:</strong> Perform algebraic substitution or integration over the specified boundary interval.</p>
                        <p><strong>Step 4:</strong> Check dimensional homogeneity [M, L, T] and interpret limiting behavior.</p>
                      </div>
                    </div>

                    {/* Common Board Pitfalls */}
                    {sub.trapNote && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-800 dark:text-amber-200">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                            Common Board Exam Mistake & Presentation Penalty:
                          </span>
                          <p className="leading-relaxed">{sub.trapNote}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: FORMULA CHEATSHEET */}
          {activeTab === 'formulas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    All Chapter Governing Formulas ({rawSubtopics.filter((s) => s.keyFormula).length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Click any equation to copy in standard LaTeX/ASCII for notes or problem solving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allFormulas = rawSubtopics
                      .filter((s) => s.keyFormula)
                      .map((s) => `[${s.code}] ${s.title}:\n${s.keyFormula}`)
                      .join('\n\n');
                    navigator.clipboard.writeText(allFormulas);
                    toast({
                      title: 'All Formulas Copied',
                      description: 'Copied complete chapter formula catalog.',
                    });
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5"
                >
                  <Copy size={13} />
                  <span>Copy All Formulas</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {rawSubtopics
                  .filter((s) => s.keyFormula)
                  .map((sub, idx) => (
                    <div
                      key={sub.id}
                      onClick={() => handleCopyFormula(sub.keyFormula!)}
                      className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-primary">
                            Subtopic {sub.code} · {sub.title}
                          </span>
                          {sub.highYield && (
                            <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[9px] font-mono font-bold text-rose-500">
                              HIGH YIELD
                            </span>
                          )}
                        </div>
                        <code className="block rounded-md bg-muted/60 p-2.5 font-mono text-xs font-bold text-foreground break-all">
                          {sub.keyFormula}
                        </code>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-2 border-t border-border/50">
                        <span>Click to copy equation</span>
                        {copiedFormula === sub.keyFormula ? (
                          <span className="text-emerald-500 flex items-center gap-1 font-bold">
                            <Check size={12} /> Copied!
                          </span>
                        ) : (
                          <Copy size={12} className="group-hover:text-primary transition" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 3: BOARD EXAM TRAPS */}
          {activeTab === 'traps' && (
            <div className="space-y-4">
              <div className="border-b border-border pb-2">
                <h3 className="font-display text-sm font-bold text-foreground">
                  Common CBSE Board Exam Pitfalls & Examiner Red Flags
                </h3>
                <p className="text-xs text-muted-foreground">
                  Compiled from official CBSE evaluated answer sheet analyses and marking rubrics.
                </p>
              </div>

              <div className="space-y-3">
                {rawSubtopics
                  .filter((s) => s.trapNote)
                  .map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-900 dark:text-amber-200 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          Trap #{idx + 1}: Subtopic {sub.code} ({sub.title})
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed pl-6">
                        {sub.trapNote}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: MASTERY CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    Chapter Mastery Progress: {masteryPercent}% Complete
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Check off subtopics as you understand the core derivations and formulas.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-primary">
                  {clearedForChapter.size} of {rawSubtopics.length} cleared
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>

              <div className="space-y-2">
                {rawSubtopics.map((sub) => {
                  const isCleared = clearedForChapter.has(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleToggleCleared(sub.id)}
                      className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition ${
                        isCleared
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                            isCleared
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-muted-foreground/40 bg-card'
                          }`}
                        >
                          {isCleared && <Check size={13} className="stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {sub.code} {sub.title}
                            </span>
                            {sub.highYield && (
                              <span className="rounded bg-rose-500/10 px-1 text-[9px] font-mono font-bold text-rose-500">
                                HIGH YIELD
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {sub.coreConcepts.length} core concepts · {sub.keyFormula ? 'Formula attached' : 'Theory topic'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[11px] font-mono font-semibold ${isCleared ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {isCleared ? 'Mastered' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="flex items-center justify-between border-t border-border p-4 sm:p-5 bg-card">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSave}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            >
              {isSaved ? (
                <>
                  <BookmarkCheck size={14} className="text-primary fill-primary" />
                  <span>Saved to Library</span>
                </>
              ) : (
                <>
                  <Bookmark size={14} />
                  <span>Save for Review</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleComplete}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-mono font-bold transition ${
                isDone
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-foreground text-background hover:bg-foreground/90'
              }`}
            >
              <CheckCircle2 size={14} className={isDone ? 'fill-emerald-500/20' : ''} />
              <span>{isDone ? 'Completed (+15 XP)' : 'Mark Mind Map Complete'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* 14-Page Short Notes Booklet Modal (z-[80]) */}
      {showBookletModal && (
        <ChapterShortNotesModal
          chapterId={selectedChapterId}
          chapterTitle={activeChapterTitle}
          subject={selectedSubject}
          isOpen={showBookletModal}
          onClose={() => setShowBookletModal(false)}
        />
      )}
    </div>
  );
}
