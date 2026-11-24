import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  chapters,
  resolveChapterById,
  type Chapter,
  type Subject,
} from '@/lib/backlog-data';
import { saveStudySession } from '@/lib/storage';
import { saveStudySessionDirect } from '@/lib/supabase-service';
import { triggerGrandCelebration } from '@/lib/celebration';
import { useAuth } from '@/lib/auth-context';
import {
  playPomodoroAlarmTune,
  stopPomodoroAlarm,
  unlockPomodoroAudio,
} from '@/lib/pomodoro-audio';

export interface PersistedTimerState {
  duration: number;
  running: boolean;
  endAtMs: number | null;
  remainingSeconds: number;
  chapterId?: string;
  subject?: Subject;
  task?: string;
}

export interface CompletedPomodoroSummary {
  minutes: number;
  chapterId: string;
  chapterTitle: string;
  subject: Subject;
  task: string;
  completedAtMs: number;
}

interface PomodoroContextValue {
  duration: number;
  seconds: number;
  running: boolean;
  hasActiveOrPausedSession: boolean;
  selectedSubject: Subject;
  selectedChapterId: string;
  selectedChapterTitle: string;
  selectedTask: string;
  logged: boolean;
  loggedMsg: string | null;
  alarmActive: boolean;
  alarmRinging: boolean;
  completedSummary: CompletedPomodoroSummary | null;
  setSelection: (next: {
    subject?: Subject;
    chapterId?: string;
    task?: string;
  }) => void;
  syncStudyChapterSelection: (chapterId: string, chapterPool?: Chapter[]) => void;
  applyPreferredDefaultMinutes: (preferredMinutes?: number) => void;
  toggleRunning: () => void;
  setPresetDuration: (minutes: number) => void;
  reset: () => void;
  logSession: () => void;
  dismissAlarm: () => void;
  restartAfterAlarm: () => void;
  testAlarmTune: () => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function getTimerStorageKey(userId?: string): string {
  return `backlogos_focus_timer_v1_${userId || 'guest'}`;
}

function readTimerState(key: string): PersistedTimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as PersistedTimerState;
  } catch {
    return null;
  }
}

function writeTimerState(key: string, state: PersistedTimerState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!state) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.uid;
  const timerStorageKey = getTimerStorageKey(userId);

  const defaultChapter = chapters[0];
  const [duration, setDuration] = useState<number>(25);
  const [seconds, setSeconds] = useState<number>(25 * 60);
  const [running, setRunning] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject>(defaultChapter.subject);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(defaultChapter.id);
  const [selectedTask, setSelectedTask] = useState<string>('Practice Questions & PYQs');
  const [logged, setLogged] = useState<boolean>(false);
  const [loggedMsg, setLoggedMsg] = useState<string | null>(null);
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [alarmRinging, setAlarmRinging] = useState<boolean>(false);
  const [completedSummary, setCompletedSummary] = useState<CompletedPomodoroSummary | null>(null);

  const endAtMsRef = useRef<number | null>(null);
  const completionFiredRef = useRef<boolean>(false);

  const recordCompletedSession = useCallback(
    async (
      mins: number,
      source: 'timer' | 'manual',
      chId: string,
      taskLabel: string
    ) => {
      const safeMins = Math.max(1, Math.round(mins));
      if (userId && !userId.startsWith('guest-')) {
        const res = await saveStudySessionDirect(
          {
            chapterId: chId,
            minutes: safeMins,
            mode: 'focus',
          },
          userId
        );
        if (!res.success) {
          console.warn('[Pomodoro] Could not persist study_session to Supabase:', res.error);
        }
      } else {
        saveStudySession(
          {
            id: `${Date.now()}-${chId}`,
            chapterId: chId,
            minutes: safeMins,
            completedAt: new Date().toISOString(),
            mode: 'focus',
            taskId: taskLabel,
          },
          userId
        );
      }

      setLogged(true);
      setLoggedMsg(
        source === 'timer'
          ? `Logged ${safeMins}m focus session for ${taskLabel}!`
          : `Logged ${safeMins}m study block for ${taskLabel}! Backlog updated.`
      );
      triggerGrandCelebration();
      window.setTimeout(() => setLoggedMsg(null), 5000);
    },
    [userId]
  );

  const triggerTimerCompletion = useCallback(
    (completedMins: number, chId: string, subj: Subject, taskLabel: string) => {
      if (completionFiredRef.current) return;
      completionFiredRef.current = true;
      endAtMsRef.current = null;
      setRunning(false);
      setSeconds(0);
      writeTimerState(timerStorageKey, null);

      const resolvedTitle = resolveChapterById(chId)?.title || chId;
      setAlarmActive(true);
      setAlarmRinging(true);
      setCompletedSummary({
        minutes: completedMins,
        chapterId: chId,
        chapterTitle: resolvedTitle,
        subject: subj,
        task: taskLabel,
        completedAtMs: Date.now(),
      });

      playPomodoroAlarmTune({
        repeatCycles: 4,
        onEnded: () => setAlarmRinging(false),
      });

      void recordCompletedSession(completedMins, 'timer', chId, taskLabel);
    },
    [recordCompletedSession, timerStorageKey]
  );

  // Hydrate timer state whenever the active user storage bucket changes
  useEffect(() => {
    const saved = readTimerState(timerStorageKey);
    completionFiredRef.current = false;
    stopPomodoroAlarm();
    setAlarmRinging(false);

    if (!saved) {
      endAtMsRef.current = null;
      setRunning(false);
      setDuration(25);
      setSeconds(25 * 60);
      setAlarmActive(false);
      setCompletedSummary(null);
      return;
    }

    const dur = saved.duration || 25;
    const chId = saved.chapterId || defaultChapter.id;
    const subj = saved.subject || resolveChapterById(chId)?.subject || defaultChapter.subject;
    const tsk = saved.task || 'Practice Questions & PYQs';

    setDuration(dur);
    setSelectedChapterId(chId);
    setSelectedSubject(subj);
    setSelectedTask(tsk);

    if (saved.running && saved.endAtMs) {
      const rem = Math.max(0, Math.ceil((saved.endAtMs - Date.now()) / 1000));
      if (rem > 0) {
        endAtMsRef.current = saved.endAtMs;
        setSeconds(rem);
        setRunning(true);
        setAlarmActive(false);
      } else {
        triggerTimerCompletion(dur, chId, subj, tsk);
      }
    } else {
      endAtMsRef.current = null;
      setRunning(false);
      setSeconds(
        typeof saved.remainingSeconds === 'number' ? saved.remainingSeconds : dur * 60
      );
      setAlarmActive(false);
    }
  }, [timerStorageKey, defaultChapter.id, defaultChapter.subject, triggerTimerCompletion]);

  // Persist running / paused mid-session changes
  useEffect(() => {
    if (running || (seconds < duration * 60 && seconds > 0)) {
      writeTimerState(timerStorageKey, {
        duration,
        running,
        endAtMs: endAtMsRef.current,
        remainingSeconds: seconds,
        chapterId: selectedChapterId,
        subject: selectedSubject,
        task: selectedTask,
      });
    }
  }, [
    timerStorageKey,
    duration,
    running,
    seconds,
    selectedChapterId,
    selectedSubject,
    selectedTask,
  ]);

  // Accurate global countdown tick across all tabs & routes
  useEffect(() => {
    if (!running) return;
    if (!endAtMsRef.current) {
      endAtMsRef.current = Date.now() + (seconds > 0 ? seconds : duration * 60) * 1000;
    }

    const syncClock = () => {
      if (!endAtMsRef.current) return;
      const nextSeconds = Math.max(0, Math.ceil((endAtMsRef.current - Date.now()) / 1000));
      setSeconds(nextSeconds);
      if (nextSeconds === 0) {
        triggerTimerCompletion(duration, selectedChapterId, selectedSubject, selectedTask);
      }
    };

    syncClock();
    const timer = window.setInterval(syncClock, 350);
    const onVis = () => {
      if (document.visibilityState === 'visible') syncClock();
    };
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', syncClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', syncClock);
    };
  }, [
    running,
    duration,
    selectedChapterId,
    selectedSubject,
    selectedTask,
    triggerTimerCompletion,
  ]);

  const setSelection = useCallback(
    (next: { subject?: Subject; chapterId?: string; task?: string }) => {
      if (next.subject) setSelectedSubject(next.subject);
      if (next.chapterId) setSelectedChapterId(next.chapterId);
      if (next.task) setSelectedTask(next.task);
    },
    []
  );

  const syncStudyChapterSelection = useCallback(
    (incomingChapterId: string, chapterPool: Chapter[] = chapters) => {
      const saved = readTimerState(timerStorageKey);
      if (
        running ||
        alarmActive ||
        seconds < duration * 60 ||
        (saved && (saved.running || saved.remainingSeconds < (saved.duration || 25) * 60))
      ) {
        return;
      }
      if (!incomingChapterId) return;
      setSelectedChapterId(incomingChapterId);
      const ch =
        resolveChapterById(incomingChapterId) ||
        chapterPool.find((c) => c.id === incomingChapterId);
      if (ch) setSelectedSubject(ch.subject);
    },
    [alarmActive, duration, running, seconds, timerStorageKey]
  );

  const applyPreferredDefaultMinutes = useCallback(
    (preferredMinutes?: number) => {
      if (!preferredMinutes || ![15, 25, 45, 60].includes(preferredMinutes)) return;
      const saved = readTimerState(timerStorageKey);
      if (running || alarmActive || seconds < duration * 60 || saved) return;
      setDuration(preferredMinutes);
      setSeconds(preferredMinutes * 60);
    },
    [alarmActive, duration, running, seconds, timerStorageKey]
  );

  const toggleRunning = useCallback(() => {
    unlockPomodoroAudio();
    stopPomodoroAlarm();
    setAlarmRinging(false);
    setAlarmActive(false);

    if (running) {
      const rem = endAtMsRef.current
        ? Math.max(0, Math.ceil((endAtMsRef.current - Date.now()) / 1000))
        : seconds;
      endAtMsRef.current = null;
      setSeconds(rem);
      setRunning(false);
      writeTimerState(timerStorageKey, {
        duration,
        running: false,
        endAtMs: null,
        remainingSeconds: rem,
        chapterId: selectedChapterId,
        subject: selectedSubject,
        task: selectedTask,
      });
    } else {
      completionFiredRef.current = false;
      const startSeconds = seconds === 0 ? duration * 60 : seconds;
      const targetEnd = Date.now() + startSeconds * 1000;
      endAtMsRef.current = targetEnd;
      setSeconds(startSeconds);
      setLogged(false);
      setCompletedSummary(null);
      setRunning(true);
      writeTimerState(timerStorageKey, {
        duration,
        running: true,
        endAtMs: targetEnd,
        remainingSeconds: startSeconds,
        chapterId: selectedChapterId,
        subject: selectedSubject,
        task: selectedTask,
      });
    }
  }, [
    duration,
    running,
    seconds,
    selectedChapterId,
    selectedSubject,
    selectedTask,
    timerStorageKey,
  ]);

  const setPresetDuration = useCallback(
    (mins: number) => {
      stopPomodoroAlarm();
      completionFiredRef.current = false;
      endAtMsRef.current = null;
      setAlarmRinging(false);
      setAlarmActive(false);
      setCompletedSummary(null);
      setDuration(mins);
      setSeconds(mins * 60);
      setRunning(false);
      setLogged(false);
      writeTimerState(timerStorageKey, null);
    },
    [timerStorageKey]
  );

  const reset = useCallback(() => {
    stopPomodoroAlarm();
    completionFiredRef.current = false;
    endAtMsRef.current = null;
    setAlarmRinging(false);
    setAlarmActive(false);
    setCompletedSummary(null);
    setSeconds(duration * 60);
    setRunning(false);
    setLogged(false);
    writeTimerState(timerStorageKey, null);
  }, [duration, timerStorageKey]);

  const dismissAlarm = useCallback(() => {
    stopPomodoroAlarm();
    completionFiredRef.current = false;
    endAtMsRef.current = null;
    setAlarmRinging(false);
    setAlarmActive(false);
    setCompletedSummary(null);
    setSeconds(duration * 60);
    setRunning(false);
    writeTimerState(timerStorageKey, null);
  }, [duration, timerStorageKey]);

  const restartAfterAlarm = useCallback(() => {
    unlockPomodoroAudio();
    stopPomodoroAlarm();
    completionFiredRef.current = false;
    setAlarmRinging(false);
    setAlarmActive(false);
    setCompletedSummary(null);
    const startSeconds = duration * 60;
    const targetEnd = Date.now() + startSeconds * 1000;
    endAtMsRef.current = targetEnd;
    setSeconds(startSeconds);
    setLogged(false);
    setRunning(true);
    writeTimerState(timerStorageKey, {
      duration,
      running: true,
      endAtMs: targetEnd,
      remainingSeconds: startSeconds,
      chapterId: selectedChapterId,
      subject: selectedSubject,
      task: selectedTask,
    });
  }, [duration, selectedChapterId, selectedSubject, selectedTask, timerStorageKey]);

  const testAlarmTune = useCallback(() => {
    unlockPomodoroAudio();
    setAlarmRinging(true);
    playPomodoroAlarmTune({
      repeatCycles: 1,
      onEnded: () => setAlarmRinging(false),
    });
  }, []);

  const logSession = useCallback(() => {
    const elapsedSeconds = duration * 60 - seconds;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const hasElapsedPartial = elapsedSeconds >= 60 && seconds > 0;
    if (hasElapsedPartial) {
      void recordCompletedSession(elapsedMinutes, 'timer', selectedChapterId, selectedTask);
    } else {
      void recordCompletedSession(duration, 'manual', selectedChapterId, selectedTask);
    }
  }, [duration, recordCompletedSession, seconds, selectedChapterId, selectedTask]);

  const selectedChapterTitle = useMemo(
    () => resolveChapterById(selectedChapterId)?.title || selectedChapterId,
    [selectedChapterId]
  );

  const hasActiveOrPausedSession = running || (seconds < duration * 60 && seconds > 0);

  const value = useMemo<PomodoroContextValue>(
    () => ({
      duration,
      seconds,
      running,
      hasActiveOrPausedSession,
      selectedSubject,
      selectedChapterId,
      selectedChapterTitle,
      selectedTask,
      logged,
      loggedMsg,
      alarmActive,
      alarmRinging,
      completedSummary,
      setSelection,
      syncStudyChapterSelection,
      applyPreferredDefaultMinutes,
      toggleRunning,
      setPresetDuration,
      reset,
      logSession,
      dismissAlarm,
      restartAfterAlarm,
      testAlarmTune,
    }),
    [
      duration,
      seconds,
      running,
      hasActiveOrPausedSession,
      selectedSubject,
      selectedChapterId,
      selectedChapterTitle,
      selectedTask,
      logged,
      loggedMsg,
      alarmActive,
      alarmRinging,
      completedSummary,
      setSelection,
      syncStudyChapterSelection,
      applyPreferredDefaultMinutes,
      toggleRunning,
      setPresetDuration,
      reset,
      logSession,
      dismissAlarm,
      restartAfterAlarm,
      testAlarmTune,
    ]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoroTimer(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error('usePomodoroTimer must be used inside PomodoroProvider');
  }
  return ctx;
}
