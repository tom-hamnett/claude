import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to console for debugging.
    console.error('VANTAGE crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#fafafe' }}>
          <div style={{ maxWidth: 640, background: '#fff', border: '1px solid #eef0f5', borderRadius: 16, padding: 24, boxShadow: '0 8px 24px rgba(16,24,40,.1)' }}>
            <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 24, margin: '0 0 8px', color: '#181b25' }}>Something broke on load</h1>
            <p style={{ color: '#525a6c', margin: '0 0 12px' }}>VANTAGE hit an error while starting. The details below help pinpoint it:</p>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f7f8fb', border: '1px solid #eef0f5', borderRadius: 12, padding: 12, fontSize: 12, color: '#b83a3a', overflow: 'auto', maxHeight: 320 }}>
              {String(this.state.error?.message || this.state.error)}
              {this.state.error?.stack ? '\n\n' + this.state.error.stack : ''}
            </pre>
            <button onClick={() => location.reload()} style={{ marginTop: 16, background: '#6c63ff', color: '#fff', border: 0, borderRadius: 12, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
