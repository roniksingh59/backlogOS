import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AppShell } from '@/components/AppShell';
import { Landing } from '@/pages/Landing';
import { Onboarding } from '@/pages/Onboarding';
import { Roadmap } from '@/pages/Roadmap';
import { Dashboard } from '@/pages/Dashboard';
import { Study } from '@/pages/Study';
import { Flashcards } from '@/pages/Flashcards';
import { CurriculumExplorer } from '@/pages/CurriculumExplorer';
import { Progress } from '@/pages/Progress';
import { AcademicMilestoneCelebration } from '@/components/AcademicMilestoneCelebration';
import { PYQBank } from '@/pages/PYQBank';
import { MockExamSimulator } from '@/pages/MockExamSimulator';
import { RapidRecallDrills } from '@/pages/RapidRecallDrills';
import { Login } from '@/pages/Login';
import { Privacy } from '@/pages/Privacy';
import { Terms } from '@/pages/Terms';
import { Account } from '@/pages/Account';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signin" component={Login} />
          <Route path="/signup" component={Login} />
          <Route path="/register" component={Login} />
          <Route path="/auth" component={Login} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/onboarding"><ProtectedRoute><Onboarding /></ProtectedRoute></Route>
          <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>
          <Route path="/curriculum"><ProtectedRoute><CurriculumExplorer /></ProtectedRoute></Route>
          <Route path="/study"><ProtectedRoute><Study /></ProtectedRoute></Route>
          <Route path="/flashcards"><ProtectedRoute><Flashcards /></ProtectedRoute></Route>
          <Route path="/pyq"><ProtectedRoute><PYQBank /></ProtectedRoute></Route>
          <Route path="/mock-exam"><ProtectedRoute><MockExamSimulator /></ProtectedRoute></Route>
          <Route path="/drills"><ProtectedRoute><RapidRecallDrills /></ProtectedRoute></Route>
          <Route path="/roadmap"><ProtectedRoute><Roadmap /></ProtectedRoute></Route>
          <Route path="/progress"><ProtectedRoute><Progress /></ProtectedRoute></Route>
          <Route path="/account"><ProtectedRoute><Account /></ProtectedRoute></Route>
          <Route path="/workspace"><ProtectedRoute><Account /></ProtectedRoute></Route>
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-[40vh] grid place-items-center text-sm text-muted-foreground">Loading your workspace…</div>;
  }
  if (!user) {
    window.location.replace('/login');
    return null;
  }
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
          <AcademicMilestoneCelebration />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
