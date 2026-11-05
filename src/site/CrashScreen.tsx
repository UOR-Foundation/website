import { Component, type ReactNode } from "react";

// Shows a readable message instead of an empty page when anything below it throws while rendering.
export default class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Page failed to render:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="foundation" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}>
        <div>
          <p style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>This page hit a problem while loading.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: "0.6rem 1.2rem", borderRadius: 999, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
