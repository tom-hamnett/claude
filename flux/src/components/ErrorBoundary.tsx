import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * App-level safety net. A render error anywhere below this boundary is caught
 * and shown as a recoverable message instead of unmounting the whole React tree
 * (which previously left the app a blank, unusable screen).
 */
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; never let it bubble up and blank the app.
    console.error('FLUX render error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="card max-w-md p-6 text-center">
            <h1 className="text-lg font-semibold text-ink-800">Something went wrong on this screen</h1>
            <p className="mt-2 text-sm text-ink-500">
              The rest of FLUX is fine — this view hit an unexpected error and was stopped before it could take the app down.
            </p>
            <p className="mt-2 break-words text-xs text-ink-400">{this.state.error.message}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button className="btn-primary" onClick={() => { this.reset(); location.hash = '#/'; }}>
                Back to dashboard
              </button>
              <button className="btn-ghost" onClick={() => location.reload()}>
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
