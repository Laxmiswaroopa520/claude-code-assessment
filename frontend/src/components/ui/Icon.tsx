// Small inline stroke icons (24px grid, 2px stroke). No icon dependency is needed for a dozen glyphs.

export type IconName =
  | 'overview' | 'expenses' | 'categories' | 'budgets' | 'reports'
  | 'plus' | 'search' | 'filter' | 'edit' | 'trash' | 'close' | 'menu'
  | 'chevron-left' | 'chevron-right' | 'download' | 'check' | 'alert' | 'info'
  | 'wallet' | 'receipt' | 'calculator' | 'gauge' | 'calendar' | 'database' | 'file' | 'sidebar'

const paths: Record<IconName, string[]> = {
  overview: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  expenses: ['M4 3h16v18l-3-2-3 2-3-2-3 2-4-2z', 'M8 8h8', 'M8 12h8', 'M8 16h5'],
  categories: ['M12 3l8 4.5-8 4.5-8-4.5z', 'M4 12l8 4.5 8-4.5', 'M4 16.5L12 21l8-4.5'],
  budgets: ['M12 3a9 9 0 1 0 9 9', 'M12 3v9h9', 'M15 3.5A9 9 0 0 1 20.5 9'],
  reports: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  filter: ['M3 5h18', 'M6 12h12', 'M10 19h4'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M4 20h16'],
  check: ['M5 12.5l4.5 4.5L19 7'],
  alert: ['M12 3l10 18H2z', 'M12 10v4', 'M12 17.5v.5'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v6', 'M12 7.5v.5'],
  wallet: ['M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M3 7l12-4v4', 'M16 13.5h2'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  calculator: ['M6 3h12v18H6z', 'M9 7h6', 'M9 12h.01', 'M12 12h.01', 'M15 12h.01', 'M9 16h.01', 'M12 16h.01', 'M15 16h.01'],
  gauge: ['M4 15a8 8 0 1 1 16 0', 'M12 15l4-5', 'M3 19h18'],
  calendar: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  database: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z', 'M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
  file: ['M6 3h8l4 4v14H6z', 'M14 3v4h4', 'M9 13h6', 'M9 17h6'],
  sidebar: ['M4 4h16v16H4z', 'M9 4v16'],
}

interface IconProps {
  name: IconName
  size?: number
  /** Visible icons are decorative unless a label is given. */
  label?: string
}

export function Icon({ name, size = 18, label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
