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
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-primary to-accent text-white shadow-md transition-transform duration-300 group-hover:scale-105">
        <Compass size={20} strokeWidth={2.5} />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
        Backlog<span className="gradient-text">OS</span>
      </span>
      <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[10px] font-bold text-primary font-mono tracking-wide">
        🎒 Class 11 PCM
      </span>
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
    { href: '/', label: 'Home', icon: BookOpen },
    { href: '/dashboard', label: 'Dashboard', icon: BookOpenCheck },
    { href: '/onboarding', label: 'Build a plan', icon: ClipboardList },
    { href: '/study', label: 'Study room', icon: BookOpen },
    { href: '/flashcards', label: 'Flashcards', icon: Layers },
    { href: '/roadmap', label: 'My roadmap', icon: Compass },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground paper-grid relative">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
                className={`focus-ring flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  location === href
                    ? 'bg-primary/10 text-primary shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <AuthButton />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="focus-ring rounded-lg p-2 text-foreground md:hidden hover:bg-muted"
              aria-label={open ? 'Close menu' : 'Open menu'}
              data-testid="button-mobile-menu"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-border bg-card/95 backdrop-blur-md px-5 py-3 md:hidden space-y-1" aria-label="Mobile navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}
                className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                  location === href ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                {label}
                <ArrowRight size={14} className="ml-auto opacity-60" />
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main>{children}</main>

      {/* Global AI Copilot launcher accessible from all pages */}
      <AIFloatingCopilot />

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-border/70 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-foreground">BacklogOS</span>
            <span>·</span>
            <span>Class 11 PCM Recovery System</span>
          </span>

          <span className="hidden sm:inline text-border">|</span>

          {/* Hyperlink that triggers the multi-page Hoverboard Deck without opening another page or tab */}
          <button
            type="button"
            onClick={() => setIsWhyBuiltOpen(true)}
            className="focus-ring group inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 hover:border-primary/60 transition shadow-xs"
            data-testid="link-why-backlogos-built"
          >
            <span>📖</span>
            <span className="underline decoration-primary/40 group-hover:decoration-primary underline-offset-2">Why BacklogOS is built?</span>
            <span className="text-[10px] text-muted-foreground font-normal">· Read Ronik's story</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Cloud SQL PostgreSQL Synced</span>
          </span>
          <span>·</span>
          <span className="text-primary font-medium">Bax AI Powered</span>
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
