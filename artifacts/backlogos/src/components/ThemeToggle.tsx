import { useEffect, useState, useRef } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

export type ThemePreference = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('backlogos-theme') as ThemePreference | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    }
    return 'dark';
  });

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (currentTheme: ThemePreference) => {
      let isDark = false;
      if (currentTheme === 'system') {
        isDark = mediaQuery.matches;
      } else {
        isDark = currentTheme === 'dark';
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectTheme = (newTheme: ThemePreference) => {
    setTheme(newTheme);
    localStorage.setItem('backlogos-theme', newTheme);
    setIsOpen(false);
  };

  const getActiveIcon = () => {
    if (theme === 'system') return <Monitor size={14} className="text-muted-foreground" />;
    if (theme === 'dark') return <Moon size={14} className="text-foreground" />;
    return <Sun size={14} className="text-foreground" />;
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Select color theme (Light, Dark, System)"
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground transition hover:border-foreground/30 hover:bg-muted hover:text-foreground"
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
        data-testid="button-theme-toggle"
      >
        {getActiveIcon()}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-36 origin-top-right rounded-md border border-border bg-card p-1 shadow-md z-50 text-xs font-mono animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => selectTheme('light')}
            className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 transition ${
              theme === 'light'
                ? 'bg-muted font-bold text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
            data-testid="theme-option-light"
          >
            <div className="flex items-center gap-2">
              <Sun size={13} />
              <span>Light</span>
            </div>
            {theme === 'light' && <Check size={12} className="text-foreground" />}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => selectTheme('dark')}
            className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 transition ${
              theme === 'dark'
                ? 'bg-muted font-bold text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
            data-testid="theme-option-dark"
          >
            <div className="flex items-center gap-2">
              <Moon size={13} />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <Check size={12} className="text-foreground" />}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => selectTheme('system')}
            className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 transition ${
              theme === 'system'
                ? 'bg-muted font-bold text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
            data-testid="theme-option-system"
          >
            <div className="flex items-center gap-2">
              <Monitor size={13} />
              <span>System</span>
            </div>
            {theme === 'system' && <Check size={12} className="text-foreground" />}
          </button>
        </div>
      )}
    </div>
  );
}
