import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[40vh] flex items-center justify-center p-8">
          <div className="card text-center max-w-md">
            <h2 className="hc text-2xl mb-4">Something Went Wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button className="btn-gold" onClick={() => this.setState({ hasError: false, error: null })}>Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
