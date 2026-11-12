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

// Define the 'subjects' table
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(), // e.g. 'physics', 'chemistry', 'mathematics', 'biology'
  name: text('name').notNull(),
  grade: text('grade').default('11').notNull(),
  code: text('code'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'chapters' table
export const chaptersTable = pgTable('chapters', {
  id: text('id').primaryKey(), // e.g. 'phy-units', 'phy-vectors', 'chem-basic'
  subjectId: text('subject_id')
    .references(() => subjects.id)
    .notNull(),
  title: text('title').notNull(),
  order: integer('order').default(1).notNull(),
  estimatedHours: integer('estimated_hours').default(5).notNull(),
  difficulty: text('difficulty').default('medium').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'backlog_items' table with explicit relational links
export const backlogItems = pgTable('backlog_items', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subjectId: text('subject_id').references(() => subjects.id),
  chapterId: text('chapter_id')
    .references(() => chaptersTable.id)
    .notNull(),
  topic: text('topic').notNull(),
  estimatedHours: integer('estimated_hours').default(5).notNull(),
  hoursSpent: integer('hours_spent').default(0).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'incomplete', 'not_started', 'in_progress', 'completed'
  difficulty: text('difficulty').default('medium').notNull(),
  confidence: text('confidence').default('medium').notNull(),
  examRelevance: text('exam_relevance').default('high').notNull(),
  deadline: text('deadline'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  plans: many(plans),
  completedChapters: many(completedChapters),
  studySessions: many(studySessions),
  userResources: many(userResources),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  chapters: many(chaptersTable),
  backlogItems: many(backlogItems),
}));

export const chaptersRelations = relations(chaptersTable, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [chaptersTable.subjectId],
    references: [subjects.id],
  }),
  backlogItems: many(backlogItems),
}));

export const backlogItemsRelations = relations(backlogItems, ({ one }) => ({
  chapter: one(chaptersTable, {
    fields: [backlogItems.chapterId],
    references: [chaptersTable.id],
  }),
  subject: one(subjects, {
    fields: [backlogItems.subjectId],
    references: [subjects.id],
  }),
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

export const userResourcesRelations = relations(userResources, ({ one }) => ({
  user: one(users, {
    fields: [userResources.userId],
    references: [users.id],
  }),
}));


