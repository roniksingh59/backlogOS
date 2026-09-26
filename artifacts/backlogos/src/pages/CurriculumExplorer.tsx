import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  ExternalLink,
  Plus,
  ArrowRight,
  Layers,
  GraduationCap,
  Sparkles,
  Settings,
} from 'lucide-react';
import {
  type GradeLevel,
  type StreamId,
  type CurriculumSubject,
  type CurriculumChapter,
} from '@/lib/curriculum/types';
import {
  getAvailableSubjectsForGrade,
  getSubjectRecommendations,
  searchCurriculum,
  getChaptersForSubject,
} from '@/lib/curriculum/registry';
import { readEducationProfile, saveEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { SubjectDetailModal } from '@/components/SubjectDetailModal';
import { ChapterDetailModal } from '@/components/ChapterDetailModal';
import { SubjectManagementModal } from '@/components/SubjectManagementModal';

export function CurriculumExplorer() {
  const [profile, setProfile] = useState(() => readEducationProfile());
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(profile.grade || '11');
  const [selectedStream, setSelectedStream] = useState<StreamId>(profile.stream || 'pcm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<CurriculumSubject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<CurriculumChapter | null>(null);
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Recommendations and available subjects
  const { recommended, optional } = useMemo(
    () => getSubjectRecommendations(selectedGrade, selectedStream),
    [selectedGrade, selectedStream]
  );

  // Search results if query active
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchCurriculum(searchQuery, selectedGrade);
  }, [searchQuery, selectedGrade]);

  const handleUpdateActiveGrade = (grade: GradeLevel) => {
    setSelectedGrade(grade);
    const updated = { ...profile, grade };
    saveEducationProfile(updated);
    setProfile(updated);
  };

  const handleUpdateActiveStream = (stream: StreamId) => {
    setSelectedStream(stream);
    const updated = { ...profile, stream };
    saveEducationProfile(updated);
    setProfile(updated);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 font-sans">
      {/* Page Header */}
      <div className="border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <span>CBSE ACADEMIC KNOWLEDGE LAYER</span>
              <span>·</span>
              <span className="font-bold text-foreground">SESSION 2026–27</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5">
              Official CBSE Curriculum & Chapter Database
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Verified syllabus structures and official NCERT textbook links for Classes 9–12.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsManageOpen(true)}
            className="rounded border border-border bg-card px-3 py-2 text-xs font-mono font-bold text-foreground hover:bg-muted transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Settings size={14} />
            <span>Manage My Subjects</span>
          </button>
        </div>

        {/* Filter Bar: Class, Stream & Search */}
        <div className="mt-4 grid gap-3 sm:grid-cols-12 items-center font-mono text-xs">
          {/* Grade selection */}
          <div className="sm:col-span-4 flex items-center gap-1 border border-border bg-background p-1">
            {(['9', '10', '11', '12'] as const).map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => handleUpdateActiveGrade(grade)}
                className={`flex-1 py-1 rounded text-center transition ${
                  selectedGrade === grade
                    ? 'bg-foreground text-background font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Class {grade}
              </button>
            ))}
          </div>

          {/* Stream selector for Class 11 and 12 */}
          {(selectedGrade === '11' || selectedGrade === '12') && (
            <div className="sm:col-span-4">
              <select
                value={selectedStream}
                onChange={(e) => handleUpdateActiveStream(e.target.value as StreamId)}
                className="w-full rounded border border-border bg-background p-2 text-xs font-mono text-foreground focus:outline-hidden"
              >
                <optgroup label="Science Streams">
                  <option value="pcm">Science (PCM)</option>
                  <option value="pcb">Science (PCB)</option>
                  <option value="pcmb">Science (PCMB)</option>
                  <option value="science_cs">Science + Computer Science</option>
                </optgroup>
                <optgroup label="Commerce Streams">
                  <option value="commerce_math">Commerce with Mathematics</option>
                  <option value="commerce_no_math">Commerce without Mathematics</option>
                </optgroup>
                <optgroup label="Humanities Streams">
                  <option value="humanities">Humanities</option>
                  <option value="humanities_math">Humanities with Mathematics</option>
                </optgroup>
              </select>
            </div>
          )}

          {/* Search box */}
          <div className={selectedGrade === '11' || selectedGrade === '12' ? 'sm:col-span-4' : 'sm:col-span-8'}>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chapters, topics, or subjects..."
                className="w-full rounded border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:outline-hidden font-sans"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH RESULTS VIEW */}
      {searchResults ? (
        <div className="border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2 text-xs font-mono">
            <span className="font-bold text-foreground">
              Search Results ({searchResults.chapters.length} chapters, {searchResults.subjects.length} subjects)
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Search
            </button>
          </div>

          <div className="divide-y divide-border border border-border bg-background text-xs">
            {searchResults.chapters.map((ch) => (
              <div
                key={ch.id}
                onClick={() => setSelectedChapter(ch)}
                className="p-3 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span>Class {ch.class}</span>
                    <span>·</span>
                    <span className="font-bold text-foreground">{ch.subjectName}</span>
                    <span>·</span>
                    <span>Ch {ch.chapterNumber}</span>
                  </div>
                  <p className="font-bold text-foreground font-sans text-sm mt-0.5">
                    {ch.title}
                  </p>
                  <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">
                    {ch.description}
                  </p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground shrink-0 ml-3" />
              </div>
            ))}
            {searchResults.chapters.length === 0 && searchResults.subjects.length === 0 && (
              <div className="p-8 text-center text-xs font-mono text-muted-foreground">
                No matching CBSE chapters found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STANDARD CURRICULUM CATALOGUE VIEW */
        <div className="space-y-6">
          {/* Recommended Core Subjects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold uppercase tracking-wider text-foreground">
                Recommended Core Subjects for Class {selectedGrade}
                {(selectedGrade === '11' || selectedGrade === '12') && ` · ${selectedStream.toUpperCase()}`}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {recommended.length} subjects
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((sub) => {
                const chapters = getChaptersForSubject(sub.id);
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className="border border-border bg-card p-4 hover:border-foreground/40 transition cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Code {sub.code}</span>
                        <span className="rounded bg-muted px-1.5 py-0.2 capitalize">
                          {sub.category}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-bold text-foreground mt-1">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {sub.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span>{chapters.length} Chapters</span>
                      <span className="text-foreground font-bold hover:underline flex items-center gap-1">
                        View Syllabus <ArrowRight size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional / Elective Subjects */}
          {optional.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Optional / Elective & Skill Subjects for Class {selectedGrade}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {optional.length} subjects
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {optional.map((sub) => {
                  const chapters = getChaptersForSubject(sub.id);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubject(sub)}
                      className="border border-border bg-card p-4 hover:border-foreground/40 transition cursor-pointer flex flex-col justify-between opacity-90"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                          <span>Code {sub.code}</span>
                          <span className="rounded bg-muted px-1.5 py-0.2 capitalize">
                            {sub.category}
                          </span>
                        </div>
                        <h3 className="font-display text-base font-bold text-foreground mt-1">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {sub.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>{chapters.length} Chapters</span>
                        <span className="text-foreground font-bold hover:underline flex items-center gap-1">
                          View Syllabus <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedSubject && (
        <SubjectDetailModal
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      )}

      {selectedChapter && (
        <ChapterDetailModal
          chapter={selectedChapter}
          onClose={() => setSelectedChapter(null)}
        />
      )}

      {isManageOpen && (
        <SubjectManagementModal
          onClose={() => setIsManageOpen(false)}
          onProfileUpdated={() => setProfile(readEducationProfile())}
        />
      )}
    </div>
  );
}
