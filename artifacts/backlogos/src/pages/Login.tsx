import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { readPlan } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  ShieldCheck,
  Database,
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  Mail,
  Lock,
  Phone,
  KeyRound,
  ArrowLeft,
  AlertTriangle,
  User as UserIcon,
} from 'lucide-react';

export function Login() {
  const [location, setLocation] = useLocation();
  const {
    user,
    savedAccounts,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordResetEmail,
    updatePassword,
    signInWithGoogleOAuth,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    signOut,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'email' | 'google' | 'phone'>('email');
  const [isRegistering, setIsRegistering] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname.includes('/signup') ||
        window.location.pathname.includes('/register') ||
        window.location.search.includes('mode=signup') ||
        window.location.search.includes('mode=register')
      );
    }
    return false;
  });
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'9' | '10' | '11' | '12'>('11');

  // Phone form
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formattedPhoneTarget, setFormattedPhoneTarget] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check URL query parameters and paths
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (
        location === '/signup' ||
        location === '/register' ||
        window.location.search.includes('mode=signup') ||
        window.location.search.includes('mode=register')
      ) {
        setIsRegistering(true);
      }

      const isRecovery =
        window.location.search.includes('type=recovery') ||
        window.location.hash.includes('type=recovery') ||
        window.location.search.includes('reset=true');
      if (isRecovery) {
        setIsResettingPassword(true);
      }

      if (window.location.search.includes('tab=phone')) {
        setActiveTab('phone');
      } else if (window.location.search.includes('tab=google')) {
        setActiveTab('google');
      }
    }
  }, [location]);

  // Cooldown countdown
  useEffect(() => {
    let t: any = null;
    if (cooldown > 0) {
      t = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [cooldown]);

  // Automatically redirect authenticated student to student information setup page (/onboarding)
  useEffect(() => {
    if (user && !user.isGuest && !isResettingPassword) {
      notifyLoginSuccess(user);
      const timer = setTimeout(() => {
        setLocation('/onboarding');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user, isResettingPassword, setLocation]);

  const notifyLoginSuccess = (signedInUser?: any) => {
    if (typeof window !== 'undefined') {
      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'BACKLOGOS_LOGIN_SUCCESS', user: signedInUser }, '*');
        } catch {}
      }
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('backlogos_auth_channel');
          bc.postMessage({ type: 'LOGIN_SUCCESS', user: signedInUser });
          bc.close();
        }
      } catch {}
    }
  };

  const handleCloseTab = () => {
    if (typeof window !== 'undefined') {
      window.close();
      setTimeout(() => {
        setLocation('/onboarding');
      }, 200);
    }
  };

  // Handle email submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Password reset update
    if (isResettingPassword) {
      if (!newPassword || newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters.');
        return;
      }
      try {
        setLoading(true);
        const res = await updatePassword(newPassword);
        if (res.success) {
          setSuccessMessage('Password updated successfully! Redirecting...');
          setTimeout(() => {
            setIsResettingPassword(false);
            setLocation('/onboarding');
          }, 1200);
        } else {
          setErrorMessage(res.error || 'Password update failed.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Password update failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Forgot password email request
    if (isForgotPassword) {
      if (!email.trim()) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      try {
        setLoading(true);
        const res = await sendPasswordResetEmail(email.trim());
        if (res.success) {
          setSuccessMessage(`Recovery link sent to ${email.trim()}. Please check your email.`);
        } else {
          setErrorMessage(res.error || 'Could not send recovery email.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Could not send recovery email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      if (isRegistering) {
        const res = await signUpWithEmail(email.trim(), password, studentName, selectedGrade);
        if (res.success) {
          if (res.needsEmailVerification) {
            setSuccessMessage(`Verification email sent to ${email.trim()}. Please confirm your email.`);
          } else {
            setSuccessMessage('Account created successfully!');
            setTimeout(() => setLocation('/onboarding'), 800);
          }
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      } else {
        const res = await signInWithEmail(email.trim(), password);
        if (res.success) {
          notifyLoginSuccess(res.user);
          setSuccessMessage('Signed in successfully! Redirecting to student information setup...');
          setTimeout(() => setLocation('/onboarding'), 600);
        } else {
          setErrorMessage(res.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleOAuth = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await signInWithGoogleOAuth();
      if (!res.success) {
        setErrorMessage(res.error || 'Google login could not be initiated.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP Send
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const raw = phoneNumber.trim().replace(/\D/g, '');
    if (raw.length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    try {
      setLoading(true);
      const res = await sendPhoneOtp(phoneNumber);
      if (res.success) {
        setOtpSent(true);
        setFormattedPhoneTarget(res.formattedPhone);
        setCooldown(60);
        setSuccessMessage(`6-digit OTP sent to ${res.formattedPhone}`);
      } else {
        setErrorMessage(res.error || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('Please enter the 6-digit code received on your phone.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyPhoneOtp(formattedPhoneTarget || phoneNumber, otpCode);
      if (res.success) {
        setSuccessMessage('Phone verified! Redirecting to plan creator...');
        setTimeout(() => setLocation('/onboarding'), 800);
      } else {
        setErrorMessage(res.error || 'Invalid or expired OTP.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed.');
    } finally {
      setLoading(false);
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
        {/* SUCCESS STATE — ACCOUNT SIGNED IN */}
        {user && !user.isGuest ? (
          <div className="text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 shadow-md">
              <CheckCircle2 size={34} />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 mb-2">
                <Database size={13} />
                <span>Account Verified & Active</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Welcome, {user.displayName || 'Student'}!
              </h1>
              <div className="mt-2.5 flex items-center justify-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold">
                    {(user.displayName || user.email || user.phone || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                    <span>{user.displayName || 'Student'}</span>
                    <span className="rounded bg-primary/10 text-primary px-1.5 py-0.2 text-[9px] font-mono">
                      Class {user.grade || '11'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground leading-tight">{user.email || user.phone}</div>
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

            {/* Automatic redirection indicator to student information setup */}
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-xs text-primary font-mono animate-pulse">
              <Loader2 size={14} className="animate-spin" />
              <span>Redirecting to Student Information Setup...</span>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={() => setLocation('/onboarding')}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-2.5 text-xs shadow-md transition cursor-pointer"
              >
                <span>Proceed to Student Information Setup Now</span>
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => signOut()}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition underline cursor-pointer"
              >
                Sign out or Switch Account
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATION FORMS */
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-card border border-border shadow-xs p-2 mb-1">
                <img src="/brand/mark-transparent.svg" alt="BacklogOS" className="h-7 w-7 object-contain" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isResettingPassword
                  ? 'Set New Password'
                  : isForgotPassword
                  ? 'Recover Password'
                  : isRegistering
                  ? 'Create Student Account'
                  : 'Sign in to BacklogOS'}
              </h1>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {isResettingPassword
                  ? 'Enter a secure new password for your account'
                  : isForgotPassword
                  ? 'We will send a password reset link to your email'
                  : 'Sync your syllabus, chapter roadmaps & study progress'}
              </p>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-500 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* Tabs */}
            {!isForgotPassword && !isResettingPassword && (
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('email');
                    setErrorMessage(null);
                  }}
                  className={`rounded-lg py-1.5 font-medium transition cursor-pointer ${
                    activeTab === 'email'
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('google');
                    setErrorMessage(null);
                  }}
                  className={`rounded-lg py-1.5 font-medium transition cursor-pointer ${
                    activeTab === 'google'
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('phone');
                    setErrorMessage(null);
                  }}
                  className={`rounded-lg py-1.5 font-medium transition cursor-pointer ${
                    activeTab === 'phone'
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Phone
                </button>
              </div>
            )}

            {/* TAB 1: EMAIL & PASSWORD */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                {isResettingPassword ? (
                  <>
                    <div>
                      <label className="text-[11px] font-medium text-foreground block mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 h-9 text-xs rounded-xl"
                          required
                          minLength={6}
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                      <span>Save New Password</span>
                    </Button>
                  </>
                ) : isForgotPassword ? (
                  <>
                    <div>
                      <label className="text-[11px] font-medium text-foreground block mb-1">
                        Student Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="pl-9 h-9 text-xs rounded-xl"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <KeyRound className="h-3.5 w-3.5 mr-1.5" />}
                      <span>Send Recovery Link</span>
                    </Button>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setErrorMessage(null);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Back to login</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Register: Name & Class */}
                    {isRegistering && (
                      <>
                        <div>
                          <label className="text-[11px] font-medium text-foreground block mb-1">
                            Student Name
                          </label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              value={studentName}
                              onChange={(e) => setStudentName(e.target.value)}
                              placeholder="e.g. Ronik Sharma"
                              className="pl-9 h-9 text-xs rounded-xl"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-foreground block mb-1">
                            CBSE Class
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(['9', '10', '11', '12'] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setSelectedGrade(g)}
                                className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition cursor-pointer ${
                                  selectedGrade === g
                                    ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                                }`}
                              >
                                Class {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-[11px] font-medium text-foreground block mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="pl-9 h-9 text-xs rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-foreground">Password</label>
                        {!isRegistering && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotPassword(true);
                              setErrorMessage(null);
                            }}
                            className="text-[10px] text-primary hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 h-9 text-xs rounded-xl"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArrowRight className="h-3.5 w-3.5 mr-1.5" />}
                      <span>{isRegistering ? 'Register Account' : 'Sign In'}</span>
                    </Button>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setErrorMessage(null);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {isRegistering ? (
                          <span>Already registered? <strong className="text-primary">Sign In</strong></span>
                        ) : (
                          <span>New student? <strong className="text-primary">Register Account</strong></span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* TAB 2: GOOGLE OAUTH */}
            {activeTab === 'google' && (
              <div className="space-y-3">
                <Button
                  onClick={handleGoogleOAuth}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 py-3 text-xs font-bold text-foreground shadow-xs transition cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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

                {/* Quick device-saved switch */}
                {savedAccounts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase px-1">
                      Or switch to linked student profile:
                    </div>
                    <div className="border border-border rounded-xl bg-card/60 divide-y divide-border/50 overflow-hidden">
                      {savedAccounts.map((account) => {
                        const name = account.displayName || account.email?.split('@')[0] || 'Student';
                        const initial = name.charAt(0).toUpperCase();

                        return (
                          <button
                            key={account.email || account.uid}
                            type="button"
                            onClick={async () => {
                              await signInWithGoogle(account.email || undefined, account.displayName || undefined);
                              notifyLoginSuccess(account);
                              setLocation('/onboarding');
                            }}
                            className="w-full flex items-center justify-between p-2.5 hover:bg-muted/60 transition text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {account.photoURL ? (
                                <img src={account.photoURL} alt="Avatar" className="h-7 w-7 rounded-full object-cover ring-1 ring-border shrink-0" />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white grid place-items-center text-xs font-bold shrink-0">
                                  {initial}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">
                                  {name}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground truncate">
                                  {account.email}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground group-hover:text-primary transition shrink-0">
                              →
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PHONE & OTP */}
            {activeTab === 'phone' && (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-medium text-foreground block mb-1">
                        Mobile Number (India)
                      </label>
                      <div className="flex items-center rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring overflow-hidden">
                        <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 border-r border-border text-xs font-mono font-semibold text-foreground shrink-0">
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="98765 43210"
                          className="border-0 focus-visible:ring-0 h-9 text-xs rounded-none"
                          maxLength={14}
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        A 6-digit OTP will be sent via SMS
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Phone className="h-3.5 w-3.5 mr-1.5" />}
                      <span>Send OTP</span>
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Enter 6-Digit OTP
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                        >
                          Change Number
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="h-9 text-center text-sm font-mono tracking-widest rounded-xl"
                        maxLength={6}
                        required
                        autoFocus
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Sent to {formattedPhoneTarget}</span>
                        {cooldown > 0 ? (
                          <span className="font-mono text-amber-500">Resend in {cooldown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
                            className="text-primary hover:underline font-medium cursor-pointer"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || otpCode.length < 6}
                      className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                      <span>Verify & Proceed to Plan</span>
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* Multi-Student Cloud Database Guarantee Note */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1 mt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-foreground">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>Isolated Student Database Storage</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                BacklogOS encrypts credentials via Secure Student Cloud and protects every student&apos;s chapters and study records with private user isolation.
              </p>
            </div>

            {/* Legal and Privacy Navigation */}
            <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground pt-3 border-t border-border/50">
              <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-4">
                Privacy Policy
              </Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-foreground transition-colors underline underline-offset-4">
                Terms of Service
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
