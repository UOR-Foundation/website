/**
 * Haptic + audio feedback for habit events
 * Uses Web Vibration API and Web Audio API (no external deps)
 */

const ctx = () => {
  if (!(window as any).__habitAudioCtx) {
    (window as any).__habitAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return (window as any).__habitAudioCtx as AudioContext;
};

function playTone(freq: number, duration: number, vol = 0.08, type: OscillatorType = "sine") {
  try {
    const a = ctx();
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, a.currentTime);
    gain.gain.setValueAtTime(vol, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
    osc.connect(gain).connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + duration);
  } catch { /* silent fail on unsupported browsers */ }
}

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* noop */ }
}

/** Subtle click when a habit fires */
export function habitFireFeedback() {
  vibrate(12);
  playTone(880, 0.08, 0.06);
  playTone(1320, 0.06, 0.04);
}

/** Ascending chime when a new habit is promoted */
export function habitPromotedFeedback() {
  vibrate([15, 40, 25]);
  playTone(523, 0.12, 0.07);
  setTimeout(() => playTone(659, 0.12, 0.07), 80);
  setTimeout(() => playTone(784, 0.18, 0.09), 160);
}
