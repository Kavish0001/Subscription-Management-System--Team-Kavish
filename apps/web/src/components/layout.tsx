import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { ArrowRightIcon, ChevronDownIcon, MenuIcon, XIcon } from './icons';
import { cn, formatStatusLabel, getStatusTone, type StatusTone } from '../lib/ui';

type IconComponent = ComponentType<{ className?: string }>;

type NavigationItem = {
  label: string;
  to: string;
  icon?: IconComponent;
  detail?: string;
  end?: boolean;
  children?: Array<{
    label: string;
    to: string;
  }>;
};

function matchesPath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function getActiveMenuLabel(navigation: NavigationItem[], pathname: string) {
  return (
    navigation.find((item) => item.children?.some((child) => matchesPath(pathname, child.to)))
      ?.label ?? null
  );
}

export function Shell({
  title,
  subtitle,
  navigation,
  toolbar,
  children,
}: Readonly<
  PropsWithChildren<{
    title: string;
    subtitle: string;
    navigation: NavigationItem[];
    toolbar?: ReactNode;
  }>
>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const activeMenuLabel = getActiveMenuLabel(navigation, location.pathname);
  const [openMenu, setOpenMenu] = useState<string | null>(() => activeMenuLabel);
  const navRef = useRef<HTMLElement | null>(null);

  // Close sidebar on navigation (mobile)
  const handleNavLinkClick = () => {
    setIsSidebarOpen(false);
    setOpenMenu(null);
  };

  useEffect(() => {
    setOpenMenu(activeMenuLabel);
  }, [activeMenuLabel]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="app-shell">
      <div className="mx-auto min-h-screen max-w-[1800px] lg:pl-[288px]">
        {/* Mobile Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)] px-4 backdrop-blur-xl lg:hidden">
          <Link
            aria-label="Veltrix home"
            className="flex items-center"
            to="/"
            onClick={() => setIsSidebarOpen(false)}
          >
            <div className="overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-white">
              <img alt="Logo" className="h-8 w-8 object-contain" src="/veltrix-logo.png" />
            </div>
          </Link>
          <button
            aria-label="Toggle navigation"
            className="grid h-10 w-10 place-items-center rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-card-muted)]"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            type="button"
          >
            {isSidebarOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </header>

        {/* Sidebar Backdrop */}
        {isSidebarOpen ? (
          <div
            className="fixed inset-0 z-40 bg-white/55 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            'app-sidebar fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto border-r border-[color:var(--color-border)] p-4 transition-transform duration-300 ease-in-out lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <BrandLockup
            caption="Connected subscription operations"
            sidebar
            className="mb-7"
            to="/"
          />
          <nav className="grid gap-2" ref={navRef}>
            {navigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = Boolean(item.children?.length);
              const isChildActive =
                item.children?.some((child) => matchesPath(location.pathname, child.to)) ?? false;

              if (hasChildren) {
                const isOpen = openMenu === item.label;
                const isExpandedOnly = isOpen && !isChildActive;

                return (
                  <div className="relative" key={item.label}>
                    <button
                      className={cn(
                        'group w-full rounded-[24px] border px-4 py-3 text-left transition-all duration-150',
                        isChildActive
                          ? 'border-[color:rgba(5,150,105,0.24)] bg-[linear-gradient(135deg,#dff7eb,#f4fdf7)] shadow-[0_16px_32px_rgba(5,150,105,0.14)]'
                          : isExpandedOnly
                            ? 'border-[color:rgba(15,23,42,0.08)] bg-[color:rgba(255,255,255,0.58)]'
                            : 'border-transparent bg-transparent opacity-42 hover:opacity-82',
                      )}
                      onClick={() =>
                        setOpenMenu((value) => (value === item.label ? null : item.label))
                      }
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        {Icon ? (
                          <div
                            className={cn(
                              'grid h-11 w-11 shrink-0 place-items-center rounded-[18px] transition-colors',
                              isChildActive
                                ? 'bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] text-white shadow-[0_10px_20px_rgba(5,150,105,0.18)]'
                                : isExpandedOnly
                                  ? 'bg-[color:rgba(255,255,255,0.88)] text-[color:var(--color-text-primary)]'
                                  : 'bg-transparent text-[color:var(--color-text-muted)]',
                            )}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'truncate text-[15px] tracking-[-0.02em]',
                              isChildActive
                                ? 'font-extrabold text-slate-950'
                                : isExpandedOnly
                                  ? 'font-semibold text-[color:var(--color-text-primary)]'
                                  : 'font-medium text-[color:rgba(2,6,23,0.34)]',
                            )}
                          >
                            {item.label}
                          </p>
                        </div>
                        <ChevronDownIcon
                          className={cn(
                            'h-4 w-4 transition-transform',
                            isOpen
                              ? isChildActive
                                ? 'rotate-180 text-[color:var(--color-primary-strong)]'
                                : 'rotate-180 text-[color:var(--color-text-secondary)]'
                              : 'text-transparent',
                          )}
                        />
                      </div>
                    </button>
                    {isOpen ? (
                      <div className="mt-2 grid gap-1 rounded-[22px] border border-[color:var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-card)_98%,transparent)] p-2">
                        {item.children?.map((child) => (
                          <NavLink
                            className={({ isActive }) =>
                              cn(
                                'rounded-2xl px-4 py-3 text-sm transition-colors',
                                isActive
                                  ? 'bg-[color:var(--color-card-muted)] font-bold text-[color:var(--color-text-primary)]'
                                  : 'font-medium text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-card-muted)] hover:text-[color:var(--color-text-primary)]',
                              )
                            }
                            key={child.to}
                            onClick={handleNavLinkClick}
                            to={child.to}
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  end={item.end}
                  to={item.to}
                  onClick={handleNavLinkClick}
                  className={({ isActive }) =>
                    cn(
                      'group rounded-[24px] border px-4 py-3 transition-all duration-150',
                      isActive
                        ? 'border-[color:rgba(5,150,105,0.24)] bg-[linear-gradient(135deg,#dff7eb,#f4fdf7)] shadow-[0_16px_32px_rgba(5,150,105,0.14)]'
                        : 'border-transparent bg-transparent opacity-42 hover:opacity-82',
                    )
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-center gap-3">
                      {Icon ? (
                        <div
                          className={cn(
                            'grid h-11 w-11 shrink-0 place-items-center rounded-[18px] transition-colors',
                            isActive
                              ? 'bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-strong))] text-white shadow-[0_10px_20px_rgba(5,150,105,0.18)]'
                              : 'bg-transparent text-[color:var(--color-text-muted)]',
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-[15px] tracking-[-0.02em]',
                            isActive
                              ? 'font-extrabold text-slate-950'
                              : 'font-medium text-[color:rgba(2,6,23,0.34)]',
                          )}
                        >
                          {item.label}
                        </p>
                      </div>
                      <ArrowRightIcon
                        className={cn(
                          'h-4 w-4 transition-all',
                          isActive
                            ? 'translate-x-0.5 text-[color:var(--color-primary-strong)]'
                            : 'text-transparent opacity-0 group-hover:translate-x-0.5 group-hover:opacity-0',
                        )}
                      />
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 p-4 lg:p-8">
          <div className="min-w-0 overflow-hidden rounded-[34px] border border-emerald-900/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,250,0.9))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] lg:p-8">
            <header className="mb-6 flex min-w-0 flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="eyebrow mb-3">{subtitle}</p>
                <h1 className="page-title">{title}</h1>
              </div>
              {toolbar}
            </header>
            <section className="grid min-w-0 gap-5 xl:grid-cols-12">{children}</section>
          </div>
        </main>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = 'info',
  loading = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
  tone?: StatusTone;
  loading?: boolean;
}) {
  const accentClass =
    tone === 'success'
      ? 'from-[var(--color-accent)] to-[var(--color-primary)]'
      : tone === 'danger'
        ? 'from-[var(--color-error)] to-[#f97316]'
        : tone === 'warning'
          ? 'from-[var(--color-warning)] to-[#f59e0b]'
          : 'from-[var(--color-primary)] to-[var(--color-primary-strong)]';

  return (
    <article className="app-panel min-w-0 xl:col-span-4">
      <div className="flex items-start justify-between gap-4 p-6">
        <div className="min-w-0">
          <p className="text-sm muted">{label}</p>
          {loading ? (
            <div className="skeleton mt-3 h-11 w-36 rounded-2xl" />
          ) : (
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">{value}</h2>
          )}
          <p className="mt-3 text-sm muted">{detail}</p>
        </div>
        <div
          className={cn(
            'grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white',
            accentClass,
          )}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

export function Surface({
  title,
  description,
  actions,
  children,
  className,
}: PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <article
      className={cn(
        'min-w-0 rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] lg:p-6 xl:col-span-12',
        className,
      )}
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </article>
  );
}

export function StatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolvedTone = tone ?? getStatusTone(status);

  return (
    <span className="status-badge" data-tone={resolvedTone}>
      {formatStatusLabel(status)}
    </span>
  );
}

export function FlowSteps({ steps, current }: { steps: readonly string[]; current: string }) {
  const currentIndex = Math.max(steps.indexOf(current), 0);

  return (
    <div className="flow-track">
      {steps.map((step, index) => {
        const state =
          index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';

        return (
          <div className="flow-step" data-state={state} key={step}>
            <span className="flow-step-indicator" />
            <span className="flow-step-label">{formatStatusLabel(step)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MessageBanner({
  tone,
  children,
  className,
}: PropsWithChildren<{ tone: 'error' | 'success' | 'info' | 'warning'; className?: string }>) {
  const toneClass =
    tone === 'error'
      ? 'theme-message theme-message-error'
      : tone === 'success'
        ? 'theme-message theme-message-success'
        : tone === 'warning'
          ? 'theme-message theme-message-warning'
          : 'theme-message theme-message-info';

  return <p className={cn(toneClass, className)}>{children}</p>;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,174,0.3),transparent_24%),radial-gradient(circle_at_top_right,rgba(167,243,208,0.26),transparent_20%),linear-gradient(180deg,#f4fbf6_0%,#edf7f1_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl place-items-center">
        <div className="auth-card">
          <div className="auth-side">
            <BrandLockup
              caption="Automated subscription ERP"
              center
              compact
              className="mb-8"
              to="/"
            />
            <p className="eyebrow mb-3">{eyebrow}</p>
            <h1 className="page-title mb-4">{title}</h1>
            <p className="max-w-md muted">{description}</p>
            <div className="mt-8 grid gap-3">
              <div className="module-card">
                <p className="text-sm font-semibold">Connected modules</p>
                <p className="mt-1 text-sm muted">
                  Products, plans, subscriptions, invoices, taxes, and reports follow one consistent
                  flow.
                </p>
              </div>
              <div className="module-card">
                <p className="text-sm font-semibold">Precision controls</p>
                <p className="mt-1 text-sm muted">
                  Low-noise forms and status-driven actions keep accounting and renewals
                  deterministic.
                </p>
              </div>
            </div>
          </div>
          <div className="auth-form">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BrandLockup({
  caption,
  center,
  className,
  compact,
  sidebar,
  to,
}: {
  caption: string;
  center?: boolean;
  className?: string;
  compact?: boolean;
  sidebar?: boolean;
  to: string;
}) {
  return (
    <Link className={cn('block', center && 'mx-auto text-center', className)} to={to}>
      {sidebar ? (
        <div className="rounded-[28px] border border-[color:var(--color-border)] bg-white/76 p-5 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto w-fit overflow-hidden rounded-[20px] border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-lift)]">
            <img
              alt="Veltrix logo"
              className="block h-24 w-24 object-contain"
              src="/veltrix-logo.png"
            />
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'overflow-hidden border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-lift)]',
              compact ? 'mx-auto rounded-[22px] px-4 py-3' : 'rounded-[28px] p-2',
            )}
          >
            <img
              alt="Veltrix logo"
              className={cn(
                'block object-contain',
                compact ? 'mx-auto w-full max-w-[152px]' : 'w-full max-w-[220px]',
              )}
              src="/veltrix-logo.png"
            />
          </div>
          <p className={cn('mt-3 text-sm muted', center && 'text-center')}>{caption}</p>
        </>
      )}
    </Link>
  );
}
