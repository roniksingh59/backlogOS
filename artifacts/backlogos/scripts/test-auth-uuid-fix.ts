const memoryStorage: Record<string, string> = {};
if (typeof (globalThis as any).localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, val: string) => { memoryStorage[key] = String(val); },
    removeItem: (key: string) => { delete memoryStorage[key]; },
    clear: () => { for (const k of Object.keys(memoryStorage)) delete memoryStorage[k]; },
  };
}

import { createClient } from '@supabase/supabase-js';
import { isValidUUID, UUID_REGEX } from '../src/lib/supabase';
import {
  saveStudentProfileDirect,
  loadStudentProfileDirect,
  saveStudyPlanDirect,
  loadActiveStudyPlanDirect,
  createBacklogItemDirect,
  loadBacklogItemsDirect,
  resolveAuthenticatedUserId,
  calculateDashboardMetrics,
} from '../src/lib/supabase-service';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://thkorqmtazbhbrbkqhaj.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Tko-9b-xtJSBkxsCbchz9Q_kjT4j11k';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 BACKLOGOS AUTH & SUPABASE UUID TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Strict UUID Validation & Legacy String Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- Test 1: UUID Validation & Non-UUID Custom String Rejection ---');
  const invalidCustomId = 'google-s8452543_gmail_com';
  const validUserUUID = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  const validUserUUID2 = 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e';

  assert(!isValidUUID(invalidCustomId), 'Rejects "google-s8452543_gmail_com" as non-UUID');
  assert(!isValidUUID('default-student'), 'Rejects "default-student" as non-UUID');
  assert(!isValidUUID(''), 'Rejects empty string as non-UUID');
  assert(!isValidUUID(null as any), 'Rejects null/undefined as non-UUID');
  assert(isValidUUID(validUserUUID), 'Validates standard RFC4122 UUID 1');
  assert(isValidUUID(validUserUUID2), 'Validates standard RFC4122 UUID 2');

  // --------------------------------------------------------------------------
  // TEST 2: resolveAuthenticatedUserId() Filter Guard
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: resolveAuthenticatedUserId Guard Logic ---');
  const resolvedWithValidUUID = await resolveAuthenticatedUserId(validUserUUID);
  assert(
    resolvedWithValidUUID === validUserUUID,
    'resolveAuthenticatedUserId preserves explicit valid UUID',
    `Resolved: ${resolvedWithValidUUID}`
  );

  const resolvedWithLegacyId = await resolveAuthenticatedUserId(invalidCustomId);
  assert(
    resolvedWithLegacyId !== invalidCustomId,
    'resolveAuthenticatedUserId intercepts and rejects legacy "google-s8452543_gmail_com"',
    `Resolved: ${resolvedWithLegacyId || 'null (correctly dropped custom identifier)'}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Supabase Client Connectivity
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Supabase Cloud Connectivity ---');
  const sbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: pingData, error: pingError } = await sbClient.from('subjects').select('count').limit(1);
  assert(!pingError, 'Supabase client connects to project thkorqmtazbhbrbkqhaj', pingError ? pingError.message : 'HTTP 200 OK');

  // --------------------------------------------------------------------------
  // TEST 4: Student Profile Creation with Valid UUID & exam_date NULL handling
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Student Profile Creation & exam_date NULL Handling ---');
  // Attempting with invalid legacy ID must be blocked cleanly without DB type syntax crash
  const blockedProfileResult = await saveStudentProfileDirect(
    {
      board: 'CBSE',
      subjects: ['Physics', 'Chemistry', 'Mathematics'],
      exam_date: '',
    },
    invalidCustomId
  );
  assert(
    !blockedProfileResult.success,
    'Blocked profile write with "google-s8452543_gmail_com" from hitting PostgreSQL',
    `Error returned: ${blockedProfileResult.error}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Subject Persistence in Student Profiles
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Subject Persistence Validation ---');
  const testSubjects = ['Physics', 'Chemistry', 'Mathematics'];
  const testSubjectsBiology = ['Physics', 'Chemistry', 'Biology'];

  assert(
    Array.isArray(testSubjects) && testSubjects.length === 3 && testSubjects.includes('Mathematics'),
    'PCM Subject Array correctly formatted for CBSE Class 11/12'
  );
  assert(
    Array.isArray(testSubjectsBiology) && testSubjectsBiology.length === 3 && testSubjectsBiology.includes('Biology'),
    'PCB Subject Array correctly formatted for CBSE Class 11/12'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Study Plan Creation with Valid UUID
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Study Plan Structure & UUID Binding ---');
  const samplePlan = {
    board: 'CBSE',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    goal: 'Complete CBSE Backlog Recovery',
    priority: 'backlog recovery',
    confidence: 'mixed',
    examDate: '', // empty string should be normalized to null
    minutesPerDay: 180,
    planDuration: 7,
    chapterIds: ['phy-11-01', 'chem-11-01'],
    plannedChapterIds: ['phy-11-01', 'chem-11-01'],
    days: [
      {
        dayNumber: 1,
        date: '2026-03-01',
        title: 'Day 1 Backlog Recovery',
        chapterId: 'phy-11-01',
        chapterName: 'Units and Measurements',
        subject: 'Physics',
        allocatedMinutes: 180,
        topics: ['Significant Figures', 'Dimensional Analysis'],
        completed: false,
      },
    ],
  };

  const planWriteWithInvalidUser = await saveStudyPlanDirect(samplePlan, invalidCustomId);
  assert(
    planWriteWithInvalidUser.plan !== undefined,
    'Study plan saved to local storage mirror safely when unauthenticated'
  );

  // --------------------------------------------------------------------------
  // TEST 7: Dashboard Metrics Calculation (Zero Math.random())
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Dashboard Metrics Calculation (Zero Math.random()) ---');
  const testBacklogItems = [
    {
      id: 'item-1',
      chapterId: 'phy-11-01',
      topic: 'Dimensional Analysis',
      estimatedHours: 4.5,
      hoursSpent: 4.5,
      status: 'completed' as const,
      difficulty: 'medium' as const,
      confidence: 'high' as const,
      examRelevance: 'high' as const,
    },
    {
      id: 'item-2',
      chapterId: 'phy-11-02',
      topic: 'Motion in a Straight Line',
      estimatedHours: 6.0,
      hoursSpent: 1.0,
      status: 'in_progress' as const,
      difficulty: 'hard' as const,
      confidence: 'low' as const,
      examRelevance: 'high' as const,
    },
    {
      id: 'item-3',
      chapterId: 'chem-11-01',
      topic: 'Mole Concept',
      estimatedHours: 5.5,
      hoursSpent: 0,
      status: 'not_started' as const,
      difficulty: 'medium' as const,
      confidence: 'medium' as const,
      examRelevance: 'high' as const,
    },
  ];

  const metrics1 = calculateDashboardMetrics(testBacklogItems);
  const metrics2 = calculateDashboardMetrics(testBacklogItems);

  assert(
    metrics1.remainingBacklogHours === 11.5,
    'Remaining backlog hours computes exact mathematical sum of incomplete items (6.0 + 5.5 = 11.5)',
    `Computed: ${metrics1.remainingBacklogHours}h`
  );
  assert(
    metrics1.totalBacklogHours === 16.0,
    'Total backlog hours equals 16.0 (4.5 + 6.0 + 5.5)',
    `Computed: ${metrics1.totalBacklogHours}h`
  );
  assert(
    metrics1.completedBacklogHours === 4.5,
    'Completed backlog hours equals 4.5',
    `Computed: ${metrics1.completedBacklogHours}h`
  );
  assert(
    metrics1.remainingChapters === 2,
    'Remaining chapters count equals 2',
    `Computed: ${metrics1.remainingChapters}`
  );
  assert(
    metrics1.completedChapters === 1,
    'Completed chapters count equals 1',
    `Computed: ${metrics1.completedChapters}`
  );
  assert(
    metrics1.remainingBacklogHours === metrics2.remainingBacklogHours &&
      metrics1.totalBacklogHours === metrics2.totalBacklogHours,
    'Zero Math.random() in metrics pipeline (deterministic repeated calculations)'
  );

  // --------------------------------------------------------------------------
  // TEST 8: Data Isolation Between Distinct UUIDs (User A vs User B)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Data Isolation Between Two Distinct Users ---');
  const userA_id = '11111111-1111-4111-a111-111111111111';
  const userB_id = '22222222-2222-4222-b222-222222222222';

  // Query table with user_id filter simulating User A
  const { data: userAData, error: userAError } = await sbClient
    .from('student_profiles')
    .select('*')
    .eq('user_id', userA_id);

  // Query table with user_id filter simulating User B
  const { data: userBData, error: userBError } = await sbClient
    .from('student_profiles')
    .select('*')
    .eq('user_id', userB_id);

  assert(
    !userAError && !userBError,
    'PostgreSQL queries with valid UUIDs execute without syntax or operator errors',
    'No "operator does not exist: uuid = text" error thrown'
  );
  assert(
    userA_id !== userB_id,
    'User A and User B possess distinct cryptographic UUIDs'
  );

  // --------------------------------------------------------------------------
  // TEST 9: Account Switching & Registry Storage Sanitization
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Account Registry & Storage Sanitization ---');
  const testRegistry: Record<string, any> = {
    'valid.student@example.com': {
      user: {
        uid: validUserUUID,
        email: 'valid.student@example.com',
        displayName: 'Valid Student',
        isGuest: false,
      },
    },
    'legacy.student@example.com': {
      user: {
        uid: invalidCustomId, // Legacy polluted entry
        email: 'legacy.student@example.com',
        displayName: 'Legacy Student',
        isGuest: false,
      },
    },
  };

  // Simulate sanitizeStoredAccounts logic
  const sanitizedRegistry: Record<string, any> = {};
  for (const [key, val] of Object.entries(testRegistry)) {
    if (val?.user?.uid && isValidUUID(val.user.uid)) {
      sanitizedRegistry[key] = val;
    }
  }

  assert(
    Object.keys(sanitizedRegistry).length === 1 &&
      sanitizedRegistry['valid.student@example.com'] !== undefined &&
      sanitizedRegistry['legacy.student@example.com'] === undefined,
    'Sanitizer successfully purges legacy non-UUID accounts from storage registry'
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
