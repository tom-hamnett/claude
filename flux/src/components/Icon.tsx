/** Minimal inline icon set (stroke-based, currentColor). Keeps the bundle tiny. */
type IconName =
  | 'home'
  | 'projects'
  | 'portfolio'
  | 'knowledge'
  | 'book'
  | 'settings'
  | 'plus'
  | 'spark'
  | 'map'
  | 'search'
  | 'design'
  | 'chevron'
  | 'back'
  | 'download'
  | 'trash'
  | 'edit'
  | 'check'
  | 'x'
  | 'bolt'
  | 'warning'
  | 'flow'
  | 'grip'
  | 'key';

const PATHS: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
  projects: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  portfolio: 'M4 19V5m5 14V9m5 10V7m5 12V11',
  knowledge: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v16',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM19 3v16',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.9 7.9 0 0 0 0-2l1.6-1.2-2-3.4-1.9.8a7.9 7.9 0 0 0-1.7-1L14 3h-4l-.5 2.2a7.9 7.9 0 0 0-1.7 1l-1.9-.8-2 3.4L4.6 11a7.9 7.9 0 0 0 0 2l-1.6 1.2 2 3.4 1.9-.8c.5.4 1.1.7 1.7 1L10 21h4l.5-2.2c.6-.3 1.2-.6 1.7-1l1.9.8 2-3.4z',
  plus: 'M12 5v14M5 12h14',
  spark: 'M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8m-5.4 5.4-2.8 2.8m11 0-2.8-2.8M7.3 7.3 4.5 4.5',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  design: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9-2.8.9-5.5-4-3.9L9.5 8z',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
  trash: 'M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7',
  edit: 'M4 20h4L18 10l-4-4L4 16zM14 6l4 4',
  check: 'M5 13l4 4L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  warning: 'M12 3 2 20h20zM12 9v5m0 3v.5',
  flow: 'M4 6h6v4H4zM14 14h6v4h-6zM10 8h6a2 2 0 0 1 2 2v4',
  grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  key: 'M14 7a4 4 0 1 1-3.5 6l-5.5 5.5L3 17l1-1 1 1 1-1 1 1 2-2a4 4 0 0 1 4-7z',
};

export default function Icon({
  name,
  className = 'w-5 h-5',
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export type { IconName };
