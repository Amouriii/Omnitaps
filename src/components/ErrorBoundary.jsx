import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-porcelain px-5">
          <div className="max-w-md rounded-3xl border border-hairline bg-surface p-8 text-center" role="alert">
            <h1 className="font-display text-[24px] font-semibold text-ink">Something went wrong</h1>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
              Please reload the page and try again. If the problem continues, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-6 inline-flex rounded-xl px-5 py-2.5 text-[14px] font-semibold"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;