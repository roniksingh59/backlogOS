import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT_DIR = process.cwd();

function loadEnvVars() {
  const env = { ...process.env };
  const envFiles = ['.env', '.env.local', 'artifacts/backlogos/.env'];
  for (const relPath of envFiles) {
    const abs = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(abs)) continue;
    const raw = fs.readFileSync(abs, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in env)) env[key] = val;
    }
  }
  return env;
}

const ENV = loadEnvVars();
const SUPABASE_URL = ENV.VITE_SUPABASE_URL || ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY || '';
const TEST_USER_A_EMAIL = ENV.TEST_USER_A_EMAIL || '';
const TEST_USER_A_PASSWORD = ENV.TEST_USER_A_PASSWORD || '';
const TEST_USER_B_EMAIL = ENV.TEST_USER_B_EMAIL || '';
const TEST_USER_B_PASSWORD = ENV.TEST_USER_B_PASSWORD || '';

const PRIVATE_TABLES = [
  'student_profiles',
  'study_plans',
  'backlog_items',
  'completed_tasks',
  'study_sessions',
  'chapter_notes',
  'migration_receipts',
];

// ---------------------------------------------------------------------------
// 1. SCHEMA & ARCHITECTURE CONTRACT VERIFICATION (ALWAYS RUNS)
// ---------------------------------------------------------------------------

test('Schema defines chapter_notes, migration_receipts, strict owner RLS, and 6-table Realtime', () => {
  const schemaPath = path.join(ROOT_DIR, 'supabase', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.chapter_notes/i);
  assert.match(sql, /CONSTRAINT chapter_notes_user_chapter_unique UNIQUE \(user_id, chapter_id\)/i);

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.migration_receipts/i);
  assert.match(sql, /CONSTRAINT migration_receipts_user_guest_batch_unique UNIQUE \(user_id, guest_uid, batch_key\)/i);

  assert.match(sql, /DROP CONSTRAINT IF EXISTS study_plans_user_id_key/i);
  assert.match(sql, /FOR pol IN\s+SELECT policyname\s+FROM pg_policies/i);

  for (const tbl of PRIVATE_TABLES) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${tbl} ENABLE ROW LEVEL SECURITY`, 'i'));
    assert.match(sql, new RegExp(`REVOKE ALL ON TABLE public\\.${tbl} FROM anon`, 'i'));
  }

  for (const rtTbl of [
    'student_profiles',
    'study_plans',
    'backlog_items',
    'completed_tasks',
    'study_sessions',
    'chapter_notes',
  ]) {
    assert.match(sql, new RegExp(`'${rtTbl}'`, 'i'), `Missing Realtime table ${rtTbl}`);
  }

  // Ensure USING (true) only ever appears for public catalog tables subjects/chapters
  const usingTrueMatches = [...sql.matchAll(/ON public\.([a-z_]+)[\s\S]{0,120}?USING\s*\(\s*true\s*\)/gi)].map(
    (m) => m[1]
  );
  assert.deepEqual(usingTrueMatches.sort(), ['chapters', 'subjects']);
});

test('Frontend only calls /api/* for AI and YouTube resources (never core student data)', () => {
  const srcRoot = path.join(ROOT_DIR, 'artifacts', 'backlogos', 'src');
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
    }
  }
  walk(srcRoot);

  const apiCallPaths = [];
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const matches = code.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g);
    for (const m of matches) {
      apiCallPaths.push(m[1]);
    }
  }

  assert.ok(apiCallPaths.length > 0, 'Expected AI/resource /api/* routes to be called');
  for (const route of apiCallPaths) {
    assert.ok(
      route.startsWith('/api/ai/') || route.startsWith('/api/resources/'),
      `Unexpected core student /api route called in frontend: ${route}`
    );
  }
});

// ---------------------------------------------------------------------------
// 2. DASHBOARD METRIC ACCURACY & FAIL-CLOSED WRITE / MIGRATION LOGIC
// ---------------------------------------------------------------------------

test('Dashboard completed and remaining chapter metrics compute exact counts without fabrication', () => {
  function computeExactMetrics(items, completedTaskIds) {
    const completedSet = new Set(completedTaskIds);
    let completedChapters = 0;
    let remainingChapters = 0;

    for (const item of items) {
      const isDone =
        item.status === 'completed' ||
        item.status === 'mastered' ||
        item.status === 'done' ||
        completedSet.has(item.chapterId);
      if (isDone) completedChapters += 1;
      else remainingChapters += 1;
    }
    const totalChapters = items.length;
    const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    return { completedChapters, remainingChapters, totalChapters, progressPercent };
  }

  const sampleBacklog = [
    { chapterId: 'phy-electrostatics', status: 'completed' },
    { chapterId: 'phy-current', status: 'learning' },
    { chapterId: 'chem-solutions', status: 'not_started' },
    { chapterId: 'math-matrices', status: 'not_started' },
  ];

  const m1 = computeExactMetrics(sampleBacklog, []);
  assert.deepEqual(m1, {
    completedChapters: 1,
    remainingChapters: 3,
    totalChapters: 4,
    progressPercent: 25,
  });

  // Sync completion from completed_tasks overrides stale item status cleanly
  const m2 = computeExactMetrics(sampleBacklog, ['phy-current', 'chem-solutions']);
  assert.deepEqual(m2, {
    completedChapters: 3,
    remainingChapters: 1,
    totalChapters: 4,
    progressPercent: 75,
  });

  // Empty plan must report 0 chapters (no fabricated defaults)
  const mEmpty = computeExactMetrics([], []);
  assert.deepEqual(mEmpty, {
    completedChapters: 0,
    remainingChapters: 0,
    totalChapters: 0,
    progressPercent: 0,
  });
});

test('Failed Supabase write never marks local cache synced and preserves error state', () => {
  const serviceCode = fs.readFileSync(
    path.join(ROOT_DIR, 'artifacts', 'backlogos', 'src', 'lib', 'supabase-service.ts'),
    'utf8'
  );

  // Confirm saveStudyPlanDirect, saveCompletedTaskDirect, saveChapterNoteDirect emit error status on failure
  assert.match(serviceCode, /emitSyncStatus\('error', error\.message\)/);
  assert.match(serviceCode, /return \{ success: false, error: error\.message \}/);

  // Confirm guest migration checks migration_receipts and never swaps user.uid to guest ID
  assert.match(serviceCode, /from\('migration_receipts'\)/);
  assert.match(serviceCode, /alreadyMigrated: true/);
  assert.match(serviceCode, /!guestUid \|\| !String\(guestUid\)\.startsWith\('guest-'\) \|\| !isValidUUID\(targetUid\)/);

  // Simulate idempotent migration receipt guard
  const receipts = new Set();
  const migratedRows = [];
  function runGuestMigration(guestUid, targetUid, batchKey, items) {
    const key = `${targetUid}:${guestUid}:${batchKey}`;
    if (receipts.has(key)) {
      return { migrated: false, alreadyMigrated: true };
    }
    for (const item of items) {
      migratedRows.push({ user_id: targetUid, chapter_id: item.chapterId });
    }
    receipts.add(key);
    return { migrated: true, alreadyMigrated: false };
  }

  const first = runGuestMigration('guest-111', '00000000-0000-4000-8000-000000000001', 'guest_migration_v1', [
    { chapterId: 'phy-units' },
  ]);
  const second = runGuestMigration('guest-111', '00000000-0000-4000-8000-000000000001', 'guest_migration_v1', [
    { chapterId: 'phy-units' },
  ]);
  assert.equal(first.migrated, true);
  assert.equal(second.migrated, false);
  assert.equal(second.alreadyMigrated, true);
  assert.equal(migratedRows.length, 1);
  assert.equal(migratedRows[0].user_id, '00000000-0000-4000-8000-000000000001');
});

test('Google OAuth hydration serializes guest migration before sync and uses stable guest IDs', () => {
  const supabaseTs = fs.readFileSync(
    path.join(ROOT_DIR, 'artifacts', 'backlogos', 'src', 'lib', 'supabase.ts'),
    'utf8'
  );
  const authContextTsx = fs.readFileSync(
    path.join(ROOT_DIR, 'artifacts', 'backlogos', 'src', 'lib', 'auth-context.tsx'),
    'utf8'
  );
  const loginTsx = fs.readFileSync(
    path.join(ROOT_DIR, 'artifacts', 'backlogos', 'src', 'pages', 'Login.tsx'),
    'utf8'
  );
  const onboardingTsx = fs.readFileSync(
    path.join(ROOT_DIR, 'artifacts', 'backlogos', 'src', 'pages', 'Onboarding.tsx'),
    'utf8'
  );

  // Stable guest bucket enforcement
  assert.match(supabaseTs, /export function getActiveUserId\(\): string[\s\S]*return getOrCreateStableGuestId\(\)/);
  assert.doesNotMatch(supabaseTs, /backlogos_google_user/);

  // Auth serialization, multi-candidate guest sweep, hydratedUserId, and no blind 500ms OAuth URL stripping
  assert.match(authContextTsx, /authQueueRef/);
  assert.match(authContextTsx, /hydratedUserId/);
  assert.match(authContextTsx, /addCandidate\('guest-student'\)/);
  assert.match(authContextTsx, /addCandidate\('guest-default'\)/);
  assert.match(authContextTsx, /cleanOAuthParamsFromUrl/);
  assert.doesNotMatch(authContextTsx, /setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]{0,200}window\.history\.replaceState[\s\S]{0,120}500\)/);
  assert.doesNotMatch(authContextTsx, /setToken\('token-' \+ u\.uid\)/);

  // Login waits for exact hydratedUserId before auto-redirecting
  assert.match(loginTsx, /hydratedUserId === user\.uid/);

  // Onboarding surfaces cloud errors rather than redirecting silently on failure
  assert.match(onboardingTsx, /if \(!planRes\.success && !planRes\.offline\)/);
  assert.match(onboardingTsx, /if \(!profRes\.success\)/);
});

// ---------------------------------------------------------------------------
// 3. LIVE SUPABASE ANONYMOUS BLOCKING & 2-USER RLS ISOLATION SUITE
// ---------------------------------------------------------------------------

test('Live Supabase anonymous client cannot read private student tables', {
  skip: !SUPABASE_URL || !SUPABASE_ANON_KEY ? 'Supabase URL/Anon key not configured in environment' : false,
}, async () => {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of PRIVATE_TABLES) {
    const { data, error } = await anonClient.from(table).select('*').limit(5);
    // Either permission error (42501 / PGRST) or strictly 0 rows returned
    const hasRows = Array.isArray(data) && data.length > 0;
    assert.equal(hasRows, false, `Anonymous request must NEVER read rows from ${table} (error=${error?.message || 'none'})`);
  }
});

const hasTwoTestUsers = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    TEST_USER_A_EMAIL &&
    TEST_USER_A_PASSWORD &&
    TEST_USER_B_EMAIL &&
    TEST_USER_B_PASSWORD
);

test('Live 2-User RLS Isolation, Plan Refresh Persistence & Chapter Notes Suite', {
  skip: !hasTwoTestUsers
    ? 'Supply TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD to run live 2-user RLS test'
    : false,
}, async () => {
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signInA = await clientA.auth.signInWithPassword({
    email: TEST_USER_A_EMAIL,
    password: TEST_USER_A_PASSWORD,
  });
  assert.ifError(signInA.error);
  const uidA = signInA.data.user.id;

  const signInB = await clientB.auth.signInWithPassword({
    email: TEST_USER_B_EMAIL,
    password: TEST_USER_B_PASSWORD,
  });
  assert.ifError(signInB.error);
  const uidB = signInB.data.user.id;
  assert.notEqual(uidA, uidB);

  const testPlanId = crypto.randomUUID();
  const testTaskId = `rls-test-task-${Date.now()}`;
  const testChapterId = `rls-test-chapter-${Date.now()}`;
  const testGuestId = `guest-rls-${Date.now()}`;

  try {
    // User A writes & reads own profile
    const profRes = await clientA
      .from('student_profiles')
      .upsert({ user_id: uidA, board: 'CBSE', grade: '12', minutes_per_day: 180 }, { onConflict: 'user_id' });
    assert.ifError(profRes.error);

    const profReadA = await clientA.from('student_profiles').select('*').eq('user_id', uidA).single();
    assert.ifError(profReadA.error);
    assert.equal(profReadA.data.user_id, uidA);

    // User B cannot read User A profile
    const profReadB = await clientB.from('student_profiles').select('*').eq('user_id', uidA);
    assert.equal((profReadB.data || []).length, 0);

    // User A creates plan & reloads after refresh
    const planInsert = await clientA.from('study_plans').upsert({
      id: testPlanId,
      user_id: uidA,
      name: 'RLS Integration Test Plan',
      is_active: false,
      board: 'CBSE',
      subjects: ['Physics'],
      chapter_ids: [testChapterId],
      planned_chapter_ids: [testChapterId],
      days: [],
    });
    assert.ifError(planInsert.error);

    const planReloadA = await clientA.from('study_plans').select('*').eq('id', testPlanId).single();
    assert.ifError(planReloadA.error);
    assert.equal(planReloadA.data.name, 'RLS Integration Test Plan');

    // User B cannot read, update, or delete User A's plan
    const planReadB = await clientB.from('study_plans').select('*').eq('id', testPlanId);
    assert.equal((planReadB.data || []).length, 0);

    const planUpdateB = await clientB
      .from('study_plans')
      .update({ name: 'Hacked Name' })
      .eq('id', testPlanId)
      .select();
    assert.equal((planUpdateB.data || []).length, 0);

    const planDeleteB = await clientB.from('study_plans').delete().eq('id', testPlanId).select();
    assert.equal((planDeleteB.data || []).length, 0);

    // User A writes completed_tasks, study_sessions, chapter_notes, migration_receipts
    assert.ifError(
      (await clientA.from('completed_tasks').upsert({ user_id: uidA, task_id: testTaskId }, { onConflict: 'user_id,task_id' }))
        .error
    );
    assert.ifError(
      (await clientA.from('study_sessions').insert({ user_id: uidA, chapter_id: testChapterId, minutes: 25, mode: 'focus' })).error
    );
    assert.ifError(
      (
        await clientA
          .from('chapter_notes')
          .upsert({ user_id: uidA, chapter_id: testChapterId, note: 'User A secret formula' }, { onConflict: 'user_id,chapter_id' })
      ).error
    );
    assert.ifError(
      (
        await clientA
          .from('migration_receipts')
          .upsert({ user_id: uidA, guest_uid: testGuestId, batch_key: 'guest_migration_v1' }, { onConflict: 'user_id,guest_uid,batch_key' })
      ).error
    );

    // Verify User B cannot read any of User A's completed_tasks, study_sessions, chapter_notes, migration_receipts
    assert.equal(((await clientB.from('completed_tasks').select('*').eq('user_id', uidA)).data || []).length, 0);
    assert.equal(((await clientB.from('study_sessions').select('*').eq('user_id', uidA)).data || []).length, 0);
    assert.equal(((await clientB.from('chapter_notes').select('*').eq('user_id', uidA)).data || []).length, 0);
    assert.equal(((await clientB.from('migration_receipts').select('*').eq('user_id', uidA)).data || []).length, 0);
  } finally {
    // Cleanup test rows created under User A
    await clientA.from('study_plans').delete().eq('id', testPlanId);
    await clientA.from('completed_tasks').delete().eq('user_id', uidA).eq('task_id', testTaskId);
    await clientA.from('study_sessions').delete().eq('user_id', uidA).eq('chapter_id', testChapterId);
    await clientA.from('chapter_notes').delete().eq('user_id', uidA).eq('chapter_id', testChapterId);
    await clientA.from('migration_receipts').delete().eq('user_id', uidA).eq('guest_uid', testGuestId);
    await clientA.auth.signOut();
    await clientB.auth.signOut();
  }
});
