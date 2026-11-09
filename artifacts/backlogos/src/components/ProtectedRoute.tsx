import { type ComponentType, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Loader2, ShieldCheck, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  component: ComponentType<any>;
  [key: string]: any;
}

export function ProtectedRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  const { user, loading, signInAsGuest } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // If not loading and no user, we keep user on this screen with instant recovery options
  }, [user, loading, location]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card p-2 shadow-xs mb-4">
          <img src="/brand/mark-transparent.svg" alt="BacklogOS" className="h-full w-full object-contain animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Verifying student session...</span>
        </div>
      </div>
    );
  }

  // If student is signed in or guest, render protected component
  if (user) {
    return <Component {...rest} />;
  }

  // Graceful barrier if unauthenticated
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center font-sans animate-in fade-in duration-300">
      <div className="max-w-md w-full border border-border bg-card p-6 sm:p-8 rounded-xl shadow-lg space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
          <ShieldCheck size={24} />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
            Protected Student Workspace
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Sign in to access your BacklogOS
          </h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Your study plans, recovery roadmap, and syllabus progress are securely synced to your student account.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            onClick={() => setLocation(`/login?redirect=${encodeURIComponent(location)}`)}
            className="w-full justify-center gap-2 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs py-2.5"
          >
            <span>Sign In to Student Account</span>
            <ArrowRight size={14} />
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              signInAsGuest('Class 11 Aspirant', '11');
            }}
            className="w-full justify-center gap-2 text-xs font-mono py-2"
          >
            <UserPlus size={13} />
            <span>Continue as Guest Mode</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
