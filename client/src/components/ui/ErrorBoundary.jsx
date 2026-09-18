import { Component } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-app text-text-main p-6 font-sans">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-500/15 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-serif italic font-medium text-text-main mb-2">
            Something went wrong.
          </h1>
          <p className="text-sm text-text-muted mb-6">
            This part of mindMesh hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-on-accent text-sm font-semibold transition-all cursor-pointer shadow-sm"
          >
            <RotateCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
