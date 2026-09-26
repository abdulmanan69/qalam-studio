import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/button';

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-md border border-border bg-card p-6 text-center shadow-card">
        <TriangleAlert className="mx-auto mb-3 size-8 text-destructive" aria-hidden />
        <h1 className="mb-1 text-base font-semibold">{t('errors.title')}</h1>
        <p className="mb-3 text-muted-foreground">{t('errors.description')}</p>
        <pre className="mb-4 max-h-32 overflow-auto rounded-sm bg-muted p-2 text-start font-mono text-xs whitespace-pre-wrap">
          {error.message}
        </pre>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onRetry}>
            {t('errors.retry')}
          </Button>
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('errors.reload')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BoundaryProps {
  resetKey: string;
  children: ReactNode;
}

interface BoundaryState {
  error: Error | null;
  resetKey: string;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    // Navigating to another route clears the error.
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => {
            this.setState({ error: null });
          }}
        />
      );
    }
    return this.props.children;
  }
}

/** Catches render errors per route so one broken page never blanks the whole app. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>;
}
