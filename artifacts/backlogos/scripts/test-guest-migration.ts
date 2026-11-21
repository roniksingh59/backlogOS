import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeGuestStorageValues,
  migrateGuestStorageNamespace,
  type GuestStorageLike,
} from '../src/lib/guest-migration';
import { getActiveUserId } from '../src/lib/supabase';

class MemoryStorage implements GuestStorageLike {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const guest = 'guest-stable-browser-id';
const account = '11111111-1111-4111-a111-111111111111';

test('reuses the same stable guest ID across calls', { concurrency: false }, () => {
  const previousStorage = (globalThis as any).localStorage;
  const storage = new MemoryStorage();
  (globalThis as any).localStorage = storage;
  try {
    const first = getActiveUserId();
    const second = getActiveUserId();
    assert.match(first, /^guest-/);
    assert.equal(second, first);
  } finally {
    (globalThis as any).localStorage = previousStorage;
  }
});

test('merges arrays without losing guest and authenticated progress', () => {
  const merged = JSON.parse(mergeGuestStorageValues(
    JSON.stringify([{ id: 'task-1' }, { id: 'task-2', completed: false }]),
    JSON.stringify([{ id: 'task-2', completed: true }, { id: 'task-3' }]),
  ));
  assert.equal(merged.length, 3);
  assert.equal(merged.find((x: any) => x.id === 'task-2').completed, true);
});

test('migrates plans, completion, sessions, backlog, progression and pending queue', () => {
  const storage = new MemoryStorage();
  storage.setItem(`backlogos-plan-history-v1:${guest}`, JSON.stringify([
    { id: 'guest-plan', updatedAt: '2026-11-22T01:00:00Z' },
  ]));
  storage.setItem(`backlogos-plan-history-v1:${account}`, JSON.stringify([
    { id: 'account-plan', updatedAt: '2026-11-21T01:00:00Z' },
  ]));
  storage.setItem(`backlogos-completed-v1:${guest}`, JSON.stringify(['chapter-1', 'chapter-2']));
  storage.setItem(`backlogos-completed-v1:${account}`, JSON.stringify(['chapter-2']));
  storage.setItem(`backlogos-study-sessions-v1:${guest}`, JSON.stringify([
    { chapterId: 'chapter-1', minutes: 30, completedAt: '2026-11-22T01:00:00Z' },
  ]));
  storage.setItem(`backlogos-backlog-items-v2:${guest}`, JSON.stringify([
    { chapterId: 'chapter-1', status: 'completed', hoursSpent: 3 },
  ]));
  storage.setItem(`backlogos-progression-v2-${guest}`, JSON.stringify({ userId: guest, xp: 120 }));
  storage.setItem(`backlogos_pending_sync_v1_${guest}`, JSON.stringify([{ id: 'queued-1' }]));

  const migrated = migrateGuestStorageNamespace(storage, guest, account, false);
  assert.ok(migrated.includes('backlogos-plan-history-v1'));
  assert.deepEqual(JSON.parse(storage.getItem(`backlogos-completed-v1:${account}`)!), ['chapter-2', 'chapter-1']);
  assert.equal(JSON.parse(storage.getItem(`backlogos-progression-v2-${account}`)!).userId, account);
  assert.deepEqual(JSON.parse(storage.getItem(`backlogos_pending_sync_v1_${account}`)!), [{ id: 'queued-1' }]);
  assert.notEqual(storage.getItem(`backlogos-plan-history-v1:${account}`), null);
  assert.notEqual(storage.getItem(`backlogos-plan-history-v1:${guest}`), null, 'source remains until cloud sync succeeds');
});

test('final cleanup is explicit and can be retried after a failed sync', () => {
  const storage = new MemoryStorage();
  storage.setItem(`backlogos-completed-v1:${guest}`, JSON.stringify(['chapter-1']));
  migrateGuestStorageNamespace(storage, guest, account, false);
  assert.notEqual(storage.getItem(`backlogos-completed-v1:${guest}`), null);
  migrateGuestStorageNamespace(storage, guest, account, true);
  assert.equal(storage.getItem(`backlogos-completed-v1:${guest}`), null);
  assert.deepEqual(JSON.parse(storage.getItem(`backlogos-completed-v1:${account}`)!), ['chapter-1']);
});

test('deleted plans and recovery namespace values are included', () => {
  const storage = new MemoryStorage();
  storage.setItem(`backlogos-deleted-plan-ids-v1:${guest}`, JSON.stringify(['deleted-plan']));
  storage.setItem(`backlogos-missed-recovery-v2:${guest}`, JSON.stringify({ updatedAt: '2026-11-22T02:00:00Z', chapterId: 'chapter-1' }));
  migrateGuestStorageNamespace(storage, guest, account, false);
  assert.deepEqual(JSON.parse(storage.getItem(`backlogos-deleted-plan-ids-v1:${account}`)!), ['deleted-plan']);
  assert.equal(JSON.parse(storage.getItem(`backlogos-missed-recovery-v2:${account}`)!).chapterId, 'chapter-1');
});
