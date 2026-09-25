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
} from 'lucide-react';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { user, loading, syncStatus, signOut, syncDataNow } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Button
          onClick={() => setModalOpen(true)}
          variant="outline"
          size="sm"
          className="focus-ring flex items-center gap-2 rounded-xl border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition hover:bg-muted"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in</span>
        </Button>

        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const isGuest = user.isGuest || false;
  const isOffline = syncStatus === 'offline';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="focus-ring flex items-center gap-2 rounded-xl border border-border/80 bg-card p-1.5 pr-2.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:bg-muted/60"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {(user.displayName || user.email || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="max-w-[90px] truncate font-semibold">
              {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                syncStatus === 'synced'
                  ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-500 animate-pulse'
                  : isOffline || isGuest
                  ? 'bg-sky-400'
                  : 'bg-muted-foreground/40'
              }`}
              title={`Status: ${syncStatus}`}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl p-2 shadow-lg">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold leading-none text-foreground">{user.displayName || 'Student'}</p>
                {isGuest && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">Local</span>
                )}
              </div>
              <p className="text-[11px] leading-none text-muted-foreground truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Sync indicator banner */}
          {syncStatus === 'synced' ? (
            <div className="my-1.5 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-300">
              <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Cloud SQL Synced</span>
                <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">Roadmap backed up online</div>
              </div>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          ) : (
            <div className="my-1.5 flex items-center gap-2 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-800 dark:text-sky-300">
              <HardDrive className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Local Storage Active</span>
                <div className="text-[10px] text-sky-700/80 dark:text-sky-400/80">
                  {isGuest ? 'Offline profile saved' : 'Protected on device'}
                </div>
              </div>
            </div>
          )}

          {!isGuest && (
            <DropdownMenuItem
              onClick={() => syncDataNow()}
              className="flex cursor-pointer items-center gap-2 rounded-lg text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Sync plan now</span>
            </DropdownMenuItem>
          )}

          {isGuest && (
            <DropdownMenuItem
              onClick={() => setModalOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-lg text-xs text-primary"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Connect Google Account</span>
            </DropdownMenuItem>
          )}

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

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
