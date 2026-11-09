import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-6 font-sans">
      <div className="max-w-lg w-full text-center border border-border/80 bg-card p-6 sm:p-8 rounded-xl shadow-lg space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/30 text-destructive mb-2">
          <span className="text-xl">⚠️</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Academic Workspace Recovery
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          The view encountered a temporary render exception. Your BacklogOS study data and progress remain safe.
        </p>
        {import.meta.env.DEV && error?.message ? (
          <pre className="mt-2 overflow-x-auto rounded border border-border bg-muted/30 p-3 text-left font-mono text-xs text-muted-foreground">
            {error.message}
          </pre>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={resetError}
            className="rounded-lg bg-foreground text-background px-4 py-2 text-xs font-bold hover:bg-foreground/90 transition shadow-xs cursor-pointer"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/dashboard';
              }
            }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-mono text-foreground hover:bg-muted transition cursor-pointer"
          >
            Open Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-mono text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}


export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
