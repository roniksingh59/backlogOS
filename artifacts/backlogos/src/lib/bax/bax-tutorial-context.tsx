import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { readPlan } from '@/lib/storage';
import { isValidUUID } from '@/lib/supabase';
import { saveWorkspaceStateDirect } from '@/lib/supabase-service';
import type { BaxExpression, BaxPose } from '@/lib/bax/bax-assets';
import {
  BAX_TUTORIAL_VERSION,
  readBaxTutorialState,
  saveBaxTutorialStateLocal,
  type BaxTutorialState,
  type BaxTutorialStatus,
} from '@/lib/bax/bax-tutorial-storage';

export { BAX_TUTORIAL_VERSION, type BaxTutorialState, type BaxTutorialStatus };

export interface BaxTutorialStep {
  id: string;
  title: string;
  message: string;
  expression: BaxExpression;
  pose: BaxPose;
  selector: string;
  fallbackSelector?: string;
  route?: string;
}

export const BAX_TUTORIAL_STEPS: BaxTutorialStep[] = [
  {
    id: 'dashboard-overview',
    title: '1. Dashboard — Your Daily Hub',
    message:
      'See remaining chapters, Clearance vs. Mastery telemetry, and Today’s Study Plan. Click Start First Block to jump straight into studying, or use Missed a Day / Rest Day if your schedule slips.',
    expression: 'happy',
    pose: 'waving',
    selector: '[data-testid="grid-dashboard-separated-metrics"]',
    fallbackSelector:
      '[data-testid="link-nav-dashboard"], [data-testid="bottom-nav-dashboard"]',
    route: '/dashboard',
  },
  {
    id: 'my-plans',
    title: '2. My Plans — Multi-Track Vault',
    message:
      'Store multiple study plans (e.g., 3-Day Rescue or Physics-only Sprint). Create new tracks anytime and click Set Active to switch which plan drives your Dashboard and Recovery Route.',
    expression: 'explaining',
    pose: 'pointing',
    selector: '[data-testid="link-nav-my-plans"]',
    fallbackSelector: '[data-testid="bottom-nav-menu"]',
  },
  {
    id: 'recovery-route',
    title: '3. Recovery Route — Day-by-Day Roadmap',
    message:
      'Work through merged daily blocks with live day countdowns. Switch horizons (1D–30D), spread missed days safely, and pass quick checks before ticking blocks off.',
    expression: 'explaining',
    pose: 'pointing',
    selector: '[data-testid="link-nav-recovery-route"]',
    fallbackSelector: '[data-testid="bottom-nav-roadmap"]',
  },
  {
    id: 'learn-and-test',
    title: '4. Learn & Test — Focus & Verification',
    message:
      'Run the hovering Pomodoro timer, review Concept Overview, videos & NCERT subtopics, save Cloud Notes, and pass the Mastery Quiz to prove real recall.',
    expression: 'determined',
    pose: 'reading',
    selector: '[data-testid="link-nav-learn-&-test"]',
    fallbackSelector: '[data-testid="bottom-nav-study"]',
  },
  {
    id: 'revision-queue',
    title: '5. Revision — Prevent Forgetting',
    message:
      'Not busywork! Verified chapters auto-schedule 1, 3, 7, 14 & 30-day reviews here so the forgetting curve never erases topics you worked hard to clear.',
    expression: 'celebrating',
    pose: 'cheering',
    selector: '[data-testid="link-nav-revision"]',
    fallbackSelector: '[data-testid="bottom-nav-revision"]',
  },
  {
    id: 'analytics-tab',
    title: '6. Analytics — Clearance vs. Mastery',
    message:
      'Spot the gap between studied chapters and quiz-verified mastery, check Weak Concepts to fix shaky topics, and monitor real XP & exam pace.',
    expression: 'thinking',
    pose: 'pointing',
    selector: '[data-testid="link-nav-analytics"]',
    fallbackSelector: '[data-testid="bottom-nav-menu"]',
  },
  {
    id: 'ask-bax-mentor',
    title: '7. Ask Bax — Live AI Mentor',
    message:
      'Stuck on a concept, numerical, or feeling overwhelmed? Tap Ask Bax anytime (or open "How this tab works" on any page) for instant help.',
    expression: 'happy',
    pose: 'waving',
    selector: '[data-testid="button-floating-bax"]',
  },
];

const BLOCKED_AUTO_ROUTES = new Set([
  '/',
  '/login',
  '/signin',
  '/signup',
  '/register',
  '/auth',
  '/privacy',
  '/terms',
  '/onboarding',
]);

interface BaxTutorialContextValue {
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: BaxTutorialStep | null;
  totalSteps: number;
  status: BaxTutorialStatus;
  startTutorial: (navigateToDashboard?: boolean) => void;
  restartTutorial: (navigateToDashboard?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const BaxTutorialContext = createContext<BaxTutorialContextValue | null>(null);

export function BaxTutorialProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const userId = user?.uid;

  const [tutorialState, setTutorialState] = useState<BaxTutorialState>(() => {
    const existing = readBaxTutorialState(userId);
    return (
      existing || {
        status: 'pending',
        version: BAX_TUTORIAL_VERSION,
        updatedAt: new Date().toISOString(),
      }
    );
  });
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasPlan, setHasPlan] = useState<boolean>(() => Boolean(readPlan(userId)));

  // Re-sync local state when userId changes or cloud hydration emits an update
  const syncFromStorage = useCallback(() => {
    const existing = readBaxTutorialState(userId);
    if (existing) {
      setTutorialState(existing);
      if (existing.status === 'completed' || existing.status === 'skipped') {
        setIsOpen(false);
      }
    } else {
      setTutorialState({
        status: 'pending',
        version: BAX_TUTORIAL_VERSION,
        updatedAt: new Date().toISOString(),
      });
    }
    setHasPlan(Boolean(readPlan(userId)));
  }, [userId]);

  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  useEffect(() => {
    const handleRefresh = () => syncFromStorage();
    window.addEventListener('backlogos-tutorial-updated', handleRefresh);
    window.addEventListener('backlogos-plan-updated', handleRefresh);
    window.addEventListener('backlogos-plans-updated', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('backlogos-tutorial-updated', handleRefresh);
      window.removeEventListener('backlogos-plan-updated', handleRefresh);
      window.removeEventListener('backlogos-plans-updated', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [syncFromStorage]);

  // Auto-open ONLY for first-time workspace sessions with an active plan on allowed routes
  useEffect(() => {
    if (authLoading) return;
    if (BLOCKED_AUTO_ROUTES.has(location)) return;
    if (!hasPlan) return;

    const latestStored = readBaxTutorialState(userId);
    if (
      latestStored &&
      (latestStored.status === 'completed' || latestStored.status === 'skipped')
    ) {
      return;
    }

    if (tutorialState.status === 'pending' && !isOpen) {
      setCurrentStepIndex(0);
      setIsOpen(true);
    }
  }, [authLoading, location, hasPlan, userId, tutorialState.status, isOpen]);

  const persistStatus = useCallback(
    (nextStatus: BaxTutorialStatus) => {
      const now = new Date().toISOString();
      const nextState: BaxTutorialState = {
        status: nextStatus,
        version: BAX_TUTORIAL_VERSION,
        updatedAt: now,
        ...(nextStatus === 'completed' ? { completedAt: now } : {}),
        ...(nextStatus === 'skipped' ? { skippedAt: now } : {}),
      };

      saveBaxTutorialStateLocal(nextState, userId);
      setTutorialState(nextState);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('backlogos-tutorial-updated'));
      }

      if (userId && !user?.isGuest && isValidUUID(userId)) {
        void saveWorkspaceStateDirect({ baxTutorial: nextState }, userId);
      }
    },
    [userId, user?.isGuest]
  );

  const completeTutorial = useCallback(() => {
    setIsOpen(false);
    setCurrentStepIndex(0);
    persistStatus('completed');
  }, [persistStatus]);

  const skipTutorial = useCallback(() => {
    setIsOpen(false);
    setCurrentStepIndex(0);
    persistStatus('skipped');
  }, [persistStatus]);

  const startTutorial = useCallback(
    (navigateToDashboard = true) => {
      setCurrentStepIndex(0);
      setIsOpen(true);
      if (navigateToDashboard && location !== '/dashboard') {
        setLocation('/dashboard');
      }
    },
    [location, setLocation]
  );

  const restartTutorial = useCallback(
    (navigateToDashboard = true) => {
      persistStatus('pending');
      setCurrentStepIndex(0);
      setIsOpen(true);
      if (navigateToDashboard && location !== '/dashboard') {
        setLocation('/dashboard');
      }
    },
    [persistStatus, location, setLocation]
  );

  const nextStep = useCallback(() => {
    if (currentStepIndex + 1 >= BAX_TUTORIAL_STEPS.length) {
      completeTutorial();
      return;
    }
    setCurrentStepIndex((prev) => prev + 1);
  }, [currentStepIndex, completeTutorial]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const currentStep = isOpen ? BAX_TUTORIAL_STEPS[currentStepIndex] || null : null;

  const value = useMemo<BaxTutorialContextValue>(
    () => ({
      isOpen,
      currentStepIndex,
      currentStep,
      totalSteps: BAX_TUTORIAL_STEPS.length,
      status: tutorialState.status,
      startTutorial,
      restartTutorial,
      nextStep,
      prevStep,
      skipTutorial,
      completeTutorial,
    }),
    [
      isOpen,
      currentStepIndex,
      currentStep,
      tutorialState.status,
      startTutorial,
      restartTutorial,
      nextStep,
      prevStep,
      skipTutorial,
      completeTutorial,
    ]
  );

  return (
    <BaxTutorialContext.Provider value={value}>
      {children}
    </BaxTutorialContext.Provider>
  );
}

export function useBaxTutorial(): BaxTutorialContextValue {
  const ctx = useContext(BaxTutorialContext);
  if (!ctx) {
    throw new Error('useBaxTutorial must be used inside a BaxTutorialProvider');
  }
  return ctx;
}
