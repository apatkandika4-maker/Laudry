type IconName =
  | "pos"
  | "orders"
  | "customers"
  | "services"
  | "reports"
  | "settings"
  | "logout"
  | "menu"
  | "close"
  | "search"
  | "plus"
  | "minus"
  | "trash"
  | "edit"
  | "printer"
  | "whatsapp"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "user"
  | "calendar"
  | "alert"
  | "cash"
  | "cart"
  | "washer"
  | "store"
  | "lock";

const PATHS: Record<IconName, React.ReactNode> = {
  pos: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M7 20h10M12 16v4M7 8h4M7 11h2" />
    </>
  ),
  orders: (
    <>
      <path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z" />
      <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <path d="M8 12h8M8 16h5" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 4.8a3.2 3.2 0 010 6.4M18 14.8c1.8.7 3 2.6 3 5.2" />
    </>
  ),
  services: (
    <>
      <path d="M3.5 12.5V5a1.5 1.5 0 011.5-1.5h7.5l8 8a1.5 1.5 0 010 2.1l-6.4 6.4a1.5 1.5 0 01-2.1 0l-8.5-7.5z" />
      <circle cx="8" cy="8" r="1.5" />
    </>
  ),
  reports: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  logout: (
    <>
      <path d="M15 12H4M8 8l-4 4 4 4" />
      <path d="M10 4h8a2 2 0 012 2v12a2 2 0 01-2 2h-8" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.2-1.1l-4.3 1.1z" />
      <path d="M9 8.5c.3 2.8 3.2 5.8 6 6l1-1.5-2-1-1 .8a5 5 0 01-2.3-2.3l.8-1-1-2L9 8.5z" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5L2.5 20h19L12 3.5z" />
      <path d="M12 10v4.5M12 17.5v.5" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 11h10.2L20 7H6.2" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </>
  ),
  washer: (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <circle cx="12" cy="13" r="5" />
      <path d="M7.5 6h1.5M11 6h.5M9 13.5c1.5-1.5 4.5 1.5 6 0" />
    </>
  ),
  store: (
    <>
      <path d="M4 10v10h16V10" />
      <path d="M2.5 10L4.5 4h15l2 6a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
