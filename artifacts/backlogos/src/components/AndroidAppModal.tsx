import { useState } from 'react';
import {
  X,
  Smartphone,
  CheckCircle2,
  Download,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AndroidAppModal({ isOpen, onClose }: AndroidAppModalProps) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const commands = [
    {
      label: '1. Install Capacitor in your project',
      cmd: 'npm install @capacitor/core @capacitor/cli @capacitor/android',
    },
    {
      label: '2. Initialize & Add Android platform',
      cmd: 'npx cap add android',
    },
    {
      label: '3. Build & Open in Android Studio to export APK / AAB',
      cmd: 'npm run build && npx cap sync && npx cap open android',
    },
  ];

  const handleCopyCmd = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    toast({
      title: 'Command Copied',
      description: cmd,
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="android-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/30 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-sm">
              <Smartphone size={17} />
            </div>
            <div>
              <h3 id="android-modal-title" className="text-sm font-bold text-foreground flex items-center gap-2">
                Mobile & Play Store Packaging
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Capacitor Ready
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                Run natively on Android phones or deploy to Google Play Store
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close Android modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Method 1: Instant PWA Install */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-300">
              <Sparkles size={14} className="text-emerald-500" />
              <span>Method 1: Instant Phone App (No Store Required)</span>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              BacklogOS is a full <strong>Progressive Web App (PWA)</strong>. On Chrome for Android or Safari for iOS, tap the browser menu (⋮) and select <strong>"Add to Home screen"</strong>. It installs with full offline access, zero address bar, and dedicated app icon!
            </p>
          </div>

          {/* Method 2: Capacitor APK / AAB for Google Play Store */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Terminal size={14} className="text-primary" />
                <span>Method 2: Export Android APK with Capacitor</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Pre-configured in <code>capacitor.config.json</code>
              </span>
            </div>

            <div className="space-y-2">
              {commands.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/70 bg-muted/20 p-2.5 text-xs space-y-1"
                >
                  <div className="text-[10px] font-mono text-muted-foreground font-bold">
                    {item.label}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-background/90 rounded-lg p-2 border border-border/50 font-mono text-[11px]">
                    <code className="text-foreground truncate">{item.cmd}</code>
                    <button
                      type="button"
                      onClick={() => handleCopyCmd(item.cmd, idx)}
                      className="p-1 text-muted-foreground hover:text-foreground transition rounded"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? (
                        <Check size={12} className="text-emerald-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed bg-muted/30 rounded-lg p-2.5">
              💡 <strong>Play Store Ready:</strong> Once opened in Android Studio, select <strong>Build &gt; Generate Signed Bundle / APK</strong> to generate the <code>.aab</code> file required by the Google Play Console!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
