import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ShieldCheck,
  Database,
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  Trash2,
  PlusCircle,
} from 'lucide-react';

export function Login() {
  const [, setLocation] = useLocation();
  const { user, savedAccounts, signInWithGoogle, linkGoogleAccountDirect, removeSavedAccount, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeAccountEmail, setActiveAccountEmail] = useState<string | null>(null);

  // Link through real Google popup (no typing email/name manually)
  const handleLinkThroughGoogle = async () => {
    try {
      setLoading(true);
      await linkGoogleAccountDirect();
      if (typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ type: 'BACKLOGOS_LOGIN_SUCCESS' }, '*');
        } catch {}
      }
    } catch (err) {
      console.error('Google linking error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-tap select for previously linked accounts on device
  const handleSelectLinkedAccount = async (email: string, name?: string, photo?: string | null) => {
    try {
      setLoading(true);
      setActiveAccountEmail(email);
      await signInWithGoogle(email, name, photo);
      if (typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ type: 'BACKLOGOS_LOGIN_SUCCESS', email }, '*');
        } catch {}
      }
    } catch (err) {
      console.error('Account switch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTab = () => {
    if (typeof window !== 'undefined') {
      window.close();
      setTimeout(() => {
        setLocation('/dashboard');
      }, 300);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 my-6 selection:bg-primary selection:text-primary-foreground font-sans relative">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-1/3 -left-32 w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 sm:p-8 backdrop-blur-xl transition-all">
        {/* SUCCESS STATE — ACCOUNT LINKED */}
        {user && !user.isGuest ? (
          <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 shadow-md">
              <CheckCircle2 size={34} />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 mb-2">
                <Database size={13} />
                <span>Google Account Linked</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Welcome, {user.displayName || 'Student'}!
              </h1>
              <div className="mt-2.5 flex items-center justify-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold">
                    {(user.displayName || user.email || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-foreground leading-tight">{user.displayName || 'Student'}</div>
                  <div className="text-[11px] font-mono text-muted-foreground leading-tight">{user.email}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-left space-y-2">
              <div className="text-[11px] font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                <span>Cloud Storage Active for Your Account</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground font-sans">
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-500 shrink-0" />
                  <span>Your backlog plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-500 shrink-0" />
                  <span>Syllabus checklist</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-500 shrink-0" />
                  <span>Focus session hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-500 shrink-0" />
                  <span>XP & daily streaks</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                onClick={() => setLocation('/dashboard')}
                className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-2.5 text-xs shadow-md transition cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
              <Button
                onClick={handleCloseTab}
                variant="outline"
                className="rounded-xl border-border hover:bg-muted py-2.5 text-xs font-semibold cursor-pointer"
              >
                Close Tab
              </Button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => signOut()}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition underline cursor-pointer"
              >
                Switch Google Account
              </button>
            </div>
          </div>
        ) : (
          /* GOOGLE DIRECT LINKING EXPERIENCE */
          <div className="space-y-5">
            {/* Header with Google Logo */}
            <div className="text-center space-y-2">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-card border border-border shadow-xs p-2.5 mb-1">
                <svg className="h-7 w-7" viewBox="0 0 24 24">
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
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Link Your Google Account
              </h1>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Connect through Google to sync and save your backlog roadmap, study timer, and chapter progress.
              </p>
            </div>

            {/* Primary Action: Direct Google Sign-In Button */}
            <Button
              onClick={handleLinkThroughGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 py-3.5 text-xs font-bold text-foreground shadow-xs transition cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
              )}
              <span>Continue with Google</span>
            </Button>

            {/* Previously Linked Google Accounts on Device */}
            {savedAccounts.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <div className="h-[1px] flex-1 bg-border" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    Or choose a linked account
                  </span>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>

                <div className="border border-border rounded-xl bg-card/60 divide-y divide-border/50 overflow-hidden">
                  {savedAccounts.map((account) => {
                    const isSelected = activeAccountEmail === account.email && loading;
                    const displayName = account.displayName || account.email?.split('@')[0] || 'Student';
                    const initial = displayName.charAt(0).toUpperCase();

                    return (
                      <div
                        key={account.email || account.uid}
                        className="flex items-center justify-between p-3 hover:bg-muted/60 transition group cursor-pointer"
                        onClick={() => handleSelectLinkedAccount(account.email || '', account.displayName || undefined, account.photoURL)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {account.photoURL ? (
                            <img
                              src={account.photoURL}
                              alt={displayName}
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-border shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white grid place-items-center font-bold text-xs shrink-0 shadow-xs">
                              {initial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                              <span>{displayName}</span>
                              {account.email === 's8452543@gmail.com' && (
                                <span className="rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-1 py-0.2 text-[8px] font-mono">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground truncate">
                              {account.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isSelected ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all">
                              →
                            </span>
                          )}
                          {account.email !== 's8452543@gmail.com' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (account.email) removeSavedAccount(account.email);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 rounded transition"
                              title="Remove from device"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Multi-Student Cloud Database Guarantee Note */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-foreground">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>Isolated Student Database Storage</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                BacklogOS stores each student&apos;s chapter checkmarks, timetable, and study sessions in their own separate cloud record.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
