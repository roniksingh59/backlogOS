import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    setIsDark(isCurrentlyDark);
  }, []);

  const toggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('backlogos-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('backlogos-theme', 'light');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground transition hover:border-primary/50 hover:bg-card hover:text-foreground"
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? <Sun size={17} className="text-amber-400 transition-transform rotate-0 hover:rotate-90 duration-300" /> : <Moon size={17} className="text-primary transition-transform hover:-rotate-12 duration-300" />}
    </button>
  );
}
