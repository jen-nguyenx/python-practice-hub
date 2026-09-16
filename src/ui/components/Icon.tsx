// 1.5px-stroke inline icons. Decorative by default (aria-hidden); pass `label` to expose.
const PATHS: Record<string, string> = {
  lock: 'M5 10V7a5 5 0 0 1 10 0v3 M4 10h12v8H4z',
  check: 'M4 10.5l4 4 8-9',
  x: 'M5 5l10 10 M15 5L5 15',
  play: 'M6 4l10 6-10 6z',
  arrowRight: 'M4 10h12 M11 5l5 5-5 5',
  arrowLeft: 'M16 10H4 M9 5l-5 5 5 5',
  chevronDown: 'M5 8l5 5 5-5',
  chevronRight: 'M8 5l5 5-5 5',
  bulb: 'M7 14h6 M8 17h4 M10 2a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a5 5 0 0 0-3-9z',
  eye: 'M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  sun: 'M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M10 1.5v2 M10 16.5v2 M1.5 10h2 M16.5 10h2 M4 4l1.4 1.4 M14.6 14.6L16 16 M4 16l1.4-1.4 M14.6 5.4L16 4',
  moon: 'M16 12.5A7 7 0 0 1 7.5 4a7 7 0 1 0 8.5 8.5z',
  monitor: 'M3 4h14v9H3z M7 17h6 M10 13v4',
  flag: 'M5 18V3 M5 3h9l-2 3.5 2 3.5H5',
  chart: 'M3 17h14 M6 14V9 M10 14V5 M14 14v-3',
  code: 'M7 6l-4 4 4 4 M13 6l4 4-4 4',
  terminal: 'M3 4h14v12H3z M6 8l2.5 2L6 12 M10 12h4',
  settings: 'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M10 2v2.5 M10 15.5V18 M2 10h2.5 M15.5 10H18 M4.3 4.3l1.8 1.8 M13.9 13.9l1.8 1.8 M4.3 15.7l1.8-1.8 M13.9 6.1l1.8-1.8',
  clock: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M10 6v4l3 2',
  book: 'M3 4h5a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2H3z M17 4h-5a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2h5z',
  layers: 'M10 3l7 4-7 4-7-4z M3 11l7 4 7-4',
  refresh: 'M16 10a6 6 0 1 1-2-4.5 M16 3v4h-4',
  download: 'M10 3v10 M6 9l4 4 4-4 M4 17h12',
  upload: 'M10 13V3 M6 7l4-4 4 4 M4 17h12',
  info: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M10 9v5 M10 6.5v.5',
  alert: 'M10 3l8 14H2z M10 8v4 M10 14.5v.5',
  file: 'M5 2h7l4 4v12H5z M12 2v4h4',
  grip: 'M8 5h.01 M12 5h.01 M8 10h.01 M12 10h.01 M8 15h.01 M12 15h.01',
  target: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M10 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M10 10h.01',
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, label, class: cls }: { name: IconName; size?: number; label?: string; class?: string }) {
  return (
    <svg class={cls} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <path d={PATHS[name]} />
    </svg>
  );
}
