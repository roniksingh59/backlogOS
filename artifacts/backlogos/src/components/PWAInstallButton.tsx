import { useState } from 'react';
import { Download, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'pill';
}

export function PWAInstallButton({ className = '', variant = 'header' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running standalone, show subtle "App Mode" status
  if (isInstalled) {
    if (variant === 'banner') return null;
    return (
      <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>App Installed</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`relative overflow-hidden rounded-xl border border-sky-400/30 bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-sky-500/5 p-4 shadow-sm card-hover-lift ${className}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500 text-white font-mono font-bold text-sm shadow-md animate-bounce-subtle">
                📱
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Install BacklogOS on your Phone / Desktop</span>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-mono text-sky-500 uppercase font-bold">Free App</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Launch instantly from your home screen with zero browser bars & offline syllabus access.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 text-xs font-mono font-bold shadow-sm transition btn-press shrink-0"
              data-testid="button-banner-install-app"
            >
              <Download size={13} />
              <span>Install App</span>
              <Sparkles size={12} className="animate-spin-slow" />
            </button>
          </div>
        </div>

        <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 px-2.5 py-1 text-xs font-mono font-medium transition btn-press ${className}`}
        data-testid="button-install-pwa"
        title="Turn this website into a native phone or desktop app"
      >
        <Smartphone size={13} className="text-sky-500 animate-bounce-subtle" />
        <span className="font-semibold">Install App</span>
        <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping" />
      </button>

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
