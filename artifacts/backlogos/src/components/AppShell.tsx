import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Menu,
  X,
  GraduationCap,
  Award,
  Calendar,
  Camera,
  User as UserIcon,
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { AIFloatingCopilot } from './AIFloatingCopilot';
import { PWAInstallButton } from './PWAInstallButton';
import { AIDoubtPhotoSolverModal } from './AIDoubtPhotoSolverModal';
import { FloatingFeedbackButton } from './FloatingFeedbackButton';

import { readPlan } from '@/lib/storage';
import { useAuth } from '@/lib/auth-context';

export function Logo() {
  return (
    <Link href="/" className="focus-ring flex items-center gap-2.5 group shrink-0" data-testid="link-logo">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs group-hover:border-sky-500/50 group-hover:scale-105 transition-all duration-200 p-1 shrink-0">
        <img
          src="/brand/mark-transparent.svg"
          alt="BacklogOS Mark"
          className="h-full w-full object-contain drop-shadow-xs"
        />
      </div>
      <div className="flex flex-col whitespace-nowrap">
        <span className="font-sans text-[14px] font-bold tracking-tight text-foreground group-hover:text-sky-500 transition-colors">
          Backlog<span className="text-sky-500">OS</span>
        </span>
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline-block -mt-0.5">
          Academic OS
        </span>
      </div>
    </Link>
  );
}

type NavAccent = {
  href: string;
  label: string;
  icon: typeof BookOpenCheck;
  activeBg: string;
  activeText: string;
  activeIcon: string;
  activeBar: string;
  idleIcon: string;
};

const WORKSPACE_NAV_ITEMS: NavAccent[] = [
  {
    href: '/dashboard',
    label: 'Plan & Backlog',
    icon: BookOpenCheck,
    activeBg: 'bg-sky-500/12',
    activeText: 'text-sky-700 dark:text-sky-300 font-semibold',
    activeIcon: 'text-sky-500',
    activeBar: 'bg-sky-500',
    idleIcon: 'text-sky-500/80 group-hover:text-sky-500',
  },
  {
    href: '/study',
    label: 'Focus Room',
    icon: BookOpen,
    activeBg: 'bg-indigo-500/12',
    activeText: 'text-indigo-700 dark:text-indigo-300 font-semibold',
    activeIcon: 'text-indigo-500',
    activeBar: 'bg-indigo-500',
    idleIcon: 'text-indigo-500/80 group-hover:text-indigo-500',
  },
  {
    href: '/roadmap',
    label: 'Recovery Route',
    icon: Calendar,
    activeBg: 'bg-emerald-500/12',
    activeText: 'text-emerald-700 dark:text-emerald-300 font-semibold',
    activeIcon: 'text-emerald-500',
    activeBar: 'bg-emerald-500',
    idleIcon: 'text-emerald-500/80 group-hover:text-emerald-500',
  },
  {
    href: '/curriculum',
    label: 'Curriculum',
    icon: GraduationCap,
    activeBg: 'bg-amber-500/12',
    activeText: 'text-amber-700 dark:text-amber-300 font-semibold',
    activeIcon: 'text-amber-500',
    activeBar: 'bg-amber-500',
    idleIcon: 'text-amber-500/80 group-hover:text-amber-500',
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: Award,
    activeBg: 'bg-violet-500/12',
    activeText: 'text-violet-700 dark:text-violet-300 font-semibold',
    activeIcon: 'text-violet-500',
    activeBar: 'bg-violet-500',
    idleIcon: 'text-violet-500/80 group-hover:text-violet-500',
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleOpenDoubt = () => setIsDoubtModalOpen(true);
    window.addEventListener('open-doubt-solver', handleOpenDoubt);
    return () => {
      window.removeEventListener('open-doubt-solver', handleOpenDoubt);
    };
  }, []);

  const { user } = useAuth();
  const [hasPlan, setHasPlan] = useState<boolean>(() => Boolean(readPlan(user?.uid)));

  useEffect(() => {
    const checkPlan = () => setHasPlan(Boolean(readPlan(user?.uid)));
    checkPlan();
    window.addEventListener('storage', checkPlan);
    window.addEventListener('backlogos-plan-updated', checkPlan);
    window.addEventListener('focus', checkPlan);
    return () => {
      window.removeEventListener('storage', checkPlan);
      window.removeEventListener('backlogos-plan-updated', checkPlan);
      window.removeEventListener('focus', checkPlan);
    };
  }, [location, user?.uid]);

  const isAuthOrLegal =
    location === '/login' ||
    location === '/signin' ||
    location === '/signup' ||
    location === '/register' ||
    location === '/auth' ||
    location === '/privacy' ||
    location === '/terms';

  const isPublicLandingOrOnboarding = isAuthOrLegal || location === '/' || location === '/onboarding';
  const showWorkspaceFeatures = Boolean(hasPlan && !isPublicLandingOrOnboarding);
  const showBaxCopilot = !isAuthOrLegal;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* Clean, Colorful 3-Zone Top Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 transition-all duration-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Zone 1: Brand Logo */}
          <div className="flex items-center shrink-0">
            <Logo />
          </div>

          {/* Zone 2: Clean 5-Link Colorful Workspace Navigation */}
          {showWorkspaceFeatures ? (
            <nav
              className="hidden items-center justify-center gap-1 lg:flex animate-in fade-in duration-200"
              aria-label="Primary navigation"
            >
              {WORKSPACE_NAV_ITEMS.map(({ href, label, icon: Icon, activeBg, activeText, activeIcon, activeBar, idleIcon }) => {
                const isActive = location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                    className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 ${
                      isActive
                        ? `${activeBg} ${activeText}`
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`}
                  >
                    <Icon
                      size={14}
                      className={`shrink-0 transition-colors ${isActive ? activeIcon : idleIcon}`}
                    />
                    <span>{label}</span>
                    {isActive && (
                      <span className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full ${activeBar}`} />
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="hidden lg:block flex-1" />
          )}

          {/* Zone 3: Focused Utilities & Account */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {showWorkspaceFeatures && (
              <button
                type="button"
                onClick={() => setIsDoubtModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 group cursor-pointer whitespace-nowrap shrink-0"
                title="Scan and solve any textbook or handwritten sum photo"
              >
                <Camera size={14} className="text-sky-500 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden md:inline">Scan Sum</span>
              </button>
            )}

            <PWAInstallButton />

            {showWorkspaceFeatures && (
              <Link
                href="/onboarding"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs active:scale-95 transition-all duration-150 btn-press group whitespace-nowrap shrink-0"
                data-testid="button-header-get-started"
              >
                <span className="text-white/95 text-sm leading-none font-bold">+</span>
                <span>New Plan</span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            <ThemeToggle />
            <AuthButton />

            {showWorkspaceFeatures && (
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="focus-ring rounded-lg p-1.5 text-muted-foreground lg:hidden hover:bg-muted hover:text-foreground transition active:scale-95 shrink-0"
                aria-label={open ? 'Close menu' : 'Open menu'}
                data-testid="button-mobile-menu"
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
          </div>
        </div>

        {/* Crisp Chromatic Hairline Accent */}
        <div className="h-[1px] w-full bg-gradient-to-r from-sky-500/20 via-emerald-500/25 to-violet-500/20" />

        {/* Clean Mobile & Tablet Slide Drawer */}
        {showWorkspaceFeatures && open && (
          <nav
            className="border-t border-border bg-card/95 backdrop-blur-xl px-4 py-4 lg:hidden space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
            aria-label="Mobile and tablet drawer navigation"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 font-bold">
              Workspaces
            </div>
            <div className="space-y-1">
              {WORKSPACE_NAV_ITEMS.map(({ href, label, icon: Icon, activeBg, activeText, activeIcon, idleIcon }) => {
                const isActive = location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}
                    className={`focus-ring flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                      isActive ? `${activeBg} ${activeText}` : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={15} className={isActive ? activeIcon : idleIcon} />
                      {label}
                    </span>
                    <ArrowRight size={12} className="opacity-40" />
                  </Link>
                );
              })}

              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className={`focus-ring flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition ${
                  location === '/account' ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <UserIcon size={15} className="text-muted-foreground" />
                  My Account
                </span>
                <ArrowRight size={12} className="opacity-40" />
              </Link>
            </div>

            <div className="pt-2 flex flex-col gap-2 border-t border-border/60">
              <PWAInstallButton className="w-full justify-center py-2" />
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white py-2.5 text-xs font-semibold shadow-xs transition"
              >
                <span>+ Create Recovery Plan</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${showWorkspaceFeatures ? 'pb-20 lg:pb-0' : 'pb-0'}`}>{children}</main>

      {/* Floating Feedback Button */}
      <FloatingFeedbackButton hasBottomNav={showWorkspaceFeatures} />

      {/* AI Copilot launcher */}
      {showBaxCopilot && <AIFloatingCopilot />}

      {/* Colorful Mobile Bottom Navigation Bar */}
      {showWorkspaceFeatures && (
        <nav
          aria-label="Mobile and tablet bottom navigation"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 backdrop-blur-md lg:hidden flex items-center justify-around py-1.5 px-2 sm:px-6 safe-area-bottom shadow-lg"
        >
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/dashboard' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-dashboard"
          >
            <BookOpenCheck size={18} className={location === '/dashboard' ? 'text-sky-500' : ''} />
            <span>Today</span>
          </Link>

          <Link
            href="/curriculum"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/curriculum' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-curriculum"
          >
            <GraduationCap size={18} className={location === '/curriculum' ? 'text-amber-500' : ''} />
            <span>Syllabus</span>
          </Link>

          <Link
            href="/study"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/study' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-study"
          >
            <BookOpen size={18} className={location === '/study' ? 'text-indigo-500' : ''} />
            <span>Focus</span>
          </Link>

          <Link
            href="/progress"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/progress' ? 'text-violet-600 dark:text-violet-400 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-progress"
          >
            <Award size={18} className={location === '/progress' ? 'text-violet-500' : ''} />
            <span>Progress</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              open ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-menu"
          >
            <Menu size={18} className={open ? 'text-emerald-500' : ''} />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {/* Minimal Student Footer */}
      <footer className="border-t border-border bg-background px-4 py-8 text-xs text-muted-foreground mt-16 hidden lg:block">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-foreground">BacklogOS</span>
            {showWorkspaceFeatures && (
              <>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => setIsDoubtModalOpen(true)}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 underline underline-offset-4 decoration-border transition flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Camera size={12} />
                  <span>Scan Sum (AI Doubt Solver)</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition underline underline-offset-4">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-foreground transition underline underline-offset-4">
              Terms of Service
            </Link>
            <span>·</span>
            <span>CBSE 2026–27</span>
          </div>
        </div>
      </footer>

      {/* AI Photo Doubt & Numerical Solver Modal */}
      <AIDoubtPhotoSolverModal
        isOpen={isDoubtModalOpen}
        onClose={() => setIsDoubtModalOpen(false)}
      />
    </div>
  );
}
