// PyLadder brand mark, rendered inline (source: pyladder-logo.svg in the project root and public/).
/**
 * The student's official PyLadder mark (pyladder-logo.svg): a prompt chevron and stepped code lines on a dark tile.
 * A fixed brand mark, so its colours are hard-coded and it stays dark in both themes. Decorative: the wordmark names it.
 */
export function LogoMark({ size = 32, class: cls }: { size?: number; class?: string }) {
  return (
    <svg class={`logo-mark${cls ? ' ' + cls : ''}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#1C1F1D" />
      <path d="M7 9.5l5 4.5-5 4.5" fill="none" stroke="#5FC4A0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M15 24h10" stroke="#E8E6DF" stroke-width="2.4" stroke-linecap="round" opacity="0.45" />
      <path d="M17 19h8" stroke="#E8E6DF" stroke-width="2.4" stroke-linecap="round" opacity="0.7" />
      <rect x="19" y="11.5" width="6" height="3.4" rx="1" fill="#F2A94B" />
    </svg>
  );
}
