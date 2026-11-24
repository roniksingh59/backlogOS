import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

function loadEnginesModule() {
  const viteEntry = require.resolve('vite', {
    paths: [ROOT_DIR, path.join(ROOT_DIR, 'artifacts/backlogos')],
  });
  const esbuild = require(
    require.resolve('esbuild', {
      paths: [
        path.dirname(viteEntry),
        path.join(ROOT_DIR, 'node_modules'),
        path.join(ROOT_DIR, 'artifacts/backlogos/node_modules'),
      ],
    })
  );

  const built = esbuild.buildSync({
    entryPoints: [path.join(ROOT_DIR, 'artifacts/backlogos/src/lib/engines/index.ts')],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    alias: {
      '@': path.join(ROOT_DIR, 'artifacts/backlogos/src'),
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': '""',
      'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
      'import.meta.env': '{}',
    },
  });

  const mod = { exports: {} };
  new Function('module', 'exports', built.outputFiles[0].text)(mod, mod.exports);
  return mod.exports;
}

const E = loadEnginesModule();

test('Planning Engine supports 3, 7, 21, 30-day plans, prerequisite-first ordering, and daily capacity limits', () => {
  // Pass dependent chapters BEFORE their prerequisites intentionally to test topological ordering
  const selected = ['phy-rotation', 'phy-work', 'phy-laws', 'phy-units'];

  for (const horizon of [3, 7, 21, 30]) {
    const plan = E.generateNormalizedPlan({
      board: 'CBSE Class 11',
      subjects: ['Physics'],
      chapterIds: selected,
      minutesPerDay: 180,
      goal: 'Clear mechanics backlog',
      priority: 'backlog recovery',
      confidence: 'mixed',
      examDate: '',
      planDuration: horizon,
      startDate: '2026-11-01',
    });

    assert.equal(plan.days.length, horizon);
    assert.deepEqual(plan.selectedChapterIds, selected);

    // Every day must strictly stay within daily time budget
    for (const day of plan.days) {
      assert.ok(
        day.allocatedMinutes <= day.maxCapacityMinutes,
        `Day ${day.dayNumber} allocated ${day.allocatedMinutes}m exceeded max ${day.maxCapacityMinutes}m`
      );
      assert.ok(day.objectives.length > 0);
      assert.ok(day.objectives.every((o) => o.state === 'PENDING'));
    }

    // Topological check: phy-units and phy-laws precede phy-work, which precedes phy-rotation
    const order = plan.orderedChapterIds;
    assert.ok(order.indexOf('phy-units') < order.indexOf('phy-rotation'));
    assert.ok(order.indexOf('phy-laws') < order.indexOf('phy-work'));
    assert.ok(order.indexOf('phy-work') < order.indexOf('phy-rotation'));
  }
});

test('Planning Engine missed-task recovery reschedules without silently overloading tomorrow', () => {
  const plan = E.generateNormalizedPlan({
    board: 'CBSE Class 11',
    subjects: ['Physics', 'Chemistry'],
    chapterIds: ['phy-units', 'phy-laws', 'chem-basic', 'chem-bonding'],
    minutesPerDay: 120,
    goal: 'Recover backlog',
    priority: 'backlog recovery',
    confidence: 'mixed',
    examDate: '',
    planDuration: 3,
    startDate: '2026-11-01',
  });

  // Simulate Day 1 & Day 2 both completely missed (240 minutes of incomplete tasks!) and today is Day 3
  const recovery = E.rescheduleMissedObjectives(plan, {
    todayDateStr: '2026-11-03',
    softOverloadMarginRatio: 0.15, // max +18m allowed over 120m -> 138m hard cap
    allowOverflowDays: true,
  });

  assert.ok(recovery.movedObjectives.length > 0, 'Expected overdue incomplete objectives to be moved');
  assert.ok(
    recovery.createdOverflowDaysCount >= 1,
    'Expected overflow recovery days rather than cramming 360m into Day 3'
  );
  assert.equal(recovery.plan.rescheduleCount, 1);

  for (const day of recovery.plan.days) {
    assert.ok(
      day.allocatedMinutes <= recovery.preservedCapacityLimitMinutes,
      `Rescheduled day ${day.dayNumber} (${day.allocatedMinutes}m) breached soft capacity cap (${recovery.preservedCapacityLimitMinutes}m)`
    );
  }
});

test('Planning Engine merges 1 missed task into next day and spreads whole missed day across multiple days', () => {
  const basePlan = E.generateNormalizedPlan({
    board: 'CBSE Class 11',
    subjects: ['Physics', 'Chemistry'],
    chapterIds: ['phy-units', 'phy-laws', 'chem-basic', 'chem-bonding', 'phy-work'],
    minutesPerDay: 180,
    goal: 'Balanced recovery',
    priority: 'backlog recovery',
    confidence: 'mixed',
    examDate: '',
    planDuration: 7,
    startDate: '2026-11-01',
  });

  // Case A: Partial miss (Day 1 tasks 1-3 studied, only 1 task missed) -> merges directly into Day 2
  const partialPlan = {
    ...basePlan,
    days: basePlan.days.map((d, idx) =>
      idx === 0
        ? {
            ...d,
            objectives: d.objectives.map((o, oi) =>
              oi < d.objectives.length - 1 ? { ...o, state: 'STUDIED' } : o
            ),
          }
        : d
    ),
  };

  const singleTaskRecovery = E.rescheduleMissedObjectives(partialPlan, {
    todayDateStr: '2026-11-02',
    softOverloadMarginRatio: 0.35,
    maxExtraMinutesPerDay: 85,
    allowOverflowDays: true,
  });

  assert.equal(singleTaskRecovery.movedObjectives.length, 1);
  assert.equal(
    singleTaskRecovery.movedObjectives[0].toDayNumber,
    2,
    'Expected single failed task from Day 1 to merge into Day 2'
  );

  // Case B: Whole Day 1 missed (all 4 tasks incomplete) -> distributes across multiple upcoming days (2, 3, 4, 5)
  const wholeDayRecovery = E.rescheduleMissedObjectives(basePlan, {
    todayDateStr: '2026-11-02',
    softOverloadMarginRatio: 0.35,
    maxExtraMinutesPerDay: 85,
    allowOverflowDays: true,
  });

  assert.equal(wholeDayRecovery.movedObjectives.length, basePlan.days[0].objectives.length);
  const destinationDays = new Set(wholeDayRecovery.movedObjectives.map((m) => m.toDayNumber));
  assert.ok(
    destinationDays.size >= 3,
    `Expected whole missed day to spread across multiple days, got days: ${[...destinationDays].join(', ')}`
  );
  for (const day of wholeDayRecovery.plan.days) {
    assert.ok(day.allocatedMinutes <= wholeDayRecovery.preservedCapacityLimitMinutes);
  }
});

test('Execution Engine enforces 6 objective states and never grants VERIFIED or MASTERED from study alone', () => {
  const plan = E.generateNormalizedPlan({
    board: 'CBSE Class 11',
    subjects: ['Physics'],
    chapterIds: ['phy-work'],
    minutesPerDay: 120,
    goal: 'Master Work Energy Power',
    priority: 'backlog recovery',
    confidence: 'mixed',
    examDate: '',
    planDuration: 3,
    startDate: '2026-11-01',
  });

  const day1Objs = plan.days[0].objectives.filter((o) => o.chapterId === 'phy-work');
  const firstObj = day1Objs[0];

  // 1. Valid progression: PENDING -> IN_PROGRESS -> STUDIED -> VERIFICATION_PENDING
  const step1 = E.transitionObjectiveState(firstObj, 'IN_PROGRESS', { additionalMinutesSpent: 20 });
  assert.equal(step1.objective.state, 'IN_PROGRESS');
  assert.equal(step1.objective.actualMinutes, 20);

  const step2 = E.transitionObjectiveState(step1.objective, 'STUDIED', { additionalMinutesSpent: 25 });
  assert.equal(step2.objective.state, 'STUDIED');
  assert.equal(step2.needsVerificationPrompt, true);

  // 2. Attempting direct STUDIED -> VERIFIED without assessment evidence MUST be rejected
  assert.throws(() => {
    E.transitionObjectiveState(step2.objective, 'VERIFIED', {});
  }, /cannot automatically grant VERIFIED/);

  // 3. Even if all chapter objectives are marked STUDIED, chapter status becomes STUDY_COMPLETE, NEVER MASTERED
  const allStudied = day1Objs.map((o) => ({
    ...o,
    state: 'STUDIED',
    studiedAt: new Date().toISOString(),
  }));
  const chapterDerived = E.deriveChapterMasteryAfterStudyChange(null, 'phy-work', allStudied);
  assert.equal(chapterDerived.record.studyCompleted, true);
  assert.equal(chapterDerived.record.status, 'STUDY_COMPLETE');
  assert.notEqual(chapterDerived.record.status, 'MASTERED');

  // 4. Passing assessment transitions VERIFICATION_PENDING -> VERIFIED cleanly
  const step3 = E.transitionObjectiveState(step2.objective, 'VERIFICATION_PENDING');
  const step4 = E.transitionObjectiveState(step3.objective, 'VERIFIED', {
    verifiedByAssessmentAttemptId: 'attempt-uuid-123',
  });
  assert.equal(step4.objective.state, 'VERIFIED');
  assert.equal(step4.historyEvent?.eventType, 'OBJECTIVE_VERIFIED');
});

test('Retention Engine uses [1, 3, 7, 14, 30] intervals, adapts dynamically, and preserves mastery history on lapse', () => {
  assert.deepEqual([...E.INITIAL_REVIEW_INTERVALS_DAYS], [1, 3, 7, 14, 30]);

  const baseDate = new Date('2026-11-01T10:00:00Z');
  const initial = E.buildInitialReviewSchedule('phy-work', 'Work, Energy & Power', 'Physics', baseDate);
  assert.equal(initial.intervalStep, 1);
  assert.equal(initial.intervalDays, 1);
  assert.equal(initial.dueDate, '2026-11-02');

  const masteredChapter = {
    chapterId: 'phy-work',
    status: 'MASTERED',
    studyCompleted: true,
    masteryScore: 92,
    bestMasteryScore: 92,
    conceptCoveragePercent: 100,
    attemptsCount: 1,
    studyCompletedAt: '2026-10-31T10:00:00Z',
    firstMasteredAt: '2026-11-01T09:00:00Z',
    lastMasteredAt: '2026-11-01T09:00:00Z',
    updatedAt: '2026-11-01T09:00:00Z',
  };

  // High pass advances interval step cleanly (step 1 -> step 2 -> 3+ days)
  const passOutcome = E.processReviewOutcome(initial, masteredChapter, {
    recallQuality: 5,
    scorePercent: 95,
    reviewedAt: new Date('2026-11-02T10:00:00Z'),
  });
  assert.equal(passOutcome.reviewAttempt.passed, true);
  assert.equal(passOutcome.nextSchedule.intervalStep, 2);
  assert.ok(passOutcome.nextSchedule.intervalDays >= 3);
  assert.equal(passOutcome.historyEvent.eventType, 'REVISION_PASSED');

  // Poor recall drops interval back to 1 day, marks chapter NEEDS_REVISION, and PRESERVES firstMasteredAt & bestMasteryScore
  const lapseOutcome = E.processReviewOutcome(passOutcome.nextSchedule, passOutcome.updatedChapterMastery, {
    recallQuality: 2,
    scorePercent: 45,
    reviewedAt: new Date('2026-11-05T10:00:00Z'),
  });
  assert.equal(lapseOutcome.reviewAttempt.passed, false);
  assert.equal(lapseOutcome.nextSchedule.intervalDays, 1);
  assert.equal(lapseOutcome.updatedChapterMastery.status, 'NEEDS_REVISION');
  assert.equal(lapseOutcome.updatedChapterMastery.firstMasteredAt, '2026-11-01T09:00:00Z');
  assert.ok(lapseOutcome.updatedChapterMastery.bestMasteryScore >= 92);
  assert.equal(lapseOutcome.updatedChapterMastery.studyCompleted, true);
  assert.equal(lapseOutcome.historyEvent.eventType, 'REVISION_DECAYED');
});

test('Analytics Engine strictly separates backlog clearance, verified mastery, retention health, and weak concepts', () => {
  const analytics = E.computeSeparatedAnalytics({
    todayDateStr: '2026-11-10',
    backlogItems: [
      { id: 'b1', chapterId: 'phy-units', subject: 'Physics', topic: 'Units', estimatedHours: 4, hoursSpent: 4, difficulty: 'easy', status: 'completed', confidence: 'high', examRelevance: 'high', prerequisites: [], createdAt: '2026-11-01' },
      { id: 'b2', chapterId: 'phy-work', subject: 'Physics', topic: 'Work', estimatedHours: 6, hoursSpent: 6, difficulty: 'medium', status: 'completed', confidence: 'medium', examRelevance: 'critical', prerequisites: [], createdAt: '2026-11-01' },
      { id: 'b3', chapterId: 'chem-basic', subject: 'Chemistry', topic: 'Mole Concept', estimatedHours: 5, hoursSpent: 2, difficulty: 'medium', status: 'learning', confidence: 'low', examRelevance: 'critical', prerequisites: [], createdAt: '2026-11-01' },
      { id: 'b4', chapterId: 'math-sets', subject: 'Mathematics', topic: 'Sets', estimatedHours: 4, hoursSpent: 0, difficulty: 'easy', status: 'not_started', confidence: 'medium', examRelevance: 'high', prerequisites: [], createdAt: '2026-11-01' },
    ],
    objectives: [
      { id: 'o1', planId: 'p1', planDayId: 'd1', dayNumber: 1, chapterId: 'phy-units', subjectName: 'Physics', title: 'Obj 1', description: '', kind: 'learn', state: 'VERIFIED', priorityScore: 80, estimatedMinutes: 45, actualMinutes: 45, sequenceOrder: 1, scheduledDate: '2026-11-08', missedCount: 0, legacyTaskKey: 'k1', studiedAt: '2026-11-08T10:00:00Z', verifiedAt: '2026-11-08T11:00:00Z', createdAt: '2026-11-08T09:00:00Z', updatedAt: '2026-11-08T11:00:00Z' },
      { id: 'o2', planId: 'p1', planDayId: 'd1', dayNumber: 1, chapterId: 'phy-work', subjectName: 'Physics', title: 'Obj 2', description: '', kind: 'learn', state: 'STUDIED', priorityScore: 90, estimatedMinutes: 45, actualMinutes: 45, sequenceOrder: 2, scheduledDate: '2026-11-09', missedCount: 0, legacyTaskKey: 'k2', studiedAt: '2026-11-09T10:00:00Z', createdAt: '2026-11-09T09:00:00Z', updatedAt: '2026-11-09T10:00:00Z' },
      { id: 'o3', planId: 'p1', planDayId: 'd2', dayNumber: 2, chapterId: 'chem-basic', subjectName: 'Chemistry', title: 'Obj 3', description: '', kind: 'practice', state: 'IN_PROGRESS', priorityScore: 70, estimatedMinutes: 45, actualMinutes: 20, sequenceOrder: 1, scheduledDate: '2026-11-10', missedCount: 0, legacyTaskKey: 'k3', createdAt: '2026-11-10T09:00:00Z', updatedAt: '2026-11-10T09:00:00Z' },
    ],
    chapterMastery: [
      { chapterId: 'phy-units', status: 'MASTERED', studyCompleted: true, masteryScore: 90, bestMasteryScore: 90, conceptCoveragePercent: 100, attemptsCount: 1, updatedAt: '2026-11-08' },
      { chapterId: 'phy-work', status: 'STUDY_COMPLETE', studyCompleted: true, masteryScore: 40, bestMasteryScore: 40, conceptCoveragePercent: 50, attemptsCount: 1, updatedAt: '2026-11-09' },
    ],
    conceptMastery: [
      { chapterId: 'phy-units', conceptId: 'c1', conceptTitle: 'Dimensional Analysis', masteryScore: 90, attemptsCount: 2, correctCount: 2, status: 'MASTERED', updatedAt: '2026-11-08' },
      { chapterId: 'phy-work', conceptId: 'c2', conceptTitle: 'Work-Energy Theorem', masteryScore: 35, attemptsCount: 3, correctCount: 1, status: 'WEAK', updatedAt: '2026-11-09' },
    ],
    reviewSchedules: [
      { id: 'r1', chapterId: 'phy-units', intervalStep: 1, intervalDays: 1, easeFactor: 2.5, dueDate: '2026-11-09', status: 'DUE', retentionHealthScore: 95, createdAt: '2026-11-08', updatedAt: '2026-11-08' },
      { id: 'r2', chapterId: 'math-sets', intervalStep: 2, intervalDays: 3, easeFactor: 2.5, dueDate: '2026-11-12', status: 'SCHEDULED', retentionHealthScore: 100, createdAt: '2026-11-09', updatedAt: '2026-11-09' },
    ],
    studySessions: [
      { id: 's1', chapterId: 'phy-units', minutes: 45, completedAt: '2026-11-09T15:00:00Z', mode: 'focus' },
      { id: 's2', chapterId: 'chem-basic', minutes: 30, completedAt: '2026-11-10T08:00:00Z', mode: 'focus' },
    ],
  });

  // 2 of 4 chapters study completed -> 50% clearance
  assert.equal(analytics.backlogClearancePercent, 50);
  // Only 1 of 4 chapters truly MASTERED
  assert.equal(analytics.masteredChaptersCount, 1);
  assert.equal(analytics.studyCompletedChaptersCount, 2);
  // 2 objectives completed (VERIFIED + STUDIED), ONLY 1 objective verified
  assert.equal(analytics.completedObjectivesCount, 2);
  assert.equal(analytics.verifiedObjectivesCount, 1);
  // Concept mastery: average of 90 & 35 = 63% (strictly separate from 50% backlog clearance!)
  assert.equal(analytics.conceptMasteryPercent, 63);
  // Pending / overdue review detection
  assert.equal(analytics.pendingRevisionsCount, 1);
  assert.equal(analytics.overdueRevisionsCount, 1);
  // Weak concepts sorted cleanly
  assert.equal(analytics.weakConcepts.length, 1);
  assert.equal(analytics.weakConcepts[0].conceptId, 'c2');
  // Real focus minutes & streak without simulation
  assert.equal(analytics.totalFocusMinutesLogged, 75);
  assert.equal(analytics.activeStudyStreakDays, 2);
});

test('Planning Engine keeps Day 1 anchored to local date and restores accidentally carried-forward plans cleanly', () => {
  // Verify isoTimestampToLocalDate matches local calendar date rather than blind UTC slice
  const sampleTs = '2026-11-24T22:30:00Z';
  const d = new Date(sampleTs);
  const expectedLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
  assert.equal(E.isoTimestampToLocalDate(sampleTs), expectedLocal);

  // Verify restoreCarriedForwardPlanToDayOne moves carried-forward tasks back to Day 1 and strips empty overflow buckets
  const basePlan = E.generateNormalizedPlan({
    board: 'CBSE Class 11',
    subjects: ['Physics', 'Chemistry'],
    chapterIds: ['phy-units', 'phy-laws', 'chem-basic'],
    minutesPerDay: 180,
    goal: 'Recover backlog',
    priority: 'backlog recovery',
    confidence: 'mixed',
    examDate: '',
    planDuration: 3,
    startDate: '2026-11-20',
  });

  // Mark one objective on Day 2 as STUDIED so we can verify progress preservation across restoration
  const modifiedBase = {
    ...basePlan,
    days: basePlan.days.map((day) =>
      day.dayNumber === 2
        ? {
            ...day,
            objectives: day.objectives.map((obj, idx) =>
              idx === 0 ? { ...obj, state: 'STUDIED', studiedAt: '2026-11-21T08:00:00Z' } : obj
            ),
          }
        : day
    ),
  };

  const carried = E.rescheduleMissedObjectives(modifiedBase, {
    todayDateStr: '2026-11-22',
    softOverloadMarginRatio: 0.35,
    maxExtraMinutesPerDay: 85,
    allowOverflowDays: true,
  });

  assert.equal(carried.plan.days[0].objectives.length, 0, 'Day 1 should be empty after carry-forward');
  assert.ok(carried.plan.rescheduleCount > 0);

  // Also test legacy fallback path by stripping rescheduledFromDayNumber from one moved objective
  const legacyLikeCarried = {
    ...carried.plan,
    days: carried.plan.days.map((day) => ({
      ...day,
      objectives: day.objectives.map((obj, idx) =>
        idx === 0 ? { ...obj, rescheduledFromDayNumber: null, rescheduledFromDayId: null } : obj
      ),
    })),
  };

  const restored = E.restoreCarriedForwardPlanToDayOne(legacyLikeCarried, '2026-11-25');
  assert.equal(restored.startDate, '2026-11-25');
  assert.equal(restored.rescheduleCount, 0);
  assert.equal(restored.days[0].scheduledDate, '2026-11-25');
  assert.equal(
    restored.days[0].objectives.length,
    basePlan.days[0].objectives.length,
    'All original Day 1 objectives should return to Day 1'
  );
  assert.equal(
    restored.days.length,
    3,
    'Empty Recovery Extension overflow days should be cleaned up on restore'
  );

  const allRestoredObjs = restored.days.flatMap((day) => day.objectives);
  assert.ok(
    allRestoredObjs.some((o) => o.state === 'STUDIED'),
    'Previously studied progress must remain intact after restoring Day 1'
  );
  assert.ok(
    allRestoredObjs.every((o) => o.missedCount === 0 && !o.rescheduledFromDayNumber),
    'Missed counters and carry-forward flags should be cleared on restore'
  );
});

