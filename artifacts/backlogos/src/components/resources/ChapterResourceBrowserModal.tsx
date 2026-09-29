import { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  type EducationalResource,
  type AcademicResourceType,
  type ResourceDiscoveryContext,
} from '@/lib/resources/types';
import { getOfficialChapterResources } from '@/lib/resources/official-catalog';
import { EducationalResourceCard } from './EducationalResourceCard';
import { ResourceDiscoverySection } from './ResourceDiscoverySection';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';

interface ChapterResourceBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterTitle: string;
  subject: string;
  onOpenNotes?: (resource: EducationalResource) => void;
  onOpenVideo?: (resource: any) => void;
}

export function ChapterResourceBrowserModal({
  isOpen,
  onClose,
  chapterId,
  chapterTitle,
  subject,
  onOpenNotes,
  onOpenVideo,
}: ChapterResourceBrowserModalProps) {
  const profile = readEducationProfile();
  const [activeTab, setActiveTab] = useState<'official' | 'videos'>('official');
  const [filterType, setFilterType] = useState<AcademicResourceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const context: ResourceDiscoveryContext = useMemo(() => ({
    grade: profile.grade || '11',
    board: profile.curriculum || 'CBSE',
    subject,
    chapter: chapterTitle,
    chapterId,
  }), [profile, subject, chapterTitle, chapterId]);

  const officialResources = useMemo(() => {
    return getOfficialChapterResources(context);
  }, [context]);

  const filteredResources = useMemo(() => {
    return officialResources.filter((r) => {
      if (filterType !== 'all' && r.resourceType !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.provider.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [officialResources, filterType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5 sm:p-6 bg-muted/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                CBSE CLASS {profile.grade} · {subject}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">·</span>
              <span className="text-[10px] font-mono text-primary font-bold">Official Syllabus</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
              Curated Academic Resources: {chapterTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Verified NCERT digital textbooks, exemplar questions, past year papers, and curated lectures.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-border px-6 pt-3 pb-2 font-mono text-xs bg-card overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('official')}
            className={`rounded-md px-3 py-1.5 font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'official'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <BookOpen size={13} />
            <span>Official NCERT, Solutions & PYQs ({officialResources.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`rounded-md px-3 py-1.5 font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'videos'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Sparkles size={13} />
            <span>Curated Video Lectures & One-Shots</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === 'official' ? (
            <>
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by keyword (e.g. formulas, pyq, exemplar)..."
                    className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {(
                    [
                      { id: 'all', label: `All (${officialResources.length})` },
                      { id: 'textbook', label: 'NCERT' },
                      { id: 'solution', label: 'Solutions' },
                      { id: 'notes', label: 'Notes' },
                      { id: 'mindmap', label: 'Mind Map' },
                      { id: 'practice', label: 'Exemplar' },
                      { id: 'pyq', label: 'PYQs' },
                      { id: 'revision', label: 'Rapid Recap' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFilterType(t.id as any)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition shrink-0 ${
                        filterType === t.id
                          ? 'border-foreground bg-foreground text-background font-bold'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Resources */}
              {filteredResources.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredResources.map((res) => (
                    <EducationalResourceCard
                      key={res.id}
                      resource={res}
                      onOpenNotes={onOpenNotes}
                      onOpenVideo={onOpenVideo}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground font-mono">
                  No resources matched your filter.
                </div>
              )}
            </>
          ) : (
            <ResourceDiscoverySection
              chapterId={chapterId}
              chapterTitle={chapterTitle}
              subject={subject}
              compact={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10 font-mono text-xs text-muted-foreground">
          <span>All materials aligned with CBSE 2026-27 rationalized syllabus.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
