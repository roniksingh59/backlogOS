import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RotateCcw,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { useAuth, type AuthErrorInfo } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'email' | 'google' | 'phone';
}

export function AuthModal({ isOpen, onClose, initialTab = 'email' }: AuthModalProps) {
  const {
    user,
    authError,
    clearAuthError,
    savedAccounts,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordResetEmail,
    signInWithGoogleOAuth,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInAsGuest,
  } = useAuth();

  // Navigation & Form State
  const [activeTab, setActiveTab] = useState<'email' | 'google' | 'phone' | 'guest'>('email');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<'9' | '10' | '11' | '12'>('11');

  // Phone form
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [formattedPhoneTarget, setFormattedPhoneTarget] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Guest form
  const [guestName, setGuestName] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle OTP cooldown timer
  useEffect(() => {
    let timer: any = null;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // Close modal when user signs in to full account
  useEffect(() => {
    if (user && !user.isGuest && isOpen) {
      onClose();
    }
  }, [user, isOpen, onClose]);

  // Clean error messages on tab switch
  const handleTabSwitch = (tab: 'email' | 'google' | 'phone' | 'guest') => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
    clearAuthError();
  };

  // 1. Email Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    // Forgot password flow
    if (isForgotPassword) {
      try {
        setLoading(true);
        const res = await sendPasswordResetEmail(email.trim());
        if (res.success) {
          setSuccessMessage(`Password recovery link sent to ${email.trim()}. Please check your inbox.`);
        } else {
          setErrorMessage(res.error || 'Failed to send recovery email.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Password reset failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      if (isRegistering) {
        const res = await signUpWithEmail(email.trim(), password, studentName, selectedGrade);
        if (res.success) {
          if (res.needsEmailVerification) {
            setEmailVerificationNeeded(true);
            setSuccessMessage(`Confirmation link sent to ${email.trim()}. Please verify your email to log in.`);
          } else {
            setSuccessMessage('Student account registered successfully!');
            onClose();
          }
        } else {
          setErrorMessage(res.error || 'Registration failed.');
        }
      } else {
        const res = await signInWithEmail(email.trim(), password);
        if (res.success) {
          onClose();
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

  // 2. Google OAuth Submit
  const handleGoogleOAuthSubmit = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await signInWithGoogleOAuth();
      if (!res.success) {
        setErrorMessage(res.error || 'Google sign-in could not be initiated.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Phone OTP Send
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const raw = phoneNumber.trim().replace(/\D/g, '');
    if (raw.length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
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
        setErrorMessage(res.error || 'Failed to send OTP. Please ensure SMS is configured in your Supabase dashboard.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Phone OTP Verify
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the 6-digit OTP received on your phone.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyPhoneOtp(formattedPhoneTarget || phoneNumber, otpCode.trim());
      if (res.success) {
        setSuccessMessage('Phone verified successfully!');
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid or expired OTP. Please request a new code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Guest Profile Submit
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signInAsGuest(guestName || 'Class ' + selectedGrade + ' Aspirant', selectedGrade);
    onClose();
  };

  // If closed, return null cleanly AFTER all hooks
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl transition-all font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            clearAuthError();
            onClose();
          }}
          className="absolute right-3.5 top-3.5 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Header with Official BacklogOS Brand Mark */}
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 border border-primary/20 shadow-xs">
            <img src="/brand/mark-transparent.svg" alt="BacklogOS" className="h-6 w-6 object-contain" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              {isForgotPassword
                ? 'Reset Password'
                : isRegistering
                ? 'Join BacklogOS'
                : 'Sign in to BacklogOS'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isForgotPassword
                ? 'Enter your student email to receive a recovery link'
                : 'Sync your syllabus, chapter roadmaps & study progress'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {(errorMessage || authError?.message) && (
          <div className="mb-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">
              {errorMessage || authError?.message}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-500 flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Verification Alert */}
        {emailVerificationNeeded && (
          <div className="mb-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-500 flex items-start gap-2">
            <Mail className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px]">
              Confirmation email sent. Click the link in your email to activate your account.
            </div>
          </div>
        )}

        {/* Tab Selection */}
        {!isForgotPassword && (
          <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleTabSwitch('email')}
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
              onClick={() => handleTabSwitch('google')}
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
              onClick={() => handleTabSwitch('phone')}
              className={`rounded-lg py-1.5 font-medium transition cursor-pointer ${
                activeTab === 'phone'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('guest')}
              className={`rounded-lg py-1.5 font-medium transition cursor-pointer ${
                activeTab === 'guest'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Guest
            </button>
          </div>
        )}

        {/* TAB 1: EMAIL & PASSWORD */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {isForgotPassword ? (
              <>
                <div>
                  <label className="text-[11px] font-medium text-foreground block mb-1">
                    Student Email Address
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
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>Send Recovery Email</span>
                </Button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setErrorMessage(null);
                      setSuccessMessage(null);
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
                {/* Registration Only: Student Name & Class Grade */}
                {isRegistering && (
                  <>
                    <div>
                      <label className="text-[11px] font-medium text-foreground block mb-1">
                        Full Name / Student Name
                      </label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="e.g. Aarav Sharma"
                          className="pl-9 h-9 text-xs rounded-xl"
                          required={isRegistering}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-foreground block mb-1">
                        CBSE Class / Grade
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
                          setSuccessMessage(null);
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
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>{isRegistering ? 'Create Student Account' : 'Sign In'}</span>
                </Button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition"
                  >
                    {isRegistering ? (
                      <span>Already have an account? <strong className="text-primary">Sign In</strong></span>
                    ) : (
                      <span>Don't have an account? <strong className="text-primary">Register Free</strong></span>
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
              onClick={handleGoogleOAuthSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 py-2.5 text-xs font-bold text-foreground shadow-xs transition cursor-pointer"
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

            {/* Quick Switch for Previously Linked Accounts */}
            {savedAccounts.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-mono text-muted-foreground uppercase px-1">
                  Or switch to linked profile:
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
                          onClose();
                        }}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-2.5 hover:bg-muted/60 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {account.photoURL ? (
                            <img
                              src={account.photoURL}
                              alt="Avatar"
                              className="h-7 w-7 rounded-full object-cover ring-1 ring-border shrink-0"
                            />
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

        {/* TAB 3: PHONE & OTP (INDIAN +91 DEFAULT) */}
        {activeTab === 'phone' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-foreground block mb-1">
                    Mobile Number (India)
                  </label>
                  <div className="flex items-center rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
                    <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 border-r border-border text-xs font-mono font-semibold text-foreground shrink-0">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-xs rounded-none"
                      maxLength={14}
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    A 6-digit verification code will be sent via SMS
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>Send OTP</span>
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
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
                        onClick={() => handleSendPhoneOtp()}
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
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  <span>Verify OTP & Sign In</span>
                </Button>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: GUEST PROFILE */}
        {activeTab === 'guest' && (
          <form onSubmit={handleGuestSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-foreground block mb-1">
                Student Name / Handle
              </label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-foreground block mb-1">
                CBSE Class / Grade
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

            <Button
              type="submit"
              className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              <span>Start as Guest Student</span>
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Guest progress is saved locally on this browser. You can link an account anytime.
            </p>
          </form>
        )}

        {/* Separate Tab Link */}
        <div className="mt-3.5 pt-2.5 flex items-center justify-center border-t border-border/40 text-[11px]">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="text-primary hover:underline flex items-center gap-1.5 font-medium"
          >
            <span>Open Login in a separate full tab</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Security Footer */}
        <div className="mt-2.5 pt-2 border-t border-border/30 text-[10px] font-mono text-muted-foreground text-center flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>Secured by Academic Cloud · Private Student Vault</span>
        </div>
      </div>
    </div>
  );
}
