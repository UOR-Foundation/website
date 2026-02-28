/**
 * scaledFontSize — Returns a CSS calc() string that scales
 * a pixel font size by the user's --holo-user-scale preference.
 *
 * Usage: style={{ fontSize: sf(13) }}  →  "calc(13px * var(--holo-user-scale, 1))"
 */
export function sf(px: number): string {
  return `calc(${px}px * var(--holo-user-scale, 1))`;
}
