import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Zap,
  FileText,
  Layers,
  Timer,
  ChevronDown,
} from 'lucide-react';

interface PracticeNavDropdownProps {
  onNavigate?: () => void;
}

export function PracticeNavDropdown({ onNavigate }: PracticeNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const practiceRoutes = ['/drills', '/pyq', '/flashcards', '/mock-exam'];
  const isPracticeActive = practiceRoutes.some((route) => location === route);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = [
    {
      href: '/drills',
      label: 'Formula Drills',
      desc: 'Rapid speed drills for core equations',
      icon: Zap,
      badge: 'Speed Test',
      color: 'text-amber-500',
    },
    {
      href: '/pyq',
      label: 'PYQ Question Bank',
      desc: '10-year chapterwise board patterns',
      icon: FileText,
      badge: 'Repeated PYQ',
      color: 'text-sky-500',
    },
    {
      href: '/flashcards',
      label: 'Active Flashcards',
      desc: 'Spaced retrieval active recall decks',
      icon: Layers,
      badge: 'Recall',
      color: 'text-emerald-500',
    },
    {
      href: '/mock-exam',
      label: 'Mock Exam Simulator',
      desc: 'Timed full-paper test environment',
      icon: Timer,
      badge: 'Timed Exam',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        className={`focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
          isPracticeActive || isOpen
            ? 'bg-muted text-foreground font-semibold shadow-2xs'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:-translate-y-0.5'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="button-nav-practice-dropdown"
      >
        <Zap size={13} className={isPracticeActive ? 'text-amber-500 fill-amber-500/20' : 'text-muted-foreground'} />
        <span>Practice & Tests</span>
        <ChevronDown
          size={12}
          className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180 text-foreground' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          onMouseLeave={() => setIsOpen(false)}
          className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur-xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold border-b border-border/50 mb-1">
            Self-Testing & Retrieval
          </div>

          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate?.();
                  }}
                  className={`group flex items-start gap-2.5 rounded-lg p-2 text-left transition-all ${
                    active
                      ? 'bg-muted text-foreground'
                      : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`link-practice-${item.href.replace('/', '')}`}
                >
                  <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/60 bg-background/80 ${item.color} group-hover:scale-110 transition-transform`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                      <span className="rounded bg-muted/60 px-1 py-0.2 text-[9px] font-mono text-muted-foreground">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
