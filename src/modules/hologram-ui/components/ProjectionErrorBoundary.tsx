/**
 * ProjectionErrorBoundary — Catches errors in projections
 * so one crashing panel doesn't freeze the entire OS.
 */

import React from "react";

interface Props {
  id: string;
  children: React.ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ProjectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ProjectionErrorBoundary:${this.props.id}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-4"
          style={{
            background: "hsl(25, 8%, 7%)",
            color: "hsl(30, 8%, 75%)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          <div className="text-center max-w-md px-6">
            <p className="text-[15px] font-light mb-2">
              This projection encountered an error.
            </p>
            <p className="text-[12px] opacity-60 mb-4 font-mono break-all">
              {this.state.error?.message || "Unknown error"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded-lg text-[13px] font-light"
                style={{
                  background: "hsla(38, 30%, 50%, 0.15)",
                  color: "hsl(38, 40%, 75%)",
                  border: "1px solid hsla(38, 30%, 50%, 0.2)",
                }}
              >
                Retry
              </button>
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="px-4 py-2 rounded-lg text-[13px] font-light"
                  style={{
                    background: "hsla(0, 0%, 100%, 0.05)",
                    color: "hsl(30, 8%, 65%)",
                    border: "1px solid hsla(0, 0%, 100%, 0.08)",
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
