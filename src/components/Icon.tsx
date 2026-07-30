interface Props {
  name: IconName
  size?: number
  className?: string
}

export type IconName =
  | 'dumbbell'
  | 'clipboard'
  | 'chart'
  | 'book'
  | 'plus'
  | 'check'
  | 'trash'
  | 'chevron'
  | 'back'
  | 'play'
  | 'settings'
  | 'flame'
  | 'trophy'
  | 'x'
  | 'timer'
  | 'copy'
  | 'edit'
  | 'download'
  | 'upload'
  | 'info'
  | 'note'
  | 'swap'
  | 'share'
  | 'trend'
  | 'camera'
  | 'people'

const paths: Record<IconName, JSX.Element> = {
  dumbbell: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M20 20H4M8 16l4-5 3 3 4-6" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4zM5 18a2 2 0 0 0 2 2M9 8h5M9 12h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4 12l5 5L20 6" />,
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  play: <path d="M7 5l12 7-12 7V5z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  flame: <path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.7-2.5 1.3-3.2C10 9 11.5 6 12 3z" />,
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 19h6M10 15v4M14 15v4" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  edit: <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3zM14 6l3 3" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6h.01" />
    </>
  ),
  note: (
    <>
      <path d="M5 4h11l3 3v13H5zM16 4v3h3" />
      <path d="M8 12h8M8 16h5" />
    </>
  ),
  share: (
    <>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" />
      <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.6a3.2 3.2 0 010 5.8M17.5 14.9c1.9.6 3 2.4 3 4.6" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l6-6 4 3.5L21 6" />
      <path d="M15.5 6H21v5.5" />
    </>
  ),
  download: <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />,
  upload: <path d="M12 20V9m0 0l-4 4m4-4l4 4M5 5h14" />,
}

export function Icon({ name, size = 22, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
