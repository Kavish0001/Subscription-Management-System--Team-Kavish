import type { PropsWithChildren, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

export function Shell({
  title,
  subtitle,
  navigation,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  navigation: Array<{ label: string; to: string }>;
}>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.16),_transparent_22%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-slate-950/70 p-6 backdrop-blur lg:border-b-0 lg:border-r">
          <Link className="mb-10 flex items-center gap-3" to="/">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-emerald-400 font-black text-slate-950">
              SM
            </div>
            <div>
              <p className="font-semibold tracking-wide">SubFlow</p>
              <p className="text-sm text-slate-400">Subscription OS</p>
            </div>
          </Link>
          <nav className="grid gap-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm transition ${
                    isActive
                      ? 'bg-white/12 text-white shadow-lg shadow-slate-950/30'
                      : 'text-slate-300 hover:bg-white/6 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="p-6 lg:p-8">
          <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-amber-300">{subtitle}</p>
              <h1 className="text-4xl font-black tracking-tight">{title}</h1>
            </div>
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
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-2xl shadow-slate-950/30 xl:col-span-4">
      <p className="text-sm text-slate-400">{label}</p>
      <h3 className="mt-2 text-3xl font-black">{value}</h3>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </article>
  );
}

export function Surface({
  title,
  actions,
  children,
}: PropsWithChildren<{ title: string; actions?: ReactNode }>) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-2xl shadow-slate-950/30 xl:col-span-12">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {actions}
      </div>
      {children}
    </article>
  );
}
