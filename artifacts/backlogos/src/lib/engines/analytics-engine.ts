import { resolveChapterById } from '../backlog-data';
import type { BacklogItem } from '../backlog-items';
import type { StudySession } from '../storage';
import { isObjectiveStudiedOrBeyond } from './execution-engine';
import { computeRetentionHealthMetric, formatReviewDateIso } from './retention-engine';
import type {
  AnalyticsDashboardMetrics,
  ChapterMasteryRecord,
  ChapterMasteryStatus,
  ConceptMasteryRecord,
  DailyStudyActivityPoint,
  ObjectiveState,
  PlanObjective,
  ReviewScheduleRecord,
  SubjectSeparatedMetrics,
  WeakConceptSummary,
} from './types';

export interface AnalyticsEngineInput {
  backlogItems?: BacklogItem[];
  objectives?: PlanObjective[];
  chapterMastery?: ChapterMasteryRecord[];
  conceptMastery?: ConceptMasteryRecord[];
  reviewSchedules?: ReviewScheduleRecord[];
  studySessions?: StudySession[];
  todayDateStr?: string;
}

/**
 * Analytics Engine (Engine E):
 * Computes all 8 persistent database-backed metrics while strictly guaranteeing:
 * 1. Backlog clearance (study progress) and learning mastery (verified comprehension) are NEVER merged.
 * 2. Zero mock data or synthetic trajectories are used.
 */
export function computeSeparatedAnalytics(
  input: AnalyticsEngineInput
): AnalyticsDashboardMetrics {
  const backlogItems = input.backlogItems || [];
  const objectives = input.objectives || [];
  const chapterMasteryList = input.chapterMastery || [];
  const conceptMasteryList = input.conceptMastery || [];
  const reviewSchedules = input.reviewSchedules || [];
  const studySessions = input.studySessions || [];
  const todayStr = input.todayDateStr || formatReviewDateIso(new Date());

  // 1. Objective-level counts (STUDIED + VERIFICATION_PENDING + VERIFIED vs strictly VERIFIED)
  const objectivesByState: Record<ObjectiveState, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    STUDIED: 0,
    VERIFICATION_PENDING: 0,
    VERIFIED: 0,
    NEEDS_RELEARNING: 0,
  };

  for (const obj of objectives) {
    if (obj?.state && obj.state in objectivesByState) {
      objectivesByState[obj.state] += 1;
    }
  }

  const completedObjectivesCount =
    objectivesByState.STUDIED +
    objectivesByState.VERIFICATION_PENDING +
    objectivesByState.VERIFIED;
  const verifiedObjectivesCount = objectivesByState.VERIFIED;
  const totalObjectivesCount = objectives.length;

  // 2. Chapter-level counts (STUDY_COMPLETE vs MASTERED)
  const masteryByChapter = new Map<string, ChapterMasteryRecord>();
  for (const cm of chapterMasteryList) {
    if (cm?.chapterId) {
      masteryByChapter.set(cm.chapterId, cm);
    }
  }

  const allTrackedChapterIds = new Set<string>();
  for (const item of backlogItems) {
    if (item?.chapterId) allTrackedChapterIds.add(item.chapterId);
  }
  for (const cm of chapterMasteryList) {
    if (cm?.chapterId) allTrackedChapterIds.add(cm.chapterId);
  }
  for (const obj of objectives) {
    if (obj?.chapterId) allTrackedChapterIds.add(obj.chapterId);
  }

  const chaptersByStatus: Record<ChapterMasteryStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    STUDY_COMPLETE: 0,
    MASTERY_PENDING: 0,
    MASTERED: 0,
    NEEDS_REVISION: 0,
  };

  let studyCompletedChaptersCount = 0;
  let masteredChaptersCount = 0;

  const backlogByChapter = new Map(backlogItems.map((b) => [b.chapterId, b]));
  const objectivesByChapter = new Map<string, PlanObjective[]>();
  for (const obj of objectives) {
    if (!objectivesByChapter.has(obj.chapterId)) {
      objectivesByChapter.set(obj.chapterId, []);
    }
    objectivesByChapter.get(obj.chapterId)!.push(obj);
  }

  for (const chId of allTrackedChapterIds) {
    const cm = masteryByChapter.get(chId);
    const bi = backlogByChapter.get(chId);
    const chObjs = objectivesByChapter.get(chId) || [];

    let status: ChapterMasteryStatus = cm?.status || 'NOT_STARTED';
    let isStudyDone = Boolean(cm?.studyCompleted);

    if (!cm) {
      if (bi?.status === 'completed') {
        status = 'STUDY_COMPLETE';
        isStudyDone = true;
      } else if (
        chObjs.length > 0 &&
        chObjs.every((o) => isObjectiveStudiedOrBeyond(o.state))
      ) {
        status = 'STUDY_COMPLETE';
        isStudyDone = true;
      } else if (
        bi?.status === 'learning' ||
        bi?.status === 'practicing' ||
        bi?.status === 'revision' ||
        chObjs.some((o) => o.state !== 'PENDING')
      ) {
        status = 'IN_PROGRESS';
      }
    } else if (
      status === 'STUDY_COMPLETE' ||
      status === 'MASTERY_PENDING' ||
      status === 'MASTERED' ||
      status === 'NEEDS_REVISION'
    ) {
      isStudyDone = true;
    }

    chaptersByStatus[status] = (chaptersByStatus[status] || 0) + 1;
    if (isStudyDone) studyCompletedChaptersCount += 1;
    if (status === 'MASTERED') masteredChaptersCount += 1;
  }

  const totalBacklogChapters = allTrackedChapterIds.size;

  // 3. Backlog clearance percentage (ONLY reflects study completion, NEVER mastery)
  const backlogClearancePercent =
    totalBacklogChapters > 0
      ? Math.round((studyCompletedChaptersCount / totalBacklogChapters) * 100)
      : totalObjectivesCount > 0
      ? Math.round((completedObjectivesCount / totalObjectivesCount) * 100)
      : 0;

  // 4. Concept Mastery percentage (strictly from verified concept_mastery assessments)
  const assessedConcepts = conceptMasteryList.filter(
    (c) => c.attemptsCount > 0 && c.status !== 'UNASSESSED'
  );
  const hasAssessmentData = assessedConcepts.length > 0;
  const conceptMasteryPercent = hasAssessmentData
    ? Math.round(
        assessedConcepts.reduce((sum, c) => sum + Number(c.masteryScore || 0), 0) /
          assessedConcepts.length
      )
    : 0;

  // 5. Weak concepts ranked lowest score first
  const weakConcepts: WeakConceptSummary[] = assessedConcepts
    .filter(
      (c) =>
        c.status === 'WEAK' ||
        c.status === 'NEEDS_REVISION' ||
        c.masteryScore < 60
    )
    .map((c) => {
      const ch = resolveChapterById(c.chapterId);
      return {
        conceptId: c.conceptId,
        conceptTitle: c.conceptTitle || c.conceptId,
        chapterId: c.chapterId,
        chapterTitle: ch?.title || c.chapterId,
        subject: ch?.subject || 'General',
        masteryScore: Math.round(Number(c.masteryScore || 0)),
        attemptsCount: c.attemptsCount,
        status: c.status,
      };
    })
    .sort((a, b) => a.masteryScore - b.masteryScore);

  // 6. Retention health & pending revisions strictly from review_schedule
  const retentionStats = computeRetentionHealthMetric(reviewSchedules, todayStr);

  // 7. Subject-wise separated Clearance vs Mastery
  const subjectMap = new Map<
    string,
    {
      chapterIds: Set<string>;
      studyDoneCount: number;
      masteredCount: number;
      conceptScores: number[];
    }
  >();

  for (const chId of allTrackedChapterIds) {
    const ch = resolveChapterById(chId);
    const bi = backlogByChapter.get(chId);
    const objs = objectivesByChapter.get(chId) || [];
    const subName = ch?.subject || bi?.subject || objs[0]?.subjectName || 'General';
    if (!subjectMap.has(subName)) {
      subjectMap.set(subName, {
        chapterIds: new Set(),
        studyDoneCount: 0,
        masteredCount: 0,
        conceptScores: [],
      });
    }
    const bucket = subjectMap.get(subName)!;
    bucket.chapterIds.add(chId);

    const cm = masteryByChapter.get(chId);
    const isStudyDone =
      Boolean(cm?.studyCompleted) ||
      cm?.status === 'STUDY_COMPLETE' ||
      cm?.status === 'MASTERY_PENDING' ||
      cm?.status === 'MASTERED' ||
      cm?.status === 'NEEDS_REVISION' ||
      bi?.status === 'completed' ||
      (objs.length > 0 && objs.every((o) => isObjectiveStudiedOrBeyond(o.state)));
    if (isStudyDone) bucket.studyDoneCount += 1;
    if (cm?.status === 'MASTERED') bucket.masteredCount += 1;
  }

  for (const cm of assessedConcepts) {
    const ch = resolveChapterById(cm.chapterId);
    const bi = backlogByChapter.get(cm.chapterId);
    const subName = ch?.subject || bi?.subject || 'General';
    if (!subjectMap.has(subName)) {
      subjectMap.set(subName, {
        chapterIds: new Set([cm.chapterId]),
        studyDoneCount: 0,
        masteredCount: 0,
        conceptScores: [],
      });
    }
    subjectMap.get(subName)!.conceptScores.push(Number(cm.masteryScore || 0));
  }

  const subjectBreakdown: SubjectSeparatedMetrics[] = Array.from(
    subjectMap.entries()
  ).map(([subject, data]) => {
    const total = data.chapterIds.size;
    return {
      subject,
      totalChapters: total,
      studyCompletedChapters: data.studyDoneCount,
      masteredChapters: data.masteredCount,
      backlogClearancePercent:
        total > 0 ? Math.round((data.studyDoneCount / total) * 100) : 0,
      conceptMasteryPercent:
        data.conceptScores.length > 0
          ? Math.round(
              data.conceptScores.reduce((a, b) => a + b, 0) /
                data.conceptScores.length
            )
          : 0,
      assessedConceptsCount: data.conceptScores.length,
    };
  });

  // 8. Real 7-day activity timeline from persistent study_sessions + objectives timestamps
  const weeklyActivity = buildWeeklyActivityTimeline(
    studySessions,
    objectives,
    todayStr
  );

  const totalFocusMinutesLogged = studySessions.reduce(
    (sum, s) => sum + Math.max(0, Number(s.minutes || s.durationMinutes || 0)),
    0
  );

  const activeStudyStreakDays = computeConsecutiveStudyDays(
    studySessions,
    todayStr
  );

  return {
    backlogClearancePercent,
    conceptMasteryPercent,
    retentionHealthPercent: retentionStats.retentionHealthPercent,

    completedObjectivesCount,
    verifiedObjectivesCount,
    totalObjectivesCount,
    objectivesByState,

    totalBacklogChapters,
    studyCompletedChaptersCount,
    masteredChaptersCount,
    chaptersByStatus,

    pendingRevisionsCount: retentionStats.pendingRevisionsCount,
    overdueRevisionsCount: retentionStats.overdueRevisionsCount,
    completedRevisionsCount: retentionStats.completedRevisionsCount,
    hasRetentionData: retentionStats.hasRetentionData,
    hasAssessmentData,

    weakConcepts,
    subjectBreakdown,
    weeklyActivity,
    totalFocusMinutesLogged,
    activeStudyStreakDays,
  };
}

function buildWeeklyActivityTimeline(
  sessions: StudySession[],
  objectives: PlanObjective[],
  todayStr: string
): DailyStudyActivityPoint[] {
  const [y, m, d] = todayStr.split('-').map((n) => Number(n));
  const anchor = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);

  const byDate = new Map<string, DailyStudyActivityPoint>();
  const orderedDates: string[] = [];

  for (let offset = -6; offset <= 0; offset++) {
    const dt = new Date(anchor.getTime());
    dt.setDate(dt.getDate() + offset);
    const iso = formatReviewDateIso(dt);
    const dayLabel = dt.toLocaleDateString('en-US', { weekday: 'short' });
    orderedDates.push(iso);
    byDate.set(iso, {
      date: iso,
      dayLabel,
      minutesStudied: 0,
      objectivesStudied: 0,
      objectivesVerified: 0,
    });
  }

  for (const s of sessions) {
    const dateKey = String(s.completedAt || '').slice(0, 10);
    const point = byDate.get(dateKey);
    if (point) {
      point.minutesStudied += Math.max(
        0,
        Number(s.minutes || s.durationMinutes || 0)
      );
    }
  }

  for (const o of objectives) {
    if (o.studiedAt) {
      const point = byDate.get(o.studiedAt.slice(0, 10));
      if (point) point.objectivesStudied += 1;
    }
    if (o.verifiedAt) {
      const point = byDate.get(o.verifiedAt.slice(0, 10));
      if (point) point.objectivesVerified += 1;
    }
  }

  return orderedDates.map((iso) => byDate.get(iso)!);
}

function computeConsecutiveStudyDays(
  sessions: StudySession[],
  todayStr: string
): number {
  const activeDates = new Set(
    sessions
      .filter((s) => Number(s.minutes || 0) > 0 && s.completedAt)
      .map((s) => String(s.completedAt).slice(0, 10))
  );
  if (activeDates.size === 0) return 0;

  const [y, m, d] = todayStr.split('-').map((n) => Number(n));
  let cursor = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);

  // Allow active streak continuing from yesterday if student hasn't logged a session today yet
  if (!activeDates.has(formatReviewDateIso(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (activeDates.has(formatReviewDateIso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
