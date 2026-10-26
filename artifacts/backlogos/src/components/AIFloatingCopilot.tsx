import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  RotateCcw,
  BookOpen,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Zap,
  ArrowRight,
  Flame,
  Clock,
  ExternalLink,
  Globe,
  HeartHandshake,
  Play,
  Bookmark,
  BookmarkCheck,
  FileText,
  Youtube,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  readBacklogItems,
  readStudySessions,
  readPlan,
  readTestLogs,
  readSpacedRevisions,
} from '@/lib/storage';
import { calculateBacklogMetrics } from '@/lib/backlog-items';
import { calculateWillIFinish } from '@/lib/smart-planner';
import { readEducationProfile } from '@/lib/curriculum/user-profile-storage';
import { getAvailableSubjectsForGrade } from '@/lib/curriculum/registry';
import { getCurriculumChaptersByGrade, type CurriculumChapter } from '@/lib/curriculum/chapters-index';
import { triggerTaskCelebration } from '@/lib/celebration';
import { YouTubePlayerModal } from '@/components/resources/YouTubePlayerModal';
import { UniversalResourceModal } from '@/components/resources/UniversalResourceModal';
import { type YouTubeResource, type EducationalResource } from '@/lib/resources/types';
import { isResourceSaved, toggleSaveResource } from '@/lib/resources/resource-service';
import { useToast } from '@/hooks/use-toast';

export interface CuratedResourceItem {
  id: string;
  type: 'youtube' | 'notes';
  title: string;
  creator: string;
  url: string;
  duration?: string;
  durationMinutes?: number;
  whyRecommended: string;
  badge?: string;
  videoId?: string;
  thumbnail?: string;
  isEmbeddable?: boolean;
}

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
  webSources?: { title: string; url: string }[];
  curatedResources?: CuratedResourceItem[];
  targetChapter?: string;
}

function renderFormattedInline(str: string): React.ReactNode {
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-muted/80 px-1 py-0.2 font-mono text-[11px] text-sky-500 dark:text-sky-400 border border-border/50">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function FormattedBaxMessage({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .filter((line) => !line.trim().startsWith('[CURATED_RESOURCE:'));

  return (
    <div className="space-y-1.5 text-xs font-sans leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-0.5" />;
        }

        // Header 3: ### Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="font-bold text-foreground text-xs pt-1.5 pb-0.5 border-b border-border/40 flex items-center gap-1.5"
            >
              {renderFormattedInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Header 2: ## Heading
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-bold text-foreground text-sm pt-2 pb-0.5 flex items-center gap-1.5">
              {renderFormattedInline(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }

        // Warning / Trap Callout
        if (trimmed.startsWith('⚠️') || trimmed.toLowerCase().includes('trap:') || trimmed.toLowerCase().startsWith('exam setter trick')) {
          return (
            <div
              key={idx}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300 font-medium my-1 text-[11px] flex items-start gap-1.5 shadow-2xs"
            >
              <span>{renderFormattedInline(trimmed)}</span>
            </div>
          );
        }

        // Numbered list: 1. Item
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="font-mono text-[10px] font-bold text-primary shrink-0 mt-0.5">
                  {match[1]}.
                </span>
                <span className="flex-1 text-foreground/90">
                  {renderFormattedInline(match[2])}
                </span>
              </div>
            );
          }
        }

        // Bullet list: * Item or - Item or • Item
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const cleanText = trimmed.replace(/^[\*\-•]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5 my-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0 mt-1.5" />
              <span className="flex-1 text-foreground/90">
                {renderFormattedInline(cleanText)}
              </span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-foreground/90 my-0.5">
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

interface CuratedResourceCardsProps {
  resources: CuratedResourceItem[];
  chapterId?: string;
  chapterTitle?: string;
  subject?: string;
  onWatchVideo: (v: YouTubeResource) => void;
  onOpenNotes: (r: EducationalResource) => void;
}

function CuratedResourceCards({
  resources,
  chapterId,
  chapterTitle,
  subject,
  onWatchVideo,
  onOpenNotes,
}: CuratedResourceCardsProps) {
  const { toast } = useToast();
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const r of resources) {
      map[r.id] = isResourceSaved(r.id);
    }
    return map;
  });

  const handleToggleSave = (item: CuratedResourceItem) => {
    const isSaved = !savedIds[item.id];
    const eduResource: EducationalResource = {
      id: item.id,
      title: item.title,
      resourceType: item.type === 'youtube' ? 'video' : 'notes',
      subject: subject || 'Science',
      chapterId,
      chapterTitle,
      provider: item.creator,
      url: item.url,
      thumbnail: item.thumbnail || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
      duration: item.duration,
      durationMinutes: item.durationMinutes || 30,
      difficulty: 'all-levels',
      recommendationReason: item.whyRecommended,
      actionLabel: item.type === 'youtube' ? 'Watch' : 'Read',
      estimatedMinutes: item.durationMinutes || 30,
    };
    toggleSaveResource(eduResource, { chapterId, chapterTitle, subject });
    setSavedIds((prev) => ({ ...prev, [item.id]: isSaved }));
    toast({
      title: isSaved ? 'Saved to Study Library' : 'Removed from Library',
      description: item.title,
    });
  };

  const youtubeItems = resources.filter((r) => r.type === 'youtube');
  const notesItems = resources.filter((r) => r.type === 'notes');

  return (
    <div className="mt-3 pt-3 border-t border-border/50 space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground font-mono">
          <Sparkles size={12} className="text-amber-500 animate-pulse" />
          <span>Curated Recommendations (Search-Grounded)</span>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
          Verified
        </span>
      </div>

      {/* YouTube Lectures */}
      {youtubeItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <Youtube size={12} className="text-red-500" />
            <span>YouTube Lectures & Playlists</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {youtubeItems.map((item) => {
              const isSaved = Boolean(savedIds[item.id]);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-red-500/20 bg-background/90 p-2.5 shadow-2xs hover:border-red-500/40 transition flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 font-bold">
                        <Play size={12} className="fill-red-500" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h5 className="text-[11px] font-bold text-foreground line-clamp-1 leading-snug">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                          <span className="font-semibold text-foreground/80">{item.creator}</span>
                          {item.duration && <span>· {item.duration}</span>}
                          {item.badge && (
                            <span className="rounded bg-red-500/10 px-1 py-0.2 text-[9px] text-red-600 dark:text-red-300 font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSave(item)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition rounded"
                      title={isSaved ? 'Saved to library' : 'Save for later'}
                    >
                      {isSaved ? <BookmarkCheck size={13} className="text-primary" /> : <Bookmark size={13} />}
                    </button>
                  </div>

                  <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-1.5 leading-relaxed">
                    💡 <strong className="text-foreground/90">Why recommended:</strong> {item.whyRecommended}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    {item.videoId ? (
                      <button
                        type="button"
                        onClick={() =>
                          onWatchVideo({
                            id: item.videoId!,
                            title: item.title,
                            channel: item.creator,
                            duration: item.duration || '30m',
                            durationMinutes: item.durationMinutes || 30,
                            thumbnail: item.thumbnail || `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg`,
                            resourceType: 'oneshot',
                            language: 'Hinglish',
                            relevanceLabel: 'Search Grounded Curated Pick',
                            isEmbeddable: true,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-2.5 py-1 text-[10px] font-mono font-bold hover:opacity-90 active:scale-95 transition shadow-xs cursor-pointer"
                      >
                        <Play size={10} className="fill-current" />
                        <span>Watch in BacklogOS</span>
                      </button>
                    ) : null}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 hover:bg-muted px-2 py-1 text-[10px] font-mono text-foreground transition"
                    >
                      <ExternalLink size={10} />
                      <span>YouTube</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open-Source Notes */}
      {notesItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase font-bold">
            <FileText size={12} className="text-emerald-500" />
            <span>Open-Source Notes & High-Yield Sheets</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {notesItems.map((item) => {
              const isSaved = Boolean(savedIds[item.id]);
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-emerald-500/20 bg-background/90 p-2.5 shadow-2xs hover:border-emerald-500/40 transition flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-bold">
                        <FileText size={12} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h5 className="text-[11px] font-bold text-foreground line-clamp-1 leading-snug">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                          <span className="font-semibold text-foreground/80">{item.creator}</span>
                          {item.duration && <span>· {item.duration}</span>}
                          {item.badge && (
                            <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] text-emerald-600 dark:text-emerald-300 font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSave(item)}
                      className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition rounded"
                      title={isSaved ? 'Saved to library' : 'Save for later'}
                    >
                      {isSaved ? <BookmarkCheck size={13} className="text-primary" /> : <Bookmark size={13} />}
                    </button>
                  </div>

                  <p className="text-[10px] text-muted-foreground bg-muted/40 rounded-lg p-1.5 leading-relaxed">
                    📑 <strong className="text-foreground/90">Why recommended:</strong> {item.whyRecommended}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenNotes({
                          id: item.id,
                          title: item.title,
                          resourceType: 'notes',
                          subject: subject || 'Science',
                          chapterId,
                          chapterTitle,
                          provider: item.creator,
                          url: item.url,
                          thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80',
                          duration: item.duration || '25 mins read',
                          durationMinutes: item.durationMinutes || 25,
                          difficulty: 'all-levels',
                          recommendationReason: item.whyRecommended,
                          actionLabel: 'Read',
                          estimatedMinutes: item.durationMinutes || 25,
                          isOfficial: item.creator.includes('NCERT') || item.creator.includes('CBSE'),
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-mono font-bold hover:opacity-90 active:scale-95 transition shadow-xs cursor-pointer"
                    >
                      <BookOpen size={10} />
                      <span>Read Notes</span>
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 hover:bg-muted px-2 py-1 text-[10px] font-mono text-foreground transition"
                    >
                      <ExternalLink size={10} />
                      <span>Open Link</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIFloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all-general');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<YouTubeResource | null>(null);
  const [selectedNotesForModal, setSelectedNotesForModal] = useState<EducationalResource | null>(null);

  // Student active education profile
  const profile = readEducationProfile();
  const grade = profile.grade || '11';

  // Load available chapters for the student's grade
  const gradeChapters = useMemo(() => {
    return getCurriculumChaptersByGrade(grade);
  }, [grade]);

  // Read current live backlog state
  const backlogItems = useMemo(() => readBacklogItems(), [isOpen]);
  const sessions = useMemo(() => readStudySessions(), [isOpen]);
  const plan = useMemo(() => readPlan(), [isOpen]);
  const testLogs = useMemo(() => readTestLogs(), [isOpen]);
  const revisions = useMemo(() => readSpacedRevisions(), [isOpen]);

  const metrics = useMemo(() => {
    return calculateBacklogMetrics(backlogItems, plan?.minutesPerDay ? plan.minutesPerDay / 60 : 3.5);
  }, [backlogItems, plan]);

  const finishAnalysis = useMemo(() => {
    return calculateWillIFinish(
      backlogItems,
      sessions,
      plan?.minutesPerDay ? plan.minutesPerDay / 60 : 3.5,
      plan?.examDate
    );
  }, [backlogItems, sessions, plan]);

  const initialGreeting = useMemo<ChatMsg>(() => ({
    id: 'init',
    role: 'assistant',
    text: `👋 Hi! I'm **Bax**, your personal academic mentor & strategist for **CBSE Class ${grade}**.\n\nI have live visibility into your **${metrics.remainingHours}h backlog**, daily pace (**${finishAnalysis.currentPaceHoursPerDay}h/day**), and connect directly with Google & student community discussions.\n\nAsk me anything:\n• 🚀 **Deep Concepts**: *"What is Inertia?"*, *"Why is entropy increasing?"*, *"Explain p-n junction diode"*.\n• 🎯 **Backlog Clearance**: *"How do I clear 40+ hours of backlog without burnout?"*\n• 🎬 **Curate Lectures & Notes**: *"Curate YouTube playlists and open-source notes for Kinematics / Chemical Bonding"*\n• 🧠 **Mental Health & Panic**: *"I feel overwhelmed and scared of failing. Help me calm down."*\n• ⏱️ **Daily Action**: *"I only have 2 hours today. What should I study?"*`,
    time: 'Just now',
  }), [grade, metrics.remainingHours, finishAnalysis.currentPaceHoursPerDay]);

  const [messages, setMessages] = useState<ChatMsg[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChapter = useMemo(() => {
    if (selectedChapterId === 'all-general') return null;
    return gradeChapters.find((c) => c.id === selectedChapterId) || null;
  }, [selectedChapterId, gradeChapters]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerTaskCelebration();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([initialGreeting]);
  };

  const handleCurateForChapter = (chap?: CurriculumChapter | null) => {
    const targetTitle = chap?.title || (selectedChapter ? selectedChapter.title : (backlogItems[0]?.topic || 'Kinematics'));
    const targetSubj = chap?.subjectName || selectedChapter?.subjectName || (backlogItems[0]?.subject || 'Physics');
    handleSend(`Curate the highest-yield YouTube lecture playlists and verified open-source notes for "${targetTitle}" (${targetSubj}) using Search Grounding, and explain which one is best for rapid backlog clearing.`);
  };

  const handleSend = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMsg = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text: queryText.trim(),
      time: 'Just now',
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setQuestion('');
    setLoading(true);

    const activeChapters = backlogItems
      .filter((i) => i.status !== 'completed')
      .map((i) => `${i.subject}: ${i.topic} (${i.estimatedHours}h, prio: ${i.examRelevance})`);

    const weakChapters = backlogItems
      .filter((i) => i.confidence === 'low' || i.difficulty === 'hard')
      .map((i) => i.topic);

    const dueRevs = revisions
      .filter((r) => r.status === 'due' || r.status === 'overdue')
      .map((r) => `${r.subject}: ${r.chapterTitle}`);

    const enrolledSubjects = profile.enrolledSubjectIds
      .map((id) => getAvailableSubjectsForGrade(profile.grade).find((s) => s.id === id)?.name)
      .filter(Boolean);

    const studentContext = {
      curriculum: profile.curriculum,
      academicSession: profile.academicSession,
      grade: profile.grade,
      stream: profile.stream,
      enrolledSubjects: enrolledSubjects.length > 0 ? enrolledSubjects : ['Core Subjects'],
      remainingHours: metrics.remainingHours,
      totalHours: metrics.totalBacklogHours,
      completedHours: metrics.completedHours,
      dailyHours: plan?.minutesPerDay ? Math.round((plan.minutesPerDay / 60) * 10) / 10 : 3.5,
      currentPace: finishAnalysis.currentPaceHoursPerDay,
      requiredPace: finishAnalysis.requiredPaceHoursPerDay,
      daysToExam: finishAnalysis.daysToExam,
      isOnTrack: finishAnalysis.isOnTrack,
      activeChapters: activeChapters.slice(0, 6),
      weakChapters: weakChapters.slice(0, 4),
      dueRevisions: dueRevs,
      estimatedCompletionDate: finishAnalysis.estimatedCompletionDate,
      recentMistakes: testLogs.length > 0 ? `Recent test: ${testLogs[0].testName}` : 'None logged',
    };

    const payload = {
      userQuery: queryText.trim(),
      subject: selectedChapter?.subjectName || 'All Subjects',
      chapterName: selectedChapter?.title || 'General Backlog Strategy',
      studentContext,
      history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
    };

    try {
      const res = await fetch('/api/ai/bax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.content) {
          setMessages((prev) => [
            ...prev,
            {
              id: 'ai_' + Date.now(),
              role: 'assistant',
              text: data.content,
              time: 'Just now',
              webSources: data.webSources || [],
              curatedResources: data.curatedResources || [],
              targetChapter: data.targetChapter || selectedChapter?.title,
            },
          ]);
          setLoading(false);
          return;
        }
      }

      // Intelligent Client Fallback if server unreachable
      const lower = queryText.toLowerCase();
      let fallbackContent = '';

      if (lower.includes('inertia') || lower.includes('first law')) {
        fallbackContent = `### 🚀 Deep Conceptual Masterclass: What is Inertia? (Physics)

#### 1. 🌟 The "Aha!" Mental Model (Physical Intuition)
Imagine you are standing on a moving bus cruising at 40 km/h. Suddenly, the driver slams on the brakes. What happens? **Your upper body lurches forward.**
Why? No invisible force pushed you forward! Your body was happily travelling at 40 km/h with the bus. The bus stopped because of the friction on its brakes, but **your upper body simply wanted to keep doing what it was already doing.**
* **Core Definition**: Inertia is the inherent laziness or stubbornness of matter. An object **naturally resists any change to its state of rest or uniform motion in a straight line**.

#### 2. 📐 Scientific & Mathematical Rigor (NCERT & CBSE)
* **Galileo's Inclined Plane Insight**: Galileo rolled a marble down a frictionless slope. He noticed it climbs to the exact same height on the opposite slope. If the second slope is made horizontal, the marble **never stops — it moves forever at constant velocity**.
* **Newton's 1st Law (The Law of Inertia)**:
  $$\\sum \\vec{F}_{net} = 0 \\implies \\frac{d\\vec{v}}{dt} = 0 \\implies \\vec{v} = \\text{constant}$$
* **Quantitative Measure of Inertia**: **Mass ($m$)**.
  * A cricket ball has far more inertia than a tennis ball.
  * A loaded freight train has immense inertia; a bicycle has tiny inertia.
* **Rotational Inertia (Moment of Inertia $I$)**:
  In rotational mechanics, mass *distribution* matters: $I = \\int r^2 dm$.

#### 3. 🔍 The 3 Classic Types (With Real Exam Scenarios)
1. **Inertia of Rest**:
   * *Example*: Dust separates when beating a rug with a stick (rug moves, dust remains at rest).
2. **Inertia of Motion**:
   * *Example*: A long jumper runs fast before leaping so their inertia of motion carries them further through the air.
3. **Inertia of Direction**:
   * *Example*: Mud flying off a spinning bicycle tyre flies off **tangentially**.

#### 4. ⚠️ The #1 Exam Setter Trap & Misconception
* ❌ **Fatal Trap**: *"Inertia is a force that pushes you forward in a braking car."*
* ✅ **Board Truth**: **Inertia is NOT a force.** Inertia is an intrinsic *property* of mass. There is zero forward force acting on you when the car brakes. It is simply the *absence* of a stopping force on your torso!`;
      } else if (lower.includes('clear backlog') || lower.includes('how to clear') || lower.includes('huge backlog') || lower.includes('backlog strategy')) {
        fallbackContent = `### 🎯 The Battle-Tested Backlog Clearance Protocol
*(From r/CBSE & r/JEENEETards Topper Debriefs + Cognitive Science)*

You have **${metrics.remainingHours}h remaining** across your backlog. Here is the 4-step framework:

1. 🚦 **The Strict 3-Tier Triage**:
   * **Tier 1 (Prerequisites)**: Vectors, Mole Concept, Basic Math (must clear first).
   * **Tier 2 (High-Yield Standalones)**: Modern Physics, Coordination Compounds, Matrices.
   * **Tier 3 (Rote Memory)**: Save for speed drills closer to exams.
2. ⚡ **The Minimum Viable Chapter (MVC)**:
   * 70% mastery in 3 hours beats 0% mastery waiting for 20 hours. Focus on NCERT in-text solved examples + 10-year PYQ archetypes.
3. 🧠 **The Non-Zero Day Rule**:
   * Doing two 25-minute Pomodoro sprints today on **${activeChapters[0] || 'your core topic'}** destroys paralysis.`;
      } else if (lower.includes('stress') || lower.includes('anxiety') || lower.includes('scared') || lower.includes('fail') || lower.includes('pressure') || lower.includes('panic') || lower.includes('give up')) {
        fallbackContent = `### 🧠 Honest Mental Reset: You Are Not Broken, You Are Overloaded

Take a slow breath in... and let it out.

1. 🪞 **The Community Truth (r/CBSE & r/JEENEETards)**:
   * Over **85% of Class 10/11/12 students are privately panicking** about their backlogs right now. People only post when they win; nobody posts pictures of crying over HC Verma at 2 AM. You are completely normal.
2. 🧬 **The Freeze Mode**:
   * Your brain's amygdala treats an unfinished backlog as a survival threat, causing paralysis. You aren't lazy — your nervous system is exhausted.
3. 🛡️ **Actionable Grounding Steps**:
   * **The 5-Minute Rule**: Just open NCERT and read 1 page for 5 minutes.
   * **Exams Measure Technique, Not Your Human Worth**.
   * **Sleep is Non-Negotiable**: Sleep consolidates memory in the hippocampus; without it, retention drops 40%.`;
      } else if (lower.includes('study') || lower.includes('hour') || lower.includes('plan') || lower.includes('today')) {
        fallbackContent = `### 🎯 Targeted Study Plan for Today:\nYou have **${metrics.remainingHours}h remaining** across your backlog.\n\n1. ⚡ **${activeChapters[0] || 'Primary Focus Topic'}** (50 mins)\n   * Focus on clearing core concept bottlenecks and standard NCERT examples.\n2. 🧪 **${activeChapters[1] || 'Secondary Core Topic'}** (40 mins)\n   * Master governing definitions and solve 1 previous year question.\n3. 🔄 **Spaced Retrieval** (25 mins)\n   * Practice active recall without looking at notes.\n\n*Current pace: ${finishAnalysis.currentPaceHoursPerDay}h/day · Exam runway: ${finishAnalysis.daysToExam} days.*`;
      } else {
        fallbackContent = `### 💡 Academic Insight: ${selectedChapter?.title || 'Backlog Priority'}\nRegarding: *"${queryText}"*\n\n1. Review the core NCERT definitions and boundary conditions.\n2. Note standard formulas with SI units.\n3. Solve 3 representative previous-year problems to test retention.\n\n*You have ${metrics.remainingHours}h left in your backlog — 1 focused session today keeps you on track!*`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: fallbackContent,
          time: 'Just now',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          text: `### 🎯 BacklogOS Recommendation:\nYou have **${metrics.remainingHours}h remaining** across active topics.\n\n* Tackle **${activeChapters[0] || 'your #1 priority chapter'}** next.\n* Complete one 25-minute Pomodoro sprint to maintain velocity.\n* Current study pace: **${finishAnalysis.currentPaceHoursPerDay}h/day**.`,
          time: 'Just now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button - Ask Bax */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="focus-ring fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 rounded-full border border-sky-400/50 bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-400 text-white px-4 py-2.5 text-xs font-mono font-bold shadow-xl hover:shadow-sky-500/30 transition-all duration-200 btn-press animate-float-delayed hover:scale-105 group"
          aria-label="Open Ask Bax AI Copilot"
          data-testid="button-floating-bax"
        >
          <div className="relative">
            <Sparkles size={15} className="group-hover:rotate-45 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="font-sans font-bold">Ask Bax</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
            AI
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-20 lg:bottom-6 right-3 sm:right-6 z-50 flex h-[min(580px,calc(100dvh-100px))] flex-col overflow-hidden rounded-2xl border border-sky-400/30 bg-card/95 backdrop-blur-xl shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 font-sans ${
            isExpanded
              ? 'w-[calc(100vw-1.5rem)] sm:w-[94vw] max-w-[640px]'
              : 'w-[calc(100vw-1.5rem)] sm:w-[92vw] max-w-[420px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-3.5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-600 to-sky-400 text-white font-mono font-bold text-xs shadow-sm">
                B
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div>
                <h4 className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  Bax AI Mentor
                  <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-mono text-sky-500 font-semibold">
                    Class {grade}
                  </span>
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                  <span>{metrics.remainingHours}h Backlog</span>
                  <span>·</span>
                  <span>{finishAnalysis.currentPaceHoursPerDay}h/d Pace</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                title="Reset conversation"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="hidden sm:inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                title={isExpanded ? 'Collapse' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                aria-label="Close Ask Bax"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* Chapter & Topic Selector with Quick Curate Trigger */}
          <div className="border-b border-border/70 bg-muted/15 px-3 py-1.5 flex items-center gap-2 font-mono text-xs">
            <span className="text-[10px] text-muted-foreground shrink-0 uppercase font-bold">
              Target:
            </span>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full truncate rounded-md border border-border bg-background/80 px-2 py-1 text-xs font-mono text-foreground focus:outline-hidden"
            >
              <option value="all-general">
                [General / Any Topic / Daily Timetable]
              </option>
              {gradeChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  [{ch.subjectName.slice(0, 10)}] {ch.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleCurateForChapter(selectedChapter)}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-red-500/15 via-rose-500/15 to-amber-500/15 border border-red-500/30 text-[10px] font-mono text-red-600 dark:text-red-300 font-bold hover:from-red-500/25 hover:to-rose-500/20 transition shadow-2xs group cursor-pointer"
              title="Curate verified YouTube playlists and open-source notes using Search Grounding"
            >
              <Youtube size={12} className="text-red-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Curate</span>
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs font-sans">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-xl p-3 leading-relaxed transition-all ${
                    m.role === 'user'
                      ? 'bg-foreground text-background font-medium shadow-xs'
                      : 'border border-border/80 bg-muted/20 text-foreground shadow-2xs'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-border/30 pb-1">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <Sparkles size={10} className="text-primary" />
                        Bax
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.text, m.id)}
                        className="hover:text-foreground p-0.5 transition"
                        title="Copy answer"
                      >
                        {copiedId === m.id ? (
                          <Check size={11} className="text-emerald-500" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    </div>
                  )}

                  {m.role === 'assistant' ? (
                    <FormattedBaxMessage text={m.text} />
                  ) : (
                    <div className="whitespace-pre-line text-xs">{m.text}</div>
                  )}

                  {/* Curated YouTube Playlists & Open-Source Notes Cards */}
                  {m.role === 'assistant' && m.curatedResources && m.curatedResources.length > 0 && (
                    <CuratedResourceCards
                      resources={m.curatedResources}
                      chapterId={selectedChapter?.id}
                      chapterTitle={m.targetChapter || selectedChapter?.title}
                      subject={selectedChapter?.subjectName}
                      onWatchVideo={(v) => setSelectedVideoForModal(v)}
                      onOpenNotes={(notes) => setSelectedNotesForModal(notes)}
                    />
                  )}

                  {/* Web & Community Grounding Sources */}
                  {m.role === 'assistant' && m.webSources && m.webSources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground font-bold">
                        <Globe size={11} className="text-sky-500" />
                        <span>Web & Community Sources:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.webSources.map((source, sIdx) => (
                          <a
                            key={sIdx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-muted/60 hover:bg-muted px-2 py-0.5 text-[10px] font-mono text-sky-500 dark:text-sky-400 hover:underline max-w-[210px] truncate border border-border/50 transition"
                            title={source.title}
                          >
                            <ExternalLink size={9} className="shrink-0" />
                            <span className="truncate">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contextual Action Shortcuts for Assistant replies */}
                  {m.role === 'assistant' && m.id !== 'init' && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCurateForChapter(selectedChapter)}
                        className="inline-flex items-center gap-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] font-mono font-medium transition border border-red-500/20"
                      >
                        <Youtube size={10} className="text-red-500" />
                        <span>Curate Resources</span>
                      </button>
                      <Link
                        href="/study"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 rounded bg-muted/70 hover:bg-muted px-2 py-0.5 text-[10px] font-mono text-foreground font-medium transition"
                      >
                        <Clock size={10} className="text-primary" />
                        <span>Start 25m Focus Block</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 rounded bg-muted/70 hover:bg-muted px-2 py-0.5 text-[10px] font-mono text-foreground font-medium transition"
                      >
                        <Zap size={10} className="text-amber-500" />
                        <span>View Daily Plan</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground p-2.5 rounded-xl border border-sky-400/30 bg-sky-500/5 max-w-xs animate-pulse">
                <Loader2 size={13} className="animate-spin text-primary" />
                <span>Bax is searching Google, YouTube & syllabus databases...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompts Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border px-3 py-2 text-[10px] font-mono bg-muted/20 scrollbar-none">
            <button
              type="button"
              onClick={() => handleCurateForChapter(selectedChapter)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-amber-500/10 hover:from-red-500/25 hover:to-rose-500/20 px-2.5 py-1 text-red-600 dark:text-red-300 font-bold transition shadow-2xs cursor-pointer group"
            >
              <Youtube size={12} className="text-red-500 group-hover:scale-110 transition-transform" />
              <Sparkles size={10} className="text-amber-400 animate-pulse" />
              <span>🎬 Curate Lectures & Notes</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-doubt-solver'));
              }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 text-sky-600 dark:text-sky-300 font-bold transition shadow-2xs cursor-pointer group"
            >
              <Camera size={12} className="text-sky-500 group-hover:scale-110 transition-transform" />
              <span>📷 Scan Sum Photo</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend("What is Inertia? Explain deeply with physical intuition, Galileo's experiment, Newton's 1st Law, 3 types, and the #1 exam trap.")}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 text-sky-600 dark:text-sky-300 font-semibold transition shadow-2xs"
            >
              <Zap size={11} className="text-sky-500" />
              <span>What is Inertia? (Deep Dive)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend("How do I clear my backlog step-by-step without burning out? Give me the battle-tested 4-step protocol from r/CBSE and r/JEENEETards.")}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-amber-600 dark:text-amber-300 font-semibold transition shadow-2xs"
            >
              <Flame size={11} className="text-amber-500" />
              <span>Clear Backlog Protocol</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend("I am stressed, overwhelmed, and scared of failing my exams. My backlog feels impossible. Help me calm down and reset mentally.")}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-rose-400/40 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 text-rose-600 dark:text-rose-300 font-semibold transition shadow-2xs"
            >
              <HeartHandshake size={11} className="text-rose-500" />
              <span>Mental Health & Panic Reset</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend("I only have 2 hours today. What should I study?")}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-foreground hover:bg-muted transition shadow-2xs"
            >
              <Clock size={11} className="text-muted-foreground" />
              <span>2h Study Plan</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend("Search Google & Reddit student forums for the biggest mistakes Class " + grade + " students make in CBSE exams.")}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-foreground hover:bg-muted transition shadow-2xs"
            >
              <Globe size={11} className="text-sky-500" />
              <span>Community / Reddit Advice</span>
            </button>
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(question);
            }}
            className="flex items-center gap-2 border-t border-border bg-card/90 p-2 sm:p-2.5 font-mono text-xs backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-doubt-solver'));
              }}
              className="flex items-center justify-center h-10 w-10 sm:h-9 sm:w-9 rounded-lg border border-border bg-muted/30 hover:bg-muted text-sky-500 hover:text-sky-600 transition shrink-0 cursor-pointer shadow-2xs touch-manipulation"
              title="Scan and solve any question photo with Bax Vision"
            >
              <Camera size={16} />
            </button>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Bax a doubt, plan inquiry, or formula..."
              className="h-10 sm:h-9 text-base sm:text-xs rounded-lg border border-border bg-background text-foreground focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !question.trim()}
              className="h-10 sm:h-9 px-3.5 sm:px-3 rounded-lg bg-foreground text-background shrink-0 font-bold hover:opacity-90 transition active:scale-95 cursor-pointer touch-manipulation"
              title="Send to Bax"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </form>
        </div>
      )}

      {/* Embedded In-App YouTube Player Modal */}
      {selectedVideoForModal && (
        <YouTubePlayerModal
          video={selectedVideoForModal}
          chapterId={selectedChapter?.id}
          chapterTitle={selectedChapter?.title}
          subject={selectedChapter?.subjectName}
          onClose={() => setSelectedVideoForModal(null)}
        />
      )}

      {/* Embedded In-App Notes / Document Modal */}
      {selectedNotesForModal && (
        <UniversalResourceModal
          resource={selectedNotesForModal}
          isOpen={Boolean(selectedNotesForModal)}
          onClose={() => setSelectedNotesForModal(null)}
        />
      )}
    </>
  );
}
