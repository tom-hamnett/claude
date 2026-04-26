import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

export type IconName =
  | 'home'
  | 'group'
  | 'template'
  | 'session'
  | 'reports'
  | 'plus'
  | 'chevron-right'
  | 'chevron-left'
  | 'check'
  | 'pencil'
  | 'trash'
  | 'export'
  | 'import'
  | 'search'
  | 'close'
  | 'menu'
  | 'play'
  | 'star'
  | 'tag'
  | 'sparkles'
  | 'sigma'
  | 'camera'
  | 'mic'
  | 'signature'
  | 'lock'
  | 'unlock'
  | 'pin'
  | 'cloud-off'
  | 'lightbulb'
  | 'wand'
  | 'document'
  | 'arrow-up-right'
  | 'shield'
  | 'copy';

const paths: Record<IconName, JSX.Element> = {
  home: (
    <path
      d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  group: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19c.6-2.8 2.9-4.5 5.5-4.5s4.9 1.7 5.5 4.5" />
      <circle cx="17" cy="8" r="2.6" />
      <path d="M14.5 14.4c1-1 2-1.4 3-1.4 2.2 0 3.8 1.4 4.3 3.6" />
    </g>
  ),
  template: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 9h16M9 9v11" />
    </g>
  ),
  session: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h4l2 5 3-10 2 5h3" />
    </g>
  ),
  reports: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16" />
      <rect x="6" y="11" width="3" height="7" rx="0.6" />
      <rect x="11" y="7" width="3" height="11" rx="0.6" />
      <rect x="16" y="14" width="3" height="4" rx="0.6" />
    </g>
  ),
  plus: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  'chevron-right': <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  'chevron-left': <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  check: <path d="M5 12.5 10 17 19 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  pencil: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 5l5 5L9 20H4v-5L14 5Z" />
    </g>
  ),
  trash: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    </g>
  ),
  export: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11M8 8l4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </g>
  ),
  import: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V5M8 12l4 4 4-4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </g>
  ),
  search: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4-4" />
    </g>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  play: <path d="M7 5v14l12-7L7 5Z" fill="currentColor" />,
  star: (
    <path
      d="M12 4l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.4 6.8 20.1l1-5.8L3.5 10.2l5.9-.9L12 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />
  ),
  tag: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4h7a2 2 0 0 1 2 2v7l-9 9-9-9 9-9Z" />
      <circle cx="13.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
    </g>
  ),
  sparkles: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8" />
    </g>
  ),
  sigma: (
    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 5H7l5 7-5 7h11" />
    </g>
  ),
  camera: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h2.5l1.6-2h5.8l1.6 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.6" />
    </g>
  ),
  mic: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </g>
  ),
  signature: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17c1.8.5 3.6.5 5.2-.6 2.5-1.8 3-7.4 5-7.4 1.7 0 .9 5 2.6 5 1 0 1.6-2 2.6-2 1 0 1 1.4 2.6 1.4" />
      <path d="M4 21h16" />
    </g>
  ),
  lock: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </g>
  ),
  unlock: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </g>
  ),
  pin: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7.4 7-12.3A7 7 0 1 0 5 9.7C5 14.6 12 22 12 22Z" />
      <circle cx="12" cy="10" r="2.5" />
    </g>
  ),
  'cloud-off': (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M7.5 8.5A5 5 0 0 1 12 6c2.6 0 4.7 1.9 5 4.4 2 .3 3.5 2 3.5 4.1 0 1.1-.4 2.1-1.1 2.8" />
      <path d="M17 18H7a4 4 0 0 1-2.8-7" />
    </g>
  ),
  lightbulb: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4" />
      <path d="M8 14a5 5 0 1 1 8 0c-.7.8-1 1.7-1 2.5V18H9v-1.5c0-.8-.3-1.7-1-2.5Z" />
    </g>
  ),
  wand: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19l9.5-9.5M14 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2ZM19 14l.7 1.3 1.3.7-1.3.7L19 18l-.7-1.3-1.3-.7 1.3-.7L19 14Z" />
    </g>
  ),
  document: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </g>
  ),
  'arrow-up-right': (
    <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </g>
  ),
  shield: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </g>
  ),
  copy: (
    <g stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </g>
  ),
};

export function Icon({ name, size = 22, ...rest }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
