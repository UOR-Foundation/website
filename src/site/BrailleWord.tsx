import { useEffect, useState } from "react";

// Braille glyphs used as ciphertext while the word is scrambled.
const GLYPHS = "⠁⠂⠄⡀⢀⠠⠐⠈⠃⠅⠆⠉⠊⠌⠑⠒⠔⠘⠡⠢⠤⠨⠰⡁⡂⡄⡈⡐⡠⢁⢂⢄⢈⢐⢠⣀⠇⠋⠍⠎⠓⠕⠖⠙⠚⠜⠣⠥⠦⠩⠪⠬⠱⠲⠴⠸⡃⡅⡆⡉⡊⡌⡑⡒⡔⡘⡡⡢⡤⡨⡰⢃⢅⢆⢉⢊⢌⢑⢒⢔⢘⢡⢢⡤⢨⢰⣁⣂⣄⣈⣐⣠⠿⡿⢿⣟⣯⣷⣾⣽⣻⣿";
const rand = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

/** Sweeps a word into braille one letter at a time, holds it as code, then
 *  decodes it back in the same order. Letters keep their real width, so the
 *  line never moves. */
export default function BrailleWord({ text }: { text: string }) {
  const n = text.length;
  const [mask, setMask] = useState<(string | null)[]>(() => Array(n).fill(null));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    const id = setInterval(() => {
      t++;
      const c = t % 100;
      const next: (string | null)[] = Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        if (c >= i * 1.5 && c < 62 + i * 1.5) next[i] = rand();
      }
      setMask(next);
    }, 45);
    return () => clearInterval(id);
  }, [n]);

  return (
    <span className="fd-braille" aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} aria-hidden className={`fd-braille-ch${mask[i] ? " fd-braille-enc" : ""}`}>
          <span style={{ visibility: mask[i] ? "hidden" : "visible" }}>{ch}</span>
          {mask[i] && <span className="fd-braille-glyph">{mask[i]}</span>}
        </span>
      ))}
    </span>
  );
}
