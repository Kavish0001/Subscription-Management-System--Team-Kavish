import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function BrandMark(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="4" width="7" height="7" rx="2" />
      <rect x="13.5" y="4" width="7" height="7" rx="2" />
      <rect x="3.5" y="13" width="7" height="7" rx="2" />
      <path d="M17 14a3.5 3.5 0 1 1-2.8 5.6" />
      <path d="M14.2 17.7 14 14h3.7" />
      <path d="M9.5 7.5h4" />
      <path d="M7 11v2" />
    </IconBase>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </IconBase>
  );
}

export function CubeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
      <path d="m12 3 7 4-7 4-7-4" />
      <path d="M12 11v10" />
    </IconBase>
  );
}

export function CalendarRepeatIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
      <path d="M9 15h6" />
      <path d="m15 13 2 2-2 2" />
    </IconBase>
  );
}

export function RefreshCycleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12a8 8 0 0 1 13.5-5.7L20 8.5" />
      <path d="M20 4v4.5h-4.5" />
      <path d="M20 12a8 8 0 0 1-13.5 5.7L4 15.5" />
      <path d="M4 20v-4.5h4.5" />
    </IconBase>
  );
}

export function DocumentPenIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 3.5h6l5 5V20a1 1 0 0 1-1 1H8a3 3 0 0 1-3-3V6.5a3 3 0 0 1 3-3Z" />
      <path d="M14 3.5V9h5" />
      <path d="m10 16 4.8-4.8a1.6 1.6 0 1 1 2.2 2.2L12.2 18H10v-2Z" />
    </IconBase>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10v18l-3-2-2 2-2-2-3 2V3Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </IconBase>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
      <path d="M13 15h4" />
    </IconBase>
  );
}

export function TagPercentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3H6a2 2 0 0 0-2 2v6l9.5 9.5a2.1 2.1 0 0 0 3 0l4-4a2.1 2.1 0 0 0 0-3L11 4a2 2 0 0 0-1-.7Z" />
      <path d="M7.5 7.5h.01" />
      <path d="m9 15 6-6" />
      <path d="M9.5 10.5h.01" />
      <path d="M14.5 15.5h.01" />
    </IconBase>
  );
}

export function PercentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m19 5-14 14" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="10" r="3" />
      <path d="M20 19a3.5 3.5 0 0 0-2.8-3.4" />
      <path d="M17 7.5a2.5 2.5 0 1 1 0 5" />
      <path d="M4 19a3.5 3.5 0 0 1 2.8-3.4" />
      <path d="M7 7.5a2.5 2.5 0 1 0 0 5" />
    </IconBase>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </IconBase>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10 20v-5h4v5" />
    </IconBase>
  );
}

export function ShoppingBagIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 17v2a2 2 0 0 0 2 2h6" />
      <path d="M18 3h-6a2 2 0 0 0-2 2v2" />
      <path d="M15 12H3" />
      <path d="m7 8-4 4 4 4" />
    </IconBase>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v3H6.5A2.5 2.5 0 0 0 4 11.5v5A2.5 2.5 0 0 0 6.5 19H20v-3" />
      <path d="M20 9H6.5A2.5 2.5 0 0 0 4 11.5v0A2.5 2.5 0 0 0 6.5 14H20V9Z" />
      <circle cx="16" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4 3.7 18.2A1.3 1.3 0 0 0 4.8 20h14.4a1.3 1.3 0 0 0 1.1-1.8L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function FolderStackIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5h5l1.5 2H20v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" />
      <path d="M4 7.5V6a2 2 0 0 1 2-2h4l1.5 2H18a2 2 0 0 1 2 2v1.5" />
    </IconBase>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 8V4h10v4" />
      <rect x="5" y="14" width="14" height="6" rx="2" />
      <rect x="3" y="8" width="18" height="8" rx="2" />
      <path d="M17 12h.01" />
    </IconBase>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a8.5 8.5 0 1 0 9.5 9.5Z" />
    </IconBase>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="m4.9 4.9 1.8 1.8" />
      <path d="m17.3 17.3 1.8 1.8" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="m4.9 19.1 1.8-1.8" />
      <path d="m17.3 6.7 1.8-1.8" />
    </IconBase>
  );
}
