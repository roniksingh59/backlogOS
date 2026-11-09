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
import { AuthProvider } from '@/lib/auth-context';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

// Ensure base is undefined when root '/' to prevent empty string route mismatch in wouter v3
const appBase =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/'
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined;

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
          <Route path="/onboarding" component={Onboarding} />

          {/* Protected Student Workspace Routes */}
          <Route path="/dashboard">
            <ProtectedRoute component={Dashboard} />
          </Route>
          <Route path="/study">
            <ProtectedRoute component={Study} />
          </Route>
          <Route path="/roadmap">
            <ProtectedRoute component={Roadmap} />
          </Route>
          <Route path="/progress">
            <ProtectedRoute component={Progress} />
          </Route>
          <Route path="/account">
            <ProtectedRoute component={Account} />
          </Route>
          <Route path="/workspace">
            <ProtectedRoute component={Account} />
          </Route>

          {/* Practice & Academic Tools */}
          <Route path="/curriculum" component={CurriculumExplorer} />
          <Route path="/flashcards" component={Flashcards} />
          <Route path="/pyq" component={PYQBank} />
          <Route path="/mock-exam" component={MockExamSimulator} />
          <Route path="/drills" component={RapidRecallDrills} />

          {/* 404 Catch-All */}
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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            {appBase ? (
              <WouterRouter base={appBase}>
                <Router />
                <AcademicMilestoneCelebration />
              </WouterRouter>
            ) : (
              <>
                <Router />
                <AcademicMilestoneCelebration />
              </>
            )}
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
