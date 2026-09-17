import { ArrowRight, BookOpen, BookOpenCheck, ClipboardList, Compass, Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

export function Logo() {
  return (
    <Link href="/" className="focus-ring flex items-center gap-2.5" data-testid="link-logo">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-foreground shadow-sm">
        <Compass size={19} strokeWidth={2.5} />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">Backlog<span className="text-primary">OS</span></span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const links = [
    { href: '/', label: 'Home', icon: BookOpen },
    { href: '/dashboard', label: 'Dashboard', icon: BookOpenCheck },
    { href: '/onboarding', label: 'Build a plan', icon: ClipboardList },
    { href: '/study', label: 'Study room', icon: BookOpen },
    { href: '/roadmap', label: 'My roadmap', icon: Compass },
  ];
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`focus-ring flex items-center gap-2 border-b-2 px-2 py-2 text-sm font-semibold transition-colors ${location === href ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={() => setOpen((value) => !value)} className="focus-ring rounded-lg p-2 text-foreground md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-border bg-card px-5 py-3 md:hidden" aria-label="Mobile navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`} className={`focus-ring flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${location === href ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}>
                <Icon size={17} />
                {label}
                <ArrowRight size={15} className="ml-auto" />
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-border/70 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>BacklogOS · one clear next step.</span>
        <span>Prototype for Class 11 PCM students · no accounts, no advice claims.</span>
      </footer>
    </div>
  );
}