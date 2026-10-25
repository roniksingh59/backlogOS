import confetti from 'canvas-confetti';

export function triggerTaskCelebration() {
  try {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899'],
      disableForReducedMotion: true,
    });
  } catch (e) {
    // Graceful fallback
  }
}

export function triggerGrandCelebration() {
  try {
    const end = Date.now() + 1200;
    const colors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } catch (e) {
    // Graceful fallback
  }
}
