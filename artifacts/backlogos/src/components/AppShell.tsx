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
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { AIFloatingCopilot } from './AIFloatingCopilot';
import { WhyBuiltHoverboard } from './WhyBuiltHoverboard';
import { ExploreFeaturesDeck } from './ExploreFeaturesDeck';

export function Logo() {
  return (
    <Link href="/" className="focus-ring flex items-center gap-2 group" data-testid="link-logo">
      <div className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-sky-400/40 bg-sky-500 text-white font-mono font-bold text-xs shadow-2xs">
        B
      </div>
      <span className="font-sans text-[14px] font-semibold tracking-tight text-foreground">
        BacklogOS
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isWhyBuiltOpen, setIsWhyBuiltOpen] = useState(false);
  const [isExploreFeaturesOpen, setIsExploreFeaturesOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleOpenWhyBuilt = () => setIsWhyBuiltOpen(true);
    const handleOpenFeatures = () => setIsExploreFeaturesOpen(true);
    window.addEventListener('open-why-built', handleOpenWhyBuilt);
    window.addEventListener('open-explore-features', handleOpenFeatures);
    return () => {
      window.removeEventListener('open-why-built', handleOpenWhyBuilt);
      window.removeEventListener('open-explore-features', handleOpenFeatures);
    };
  }, []);

  const primaryLinks = [
    { href: '/dashboard', label: 'Plan & Backlog', icon: BookOpenCheck },
    { href: '/curriculum', label: 'Curriculum', icon: GraduationCap },
    { href: '/study', label: 'Focus Room', icon: BookOpen },
    { href: '/progress', label: 'Progress', icon: Award },
    { href: '/flashcards', label: 'Flashcards', icon: Layers },
    { href: '/roadmap', label: 'Syllabus Map', icon: Calendar },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative flex flex-col font-sans selection:bg-foreground selection:text-background">
      {/* Notion-Style Top Menu & Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-13 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo />

            {/* Notion Top Menu Links */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
              {primaryLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                  className={`focus-ring flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[13px] font-medium transition-colors ${
                    location === href
                      ? 'bg-muted text-foreground font-semibold shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  }`}
                >
                  <Icon size={13} className={location === href ? 'text-foreground' : 'text-muted-foreground'} />
                  <span>{label}</span>
                </Link>
              ))}

              <button
                type="button"
                onClick={() => setIsExploreFeaturesOpen(true)}
                className="flex items-center gap-1 rounded-[5px] px-2.5 py-1 text-[13px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                data-testid="button-nav-explore-features"
              >
                <Sparkles size={12} className="text-muted-foreground" />
                <span>Explore Features</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notion-style Action CTA button */}
            <Link
              href="/onboarding"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-[5px] border border-sky-400/40 bg-sky-500 hover:bg-sky-400 text-white px-3 py-1.5 text-xs font-medium transition shadow-2xs"
              data-testid="button-header-get-started"
            >
              <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[8px] font-bold">
                B
              </div>
              <span>Create your backlog plan now</span>
              <ArrowRight size={12} />
            </Link>

            <ThemeToggle />
            <AuthButton />

            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="focus-ring rounded-md p-1.5 text-muted-foreground md:hidden hover:bg-muted hover:text-foreground"
              aria-label={open ? 'Close menu' : 'Open menu'}
              data-testid="button-mobile-menu"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Notion-style Mobile Slide Drawer */}
        {open && (
          <nav className="border-t border-border bg-card px-4 py-3 md:hidden space-y-1 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150" aria-label="Mobile navigation">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-3 pt-1 pb-1">
              Workspace
            </div>

            {primaryLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}
                className={`focus-ring flex items-center justify-between rounded-[5px] px-3 py-2 text-xs font-medium ${
                  location === href ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={14} className={location === href ? 'text-foreground' : 'text-muted-foreground'} />
                  {label}
                </span>
                <ArrowRight size={11} className="opacity-40" />
              </Link>
            ))}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setIsExploreFeaturesOpen(true);
              }}
              className="flex items-center justify-between w-full rounded-[5px] px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <span className="flex items-center gap-2.5">
                <Sparkles size={14} />
                Explore BacklogOS Features
              </span>
              <ArrowRight size={11} className="opacity-40" />
            </button>

            <div className="pt-2">
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full rounded-[5px] bg-sky-500 hover:bg-sky-400 text-white py-2 text-xs font-medium transition shadow-2xs border border-sky-400/40"
              >
                <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] bg-white/20 text-white font-mono text-[8px] font-bold">
                  B
                </div>
                <span>Create your backlog plan now</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="border-t border-border pt-2 mt-2 px-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsWhyBuiltOpen(true);
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-mono"
              >
                Why BacklogOS was built (Ronik's story) →
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content with bottom padding for mobile navigation */}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* AI Copilot launcher */}
      <AIFloatingCopilot />

      {/* Mobile Bottom Navigation Bar (High touch target, thumb friendly) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-xs md:hidden flex items-center justify-around py-1.5 px-2 safe-area-bottom shadow-lg"
      >
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[10px] font-medium transition ${
            location === '/dashboard' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="bottom-nav-dashboard"
        >
          <BookOpenCheck size={18} />
          <span>Today</span>
        </Link>

        <Link
          href="/curriculum"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[10px] font-medium transition ${
            location === '/curriculum' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="bottom-nav-curriculum"
        >
          <GraduationCap size={18} />
          <span>Syllabus</span>
        </Link>

        <Link
          href="/study"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[10px] font-medium transition ${
            location === '/study' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="bottom-nav-study"
        >
          <BookOpen size={18} />
          <span>Focus</span>
        </Link>

        <Link
          href="/progress"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[10px] font-medium transition ${
            location === '/progress' ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="bottom-nav-progress"
        >
          <Award size={18} />
          <span>Progress</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground"
          data-testid="bottom-nav-menu"
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* Notion-style Clean Minimal Footer */}
      <footer className="border-t border-border bg-background px-4 py-8 text-xs text-muted-foreground mt-16 hidden md:block">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-foreground">BacklogOS</span>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={() => setIsExploreFeaturesOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border transition"
            >
              Explore BacklogOS Features
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={() => setIsWhyBuiltOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border transition"
              data-testid="link-why-backlogos-built"
            >
              Why BacklogOS was built (Ronik's story)
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            <span>CBSE 2026–27</span>
            <span>·</span>
            <span>Local Authoritative</span>
          </div>
        </div>
      </footer>

      {/* Interactive Feature Architecture Floating Deck Modal */}
      <ExploreFeaturesDeck
        isOpen={isExploreFeaturesOpen}
        onClose={() => setIsExploreFeaturesOpen(false)}
      />

      {/* Interactive Founder Story Deck Modal */}
      <WhyBuiltHoverboard
        isOpen={isWhyBuiltOpen}
        onClose={() => setIsWhyBuiltOpen(false)}
      />
    </div>
  );
}
