/**
 * QShellPage — Standalone full-page terminal route (/q-shell).
 * Delegates to QShellEmbed for all terminal functionality.
 */
import QShellEmbed from "./QShellEmbed";

export default function QShellPage() {
  return (
    <div className="h-screen w-screen">
      <QShellEmbed />
    </div>
  );
}
