import { useState } from 'react';
import {
  Download,
  Smartphone,
  Monitor,
  Apple,
  Check,
  Sparkles,
  X,
  Share2,
  PlusSquare,
  ExternalLink,
  Copy,
  CheckCheck,
  ShieldCheck,
  Terminal,
  Play,
  Layers,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { triggerGrandCelebration, triggerTaskCelebration } from '@/lib/celebration';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallModal({ isOpen, onClose }: PWAInstallModalProps) {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [platformTab, setPlatformTab] = useState<'playstore' | 'android' | 'ios' | 'desktop'>('playstore');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedBubblewrap, setCopiedBubblewrap] = useState(false);
  const [copiedCapacitor, setCopiedCapacitor] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-n4nawyuhw6h2kcudy6r4tl-803844255745.asia-southeast1.run.app';
  const pwabuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentUrl)}`;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      triggerGrandCelebration();
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    triggerTaskCelebration();
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyBubblewrap = () => {
    const cmd = `npx @bubblewrap/cli init --manifest=${currentUrl}/manifest.webmanifest`;
    navigator.clipboard.writeText(cmd);
    setCopiedBubblewrap(true);
    triggerTaskCelebration();
    setTimeout(() => setCopiedBubblewrap(false), 2500);
  };

  const handleCopyCapacitor = () => {
    const cmd = `npm i @capacitor/core @capacitor/cli @capacitor/android && npx cap init BacklogOS app.backlogos.study --web-dir=dist && npm run build && npx cap add android && npx cap open android`;
    navigator.clipboard.writeText(cmd);
    setCopiedCapacitor(true);
    triggerTaskCelebration();
    setTimeout(() => setCopiedCapacitor(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative my-8 w-full max-w-xl rounded-2xl border border-sky-400/30 bg-card p-6 sm:p-7 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-200">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-80 rounded-full bg-sky-500/20 blur-3xl" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-mono font-bold text-base shadow-md animate-pulse-scale">
              B
            </div>
            <div>
              <h2 id="install-modal-title" className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
                BacklogOS App & Play Store Hub
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  APK / AAB Ready
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Install as a standalone app or package into a Google Play Store APK / AAB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1-Click Native Fast Install Banner (if browser supports it) */}
        {isInstallable && !isInstalled && !installSuccess && (
          <div className="my-4 rounded-xl border border-sky-400/30 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 p-4 text-center space-y-2">
            <p className="text-xs font-semibold text-foreground">
              ⚡ Instant 1-Click Device Installation Available!
            </p>
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 btn-press"
            >
              <Download size={15} />
              <span>INSTALL DIRECTLY TO THIS DEVICE</span>
              <Sparkles size={14} className="animate-spin-slow" />
            </button>
          </div>
        )}

        {/* Already Installed Notification */}
        {(isInstalled || installSuccess) && (
          <div className="my-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center space-y-1">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white font-bold mb-0.5">
              <Check size={16} />
            </div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              BacklogOS is Installed in Standalone Mode!
            </p>
            <p className="text-[11px] text-muted-foreground">
              You can launch it anytime from your app drawer or home screen.
            </p>
          </div>
        )}

        {/* Platform Selection Tabs */}
        <div className="mt-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-2 font-bold">
            Select Method or Device
          </span>

          <div className="grid grid-cols-4 gap-1 p-1 rounded-lg border border-border bg-muted/30 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPlatformTab('playstore')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded transition text-center ${
                platformTab === 'playstore'
                  ? 'bg-foreground text-background font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Play size={12} className="shrink-0 fill-current" />
              <span className="truncate">Play Store</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatformTab('android')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded transition text-center ${
                platformTab === 'android'
                  ? 'bg-foreground text-background font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone size={12} className="shrink-0" />
              <span className="truncate">Android</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatformTab('ios')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded transition text-center ${
                platformTab === 'ios'
                  ? 'bg-foreground text-background font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Apple size={12} className="shrink-0" />
              <span className="truncate">iOS</span>
            </button>

            <button
              type="button"
              onClick={() => setPlatformTab('desktop')}
              className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded transition text-center ${
                platformTab === 'desktop'
                  ? 'bg-foreground text-background font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor size={12} className="shrink-0" />
              <span className="truncate">PC/Mac</span>
            </button>
          </div>
        </div>

        {/* Platform Content Body */}
        <div className="mt-4 rounded-xl border border-border bg-background p-4 text-xs space-y-3 font-sans">
          {/* PLAY STORE TAB */}
          {platformTab === 'playstore' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold text-xs">
                    <ShieldCheck size={15} />
                    <span>Google Trusted Web Activity (TWA) Ready</span>
                  </div>
                  <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono text-sky-500 font-semibold border border-sky-500/20">
                    Official Google Spec
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  BacklogOS has a verified PWA manifest, service worker caching, and Digital Asset Links (<code className="font-mono text-[10px] text-foreground">/.well-known/assetlinks.json</code>). You can generate an <strong>Android App Bundle (.aab)</strong> to publish on the <strong>Google Play Store</strong>, or an <strong>APK file</strong> to install directly on any Android phone!
                </p>
              </div>

              {/* Instant Builder Card */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Layers size={14} className="text-amber-500" />
                    Option 1: 1-Click APK / Play Store Bundle (PWABuilder)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">Fastest (2 min)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  PWABuilder (backed by Microsoft & Google) scans your URL and automatically compiles the signed <code className="font-mono text-[10px]">.aab</code> and test <code className="font-mono text-[10px]">.apk</code> package for free.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 rounded border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] font-mono text-foreground truncate select-all focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="shrink-0 inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 text-xs font-mono font-medium hover:bg-muted transition"
                  >
                    {copiedUrl ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <a
                  href={pwabuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded bg-foreground text-background py-2 text-xs font-bold hover:bg-foreground/90 transition shadow-xs"
                >
                  <span>Build APK & Play Store Bundle on PWABuilder</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Step-by-Step Play Store Checklist */}
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                <span className="font-bold text-xs text-foreground block">
                  Publishing Steps on Google Play Console:
                </span>
                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-foreground shrink-0">1.</span>
                    <span>Download your signed <strong>.aab (Android App Bundle)</strong> from PWABuilder or Bubblewrap.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-foreground shrink-0">2.</span>
                    <span>Sign in to <a href="https://play.google.com/console" target="_blank" rel="noreferrer" className="text-sky-500 underline inline-flex items-center gap-0.5">Google Play Console <ExternalLink size={10} /></a> (one-time $25 Google registration fee).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-foreground shrink-0">3.</span>
                    <span>Click <strong>"Create App"</strong> &rarr; Fill name: <strong>BacklogOS</strong> &rarr; Category: <strong>Education</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-foreground shrink-0">4.</span>
                    <span>Under <strong>Production / Releases</strong>, upload the <code className="font-mono text-[10px]">.aab</code> bundle.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-foreground shrink-0">5.</span>
                    <span>Add app description, high-res 512x512 icon, and screenshots (provided in BacklogOS).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-foreground shrink-0">6.</span>
                    <span>Submit for review! Google verifies within 24-48 hours and your app goes live worldwide on Google Play Store! 🚀</span>
                  </div>
                </div>
              </div>

              {/* Option 2: CLI for Developers */}
              <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Terminal size={13} className="text-muted-foreground" />
                    Option 2: Google Bubblewrap CLI (Official TWA)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyBubblewrap}
                    className="text-[10px] font-mono text-sky-500 hover:underline flex items-center gap-1"
                  >
                    {copiedBubblewrap ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedBubblewrap ? 'Copied' : 'Copy command'}</span>
                  </button>
                </div>
                <pre className="rounded bg-muted/60 p-2 font-mono text-[10px] text-foreground overflow-x-auto">
{`npx @bubblewrap/cli init --manifest=${currentUrl}/manifest.webmanifest
npx @bubblewrap/cli build`}
                </pre>
              </div>

              {/* Option 3: Capacitor (Full Native Android Studio Project) */}
              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Terminal size={13} className="text-emerald-500" />
                    Option 3: Capacitor (Android Studio Native APK)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCapacitor}
                    className="text-[10px] font-mono text-emerald-500 hover:underline flex items-center gap-1"
                  >
                    {copiedCapacitor ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCapacitor ? 'Copied' : 'Copy setup'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Best if you want to open in <strong>Android Studio</strong>, add native hardware plugins (vibration, screen awake, push notifications), and bundle the code inside the APK directly. Pre-configured <code className="font-mono text-[10px] text-foreground">capacitor.config.json</code> is already included!
                </p>
                <pre className="rounded bg-muted/60 p-2 font-mono text-[10px] text-foreground overflow-x-auto">
{`npm i @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap open android`}
                </pre>
              </div>
            </div>
          )}

          {/* ANDROID TAB */}
          {platformTab === 'android' && (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  1
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Open this link in <strong className="text-foreground">Google Chrome</strong> on your Android phone.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  2
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Tap the <strong className="text-foreground">Three Dots (⋮)</strong> menu in the top-right corner.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  3
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Tap <strong className="text-foreground">"Install App"</strong> or <strong className="text-foreground">"Add to Home screen"</strong>.
                </p>
              </div>

              <div className="mt-3 p-2.5 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground">
                🎉 That's it! BacklogOS will appear on your phone's app drawer with its own app icon and launch in full screen with zero URL bar, just like a Play Store app.
              </div>
            </div>
          )}

          {/* IOS TAB */}
          {platformTab === 'ios' && (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  1
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Open this website in <strong className="text-foreground">Safari</strong> on your iPhone or iPad.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  2
                </span>
                <div className="leading-relaxed text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>Tap the</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-foreground">
                    <Share2 size={12} /> Share
                  </span>
                  <span>icon at the bottom bar of Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  3
                </span>
                <div className="leading-relaxed text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span>Scroll down and tap</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-foreground">
                    <PlusSquare size={12} /> Add to Home Screen
                  </span>
                  <span>, then tap <strong>Add</strong> in the top right.</span>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground">
                📱 The BacklogOS icon will be placed directly onto your iPhone home screen!
              </div>
            </div>
          )}

          {/* DESKTOP TAB */}
          {platformTab === 'desktop' && (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  1
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Open in <strong className="text-foreground">Chrome, Edge, or Brave</strong> on Windows or Mac.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  2
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Look at the right side of your URL address bar for the <strong className="text-foreground">Install icon</strong> (computer monitor with a down arrow).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-500/20 text-sky-500 font-mono text-[10px] font-bold">
                  3
                </span>
                <p className="leading-relaxed text-muted-foreground">
                  Click <strong className="text-foreground">"Install BacklogOS"</strong>. It will open in its own distraction-free desktop window!
                </p>
              </div>

              <div className="mt-3 p-2.5 rounded bg-muted/40 border border-border/60 text-[11px] text-muted-foreground">
                💻 Works offline, loads in &lt;100ms, and pins straight to your Windows Taskbar or macOS Dock!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-card px-4 py-2 text-xs font-mono font-medium hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
