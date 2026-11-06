import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Supabase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  preferredName: text('preferred_name'),
  photoUrl: text('photo_url'),
  phone: text('phone'),
  grade: text('grade').default('11'), // CBSE Class '11' | '12'
  schoolName: text('school_name'),
  board: text('board').default('CBSE'),
  academicSession: text('academic_session').default('2026-27'),
  stream: text('stream').default('pcm'), // 'pcm' | 'pcb' | 'pcmb'
  additionalSubjects: text('additional_subjects').default('[]'),
  backlogInfo: text('backlog_info'), // JSON of pending topics/chapters & difficulty
  learningPreferences: text('learning_preferences'), // JSON
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: integer('onboarding_step').default(1),
  onboardingDraft: text('onboarding_draft'), // In-progress onboarding draft
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define the 'plans' table supporting multiple independent study plans
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').default('Primary Study Plan').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  board: text('board').notNull(),
  goal: text('goal'),
  priority: text('priority'),
  confidence: text('confidence'),
  examDate: text('exam_date'),
  minutesPerDay: integer('minutes_per_day').notNull(),
  targetScore: integer('target_score').default(90),
  planDuration: integer('plan_duration').default(7),
  subjects: text('subjects').notNull(), // JSON string
  chapterIds: text('chapter_ids').notNull(), // JSON string
  plannedChapterIds: text('planned_chapter_ids'), // JSON string
  days: text('days'), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define 'completed_chapters' table
export const completedChapters = pgTable('completed_chapters', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  chapterId: text('chapter_id').notNull(),
  completedAt: timestamp('completed_at').defaultNow(),
});

// Define 'study_sessions' table
export const studySessions = pgTable('study_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  sessionId: text('session_id').notNull(),
  chapterId: text('chapter_id').notNull(),
  minutes: integer('minutes').notNull(),
  mode: text('mode').notNull(),
  completedAt: text('completed_at').notNull(),
});

// Define 'notes' table
export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  chapterId: text('chapter_id').notNull(),
  note: text('note').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define 'practice_checks' table for Chapter Mastery (Theory, NCERT, PYQ)
export const practiceChecks = pgTable('practice_checks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  chapterId: text('chapter_id').notNull(),
  theory: boolean('theory').default(false).notNull(),
  ncert: boolean('ncert').default(false).notNull(),
  pyq: boolean('pyq').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define 'user_resources' table for saved and completed educational resources
export const userResources = pgTable('user_resources', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  resourceId: text('resource_id').notNull(),
  subject: text('subject'),
  chapterId: text('chapter_id'),
  chapterTitle: text('chapter_title'),
  topic: text('topic'),
  resourceType: text('resource_type').notNull(),
  title: text('title').notNull(),
  provider: text('provider').notNull(),
  url: text('url'),
  thumbnailUrl: text('thumbnail_url'),
  duration: text('duration'),
  durationMinutes: integer('duration_minutes'),
  difficulty: text('difficulty'),
  language: text('language'),
  description: text('description'),
  recommendationReason: text('recommendation_reason'),
  estimatedMinutes: integer('estimated_minutes'),
  isSaved: boolean('is_saved').default(false).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  plans: many(plans),
  completedChapters: many(completedChapters),
  studySessions: many(studySessions),
  notes: many(notes),
  practiceChecks: many(practiceChecks),
  userResources: many(userResources),
}));

export const plansRelations = relations(plans, ({ one }) => ({
  user: one(users, {
    fields: [plans.userId],
    references: [users.id],
  }),
}));

export const completedChaptersRelations = relations(completedChapters, ({ one }) => ({
  user: one(users, {
    fields: [completedChapters.userId],
    references: [users.id],
  }),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

export const practiceChecksRelations = relations(practiceChecks, ({ one }) => ({
  user: one(users, {
    fields: [practiceChecks.userId],
    references: [users.id],
  }),
}));

export const userResourcesRelations = relations(userResources, ({ one }) => ({
  user: one(users, {
    fields: [userResources.userId],
    references: [users.id],
  }),
}));

