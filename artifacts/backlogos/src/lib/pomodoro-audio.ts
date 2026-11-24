// Web Audio API study alarm synthesizer — zero external audio file dependencies.

let sharedAudioCtx: AudioContext | null = null;
let activeLoopTimer: number | null = null;
let activeStopOscillators: Array<() => void> = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new Ctx();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Unlocks/resumes browser AudioContext during a user click (e.g. Start Focus)
 * so the alarm tune can play cleanly later when the countdown reaches 00:00.
 */
export function unlockPomodoroAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {
      // Ignore autoplay blocks in non-interactive headless environments
    });
  }
}

export function stopPomodoroAlarm(): void {
  if (activeLoopTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(activeLoopTimer);
    activeLoopTimer = null;
  }
  const stops = activeStopOscillators;
  activeStopOscillators = [];
  for (const fn of stops) {
    try {
      fn();
    } catch {
      // ignore already-stopped nodes
    }
  }
}

function playSingleChimeCycle(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // Bright, pleasant 4-note ascending study bell cadence (C5 -> E5 -> G5 -> C6)
  const notes = [
    { freq: 523.25, offset: 0.0, dur: 0.34 },
    { freq: 659.25, offset: 0.16, dur: 0.34 },
    { freq: 783.99, offset: 0.32, dur: 0.36 },
    { freq: 1046.5, offset: 0.50, dur: 0.68 },
  ];

  for (const note of notes) {
    const startAt = now + note.offset;
    const endAt = startAt + note.dur;

    const primary = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();

    primary.type = 'sine';
    primary.frequency.setValueAtTime(note.freq, startAt);

    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(note.freq * 2, startAt);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.16, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.24, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    primary.connect(gain);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gain);
    gain.connect(ctx.destination);

    primary.start(startAt);
    harmonic.start(startAt);
    primary.stop(endAt + 0.02);
    harmonic.stop(endAt + 0.02);

    activeStopOscillators.push(() => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        primary.stop();
        harmonic.stop();
      } catch {
        // already stopped
      }
    });
  }
}

/**
 * Plays a clear harmonic alarm chime loop when a Pomodoro block finishes.
 */
export function playPomodoroAlarmTune(options?: {
  repeatCycles?: number;
  onEnded?: () => void;
}): void {
  stopPomodoroAlarm();

  const cycles = Math.max(1, options?.repeatCycles ?? 4);
  const ctx = getAudioContext();
  if (!ctx) {
    options?.onEnded?.();
    return;
  }

  const runCycle = (remaining: number) => {
    if (remaining <= 0) {
      activeLoopTimer = null;
      options?.onEnded?.();
      return;
    }

    const startAudio = () => {
      playSingleChimeCycle(ctx);
      if (remaining > 1 && typeof window !== 'undefined') {
        activeLoopTimer = window.setTimeout(() => {
          runCycle(remaining - 1);
        }, 1750);
      } else {
        activeLoopTimer = window.setTimeout(() => {
          activeLoopTimer = null;
          options?.onEnded?.();
        }, 1250);
      }
    };

    if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(startAudio)
        .catch(() => {
          options?.onEnded?.();
        });
    } else {
      startAudio();
    }
  };

  runCycle(cycles);
}
