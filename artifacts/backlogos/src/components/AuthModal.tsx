import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  User as UserIcon,
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import { useAuth, type AuthErrorInfo } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    user,
    authError,
    clearAuthError,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'options' | 'guest' | 'email'>('options');
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isNetlify = currentHostname.includes('netlify.app');

  // Close modal when user is logged in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  // If there's an unauthorized domain error, switch to options to view the banner
  useEffect(() => {
    if (authError?.isUnauthorizedDomain) {
      setActiveTab('options');
    }
  }, [authError]);

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWildcardDomain = () => {
    navigator.clipboard.writeText('netlify.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithGoogle();
    } catch (e: any) {
      console.error('Google sign in error:', e);
      if (e?.code === 'auth/unauthorized-domain') {
        // Will be shown via authError
      } else if (e?.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. You can use Redirect Sign-in below or Instant Student Profile.');
      } else {
        setErrorMessage(e?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await signInWithGoogleRedirect();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Redirect failed.');
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInAsGuest(guestName || 'Class 11 Aspirant');
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      if (isRegistering) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (e: any) {
      setErrorMessage(e?.message?.replace('Firebase: ', '') || 'Email authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            clearAuthError();
            onClose();
          }}
          className="absolute right-4 top-4 rounded-xl p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Sign In to BacklogOS</h2>
            <p className="text-xs text-muted-foreground">Keep your PCM chapters, study sessions & roadmap in sync</p>
          </div>
        </div>

        {/* Netlify / Unauthorized Domain Alert Banner */}
        {(authError?.isUnauthorizedDomain || isNetlify) && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1 space-y-1.5">
                <div className="font-semibold text-amber-500">
                  {isNetlify ? 'Netlify Hosting Detected' : 'Firebase Domain Authorization Required'}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Firebase Google Sign-In requires your Netlify domain to be listed in Authorized Domains.
                </p>

                {/* Domain Pill + Copy */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-card px-2 py-1 font-mono text-[11px] text-foreground">
                    <Globe size={12} className="text-muted-foreground" />
                    <span>{currentHostname}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-300 transition"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied!' : 'Copy Domain'}</span>
                  </button>
                </div>

                {/* Instructions Dropdown / Steps */}
                <div className="mt-2 rounded-lg bg-background/50 p-2 text-[10px] text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">To enable Google OAuth on this Netlify site:</p>
                  <ol className="list-decimal pl-3 space-y-0.5">
                    <li>Open Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</li>
                    <li>Add: <code className="text-primary font-mono">{currentHostname}</code> or <code className="text-primary font-mono">netlify.app</code></li>
                  </ol>
                  <div className="pt-1 flex items-center justify-between">
                    <a
                      href="https://console.firebase.google.com/project/total-essence-1lkcn/authentication/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                    >
                      <span>Open Firebase Console</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generic Error message */}
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">{errorMessage}</div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`rounded-lg py-1.5 font-medium transition ${
              activeTab === 'options' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`rounded-lg py-1.5 font-medium transition ${
              activeTab === 'guest' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Instant Student
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`rounded-lg py-1.5 font-medium transition ${
              activeTab === 'email' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Email
          </button>
        </div>

        {/* Tab 1: Google Sign In */}
        {activeTab === 'options' && (
          <div className="space-y-3">
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card hover:bg-muted py-2.5 text-xs font-semibold text-foreground shadow-xs transition"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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

            <div className="relative my-2 text-center text-[10px] text-muted-foreground uppercase">
              <span className="bg-card px-2 z-10 relative">Or use without setup</span>
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
            </div>

            {/* Instant Student Profile Button */}
            <button
              type="button"
              onClick={() => {
                signInAsGuest('Class 11 Aspirant');
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 py-2.5 text-xs font-semibold text-primary transition"
            >
              <UserIcon size={14} />
              <span>Continue as Student (Instant Access)</span>
            </button>
            <p className="text-[10px] text-center text-muted-foreground">
              Works instantly anywhere (Netlify, local file, preview) with 100% full feature access.
            </p>
          </div>
        )}

        {/* Tab 2: Guest Profile */}
        {activeTab === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-foreground block mb-1">
                Your Student Name / Handle
              </label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Aarav Sharma (JEE 2027)"
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Saves your study roadmap, chapter checkmarks, and notes locally. No setup required!
              </p>
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2 text-xs font-bold"
            >
              <ShieldCheck size={14} className="mr-1.5" />
              <span>Start Studying Instantly</span>
            </Button>
          </form>
        )}

        {/* Tab 3: Email Sign In */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-2.5">
            {isRegistering && (
              <div>
                <label className="text-[10px] font-medium text-foreground block mb-0.5">Your Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Priya Patel"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-medium text-foreground block mb-0.5">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                required
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-foreground block mb-0.5">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground py-2 text-xs font-bold mt-2"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Mail size={14} className="mr-1.5" />
              )}
              <span>{isRegistering ? 'Create Student Account' : 'Sign In with Email'}</span>
            </Button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[11px] text-muted-foreground hover:text-primary transition underline"
              >
                {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
