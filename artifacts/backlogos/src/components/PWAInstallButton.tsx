import { useState } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'pill';
}

export function PWAInstallButton({ className = '', variant = 'header' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      try {
        const success = await install();
        if (success) return;
      } catch {
        // Fall back to opening guide modal
      }
    }
    setIsModalOpen(true);
  };

  if (isInstalled) {
    if (variant === 'banner') return null;
    return (
      <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
        <CheckCircle2 size={13} />
        <span>App Active</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`rounded-xl border border-indigo-500/25 bg-indigo-500/[0.04] p-4 ${className}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
                <Smartphone size={17} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
                  <span>Install BacklogOS App for Distraction-Free Study</span>
                  <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    Free · Offline Ready
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Launch directly from your home screen with offline syllabus checklists and instant Focus Room access.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-mono font-semibold transition shrink-0 cursor-pointer"
              data-testid="button-banner-install-app"
            >
              <Download size={13} />
              <span>Install App</span>
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
        onClick={handleInstallClick}
        className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground px-2.5 py-1.5 text-xs font-mono font-medium transition cursor-pointer shrink-0 ${className}`}
        data-testid="button-install-pwa"
        title="Install BacklogOS as a native phone or desktop app"
      >
        <Smartphone size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="font-semibold hidden sm:inline">Install App</span>
        <span className="font-semibold sm:hidden text-[11px]">App</span>
      </button>

      <PWAInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
