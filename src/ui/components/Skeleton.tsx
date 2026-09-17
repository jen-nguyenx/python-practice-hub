// Placeholder block shown while data loads.
import './controls.css';

export function Skeleton({ w = '100%', h = 12, class: cls }: { w?: string | number; h?: string | number; class?: string }) {
  return <span class={`skel${cls ? ' ' + cls : ''}`} style={{ width: typeof w === 'number' ? `${w}px` : w, height: typeof h === 'number' ? `${h}px` : h }} aria-hidden="true" />;
}
