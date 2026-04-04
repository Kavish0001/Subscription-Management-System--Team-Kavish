import type { ComponentType, PropsWithChildren, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { ArrowRightIcon } from './icons';
import { cn, formatStatusLabel, getStatusTone, type StatusTone } from '../lib/ui';

type IconComponent = ComponentType<{ className?: string }>;

type NavigationItem = {
  label: string;
  to: string;
  icon?: IconComponent;
  detail?: string;
};

export function Shell({
  title,
  subtitle,
  navigation,
  toolbar,
  children
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  navigation: NavigationItem[];
  toolbar?: ReactNode;
}>) {
  return (
    <div className="app-shell">
      <div className="grid min-h-screen lg:grid-cols-[304px_1fr]">
        <aside className="app-sidebar border-b p-5 lg:border-r lg:border-b-0 lg:p-6">
          <BrandLockup
            caption="Connected subscription operations"
            className="mb-8"
            to="/"
          />
          <div className="app-card mb-5 p-4">
            <p className="eyebrow mb-2">Finance-grade ERP</p>
            <p className="text-sm muted">
              Precise recurring billing, modular controls, and low-noise workflows for backoffice teams.
            </p>
          </div>
          <nav className="grid gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'group rounded-[20px] border px-4 py-3 transition-all duration-150',
                      isActive
                        ? 'border-[color:var(--color-primary)] bg-[linear-gradient(135deg,rgba(79,70,229,0.16),rgba(6,182,212,0.08))] shadow-[var(--shadow-lift)]'
                        : 'border-transparent hover:border-[color:var(--color-border)] hover:bg-[color:color-mix(in_srgb,var(--color-card)_88%,transparent)]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-center gap-3">
                      {Icon ? (
                        <div
                          className={cn(
                            'grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-colors',
                            isActive
                              ? 'bg-[linear-gradient(135deg,var(--color-primary),var(--color-secondary))] text-white'
                              : 'bg-[color:color-mix(in_srgb,var(--color-card)_90%,transparent)] text-[color:var(--color-text-secondary)]'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.label}</p>
                        {item.detail ? <p className="truncate text-xs muted">{item.detail}</p> : null}
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-[color:var(--color-text-muted)] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="p-5 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="eyebrow mb-3">{subtitle}</p>
              <h1 className="page-title">{title}</h1>
            </div>
            {toolbar}
          </header>
          <section className="grid gap-5 xl:grid-cols-12">{children}</section>
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
  loading = false
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
      ? 'from-[var(--color-accent)] to-[var(--color-secondary)]'
      : tone === 'danger'
        ? 'from-[var(--color-error)] to-[var(--color-warning)]'
        : tone === 'warning'
          ? 'from-[var(--color-warning)] to-[var(--color-secondary)]'
          : 'from-[var(--color-primary)] to-[var(--color-secondary)]';

  return (
    <article className="app-panel xl:col-span-4">
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
        <div className={cn('grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white', accentClass)}>
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
  className
}: PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <article className={cn('app-panel p-5 lg:p-6 xl:col-span-12', className)}>
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

export function StatusBadge({
  status,
  tone
}: {
  status: string;
  tone?: StatusTone;
}) {
  const resolvedTone = tone ?? getStatusTone(status);

  return (
    <span className="status-badge" data-tone={resolvedTone}>
      {formatStatusLabel(status)}
    </span>
  );
}

export function FlowSteps({
  steps,
  current
}: {
  steps: readonly string[];
  current: string;
}) {
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
  className
}: PropsWithChildren<{ tone: 'error' | 'success' | 'info' | 'warning'; className?: string }>) {
  const toneClass =
    tone === 'error'
      ? 'border-red-400/30 bg-red-500/10 text-red-200'
      : tone === 'success'
        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
        : tone === 'warning'
          ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
          : 'border-sky-400/30 bg-sky-500/10 text-sky-100';

  return <p className={cn('rounded-2xl border px-4 py-3 text-sm', toneClass, className)}>{children}</p>;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-side">
          <BrandLockup
            caption="Automated subscription ERP"
            className="mb-10"
            to="/"
          />
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="page-title mb-4">{title}</h1>
          <p className="max-w-md muted">{description}</p>
          <div className="mt-8 grid gap-3">
            <div className="module-card">
              <p className="text-sm font-semibold">Connected modules</p>
              <p className="mt-1 text-sm muted">Products, plans, subscriptions, invoices, taxes, and reports follow one consistent flow.</p>
            </div>
            <div className="module-card">
              <p className="text-sm font-semibold">Precision controls</p>
              <p className="mt-1 text-sm muted">Low-noise forms and status-driven actions keep accounting and renewals deterministic.</p>
            </div>
          </div>
        </div>
        <div className="auth-form">{children}</div>
      </div>
    </div>
  );
}

function BrandLockup({
  caption,
  className,
  to
}: {
  caption: string;
  className?: string;
  to: string;
}) {
  return (
    <Link className={cn('block', className)} to={to}>
      <div className="overflow-hidden rounded-[28px] border border-[color:var(--color-border)] bg-white p-2 shadow-[var(--shadow-lift)]">
        <img
          alt="Veltrix logo"
          className="block w-full max-w-[220px] object-contain"
          src="/veltrix-logo.png"
        />
      </div>
      <p className="mt-3 text-sm muted">{caption}</p>
    </Link>
  );
}
