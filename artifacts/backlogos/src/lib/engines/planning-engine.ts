import {
  chapters,
  resolveChapterById,
  generatePlanId,
  buildDefaultPlanName,
  isCoreSubject,
  isAuxiliaryOrElective,
  type Chapter,
  type PlanDay,
  type PlanTask,
  type PlanDaySlot,
  type DayRhythmType,
  type StudentPlan,
  type StudentPlanInput,
  type PlanDuration,
} from '../backlog-data';
import {
  calculatePriorityScore,
  generateDefaultBacklogItems,
  type BacklogItem,
} from '../backlog-items';
import {
  PREREQUISITE_GRAPH,
  checkUnfinishedPrerequisites,
  getAllTransitivePrerequisites,
} from '../prerequisites-graph';
import type {
  MovedObjectiveSummary,
  NormalizedPlan,
  NormalizedPlanDay,
  ObjectiveKind,
  ObjectiveState,
  PlanObjective,
  RescheduleResult,
} from './types';

export const SUPPORTED_PLAN_HORIZONS = [3, 7, 21, 30] as const;

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isoTimestampToLocalDate(isoOrDate?: string | null): string {
  if (!isoOrDate) return formatIsoDate(new Date());
  const trimmed = String(isoOrDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return formatIsoDate(new Date());
  return formatIsoDate(parsed);
}

export function addDaysToIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map((n) => Number(n));
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  dt.setDate(dt.getDate() + deltaDays);
  return formatIsoDate(dt);
}

function getDayOfWeekLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map((n) => Number(n));
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()];
}

export interface ChapterSchedulingScore {
  chapter: Chapter;
  priorityScore: number;
  prerequisitesInSelection: string[];
  missingPrerequisites: string[];
  warningMessage: string | null;
}

/**
 * Computes priority scores and sorts selected chapters using topological prerequisite ordering
 * with highest-priority foundation chapters unlocked first.
 * Does NOT inject unselected chapters into the student's chapter count (keeps prerequisite warnings advisory).
 */
export function orderChaptersByPrerequisitesAndPriority(
  selectedChapterIds: string[],
  backlogItems: BacklogItem[] = [],
  completedChapterIds: string[] = [],
  prerequisitesMap: Record<string, string[]> = PREREQUISITE_GRAPH
): {
  ordered: ChapterSchedulingScore[];
  missingPrerequisiteIds: string[];
  prerequisiteWarnings: string[];
} {
  const cleanIds = Array.from(
    new Set(selectedChapterIds.filter((id) => Boolean(id) && id !== 'phy-world'))
  );
  const selectedSet = new Set(cleanIds);
  const completedSet = new Set(completedChapterIds);
  const backlogByChapter = new Map(backlogItems.map((b) => [b.chapterId, b]));
  const missingPrereqs = new Set<string>();
  const warnings: string[] = [];

  const metaById = new Map<string, ChapterSchedulingScore>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const id of cleanIds) {
    const ch = resolveChapterById(id) || {
      id,
      subject: 'Physics',
      title: id,
      note: 'Selected backlog chapter',
      order: 1,
      tag: 'Core',
    };

    const existingBacklog =
      backlogByChapter.get(id) || generateDefaultBacklogItems([id])[0];
    const prio = existingBacklog
      ? calculatePriorityScore(existingBacklog, completedChapterIds)
      : { score: 50 };

    const directPrereqs = prerequisitesMap[id] || [];
    const transitivePrereqs =
      prerequisitesMap === PREREQUISITE_GRAPH
        ? getAllTransitivePrerequisites(id)
        : directPrereqs;
    const prereqsInSelection = Array.from(
      new Set(
        transitivePrereqs.filter((pid) => selectedSet.has(pid) && pid !== id)
      )
    );
    const unfinishedCheck = checkUnfinishedPrerequisites(id, [
      ...completedChapterIds,
      ...prereqsInSelection,
    ]);

    for (const pid of directPrereqs) {
      if (!selectedSet.has(pid) && !completedSet.has(pid) && pid !== 'phy-world') {
        missingPrereqs.add(pid);
      }
    }

    if (unfinishedCheck.hasUnfinished && unfinishedCheck.warningMessage) {
      warnings.push(unfinishedCheck.warningMessage);
    }

    metaById.set(id, {
      chapter: ch,
      priorityScore: prio.score,
      prerequisitesInSelection: prereqsInSelection,
      missingPrerequisites: directPrereqs.filter(
        (pid) => !selectedSet.has(pid) && !completedSet.has(pid)
      ),
      warningMessage: unfinishedCheck.warningMessage,
    });

    inDegree.set(id, prereqsInSelection.length);
    for (const pid of prereqsInSelection) {
      if (!dependents.has(pid)) dependents.set(pid, []);
      dependents.get(pid)!.push(id);
    }
  }

  // Kahn's topological sort prioritizing higher priority score & foundational chapter order
  const ready: ChapterSchedulingScore[] = [];
  for (const id of cleanIds) {
    if ((inDegree.get(id) || 0) === 0) {
      const m = metaById.get(id);
      if (m) ready.push(m);
    }
  }

  const comparator = (a: ChapterSchedulingScore, b: ChapterSchedulingScore) =>
    b.priorityScore - a.priorityScore || a.chapter.order - b.chapter.order;

  ready.sort(comparator);
  const ordered: ChapterSchedulingScore[] = [];
  const visited = new Set<string>();

  while (ready.length > 0) {
    const current = ready.shift()!;
    if (visited.has(current.chapter.id)) continue;
    visited.add(current.chapter.id);
    ordered.push(current);

    const nextIds = dependents.get(current.chapter.id) || [];
    for (const nid of nextIds) {
      const nextDeg = (inDegree.get(nid) || 0) - 1;
      inDegree.set(nid, nextDeg);
      if (nextDeg <= 0 && !visited.has(nid)) {
        const meta = metaById.get(nid);
        if (meta) {
          ready.push(meta);
        }
      }
    }
    ready.sort(comparator);
  }

  // Defensive fallback in case any custom prerequisite graph introduces a cycle
  if (ordered.length < cleanIds.length) {
    const remaining = cleanIds
      .filter((id) => !visited.has(id))
      .map((id) => metaById.get(id)!)
      .filter(Boolean)
      .sort(comparator);
    ordered.push(...remaining);
  }

  return {
    ordered,
    missingPrerequisiteIds: Array.from(missingPrereqs),
    prerequisiteWarnings: Array.from(new Set(warnings)),
  };
}

function stableObjUuid(seed: string): string {
  // Deterministic UUID v4-shaped identifier when an objective row hasn't been persisted yet
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  const hex =
    ((h1 >>> 0).toString(16).padStart(8, '0') +
      (h2 >>> 0).toString(16).padStart(8, '0') +
      ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0') +
      ((h1 + h2) >>> 0).toString(16).padStart(8, '0'))
      .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Builds a normalized multi-horizon study plan respecting study-time capacity,
 * priority scoring, and prerequisite ordering.
 */
export function generateNormalizedPlan(
  input: StudentPlanInput & { startDate?: string },
  backlogItems: BacklogItem[] = [],
  completedChapterIds: string[] = []
): NormalizedPlan {
  const rawChapterIds = input.chapterIds || [];
  const sanitizedChapterIds = Array.from(
    new Set(
      (Array.isArray(rawChapterIds) ? rawChapterIds : []).filter(
        (id) => Boolean(id) && id !== 'phy-world'
      )
    )
  );
  const selectedChapterIds =
    sanitizedChapterIds.length > 0 ? sanitizedChapterIds : ['phy-units'];

  const minutesPerDay = Math.min(
    960,
    Math.max(
      30,
      typeof input.minutesPerDay === 'number' && !Number.isNaN(input.minutesPerDay)
        ? Math.round(input.minutesPerDay)
        : 180
    )
  );

  const planHorizonDays = Math.min(
    365,
    Math.max(1, Number(input.planDuration) || 7)
  );
  const isEmergency = planHorizonDays === 1;
  const startDate = input.startDate || formatIsoDate(new Date());
  const planId = input.id || generatePlanId();
  const nowIso = new Date().toISOString();

  const { ordered, missingPrerequisiteIds, prerequisiteWarnings } =
    orderChaptersByPrerequisitesAndPriority(
      selectedChapterIds,
      backlogItems,
      completedChapterIds
    );

  const fallbackChapter =
    chapters.find((c) => c.id !== 'phy-world') || chapters[0];
  const queue: ChapterSchedulingScore[] =
    ordered.length > 0
      ? ordered
      : [
          {
            chapter: fallbackChapter,
            priorityScore: 50,
            prerequisitesInSelection: [],
            missingPrerequisites: [],
            warningMessage: null,
          },
        ];

  const coreQueue = queue.filter((q) => isCoreSubject(q.chapter.subject));
  const electiveQueue = queue.filter((q) =>
    isAuxiliaryOrElective(q.chapter.subject)
  );
  const effectiveCore = coreQueue.length > 0 ? coreQueue : queue;
  const effectiveElective = electiveQueue.length > 0 ? electiveQueue : [];

  let corePointer = 0;
  let electivePointer = 0;

  const days: NormalizedPlanDay[] = [];

  for (let index = 0; index < planHorizonDays; index++) {
    const dayNumber = index + 1;
    const scheduledDate = addDaysToIsoDate(startDate, index);
    const dayOfWeekLabel = getDayOfWeekLabel(scheduledDate);
    const isWednesday = dayOfWeekLabel === 'Wednesday';
    const isSaturday = dayOfWeekLabel === 'Saturday';
    const isSunday = dayOfWeekLabel === 'Sunday';
    const isElectiveDay = isWednesday || isSaturday || isSunday;

    let focus1Meta: ChapterSchedulingScore;
    let focus2Meta: ChapterSchedulingScore;
    let rhythmBadge = '';

    if (isEmergency) {
      focus1Meta = effectiveCore[0] || queue[0];
      focus2Meta = effectiveCore[1] || effectiveElective[0] || focus1Meta;
      rhythmBadge = `1-Day Triage · ${focus1Meta.chapter.subject} + ${focus2Meta.chapter.subject}`;
    } else if (isElectiveDay && effectiveElective.length > 0) {
      const scheduledElective =
        effectiveElective[electivePointer % effectiveElective.length];
      electivePointer++;
      const scheduledCore = effectiveCore[corePointer % effectiveCore.length];
      corePointer++;

      if (isSunday) {
        focus1Meta = scheduledElective;
        focus2Meta = scheduledCore;
        rhythmBadge = `Sunday Review · ${focus1Meta.chapter.subject} + ${focus2Meta.chapter.subject}`;
      } else if (isWednesday) {
        focus1Meta = scheduledCore;
        focus2Meta = scheduledElective;
        rhythmBadge = `Wednesday Elective Pivot · ${focus1Meta.chapter.subject} + ${focus2Meta.chapter.subject}`;
      } else {
        focus1Meta = scheduledCore;
        focus2Meta = scheduledElective;
        rhythmBadge = `Weekend Board Booster · ${focus1Meta.chapter.subject} + ${focus2Meta.chapter.subject}`;
      }
    } else {
      const scheduledCore1 = effectiveCore[corePointer % effectiveCore.length];
      corePointer++;
      let scheduledCore2 = effectiveCore.find(
        (c) =>
          c.chapter.subject !== scheduledCore1.chapter.subject &&
          c.chapter.id !== scheduledCore1.chapter.id
      );
      if (!scheduledCore2) {
        scheduledCore2 = effectiveCore[corePointer % effectiveCore.length];
        corePointer++;
      }
      focus1Meta = scheduledCore1;
      focus2Meta = scheduledCore2 || scheduledCore1;
      rhythmBadge = `Dual-Core Focus · ${focus1Meta.chapter.subject} + ${focus2Meta.chapter.subject}`;
    }

    const focus1 = focus1Meta.chapter;
    const focus2 = focus2Meta.chapter;

    // Strictly cap allocated minutes at minutesPerDay
    const recallMinutes = Math.min(
      30,
      Math.max(15, Math.round(minutesPerDay * 0.13))
    );
    const remainingForCore = Math.max(15, minutesPerDay - recallMinutes);
    const slot1Minutes = Math.round(remainingForCore * 0.6);
    const slot2Minutes = Math.max(0, remainingForCore - slot1Minutes);

    const task1Min = Math.round(slot1Minutes * 0.55);
    const task2Min = Math.max(0, slot1Minutes - task1Min);
    const task3Min = slot2Minutes;
    const task4Min = recallMinutes;

    const planDayId = stableObjUuid(`${planId}::day-${dayNumber}`);

    type ObjectiveTemplate = {
      slotIdx: number;
      chapter: Chapter;
      kind: ObjectiveKind;
      minutes: number;
      priorityScore: number;
      title: string;
      description: string;
    };

    const rawTemplates: ObjectiveTemplate[] = [
      {
        slotIdx: 1,
        chapter: focus1,
        kind: 'learn',
        minutes: task1Min,
        priorityScore: focus1Meta.priorityScore,
        title: `Concept & Derivations: ${focus1.title}`,
        description: `${task1Min} min · High-yield theory & NCERT derivations for ${focus1.subject}`,
      },
      {
        slotIdx: 2,
        chapter: focus1,
        kind: 'practice',
        minutes: task2Min,
        priorityScore: focus1Meta.priorityScore,
        title: `PYQs & Problem Set: ${focus1.title}`,
        description: `${task2Min} min · Solve targeted board & conceptual problems`,
      },
      {
        slotIdx: 3,
        chapter: focus2,
        kind: 'practice',
        minutes: task3Min,
        priorityScore: focus2Meta.priorityScore,
        title: `Secondary Clearance: ${focus2.title}`,
        description: `${task3Min} min · ${focus2.subject} backlog sprint`,
      },
      {
        slotIdx: 4,
        chapter: focus1,
        kind: 'verify',
        minutes: task4Min,
        priorityScore: Math.max(focus1Meta.priorityScore, focus2Meta.priorityScore),
        title: `Active Recall & Verification Prep: ${focus1.title}`,
        description: `${task4Min} min · Formula recall and understanding verification`,
      },
    ];

    const objTemplates = rawTemplates.filter((o) => o.minutes > 0);

    const objectives: PlanObjective[] = objTemplates.map((tpl, seqIdx) => {
      const legacyTaskKey = `${planId}::day-${dayNumber}-task-${tpl.slotIdx}`;
      return {
        id: stableObjUuid(legacyTaskKey),
        planId,
        planDayId,
        dayNumber,
        chapterId: tpl.chapter.id,
        conceptId: null,
        subjectName: tpl.chapter.subject,
        title: tpl.title,
        description: tpl.description,
        kind: tpl.kind,
        state: 'PENDING',
        priorityScore: tpl.priorityScore,
        estimatedMinutes: tpl.minutes,
        actualMinutes: 0,
        sequenceOrder: seqIdx + 1,
        scheduledDate,
        missedCount: 0,
        rescheduledFromDayId: null,
        legacyTaskKey,
        studiedAt: null,
        verifiedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    const allocatedMinutes = objectives.reduce(
      (sum, o) => sum + o.estimatedMinutes,
      0
    );

    const focusTheme = isEmergency
      ? `Day ${dayNumber} Emergency Triage: ${focus1.subject} + ${focus2.subject}`
      : `${dayOfWeekLabel}: ${focus1.subject} (${focus1.title}) + ${focus2.subject} (${focus2.title})`;

    days.push({
      id: planDayId,
      planId,
      dayNumber,
      scheduledDate,
      title: `Day ${dayNumber} · ${focus1.title}`,
      focusTheme,
      dayOfWeekLabel,
      rhythmBadge,
      allocatedMinutes,
      maxCapacityMinutes: minutesPerDay,
      isRecoveryDay: false,
      isPrerequisiteDay:
        focus1Meta.prerequisitesInSelection.length === 0 &&
        Boolean(PREREQUISITE_GRAPH[focus1.id]?.length === 0),
      isRecap: index >= queue.length,
      primaryChapterId: focus1.id,
      secondaryChapterId: focus2.id,
      objectives,
    });
  }

  const coverageNote = buildCoverageNote(planHorizonDays, minutesPerDay);
  const orderReason = isEmergency
    ? 'Single-day emergency triage protocol prioritizing highest-yield formulas and prerequisite foundations.'
    : 'Prerequisite-aware topological ordering combined with priority-weighted dual-subject pacing capped at your daily study budget.';

  const planName =
    input.name && input.name.trim()
      ? input.name.trim()
      : buildDefaultPlanName({
          subjects: input.subjects,
          planDuration: planHorizonDays,
          days,
        });

  return {
    id: planId,
    name: planName,
    planHorizonDays,
    isActive: input.isActive ?? true,
    status: 'active',
    board: input.board || 'CBSE Class 12',
    goal: input.goal || 'Complete Backlog Recovery',
    priority: input.priority || 'backlog recovery',
    confidence: input.confidence || 'mixed',
    examDate: input.examDate || '',
    startDate,
    minutesPerDay,
    subjects: input.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    selectedChapterIds,
    orderedChapterIds: ordered.map((o) => o.chapter.id),
    prerequisiteChapterIds: missingPrerequisiteIds,
    prerequisiteWarnings,
    orderReason,
    coverageNote,
    rescheduleCount: 0,
    lastRescheduledAt: null,
    days,
    createdAt: input.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

function buildCoverageNote(horizonDays: number, minutesPerDay: number): string {
  if (horizonDays === 1) {
    return `1-Day Emergency Sprint: Dual-subject emergency triage within your ${minutesPerDay}-minute budget.`;
  }
  if (horizonDays === 3) {
    return '3-Day Bootcamp: Prerequisite foundations first, then core high-weightage backlog blockers.';
  }
  if (horizonDays === 21) {
    return '21-Day Habit Mastery: 3-week structured curriculum recovery with spaced verification checkpoints.';
  }
  if (horizonDays === 30) {
    return '30-Day Complete Overhaul: Full month systematic recovery balancing prerequisite order, study, and mastery testing.';
  }
  return `${horizonDays}-Day Recovery Track: Prerequisite-ordered multi-subject schedule balanced strictly within ${minutesPerDay} min/day.`;
}

function isObjectiveIncompleteForSchedule(state: ObjectiveState): boolean {
  return state === 'PENDING' || state === 'IN_PROGRESS' || state === 'NEEDS_RELEARNING';
}

export interface RescheduleOptions {
  todayDateStr?: string;
  missedDayNumbers?: number[];
  /**
   * Maximum extra daily buffer allowed above base capacity (e.g. 0.15 = max +15% up to 35 min).
   * Prevents silently cramming 2-3 missed days into tomorrow.
   */
  softOverloadMarginRatio?: number;
  maxExtraMinutesPerDay?: number;
  allowOverflowDays?: boolean;
}

/**
 * Missed-task recovery & automatic plan rescheduling:
 * - If a student misses 1 task from a day, merges it directly into the next upcoming day (within capacity).
 * - If a whole day (or multiple tasks) is missed, distributes tasks evenly across multiple upcoming days
 *   and opens overflow recovery days when needed so tomorrow never carries sudden backlog pressure.
 */
export function rescheduleMissedObjectives(
  plan: NormalizedPlan,
  options: RescheduleOptions = {}
): RescheduleResult {
  const todayDateStr = options.todayDateStr || formatIsoDate(new Date());
  const softRatio =
    typeof options.softOverloadMarginRatio === 'number'
      ? Math.max(0, Math.min(0.45, options.softOverloadMarginRatio))
      : 0.15;
  const maxExtraCap =
    typeof options.maxExtraMinutesPerDay === 'number'
      ? Math.max(0, options.maxExtraMinutesPerDay)
      : 35;
  const allowOverflowDays = options.allowOverflowDays !== false;

  const baseDailyCapacity = Math.max(30, plan.minutesPerDay);
  const perDaySoftCap =
    baseDailyCapacity +
    Math.min(maxExtraCap, Math.round(baseDailyCapacity * softRatio));

  const missedSet = new Set(options.missedDayNumbers || []);

  // Clone structure cleanly without mutating caller reference
  const clonedDays: NormalizedPlanDay[] = plan.days.map((d) => ({
    ...d,
    objectives: d.objectives.map((o) => ({ ...o })),
  }));

  const overdueObjectives: Array<{
    objective: PlanObjective;
    fromDayIndex: number;
    fromDayNumber: number;
    fromDayId: string;
    fromDate: string | null;
    fromWholeDayMissed: boolean;
  }> = [];

  for (let i = 0; i < clonedDays.length; i++) {
    const day = clonedDays[i];
    const isPastDay =
      missedSet.size > 0
        ? missedSet.has(day.dayNumber)
        : day.scheduledDate < todayDateStr;

    if (!isPastDay) continue;

    const totalBefore = day.objectives.length;
    const keptObjectives: PlanObjective[] = [];
    const dayMissedList: PlanObjective[] = [];
    for (const obj of day.objectives) {
      if (isObjectiveIncompleteForSchedule(obj.state)) {
        dayMissedList.push(obj);
      } else {
        keptObjectives.push(obj);
      }
    }

    const wholeDayMissed =
      totalBefore >= 2 && dayMissedList.length === totalBefore;

    for (const obj of dayMissedList) {
      overdueObjectives.push({
        objective: obj,
        fromDayIndex: i,
        fromDayNumber: day.dayNumber,
        fromDayId: day.id,
        fromDate: obj.scheduledDate || day.scheduledDate,
        fromWholeDayMissed: wholeDayMissed,
      });
    }

    day.objectives = keptObjectives;
    day.allocatedMinutes = keptObjectives.reduce(
      (sum, o) => sum + o.estimatedMinutes,
      0
    );
  }

  if (overdueObjectives.length === 0) {
    return {
      plan: {
        ...plan,
        days: clonedDays,
      },
      movedObjectives: [],
      createdOverflowDaysCount: 0,
      unscheduledCount: 0,
      preservedCapacityLimitMinutes: perDaySoftCap,
      summaryMessage: 'No overdue incomplete objectives needed rescheduling.',
    };
  }

  // Sort missed objectives by original day ASC then priority DESC so earliest foundations merge first
  overdueObjectives.sort(
    (a, b) =>
      a.fromDayNumber - b.fromDayNumber ||
      b.objective.priorityScore - a.objective.priorityScore
  );

  const nowIso = new Date().toISOString();
  const movedObjectives: MovedObjectiveSummary[] = [];
  let createdOverflowDaysCount = 0;
  let unscheduledCount = 0;

  // Identify candidate future days (>= todayDateStr)
  const futureDays = clonedDays.filter((d) => d.scheduledDate >= todayDateStr);
  // Ensure at least today exists as a target bucket if entire plan horizon was in the past
  if (futureDays.length === 0 && allowOverflowDays) {
    const nextDayNum = clonedDays.length + 1;
    const newDayId = stableObjUuid(`${plan.id}::day-${nextDayNum}`);
    const newDay: NormalizedPlanDay = {
      id: newDayId,
      planId: plan.id,
      dayNumber: nextDayNum,
      scheduledDate: todayDateStr,
      title: `Day ${nextDayNum} · Missed Task Recovery`,
      focusTheme: `${getDayOfWeekLabel(todayDateStr)}: Missed Backlog Recovery`,
      dayOfWeekLabel: getDayOfWeekLabel(todayDateStr),
      rhythmBadge: 'Recovery Cushion',
      allocatedMinutes: 0,
      maxCapacityMinutes: baseDailyCapacity,
      isRecoveryDay: true,
      isPrerequisiteDay: false,
      isRecap: false,
      primaryChapterId: overdueObjectives[0].objective.chapterId,
      objectives: [],
    };
    clonedDays.push(newDay);
    futureDays.push(newDay);
    createdOverflowDaysCount += 1;
  }

  const isMultiTaskSpread =
    overdueObjectives.length >= 2 ||
    overdueObjectives.some((item) => item.fromWholeDayMissed);
  const addedCountByDayId = new Map<string, number>();

  for (const item of overdueObjectives) {
    const obj = item.objective;
    const effectiveCapForDay = (d: NormalizedPlanDay) =>
      Math.max(d.maxCapacityMinutes, perDaySoftCap);

    const eligibleDays = futureDays.filter(
      (d) =>
        d.id !== item.fromDayId &&
        d.allocatedMinutes + obj.estimatedMinutes <= effectiveCapForDay(d)
    );

    let targetDay: NormalizedPlanDay | undefined;
    if (eligibleDays.length > 0) {
      if (!isMultiTaskSpread) {
        // Single partial task: merge directly into the immediate next upcoming day that has capacity
        eligibleDays.sort((a, b) => a.dayNumber - b.dayNumber);
        targetDay = eligibleDays[0];
      } else {
        // Whole day or multi-task miss: balance evenly across multiple upcoming days (least-added, lightest load first)
        eligibleDays.sort((a, b) => {
          const addedDiff =
            (addedCountByDayId.get(a.id) || 0) -
            (addedCountByDayId.get(b.id) || 0);
          if (addedDiff !== 0) return addedDiff;
          const loadDiff = a.allocatedMinutes - b.allocatedMinutes;
          if (loadDiff !== 0) return loadDiff;
          return a.dayNumber - b.dayNumber;
        });
        targetDay = eligibleDays[0];
      }
    }

    if (!targetDay && allowOverflowDays) {
      const lastDay = clonedDays[clonedDays.length - 1];
      const nextDayNum = (lastDay?.dayNumber || clonedDays.length) + 1;
      const lastDate = lastDay?.scheduledDate || todayDateStr;
      const candidateDate = addDaysToIsoDate(lastDate, 1);
      const nextDate = candidateDate >= todayDateStr ? candidateDate : todayDateStr;
      const dayLabel = getDayOfWeekLabel(nextDate);
      const newDayId = stableObjUuid(`${plan.id}::day-${nextDayNum}`);

      targetDay = {
        id: newDayId,
        planId: plan.id,
        dayNumber: nextDayNum,
        scheduledDate: nextDate,
        title: `Day ${nextDayNum} · Recovery Overflow`,
        focusTheme: `${dayLabel}: Recovered Objectives (${obj.subjectName})`,
        dayOfWeekLabel: dayLabel,
        rhythmBadge: 'Recovery Extension Day',
        allocatedMinutes: 0,
        maxCapacityMinutes: baseDailyCapacity,
        isRecoveryDay: true,
        isPrerequisiteDay: false,
        isRecap: false,
        primaryChapterId: obj.chapterId,
        objectives: [],
      };
      clonedDays.push(targetDay);
      futureDays.push(targetDay);
      createdOverflowDaysCount += 1;
    }

    if (!targetDay) {
      // If overflow days disabled, put back safely rather than silently losing the objective
      clonedDays[item.fromDayIndex].objectives.push(obj);
      clonedDays[item.fromDayIndex].allocatedMinutes += obj.estimatedMinutes;
      unscheduledCount += 1;
      continue;
    }

    const updatedObj: PlanObjective = {
      ...obj,
      planDayId: targetDay.id,
      dayNumber: targetDay.dayNumber,
      scheduledDate: targetDay.scheduledDate,
      missedCount: (obj.missedCount || 0) + 1,
      rescheduledFromDayId: item.fromDayId,
      rescheduledFromDayNumber: item.fromDayNumber,
      sequenceOrder: targetDay.objectives.length + 1,
      updatedAt: nowIso,
    };

    targetDay.objectives.push(updatedObj);
    targetDay.allocatedMinutes += updatedObj.estimatedMinutes;
    targetDay.isRecoveryDay = true;
    addedCountByDayId.set(targetDay.id, (addedCountByDayId.get(targetDay.id) || 0) + 1);

    movedObjectives.push({
      objectiveId: updatedObj.id,
      title: updatedObj.title,
      chapterId: updatedObj.chapterId,
      fromDayNumber: item.fromDayNumber,
      fromDate: item.fromDate,
      toDayNumber: targetDay.dayNumber,
      toDate: targetDay.scheduledDate,
      estimatedMinutes: updatedObj.estimatedMinutes,
    });
  }

  // Re-index sequence orders cleanly per day
  for (const day of clonedDays) {
    day.objectives = day.objectives.map((o, idx) => ({
      ...o,
      sequenceOrder: idx + 1,
    }));
    day.allocatedMinutes = day.objectives.reduce(
      (sum, o) => sum + o.estimatedMinutes,
      0
    );
  }

  const updatedPlan: NormalizedPlan = {
    ...plan,
    planHorizonDays: clonedDays.length,
    days: clonedDays,
    rescheduleCount: (plan.rescheduleCount || 0) + (movedObjectives.length > 0 ? 1 : 0),
    lastRescheduledAt: movedObjectives.length > 0 ? nowIso : plan.lastRescheduledAt,
    updatedAt: nowIso,
  };

  const sourceDays = Array.from(new Set(movedObjectives.map((m) => m.fromDayNumber))).sort(
    (a, b) => a - b
  );
  const destDays = Array.from(new Set(movedObjectives.map((m) => m.toDayNumber))).sort(
    (a, b) => a - b
  );
  const fromLabel = sourceDays.map((d) => `Day ${d}`).join(', ');
  const toLabel = destDays.map((d) => `Day ${d}`).join(', ');

  const summaryMessage =
    movedObjectives.length === 1
      ? `Merged 1 missed task from ${fromLabel} into ${toLabel} (${perDaySoftCap}m daily cap preserved).`
      : createdOverflowDaysCount > 0
      ? `Spread ${movedObjectives.length} missed tasks from ${fromLabel} across ${toLabel} (+${createdOverflowDaysCount} overflow recovery day${createdOverflowDaysCount === 1 ? '' : 's'}) so tomorrow stays pressure-free.`
      : `Spread ${movedObjectives.length} missed tasks from ${fromLabel} evenly across ${toLabel} without overloading any single day (${perDaySoftCap}m cap).`;

  return {
    plan: updatedPlan,
    movedObjectives,
    createdOverflowDaysCount,
    unscheduledCount,
    preservedCapacityLimitMinutes: perDaySoftCap,
    summaryMessage,
  };
}

/**
 * Restores any carried-forward / accidentally merged tasks back to their original days
 * and re-anchors Day 1 to start today in the student's local timezone while preserving
 * all study/verification completion states.
 */
export function restoreCarriedForwardPlanToDayOne(
  plan: NormalizedPlan,
  todayDateStr?: string
): NormalizedPlan {
  const anchorDate = todayDateStr || formatIsoDate(new Date());
  const nowIso = new Date().toISOString();

  const dayIdToNumber = new Map<string, number>();
  for (const d of plan.days) {
    dayIdToNumber.set(d.id, d.dayNumber);
  }

  const allObjectives = plan.days.flatMap((d) =>
    d.objectives.map((o) => ({ ...o, currentDayNumber: d.dayNumber }))
  );

  const buckets = new Map<number, PlanObjective[]>();
  const nonOverflowDays = plan.days.filter(
    (d) => !d.isRecoveryDay || d.objectives.length > 0 || d.dayNumber <= plan.planHorizonDays
  );

  let maxOriginalDay = 1;
  for (const d of nonOverflowDays) {
    if (!d.isRecoveryDay || d.objectives.length === 0) {
      maxOriginalDay = Math.max(maxOriginalDay, d.dayNumber);
    }
  }

  for (const obj of allObjectives) {
    let targetDayNum = obj.currentDayNumber;
    if (typeof obj.rescheduledFromDayNumber === 'number' && obj.rescheduledFromDayNumber >= 1) {
      targetDayNum = obj.rescheduledFromDayNumber;
    } else if (obj.rescheduledFromDayId && dayIdToNumber.has(obj.rescheduledFromDayId)) {
      targetDayNum = dayIdToNumber.get(obj.rescheduledFromDayId)!;
    } else if (obj.legacyTaskKey) {
      const m = obj.legacyTaskKey.match(/::day-(\d+)-task-/);
      if (m && Number(m[1]) >= 1) {
        targetDayNum = Number(m[1]);
      }
    }
    maxOriginalDay = Math.max(maxOriginalDay, targetDayNum);
    const list = buckets.get(targetDayNum) || [];
    list.push(obj);
    buckets.set(targetDayNum, list);
  }

  const dayByNumber = new Map<number, NormalizedPlanDay>();
  for (const d of plan.days) {
    dayByNumber.set(d.dayNumber, d);
  }

  const restoredDays: NormalizedPlanDay[] = [];
  for (let dayNum = 1; dayNum <= maxOriginalDay; dayNum++) {
    const existingDay = dayByNumber.get(dayNum);
    const bucketObjs = buckets.get(dayNum) || [];
    const isOverflowBucket =
      existingDay?.rhythmBadge === 'Recovery Extension Day' ||
      existingDay?.rhythmBadge === 'Recovery Cushion' ||
      Boolean(existingDay?.title?.includes('Recovery Overflow'));
    if (isOverflowBucket && bucketObjs.length === 0) {
      continue;
    }
    if (!existingDay && bucketObjs.length === 0) continue;

    const scheduledDate = addDaysToIsoDate(anchorDate, dayNum - 1);
    const dayOfWeekLabel = existingDay?.dayOfWeekLabel || getDayOfWeekLabel(scheduledDate);
    const planDayId = existingDay?.id || stableObjUuid(`${plan.id}::day-${dayNum}`);

    const cleanObjectives: PlanObjective[] = bucketObjs
      .sort((a, b) => {
        const seqA = Number((a.legacyTaskKey.match(/-task-(\d+)/) || [])[1] || a.sequenceOrder);
        const seqB = Number((b.legacyTaskKey.match(/-task-(\d+)/) || [])[1] || b.sequenceOrder);
        return seqA - seqB;
      })
      .map((o, idx) => ({
        ...o,
        planDayId,
        dayNumber: dayNum,
        scheduledDate,
        missedCount: 0,
        rescheduledFromDayId: null,
        rescheduledFromDayNumber: null,
        sequenceOrder: idx + 1,
        updatedAt: nowIso,
      }));

    const firstObj = cleanObjectives[0];
    const ch1Id = existingDay?.primaryChapterId || firstObj?.chapterId || 'phy-units';

    restoredDays.push({
      id: planDayId,
      planId: plan.id,
      dayNumber: dayNum,
      scheduledDate,
      title: existingDay?.title || `Day ${dayNum} · ${resolveChapterById(ch1Id)?.title || ch1Id}`,
      focusTheme: existingDay?.focusTheme || `${dayOfWeekLabel}: Day ${dayNum}`,
      dayOfWeekLabel,
      rhythmBadge:
        existingDay?.rhythmBadge && existingDay.rhythmBadge !== 'Recovery Extension Day'
          ? existingDay.rhythmBadge
          : 'Balanced Focus',
      allocatedMinutes: cleanObjectives.reduce((sum, o) => sum + o.estimatedMinutes, 0),
      maxCapacityMinutes: existingDay?.maxCapacityMinutes || Math.max(30, plan.minutesPerDay),
      isRecoveryDay: false,
      isPrerequisiteDay: Boolean(existingDay?.isPrerequisiteDay),
      isRecap: Boolean(existingDay?.isRecap),
      primaryChapterId: ch1Id,
      secondaryChapterId: existingDay?.secondaryChapterId,
      objectives: cleanObjectives,
    });
  }

  return {
    ...plan,
    planHorizonDays: restoredDays.length,
    startDate: anchorDate,
    rescheduleCount: 0,
    lastRescheduledAt: null,
    days: restoredDays,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Projects a NormalizedPlan back into legacy StudentPlan format so existing
 * components and legacy storage stay synchronized without breaking backwards compatibility.
 */
export function toLegacyStudentPlan(normalized: NormalizedPlan): StudentPlan {
  const days: PlanDay[] = normalized.days.map((day) => {
    const ch1 = resolveChapterById(day.primaryChapterId) || {
      id: day.primaryChapterId,
      subject: day.objectives[0]?.subjectName || 'Physics',
      title: day.objectives[0]?.title || day.primaryChapterId,
      note: '',
      order: 1,
      tag: 'Core',
    };
    const ch2 = day.secondaryChapterId
      ? resolveChapterById(day.secondaryChapterId)
      : undefined;

    const tasks: PlanTask[] = day.objectives.map((obj) => {
      const legacyKind =
        obj.kind === 'learn'
          ? 'learning'
          : obj.kind === 'revise' || obj.kind === 'verify'
          ? 'revision'
          : 'practice';
      return {
        id: obj.legacyTaskKey || `${normalized.id}::day-${day.dayNumber}-task-${obj.sequenceOrder}`,
        kind: legacyKind,
        chapterId: obj.chapterId,
        chapterTitle: resolveChapterById(obj.chapterId)?.title || obj.chapterId,
        subject: obj.subjectName,
        minutes: obj.estimatedMinutes,
        isPrerequisite: day.isPrerequisiteDay,
        label: obj.title,
        detail: obj.description,
        rescheduledFromDay: obj.rescheduledFromDayNumber ?? undefined,
      };
    });

    const slots: PlanDaySlot[] = day.objectives.slice(0, 3).map((obj, idx) => ({
      slotNumber: ((idx % 3) + 1) as 1 | 2 | 3,
      title: obj.title,
      subject: obj.subjectName,
      chapterId: obj.chapterId,
      chapterTitle: resolveChapterById(obj.chapterId)?.title || obj.chapterId,
      durationMinutes: obj.estimatedMinutes,
      kind:
        obj.kind === 'learn'
          ? 'learning'
          : obj.kind === 'revise' || obj.kind === 'verify'
          ? 'revision'
          : 'practice',
      objective: obj.description,
    }));

    const rhythmType: DayRhythmType = day.isRecoveryDay
      ? 'consolidation'
      : normalized.planHorizonDays === 1
      ? 'emergency_triage'
      : day.dayOfWeekLabel === 'Wednesday'
      ? 'wednesday_pivot'
      : day.dayOfWeekLabel === 'Saturday' || day.dayOfWeekLabel === 'Sunday'
      ? 'weekend_booster'
      : 'dual_core';

    return {
      day: day.dayNumber,
      scheduledDate: day.scheduledDate,
      dayOfWeekLabel: day.dayOfWeekLabel,
      rhythmType,
      rhythmBadge: day.rhythmBadge,
      theme: day.focusTheme,
      chapterId: ch1.id,
      chapterTitle: ch1.title,
      subject: ch1.subject,
      secondaryChapterId: ch2?.id,
      secondaryChapterTitle: ch2?.title,
      secondarySubject: ch2?.subject,
      slots,
      isPrerequisite: day.isPrerequisiteDay,
      isRecap: day.isRecap,
      tasks,
    };
  });

  const validDuration = ([1, 3, 7, 14, 21, 30, 60].includes(normalized.planHorizonDays)
    ? normalized.planHorizonDays
    : 7) as PlanDuration;

  return {
    id: normalized.id,
    name: normalized.name,
    isActive: normalized.isActive,
    board: normalized.board,
    subjects: normalized.subjects,
    chapterIds: normalized.selectedChapterIds,
    minutesPerDay: normalized.minutesPerDay,
    goal: normalized.goal,
    priority: normalized.priority,
    confidence: normalized.confidence,
    examDate: normalized.examDate,
    planDuration: validDuration,
    plannedChapterIds: normalized.orderedChapterIds,
    prerequisiteIds: normalized.prerequisiteChapterIds,
    orderReason: normalized.orderReason,
    coverageNote: normalized.coverageNote,
    days,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  };
}

/**
 * Hydrates a NormalizedPlan from a legacy StudentPlan + existing completed task keys.
 */
export function fromLegacyStudentPlan(
  plan: StudentPlan,
  completedTaskKeys: string[] = []
): NormalizedPlan {
  const completedSet = new Set(completedTaskKeys);
  const startDate =
    plan.days?.[0]?.scheduledDate || isoTimestampToLocalDate(plan.createdAt);
  const planId = plan.id || generatePlanId();
  const maxCap = Math.max(30, Number(plan.minutesPerDay) || 180);

  const days: NormalizedPlanDay[] = (plan.days || []).map((day, idx) => {
    const dayNumber = Number(day.day) || idx + 1;
    const scheduledDate = day.scheduledDate || addDaysToIsoDate(startDate, dayNumber - 1);
    const planDayId = stableObjUuid(`${planId}::day-${dayNumber}`);

    const objectives: PlanObjective[] = (day.tasks || []).map((t, tIdx) => {
      const legacyTaskKey =
        t.id && t.id.includes('::')
          ? t.id
          : `${planId}::${t.id || `day-${dayNumber}-task-${tIdx + 1}`}`;
      const isLegacyDone =
        completedSet.has(legacyTaskKey) ||
        completedSet.has(t.id) ||
        completedSet.has(t.chapterId);

      // Critical invariant: legacy completed checkboxes represent STUDIED, never VERIFIED.
      const state: ObjectiveState = isLegacyDone ? 'STUDIED' : 'PENDING';
      const kind: ObjectiveKind =
        t.kind === 'learning'
          ? 'learn'
          : t.kind === 'revision'
          ? 'revise'
          : 'practice';

      return {
        id: stableObjUuid(legacyTaskKey),
        planId,
        planDayId,
        dayNumber,
        chapterId: t.chapterId || day.chapterId,
        conceptId: null,
        subjectName: t.subject || day.subject || 'Physics',
        title: t.label || `${day.chapterTitle} Task`,
        description: t.detail || '',
        kind,
        state,
        priorityScore: 50,
        estimatedMinutes: Math.max(0, Number(t.minutes) || 30),
        actualMinutes: 0,
        sequenceOrder: tIdx + 1,
        scheduledDate,
        missedCount: typeof t.rescheduledFromDay === 'number' ? 1 : 0,
        rescheduledFromDayId: null,
        rescheduledFromDayNumber:
          typeof t.rescheduledFromDay === 'number' ? t.rescheduledFromDay : null,
        legacyTaskKey,
        studiedAt: isLegacyDone ? plan.updatedAt || plan.createdAt : null,
        verifiedAt: null,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt || plan.createdAt,
      };
    });

    return {
      id: planDayId,
      planId,
      dayNumber,
      scheduledDate,
      title: `Day ${dayNumber} · ${day.chapterTitle || day.chapterId}`,
      focusTheme: day.theme || `Day ${dayNumber}`,
      dayOfWeekLabel: day.dayOfWeekLabel || getDayOfWeekLabel(scheduledDate),
      rhythmBadge: day.rhythmBadge || '',
      allocatedMinutes: objectives.reduce((s, o) => s + o.estimatedMinutes, 0),
      maxCapacityMinutes: maxCap,
      isRecoveryDay: day.rhythmType === 'consolidation',
      isPrerequisiteDay: Boolean(day.isPrerequisite),
      isRecap: Boolean(day.isRecap),
      primaryChapterId: day.chapterId,
      secondaryChapterId: day.secondaryChapterId,
      objectives,
    };
  });

  return {
    id: planId,
    name: plan.name || buildDefaultPlanName(plan),
    planHorizonDays: Number(plan.planDuration) || days.length || 7,
    isActive: Boolean(plan.isActive),
    status: 'active',
    board: plan.board || 'CBSE Class 12',
    goal: plan.goal || 'Complete Backlog Recovery',
    priority: plan.priority || 'backlog recovery',
    confidence: plan.confidence || 'mixed',
    examDate: plan.examDate || '',
    startDate,
    minutesPerDay: maxCap,
    subjects: plan.subjects || ['Physics', 'Chemistry', 'Mathematics'],
    selectedChapterIds: plan.chapterIds || [],
    orderedChapterIds: plan.plannedChapterIds || plan.chapterIds || [],
    prerequisiteChapterIds: plan.prerequisiteIds || [],
    prerequisiteWarnings: [],
    orderReason: plan.orderReason || '',
    coverageNote: plan.coverageNote || '',
    rescheduleCount: 0,
    lastRescheduledAt: null,
    days,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt || plan.createdAt,
  };
}
