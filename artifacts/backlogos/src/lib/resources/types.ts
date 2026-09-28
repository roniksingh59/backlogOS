export type AcademicResourceType =
  | 'video'
  | 'textbook'
  | 'notes'
  | 'practice'
  | 'pyq'
  | 'revision'
  | 'official';

export type VideoResourceType = 'concept' | 'oneshot' | 'pyq' | 'revision' | 'general';
export type VideoLanguage = 'English' | 'Hinglish' | 'Hindi' | 'any';

export type ResourceActionLabel =
  | 'Watch'
  | 'Read'
  | 'Practice'
  | 'Open Resource'
  | 'View PYQs'
  | 'Review Notes';

export interface EducationalResource {
  id: string; // unique identifier
  title: string;
  resourceType: AcademicResourceType;
  videoSubtype?: VideoResourceType;
  subject: string;
  chapterId?: string;
  chapterTitle?: string;
  topic?: string;
  provider: string; // e.g. "NCERT Official", "CBSE Academic", "Physics Wallah", "Khan Academy", "LearnOHub"
  url?: string;
  thumbnail: string;
  duration?: string; // e.g. "35m" or "25 mins read"
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'exam-level' | 'all-levels';
  language?: 'English' | 'Hinglish' | 'Hindi';
  recommendationReason: string;
  relevanceScore?: number;
  estimatedMinutes: number;
  actionLabel: ResourceActionLabel;
  isEmbeddable?: boolean;
  isExternal?: boolean; // opens directly in new tab or external viewer
  isOfficial?: boolean; // Official CBSE/NCERT source
  description?: string;
  publishedTime?: string;
  viewCount?: string;
  interactiveContent?: {
    summary?: string;
    keyFormulas?: string[];
    coreConcepts?: string[];
    trapNote?: string;
  };
}

export interface YouTubeResource {
  id: string;
  title: string;
  channel: string;
  duration: string;
  durationMinutes: number;
  publishedTime?: string;
  viewCount?: string;
  thumbnail: string;
  resourceType: VideoResourceType;
  language: 'English' | 'Hinglish' | 'Hindi';
  relevanceLabel: string;
  relevanceScore?: number;
  isEmbeddable: boolean;
}

export interface ResourceDiscoveryContext {
  grade?: string;
  board?: string;
  subject?: string;
  chapter?: string;
  chapterId?: string;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'exam-level' | 'all-levels' | string;
  confidence?: 'low' | 'medium' | 'high' | 'rusty' | 'mixed' | 'solid' | string;
  preferredLanguage?: VideoLanguage | string;
  resourceType?: AcademicResourceType | VideoResourceType | 'all';
  availableTime?: number; // in minutes
  examDate?: string;
  backlogCount?: number;
}

export interface SavedResource {
  id: string; // unique resource id or video id
  title: string;
  channel?: string; // for backward compatibility with existing saved videos
  provider: string;
  resourceType: AcademicResourceType | VideoResourceType;
  subject?: string;
  chapterId?: string;
  chapterTitle?: string;
  topic?: string;
  thumbnail: string;
  url?: string;
  duration: string;
  durationMinutes: number;
  difficulty?: string;
  language?: string;
  recommendationReason?: string;
  actionLabel?: ResourceActionLabel | string;
  isEmbeddable?: boolean;
  isExternal?: boolean;
  isOfficial?: boolean;
  savedAt: string;
  completed?: boolean;
  completedAt?: string;
}
