import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { resolveChapterById, type StudentPlan } from '@/lib/backlog-data';
import { isSupabaseConfigured, isValidUUID } from '@/lib/supabase';
import {
  getScopedBacklogItemsForPlan,
  readBacklogItems,
  readCompleted,
  readPlan,
  readStudySessions,
  saveCompleted,
  savePlan,
} from '@/lib/storage';
import {
  saveCompletedTaskDirect,
  saveStudyPlanDirect,
} from '@/lib/supabase-service';
import {
  formatIsoDate,
  fromLegacyStudentPlan,
  rescheduleMissedObjectives,
  restoreCarriedForwardPlanToDayOne,
  toLegacyStudentPlan,
} from '@/lib/engines/planning-engine';
import {
  deriveChapterMasteryAfterStudyChange,
  isObjectiveStudiedOrBeyond,
  transitionObjectiveState,
} from '@/lib/engines/execution-engine';
import {
  buildInitialReviewSchedule,
  processReviewOutcome,
} from '@/lib/engines/retention-engine';
import { computeSeparatedAnalytics } from '@/lib/engines/analytics-engine';
import {
  appendCachedMasteryHistory,
  appendCachedReviewAttempt,
  appendMasteryHistoryEventToSupabase,
  loadV2WorkspaceFromSupabase,
  readCachedChapterMastery,
  readCachedConceptMastery,
  readCachedMasteryHistory,
  readCachedNormalizedPlans,
  readCachedReviewSchedules,
  saveCachedChapterMastery,
  saveCachedConceptMastery,
  saveCachedReviewSchedules,
  syncNormalizedPlanToSupabase,
  syncObjectiveStateToSupabase,
  syncReviewScheduleToSupabase,
  upsertCachedChapterMastery,
  upsertCachedNormalizedPlan,
} from '@/lib/engines/v2-sync-service';
import type {
  AnalyticsDashboardMetrics,
  ChapterMasteryRecord,
  ChapterMasteryStatus,
  ConceptMasteryRecord,
  MasteryHistoryEvent,
  NormalizedPlan,
  ObjectiveState,
  PlanObjective,
  RescheduleResult,
  ReviewScheduleRecord,
} from '@/lib/engines/types';
import type { SubmitAssessmentResponse } from '@/lib/verification/verification-service';
import { triggerGrandCelebration, triggerTaskCelebration } from '@/lib/celebration';

function emitV2Updated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('backlogos-v2-updated'));
  }
}

export function useEnginesWorkspace(explicitPlan?: StudentPlan | null) {
  const { user, activePlan: contextActivePlan, refreshPlans } = useAuth();
  const userId = user?.uid;
  const isCloudUser = Boolean(userId && !user?.isGuest && isValidUUID(userId) && isSupabaseConfigured);

  const [revisionTick, setRevisionTick] = useState(0);
  const [v2SchemaReady, setV2SchemaReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const legacyPlan = explicitPlan ?? contextActivePlan ?? readPlan(userId);

  useEffect(() => {
    const bump = () => setRevisionTick((t) => t + 1);
    window.addEventListener('backlogos-v2-hydrated', bump);
    window.addEventListener('backlogos-v2-updated', bump);
    window.addEventListener('backlogos-plan-updated', bump);
    window.addEventListener('backlogos-plans-updated', bump);
    window.addEventListener('backlogos-completed-updated', bump);
    window.addEventListener('backlogos-backlog-updated', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('backlogos-v2-hydrated', bump);
      window.removeEventListener('backlogos-v2-updated', bump);
      window.removeEventListener('backlogos-plan-updated', bump);
      window.removeEventListener('backlogos-plans-updated', bump);
      window.removeEventListener('backlogos-completed-updated', bump);
      window.removeEventListener('backlogos-backlog-updated', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);

  const refreshFromCloud = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const hydrated = await loadV2WorkspaceFromSupabase(userId);
      setV2SchemaReady(hydrated.v2SchemaReady);
      setRevisionTick((t) => t + 1);
      return hydrated;
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  const completedIds = useMemo(
    () => readCompleted(userId),
    [userId, revisionTick]
  );

  const backlogItems = useMemo(() => {
    const all = readBacklogItems(userId);
    return legacyPlan ? getScopedBacklogItemsForPlan(all, legacyPlan, completedIds) : all;
  }, [userId, legacyPlan, completedIds, revisionTick]);

  const normalizedPlans = useMemo(
    () => readCachedNormalizedPlans(userId),
    [userId, revisionTick]
  );

  const activeNormalizedPlan: NormalizedPlan | null = useMemo(() => {
    if (!legacyPlan && normalizedPlans.length === 0) return null;
    if (legacyPlan?.id) {
      const matched = normalizedPlans.find((p) => p.id === legacyPlan.id);
      if (
        matched &&
        matched.days.length === (legacyPlan.days?.length || matched.days.length)
      ) {
        // Reconcile any newly completed legacy keys as at least STUDIED (never VERIFIED)
        const doneSet = new Set(completedIds);
        return {
          ...matched,
          days: matched.days.map((d) => ({
            ...d,
            objectives: d.objectives.map((o) => {
              if (
                o.state === 'PENDING' &&
                (doneSet.has(o.legacyTaskKey) || doneSet.has(o.chapterId))
              ) {
                return {
                  ...o,
                  state: 'STUDIED' as ObjectiveState,
                  studiedAt: o.studiedAt || new Date().toISOString(),
                };
              }
              return o;
            }),
          })),
        };
      }
      return fromLegacyStudentPlan(legacyPlan, completedIds);
    }
    return normalizedPlans.find((p) => p.isActive) || normalizedPlans[0] || null;
  }, [legacyPlan, normalizedPlans, completedIds]);

  const chapterMasteryList = useMemo(
    () => readCachedChapterMastery(userId),
    [userId, revisionTick]
  );

  const conceptMasteryList = useMemo(
    () => readCachedConceptMastery(userId),
    [userId, revisionTick]
  );

  const masteryHistoryList = useMemo(
    () => readCachedMasteryHistory(userId),
    [userId, revisionTick]
  );

  const reviewSchedulesList = useMemo(
    () => readCachedReviewSchedules(userId),
    [userId, revisionTick]
  );

  const studySessions = useMemo(
    () => readStudySessions(userId),
    [userId, revisionTick]
  );

  const allActiveObjectives: PlanObjective[] = useMemo(() => {
    if (!activeNormalizedPlan) return [];
    return activeNormalizedPlan.days.flatMap((d) => d.objectives);
  }, [activeNormalizedPlan]);

  const analytics: AnalyticsDashboardMetrics = useMemo(() => {
    return computeSeparatedAnalytics({
      backlogItems,
      objectives: allActiveObjectives,
      chapterMastery: chapterMasteryList,
      conceptMastery: conceptMasteryList,
      reviewSchedules: reviewSchedulesList,
      studySessions,
    });
  }, [
    backlogItems,
    allActiveObjectives,
    chapterMasteryList,
    conceptMasteryList,
    reviewSchedulesList,
    studySessions,
  ]);

  const chapterMasteryByChapterId = useMemo(() => {
    const map = new Map<string, ChapterMasteryRecord>();
    for (const rec of chapterMasteryList) {
      map.set(rec.chapterId, rec);
    }
    return map;
  }, [chapterMasteryList]);

  /**
   * Transitions an objective through PENDING -> IN_PROGRESS -> STUDIED -> VERIFICATION_PENDING -> VERIFIED / NEEDS_RELEARNING.
   * Strictly prevents granting VERIFIED without assessment evidence.
   */
  const transitionObjective = useCallback(
    async (
      objectiveId: string,
      nextState: ObjectiveState,
      options: {
        additionalMinutesSpent?: number;
        verifiedByAssessmentAttemptId?: string | null;
      } = {}
    ) => {
      if (!activeNormalizedPlan) return null;

      let targetObj: PlanObjective | null = null;
      for (const day of activeNormalizedPlan.days) {
        const found = day.objectives.find((o) => o.id === objectiveId);
        if (found) {
          targetObj = found;
          break;
        }
      }
      if (!targetObj) return null;

      const siblingObjectives = activeNormalizedPlan.days
        .flatMap((d) => d.objectives)
        .filter((o) => o.chapterId === targetObj!.chapterId);

      const result = transitionObjectiveState(
        targetObj,
        nextState,
        {
          additionalMinutesSpent: options.additionalMinutesSpent,
          verifiedByAssessmentAttemptId: options.verifiedByAssessmentAttemptId,
        },
        siblingObjectives
      );

      const updatedPlan: NormalizedPlan = {
        ...activeNormalizedPlan,
        updatedAt: new Date().toISOString(),
        days: activeNormalizedPlan.days.map((d) => ({
          ...d,
          objectives: d.objectives.map((o) =>
            o.id === objectiveId ? result.objective : o
          ),
        })),
      };

      upsertCachedNormalizedPlan(updatedPlan, userId);

      // Update chapter_mastery cleanly (study completion -> STUDY_COMPLETE, NEVER MASTERED)
      const existingMastery = chapterMasteryList.find(
        (cm) => cm.chapterId === targetObj!.chapterId
      );
      const updatedChapterObjectives = updatedPlan.days
        .flatMap((d) => d.objectives)
        .filter((o) => o.chapterId === targetObj!.chapterId);

      const derived = deriveChapterMasteryAfterStudyChange(
        existingMastery,
        targetObj.chapterId,
        updatedChapterObjectives
      );
      upsertCachedChapterMastery(derived.record, userId);

      if (result.historyEvent) {
        appendCachedMasteryHistory(result.historyEvent, userId);
        if (isCloudUser) {
          void appendMasteryHistoryEventToSupabase(result.historyEvent, userId);
        }
      }
      if (derived.historyEvent) {
        appendCachedMasteryHistory(derived.historyEvent, userId);
        if (isCloudUser) {
          void appendMasteryHistoryEventToSupabase(derived.historyEvent, userId);
        }
      }

      // Keep legacy completed_tasks in sync cleanly for legacy route compatibility
      const legacyKey = targetObj.legacyTaskKey;
      const isLegacyStudied = isObjectiveStudiedOrBeyond(result.objective.state);
      const currentDone = readCompleted(userId);
      const nextDone = isLegacyStudied
        ? Array.from(new Set([...currentDone, legacyKey]))
        : currentDone.filter((id) => id !== legacyKey);
      saveCompleted(nextDone, userId, { skipProgression: true });

      if (isLegacyStudied) {
        triggerTaskCelebration();
      }

      if (isCloudUser) {
        await Promise.all([
          syncObjectiveStateToSupabase(result.objective, userId),
          saveCompletedTaskDirect(legacyKey, isLegacyStudied, userId),
        ]);
      }

      emitV2Updated();
      return {
        objective: result.objective,
        chapterMastery: derived.record,
        needsVerificationPrompt: result.needsVerificationPrompt,
      };
    },
    [activeNormalizedPlan, chapterMasteryList, isCloudUser, userId]
  );

  /**
   * Applies server-graded Edge Function assessment results locally + triggers refresh.
   * Preserves study completion on failure and activates retention intervals on pass.
   */
  const applyAssessmentSubmission = useCallback(
    async (
      response: SubmitAssessmentResponse,
      context: { chapterId: string; objectiveId?: string | null; reviewScheduleId?: string | null }
    ) => {
      const nowIso = new Date().toISOString();
      const ch = resolveChapterById(context.chapterId);

      // 1. Update Concept Mastery cache cleanly
      if (Array.isArray(response.conceptResults) && response.conceptResults.length > 0) {
        const existing = readCachedConceptMastery(userId);
        const byConcept = new Map<string, ConceptMasteryRecord>(
          existing.map((c) => [`${c.chapterId}::${c.conceptId}`, c])
        );
        for (const cr of response.conceptResults) {
          byConcept.set(`${context.chapterId}::${cr.conceptId}`, {
            chapterId: context.chapterId,
            conceptId: cr.conceptId,
            conceptTitle: cr.conceptTitle,
            masteryScore: cr.masteryScore,
            attemptsCount: cr.attemptsCount,
            correctCount: cr.correctCount,
            status: cr.status,
            lastAssessedAt: nowIso,
            updatedAt: nowIso,
          });
        }
        saveCachedConceptMastery(Array.from(byConcept.values()), userId);
      }

      // 2. Update Chapter Mastery cache (never erase studyCompleted when failed!)
      const existingCh = readCachedChapterMastery(userId).find(
        (cm) => cm.chapterId === context.chapterId
      );
      const nextStatus = (response.summary.nextChapterStatus ||
        existingCh?.status ||
        'STUDY_COMPLETE') as ChapterMasteryStatus;
      const passedMastery =
        response.attempt.assessment_type === 'CHAPTER_MASTERY' && response.summary.passed;

      const updatedChapterRecord: ChapterMasteryRecord = {
        id: existingCh?.id,
        userId,
        chapterId: context.chapterId,
        status: nextStatus,
        studyCompleted:
          Boolean(existingCh?.studyCompleted) ||
          nextStatus === 'STUDY_COMPLETE' ||
          nextStatus === 'MASTERY_PENDING' ||
          nextStatus === 'MASTERED' ||
          nextStatus === 'NEEDS_REVISION',
        masteryScore: response.summary.scorePercent,
        bestMasteryScore: Math.max(
          existingCh?.bestMasteryScore || 0,
          response.summary.scorePercent
        ),
        conceptCoveragePercent: response.summary.conceptCoveragePercent,
        attemptsCount: (existingCh?.attemptsCount || 0) + 1,
        lastAssessmentAttemptId: response.attempt.id,
        studyCompletedAt: existingCh?.studyCompletedAt || nowIso,
        firstMasteredAt:
          existingCh?.firstMasteredAt || (passedMastery ? nowIso : null),
        lastMasteredAt: passedMastery ? nowIso : existingCh?.lastMasteredAt || null,
        updatedAt: nowIso,
      };
      upsertCachedChapterMastery(updatedChapterRecord, userId);

      // 3. Append mastery history audit record
      appendCachedMasteryHistory(
        {
          id: `mh-assess-${response.attempt.id}`,
          userId,
          chapterId: context.chapterId,
          eventType:
            response.attempt.assessment_type === 'CHAPTER_MASTERY'
              ? response.summary.passed
                ? 'CHAPTER_MASTERED'
                : 'CHAPTER_FAILED'
              : response.attempt.assessment_type === 'REVISION'
              ? response.summary.passed
                ? 'REVISION_PASSED'
                : 'REVISION_DECAYED'
              : response.summary.passed
              ? 'OBJECTIVE_VERIFIED'
              : 'OBJECTIVE_FAILED',
          previousStatus: existingCh?.status || null,
          newStatus: nextStatus,
          scorePercent: response.summary.scorePercent,
          attemptId: response.attempt.id,
          notes: `${response.attempt.assessment_type} assessment (${response.summary.scorePercent}% score, ${response.summary.conceptCoveragePercent}% concept coverage).`,
          recordedAt: nowIso,
        },
        userId
      );

      // 4. Transition objective if applicable (only with real attempt ID!)
      if (context.objectiveId && activeNormalizedPlan) {
        const nextObjState: ObjectiveState = response.summary.passed
          ? 'VERIFIED'
          : 'NEEDS_RELEARNING';
        await transitionObjective(context.objectiveId, nextObjState, {
          verifiedByAssessmentAttemptId: response.attempt.id,
        });
      }

      // 5. Update Review Schedule cache if Edge Function created/updated one OR seed 1-day review upon mastery pass
      const currentSchedules = readCachedReviewSchedules(userId);
      if (response.reviewSchedule && typeof response.reviewSchedule === 'object') {
        const rs = response.reviewSchedule as Record<string, any>;
        const mappedSchedule: ReviewScheduleRecord = {
          id: String(rs.id || `rev-${context.chapterId}-${Date.now()}`),
          userId,
          chapterId: String(rs.chapter_id || context.chapterId),
          chapterTitle: ch?.title || context.chapterId,
          subjectName: ch?.subject || 'Physics',
          conceptId: rs.concept_id ? String(rs.concept_id) : null,
          intervalStep: Number(rs.interval_step || 1),
          intervalDays: Number(rs.interval_days || 1),
          easeFactor: Number(rs.ease_factor || 2.5),
          dueDate: String(rs.due_date || new Date().toISOString().slice(0, 10)),
          status: (rs.status || 'SCHEDULED') as any,
          retentionHealthScore: Number(rs.retention_health_score ?? 100),
          lastReviewedAt: rs.last_reviewed_at || nowIso,
          createdAt: String(rs.created_at || nowIso),
          updatedAt: String(rs.updated_at || nowIso),
        };
        const filtered = currentSchedules.filter(
          (s) => s.id !== mappedSchedule.id && s.id !== context.reviewScheduleId
        );
        saveCachedReviewSchedules([mappedSchedule, ...filtered], userId);
      } else if (passedMastery) {
        const alreadyScheduled = currentSchedules.some(
          (s) => s.chapterId === context.chapterId && s.status !== 'COMPLETED'
        );
        if (!alreadyScheduled) {
          const initial = buildInitialReviewSchedule(
            context.chapterId,
            ch?.title,
            ch?.subject
          );
          saveCachedReviewSchedules([initial, ...currentSchedules], userId);
        }
      }

      if (response.summary.passed) {
        if (response.attempt.assessment_type === 'CHAPTER_MASTERY') {
          triggerGrandCelebration();
        } else {
          triggerTaskCelebration();
        }
      }

      // Pull fresh server truth cleanly in background when signed in
      if (isCloudUser) {
        void loadV2WorkspaceFromSupabase(userId).then(() => emitV2Updated());
      } else {
        emitV2Updated();
      }
    },
    [activeNormalizedPlan, isCloudUser, transitionObjective, userId]
  );

  /**
   * Missed-task recovery & automatic rescheduling without silently overloading tomorrow.
   */
  const reschedulePlanMissedDays = useCallback(
    async (missedDayNumbers?: number[]): Promise<RescheduleResult | null> => {
      if (!activeNormalizedPlan) return null;

      const result = rescheduleMissedObjectives(activeNormalizedPlan, {
        missedDayNumbers,
        softOverloadMarginRatio: 0.35,
        maxExtraMinutesPerDay: 85,
        allowOverflowDays: true,
      });

      if (result.movedObjectives.length === 0) {
        return result;
      }

      upsertCachedNormalizedPlan(result.plan, userId);

      // Project back to legacy StudentPlan & persist seamlessly
      const updatedLegacy = toLegacyStudentPlan(result.plan);
      savePlan(updatedLegacy, userId);

      if (isCloudUser) {
        await Promise.all([
          saveStudyPlanDirect(updatedLegacy, userId, { preserveActiveFlag: true }),
          syncNormalizedPlanToSupabase(result.plan, userId),
        ]);
        await refreshPlans();
      }

      emitV2Updated();
      return result;
    },
    [activeNormalizedPlan, isCloudUser, refreshPlans, userId]
  );

  /**
   * Undoes accidental or premature carry-forwards by returning merged tasks to their original days
   * and anchoring Day 1 cleanly to today's local date while keeping study/mastery progress intact.
   */
  const restorePlanToDayOne = useCallback(async () => {
    if (!activeNormalizedPlan) return null;

    const restored = restoreCarriedForwardPlanToDayOne(
      activeNormalizedPlan,
      formatIsoDate(new Date())
    );
    upsertCachedNormalizedPlan(restored, userId);

    const updatedLegacy = toLegacyStudentPlan(restored);
    savePlan(updatedLegacy, userId);

    if (isCloudUser) {
      await Promise.all([
        saveStudyPlanDirect(updatedLegacy, userId, { preserveActiveFlag: true }),
        syncNormalizedPlanToSupabase(restored, userId),
      ]);
      await refreshPlans();
    }

    emitV2Updated();
    return restored;
  }, [activeNormalizedPlan, isCloudUser, refreshPlans, userId]);

  /**
   * Completes a spaced repetition cycle using adaptive intervals [1, 3, 7, 14, 30]
   * while preserving historical mastery records even when recall drops.
   */
  const submitRetentionReviewOutcome = useCallback(
    async (
      scheduleId: string,
      recallQuality: 1 | 2 | 3 | 4 | 5,
      scorePercent?: number
    ) => {
      const target = reviewSchedulesList.find((r) => r.id === scheduleId);
      if (!target) return null;

      const derivedScore =
        typeof scorePercent === 'number'
          ? scorePercent
          : recallQuality === 5
          ? 95
          : recallQuality === 4
          ? 82
          : recallQuality === 3
          ? 70
          : recallQuality === 2
          ? 50
          : 30;

      const chapterRec = chapterMasteryByChapterId.get(target.chapterId);
      const outcome = processReviewOutcome(target, chapterRec, {
        recallQuality,
        scorePercent: derivedScore,
      });

      const nextList = [
        outcome.nextSchedule,
        outcome.completedSchedule,
        ...reviewSchedulesList.filter((r) => r.id !== target.id),
      ];
      saveCachedReviewSchedules(nextList, userId);
      appendCachedReviewAttempt(outcome.reviewAttempt, userId);

      if (outcome.updatedChapterMastery) {
        upsertCachedChapterMastery(outcome.updatedChapterMastery, userId);
      }
      appendCachedMasteryHistory(outcome.historyEvent, userId);

      if (isCloudUser) {
        await Promise.all([
          syncReviewScheduleToSupabase(outcome.completedSchedule, userId),
          syncReviewScheduleToSupabase(outcome.nextSchedule, userId),
          appendMasteryHistoryEventToSupabase(outcome.historyEvent, userId),
        ]);
      }

      if (outcome.reviewAttempt.passed) {
        triggerTaskCelebration();
      }

      emitV2Updated();
      return outcome;
    },
    [chapterMasteryByChapterId, isCloudUser, reviewSchedulesList, userId]
  );

  /**
   * Ensures any chapter marked MASTERED or STUDY_COMPLETE can opt into a retention cycle cleanly.
   */
  const ensureReviewScheduleForChapter = useCallback(
    async (chapterId: string) => {
      const existing = reviewSchedulesList.find(
        (s) => s.chapterId === chapterId && s.status !== 'COMPLETED'
      );
      if (existing) return existing;

      const ch = resolveChapterById(chapterId);
      const created = buildInitialReviewSchedule(chapterId, ch?.title, ch?.subject);
      const next = [created, ...reviewSchedulesList];
      saveCachedReviewSchedules(next, userId);
      if (isCloudUser) {
        await syncReviewScheduleToSupabase(created, userId);
      }
      emitV2Updated();
      return created;
    },
    [isCloudUser, reviewSchedulesList, userId]
  );

  return {
    userId,
    isCloudUser,
    isRefreshing,
    v2SchemaReady,
    legacyPlan,
    activeNormalizedPlan,
    objectives: allActiveObjectives,
    backlogItems,
    chapterMasteryList,
    chapterMasteryByChapterId,
    conceptMasteryList,
    masteryHistoryList,
    reviewSchedulesList,
    studySessions,
    analytics,
    transitionObjective,
    applyAssessmentSubmission,
    reschedulePlanMissedDays,
    restorePlanToDayOne,
    submitRetentionReviewOutcome,
    ensureReviewScheduleForChapter,
    refreshFromCloud,
  };
}
