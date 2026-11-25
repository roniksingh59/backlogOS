import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { BaxMascot } from '@/components/bax/BaxMascot';
import { useBaxTutorial } from '@/lib/bax/bax-tutorial-context';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findVisibleTarget(selector: string, fallbackSelector?: string): HTMLElement | null {
  const candidates = [selector, ...(fallbackSelector ? fallbackSelector.split(',') : [])]
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sel of candidates) {
    const matches = Array.from(document.querySelectorAll<HTMLElement>(sel));
    for (const el of matches) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        return el;
      }
    }
  }
  return null;
}

export function BaxTutorialOverlay() {
  const [location] = useLocation();
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTutorial,
  } = useBaxTutorial();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  // Measure highlighted element and re-measure on route change, resize, or scroll
  useEffect(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }

    let mountTimer: number | undefined;
    let scrollTimer: number | undefined;
    let rafId = 0;

    const measure = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      const el = findVisibleTarget(currentStep.selector, currentStep.fallbackSelector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const pad = 6;
      setTargetRect({
        top: Math.max(4, rect.top - pad),
        left: Math.max(4, rect.left - pad),
        width: Math.min(window.innerWidth - 8, rect.width + pad * 2),
        height: Math.min(window.innerHeight - 8, rect.height + pad * 2),
      });
    };

    const focusTarget = () => {
      const el = findVisibleTarget(currentStep.selector, currentStep.fallbackSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      measure();
    };

    focusTarget();
    mountTimer = window.setTimeout(focusTarget, 80);
    scrollTimer = window.setTimeout(measure, 360);

    const onUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };

    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, true);

    return () => {
      if (mountTimer) window.clearTimeout(mountTimer);
      if (scrollTimer) window.clearTimeout(scrollTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate, true);
    };
  }, [isOpen, currentStep, location]);

  // Keyboard support: Escape skips tutorial
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, skipTutorial]);

  if (!isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex + 1 >= totalSteps;
  const isFirstStep = currentStepIndex === 0;
  const isCompact = viewport.width < 640;

  // Compute safe clamped bubble card coordinates
  const cardWidth = Math.min(500, Math.max(296, viewport.width - 24));
  const approxCardHeight = isCompact ? 280 : 225;
  const margin = 12;

  let cardTop = Math.max(margin, Math.round((viewport.height - approxCardHeight) / 2));
  let cardLeft = Math.max(margin, Math.round((viewport.width - cardWidth) / 2));

  if (targetRect) {
    const spaceBelow = viewport.height - (targetRect.top + targetRect.height);
    const spaceAbove = targetRect.top;

    if (spaceBelow >= approxCardHeight + 18) {
      cardTop = targetRect.top + targetRect.height + 14;
    } else if (spaceAbove >= approxCardHeight + 18) {
      cardTop = targetRect.top - approxCardHeight - 14;
    } else {
      cardTop = Math.max(margin, Math.min(viewport.height - approxCardHeight - margin, viewport.height - approxCardHeight - 20));
    }

    const preferredLeft = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    cardLeft = Math.max(
      margin,
      Math.min(preferredLeft, viewport.width - cardWidth - margin)
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`BacklogOS Walkthrough Step ${currentStepIndex + 1} of ${totalSteps}`}
      className="fixed inset-0 z-[70]"
      data-testid="bax-tutorial-overlay"
    >
      {/* Click-blocker backdrop (with spotlight cutout when targetRect is available) */}
      {targetRect ? (
        <>
          <div
            className="fixed inset-0 bg-transparent"
            onClick={skipTutorial}
            aria-hidden="true"
          />
          <div
            aria-hidden="true"
            data-testid="bax-tutorial-spotlight"
            className="pointer-events-none fixed rounded-xl border-2 border-indigo-400 transition-all duration-200"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
            }}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
          onClick={skipTutorial}
          aria-hidden="true"
        />
      )}

      {/* Positioned Bax Mascot + Speech Bubble Card */}
      <div
        className="fixed z-[71] transition-all duration-200"
        style={{
          top: cardTop,
          left: cardLeft,
          width: cardWidth,
        }}
        data-testid="bax-tutorial-card"
      >
        <BaxMascot
          expression={currentStep.expression}
          pose={currentStep.pose}
          size={isCompact ? 'sm' : 'md'}
          bubbleTitle={currentStep.title}
          message={currentStep.message}
          showBubble
          bubblePlacement={isCompact ? 'bottom' : 'right'}
          onDismiss={skipTutorial}
          className="w-full"
          data-testid="bax-tutorial-mascot"
          footerSlot={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <span
                className="text-[11px] font-mono font-semibold text-muted-foreground tabular-nums"
                data-testid="text-tutorial-step-counter"
              >
                Step {currentStepIndex + 1} of {totalSteps}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={skipTutorial}
                  className="rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
                  data-testid="button-tutorial-skip"
                >
                  Skip
                </button>

                {!isFirstStep && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition cursor-pointer"
                    data-testid="button-tutorial-prev"
                  >
                    <ArrowLeft size={12} />
                    <span>Previous</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                  data-testid="button-tutorial-next"
                >
                  <span>{isLastStep ? 'Finish' : 'Next'}</span>
                  {isLastStep ? <Check size={12} /> : <ArrowRight size={12} />}
                </button>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
