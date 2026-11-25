import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  Loader2,
  LogOut,
  RefreshCw,
  Database,
  HardDrive,
  Sparkles,
  GraduationCap,
  User as UserIcon,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'wouter';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { user, loading, syncStatus, syncError, signOut, syncDataNow, updateStudentProfile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'email' | 'google'>('email');

  const openAuthWithTab = (tab: 'email' | 'google') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const handleGradeChange = async (newGrade: '11' | '12') => {
    if (!user) return;
    await updateStudentProfile({ grade: newGrade });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="font-mono text-[11px]">Connecting...</span>
      </div>
    );
  }

  const isGuest = user?.isGuest || false;
  const isOffline = syncStatus === 'offline';
  const gradeDisplay = user?.grade ? `Class ${user.grade}` : 'Class 11';
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <>
      {!user ? (
        <div className="flex items-center gap-1.5 shrink-0">
          {isInIframe ? (
            <>
              <a
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted shrink-0 cursor-pointer"
                title="Open Sign In in a new tab"
              >
                <UserIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Sign In</span>
                <ExternalLink size={11} className="text-muted-foreground opacity-70" />
              </a>
              <a
                href="/signup"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring hidden xs:inline-flex items-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-2.5 py-1.5 text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
                title="Open Sign Up in a new tab"
              >
                <span>Sign Up</span>
                <ExternalLink size={10} className="text-white/80" />
              </a>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted shrink-0 cursor-pointer"
              >
                <UserIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="focus-ring hidden xs:inline-flex items-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white px-2.5 py-1.5 text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
              >
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="focus-ring flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border/80 bg-card p-1 sm:p-1.5 pr-2 sm:pr-2.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-muted/60 shrink-0 cursor-pointer"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full object-cover ring-1 ring-border shrink-0"
                />
              ) : (
                <div className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary shrink-0">
                  {(user.displayName || user.email || 'S').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col text-left leading-none min-w-0">
                <span className="max-w-[70px] sm:max-w-[100px] truncate font-semibold text-[11px] sm:text-xs">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Student'}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground uppercase">
                  {gradeDisplay}
                </span>
              </div>
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-500 animate-pulse'
                    : isOffline || isGuest
                    ? 'bg-sky-400'
                    : 'bg-muted-foreground/40'
                }`}
                title={`Sync status: ${syncStatus}`}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 shadow-xl font-sans">
            <DropdownMenuLabel className="font-normal p-1.5">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold leading-none text-foreground">
                    {user.displayName || 'Student Aspirant'}
                  </p>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono font-medium text-primary">
                    {gradeDisplay}
                  </span>
                </div>
                {user.email && (
                  <p className="text-[11px] leading-none text-muted-foreground truncate font-mono">
                    {user.email}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* My Account & Workspace Link */}
            <DropdownMenuItem asChild>
              <Link
                href="/account"
                className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="font-bold">My Account & Workspace</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Profile, subjects, and study metrics</div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono">→</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Quick Class Grade Selector */}
            <div className="px-1.5 py-1">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                Switch CBSE Class
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['11', '12'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGradeChange(g)}
                    className={`py-1 text-[11px] font-mono rounded border transition cursor-pointer ${
                      (user.grade || '11') === g
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    Class {g}
                  </button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />

            {/* Sync Status Banner */}
            {isGuest ? (
              <div className="my-1 flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                <HardDrive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">Local Guest Mode</span>
                  <div className="text-[10px] text-amber-700/90 dark:text-amber-400/90">
                    Saved on this device only — sign in to sync
                  </div>
                </div>
              </div>
            ) : syncStatus === 'error' ? (
              <div
                className="my-1 flex items-center gap-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-800 dark:text-rose-300"
                title={syncError || 'Cloud sync failed'}
              >
                <Database className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">Cloud Sync Issue</span>
                  <div className="text-[10px] text-rose-700/90 dark:text-rose-400/90 truncate">
                    {syncError || 'Tap retry to sync with cloud'}
                  </div>
                </div>
              </div>
            ) : isOffline ? (
              <div className="my-1 flex items-center gap-2 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-800 dark:text-sky-300">
                <HardDrive className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">Offline Mode</span>
                  <div className="text-[10px] text-sky-700/80 dark:text-sky-400/80">
                    Changes queued locally
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-1 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold">Secure Cloud Connected</span>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                    {syncStatus === 'syncing'
                      ? 'Syncing across devices...'
                      : syncStatus === 'synced'
                      ? 'All roadmaps backed up'
                      : 'Active sync available'}
                  </div>
                </div>
                {syncStatus === 'syncing' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </div>
            )}

            {isGuest ? (
              <DropdownMenuItem asChild>
                <Link
                  href="/login"
                  className="flex cursor-pointer items-center gap-2 rounded-lg text-xs font-semibold text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sign in to enable cross-device sync</span>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => syncDataNow()}
                className="flex cursor-pointer items-center gap-2 rounded-lg text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Sync study progress now</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild>
              {isInIframe ? (
                <a
                  href="/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Switch student account</span>
                  </div>
                  <ExternalLink size={11} className="text-muted-foreground opacity-70" />
                </a>
              ) : (
                <Link
                  href="/login"
                  className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 text-xs text-foreground hover:bg-muted transition"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Switch student account</span>
                  </div>
                </Link>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="flex cursor-pointer items-center gap-2 rounded-lg text-xs text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Render modal consistently outside conditional branches */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
      />
    </>
  );
}
