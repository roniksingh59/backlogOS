import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  ClipboardList,
  Compass,
  Layers,
  Menu,
  X,
  GraduationCap,
  Award,
  Calendar,
  Sparkles,
  HelpCircle,
  FileText,
  Timer,
  Zap,
  Camera,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { AIFloatingCopilot } from './AIFloatingCopilot';
import { PWAInstallButton } from './PWAInstallButton';
import { PracticeNavDropdown } from './PracticeNavDropdown';
import { AIDoubtPhotoSolverModal } from './AIDoubtPhotoSolverModal';

import { readPlan } from '@/lib/storage';

export function Logo() {
  return (
    <Link href="/" className="focus-ring flex items-center gap-2.5 group" data-testid="link-logo">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border/80 shadow-xs group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200 p-1">
        <img
          src="/brand/mark-transparent.svg"
          alt="BacklogOS Mark"
          className="h-full w-full object-contain drop-shadow-xs"
        />
      </div>
      <div className="flex flex-col">
        <span className="font-sans text-[14px] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
          <span>Backlog<span className="text-[#5B7CFF]">OS</span></span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="System Active" />
        </span>
        <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline-block -mt-0.5">
          Academic OS
        </span>
      </div>
    </Link>
  );
}

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

  const [hasPlan, setHasPlan] = useState<boolean>(() => Boolean(readPlan()));

  useEffect(() => {
    const checkPlan = () => setHasPlan(Boolean(readPlan()));
    checkPlan();
    window.addEventListener('storage', checkPlan);
    window.addEventListener('backlogos-plan-updated', checkPlan);
    window.addEventListener('focus', checkPlan);
    return () => {
      window.removeEventListener('storage', checkPlan);
      window.removeEventListener('backlogos-plan-updated', checkPlan);
      window.removeEventListener('focus', checkPlan);
    };
  }, [location]);

  const coreNavLinks = [
    { href: '/dashboard', label: 'Plan & Backlog', icon: BookOpenCheck },
    { href: '/study', label: 'Focus Room', icon: BookOpen },
    { href: '/roadmap', label: 'Recovery Route', icon: Calendar },
    { href: '/curriculum', label: 'Curriculum', icon: GraduationCap },
  ];

  // Crucial: NEVER show workspace tabs or headers on homepage ('/'), onboarding ('/onboarding'), auth, privacy, or terms.
  // Only show them when the student has created a plan AND is inside the study workspace (dashboard, focus room, roadmap, curriculum, etc.)
  const isPublicLandingOrOnboarding =
    location === '/' ||
    location === '/onboarding' ||
    location === '/login' ||
    location === '/signin' ||
    location === '/signup' ||
    location === '/register' ||
    location === '/auth' ||
    location === '/privacy' ||
    location === '/terms';
  const showWorkspaceFeatures = Boolean(hasPlan && !isPublicLandingOrOnboarding);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* Aesthetic Glassmorphic Top Menu & Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 transition-all duration-200">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-5 sm:gap-7">
            <Logo />

            {/* Desktop Navigation Links — Shown only when user has created a plan and is in workspaces */}
            {showWorkspaceFeatures && (
              <nav className="hidden items-center gap-1 lg:flex animate-in fade-in duration-200" aria-label="Primary navigation">
                {coreNavLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                    className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                      location === href
                        ? 'bg-muted text-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:-translate-y-0.5'
                    }`}
                  >
                    <Icon
                      size={13}
                      className={`transition-colors ${location === href ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'}`}
                    />
                    <span>{label}</span>
                    {location === href && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary animate-in fade-in zoom-in duration-200" />
                    )}
                  </Link>
                ))}

                {/* Practice & Tests Consolidated Dropdown */}
                <PracticeNavDropdown />

                {/* Progress Link */}
                <Link
                  href="/progress"
                  data-testid="link-nav-progress"
                  className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                    location === '/progress'
                      ? 'bg-muted text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:-translate-y-0.5'
                  }`}
                >
                  <Award
                    size={13}
                    className={`transition-colors ${location === '/progress' ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'}`}
                  />
                  <span>Progress</span>
                  {location === '/progress' && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary animate-in fade-in zoom-in duration-200" />
                  )}
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* AI Photo Doubt Solver Button — Only inside workspace */}
            {showWorkspaceFeatures && (
              <button
                type="button"
                onClick={() => setIsDoubtModalOpen(true)}
                className="flex items-center gap-1 rounded-lg border border-sky-400/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 shadow-2xs group cursor-pointer shrink-0"
                title="Scan and solve any textbook or handwritten sum photo"
              >
                <Camera size={14} className="text-sky-500 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden md:inline">Scan Sum</span>
              </button>
            )}

            {/* Install App Button */}
            <PWAInstallButton />

            {/* Compact Action CTA — Only inside workspace */}
            {showWorkspaceFeatures && (
              <Link
                href="/onboarding"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-xs hover:shadow-sky-500/25 active:scale-95 transition-all duration-150 btn-press group shrink-0"
                data-testid="button-header-get-started"
              >
                <span className="text-white/90 text-sm leading-none font-bold">+</span>
                <span>New Plan</span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            <ThemeToggle />
            <AuthButton />

            {/* Mobile Menu Button — Only inside workspace */}
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

        {/* Ambient Gradient Line under header */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />

        {/* Mobile & Tablet Slide Drawer — Only inside workspace */}
        {showWorkspaceFeatures && open && (
          <nav className="border-t border-border bg-card/95 backdrop-blur-xl px-4 py-4 lg:hidden space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150" aria-label="Mobile and tablet drawer navigation">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 pb-1.5 font-bold">
                Recovery Workspaces
              </div>
              <div className="space-y-0.5">
                {[
                  { href: '/dashboard', label: 'Plan & Backlog', icon: BookOpenCheck },
                  { href: '/study', label: 'Focus Room', icon: BookOpen },
                  { href: '/roadmap', label: 'Recovery Route', icon: Calendar },
                  { href: '/curriculum', label: 'Curriculum & Syllabus', icon: GraduationCap },
                  { href: '/progress', label: 'Progress & Analytics', icon: Award },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}
                    className={`focus-ring flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                      location === href ? 'bg-muted text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={14} className={location === href ? 'text-primary' : 'text-muted-foreground'} />
                      {label}
                    </span>
                    <ArrowRight size={11} className="opacity-40" />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 pb-1.5 font-bold">
                Practice & Testing
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { href: '/account', label: 'My Account', icon: UserIcon },
                  { href: '/drills', label: 'Formula Drills', icon: Zap },
                  { href: '/pyq', label: 'PYQ Bank', icon: FileText },
                  { href: '/flashcards', label: 'Flashcards', icon: Layers },
                  { href: '/mock-exam', label: 'Mock Exam', icon: Timer },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-lg p-2 text-xs font-medium border border-border/60 transition ${
                      location === href ? 'bg-muted text-foreground font-semibold' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={13} className="text-primary" />
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2 border-t border-border/60">
              <PWAInstallButton className="w-full justify-center py-2" />
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white py-2 text-xs font-semibold shadow-xs transition"
              >
                <span>+ Create Recovery Plan</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content with bottom padding for mobile and tablet bottom navigation */}
      <main className={`flex-1 ${showWorkspaceFeatures ? 'pb-20 lg:pb-0' : 'pb-0'}`}>{children}</main>

      {/* AI Copilot launcher — Only active when student is inside workspace */}
      {showWorkspaceFeatures && <AIFloatingCopilot />}

      {/* Mobile & Tablet Bottom Navigation Bar — Only active when student is inside workspace */}
      {showWorkspaceFeatures && (
        <nav
          aria-label="Mobile and tablet bottom navigation"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-background/95 backdrop-blur-md lg:hidden flex items-center justify-around py-1.5 px-2 sm:px-6 safe-area-bottom shadow-lg"
        >
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/dashboard' ? 'text-sky-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-dashboard"
          >
            <BookOpenCheck size={18} className={location === '/dashboard' ? 'text-sky-500' : ''} />
            <span>Today</span>
          </Link>

          <Link
            href="/curriculum"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/curriculum' ? 'text-sky-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-curriculum"
          >
            <GraduationCap size={18} className={location === '/curriculum' ? 'text-sky-500' : ''} />
            <span>Syllabus</span>
          </Link>

          <Link
            href="/study"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/study' ? 'text-sky-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-study"
          >
            <BookOpen size={18} className={location === '/study' ? 'text-sky-500' : ''} />
            <span>Focus</span>
          </Link>

          <Link
            href="/progress"
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              location === '/progress' ? 'text-sky-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-progress"
          >
            <Award size={18} className={location === '/progress' ? 'text-sky-500' : ''} />
            <span>Progress</span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`flex flex-col items-center gap-1 py-1 px-3 sm:px-6 rounded-md text-[10px] sm:text-xs font-medium transition ${
              open ? 'text-sky-500 font-bold' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid="bottom-nav-menu"
          >
            <Menu size={18} />
            <span>Menu</span>
          </button>
        </nav>
      )}

      {/* Minimal Student Footer (Desktop only) */}
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
