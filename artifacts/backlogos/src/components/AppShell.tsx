import { ArrowRight, BookOpen, BookOpenCheck, ClipboardList, Compass, Layers, Menu, Sparkles, X, HeartHandshake, Info } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';
import { AIFloatingCopilot } from './AIFloatingCopilot';
import { WhyBuiltHoverboard } from './WhyBuiltHoverboard';

export function Logo() {
  return (
    <Link href="/" className="focus-ring flex items-center gap-2.5 group" data-testid="link-logo">
      <span className="grid h-8 w-8 place-items-center rounded bg-foreground text-background font-mono font-bold text-xs">
        B/OS
      </span>
      <div className="flex flex-col">
        <span className="font-display text-base font-bold tracking-tight text-foreground leading-tight">
          BacklogOS
        </span>
        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
          Class 11 PCM Command Center
        </span>
      </div>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isWhyBuiltOpen, setIsWhyBuiltOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleOpen = () => setIsWhyBuiltOpen(true);
    window.addEventListener('open-why-built', handleOpen);
    return () => window.removeEventListener('open-why-built', handleOpen);
  }, []);

  const links = [
    { href: '/', label: 'Overview', icon: BookOpen },
    { href: '/dashboard', label: 'Dashboard', icon: BookOpenCheck },
    { href: '/onboarding', label: 'Plan Generator', icon: ClipboardList },
    { href: '/study', label: 'Focus Room', icon: BookOpen },
    { href: '/flashcards', label: 'Flashcards', icon: Layers },
    { href: '/roadmap', label: 'Syllabus Map', icon: Compass },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                className={`focus-ring flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  location === href
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthButton />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="focus-ring rounded p-1.5 text-foreground md:hidden hover:bg-muted"
              aria-label={open ? 'Close menu' : 'Open menu'}
              data-testid="button-mobile-menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-border bg-card px-4 py-2.5 md:hidden space-y-1" aria-label="Mobile navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}
                className={`focus-ring flex items-center justify-between rounded px-3 py-2 text-xs font-medium ${
                  location === href ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon size={15} />
                  {label}
                </span>
                <ArrowRight size={13} className="opacity-50" />
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* AI Copilot launcher */}
      <AIFloatingCopilot />

      <footer className="border-t border-border bg-card/40 px-4 py-6 text-xs text-muted-foreground mt-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-semibold text-foreground">BacklogOS</span>
            <span>·</span>
            <span>Academic Command Center for Class 11 PCM</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setIsWhyBuiltOpen(true)}
              className="focus-ring text-xs text-foreground/80 hover:text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition"
              data-testid="link-why-backlogos-built"
            >
              Why BacklogOS was built (Ronik's story)
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span>JEE & CBSE SYLLABUS</span>
            <span>·</span>
            <span>RECOVERY PACE ENGINE</span>
          </div>
        </div>
      </footer>

      {/* Interactive Multi-page Hoverboard Deck (Does not navigate or open another tab) */}
      <WhyBuiltHoverboard
        isOpen={isWhyBuiltOpen}
        onClose={() => setIsWhyBuiltOpen(false)}
      />
    </div>
  );
}
