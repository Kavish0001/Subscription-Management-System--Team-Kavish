import { Link } from 'react-router-dom';

import { ArrowRightIcon, CalendarRepeatIcon, CubeIcon, ReceiptIcon, UsersIcon } from '../../components/icons';
import { useSession } from '../../lib/session';

const highlights = [
  {
    title: 'Plan-aware pricing',
    detail: 'Every product card reflects the selected recurring plan, so billing context stays visible.',
    icon: CalendarRepeatIcon
  },
  {
    title: 'Direct shopping flow',
    detail: 'Browse, compare, add to cart, and move into checkout without leaving the external portal.',
    icon: CubeIcon
  },
  {
    title: 'Profile control',
    detail: 'Addresses, contact details, orders, and invoices stay available in one customer-facing space.',
    icon: UsersIcon
  }
];

const quickLinks = [
  {
    title: 'Browse subscriptions',
    detail: 'Open the shop and compare recurring offers.',
    to: '/shop',
    icon: CubeIcon
  },
  {
    title: 'Manage account',
    detail: 'Update profile, addresses, and company details.',
    to: '/account/profile',
    icon: UsersIcon
  },
  {
    title: 'Track orders',
    detail: 'Review subscriptions, invoices, and lifecycle status.',
    to: '/account/orders',
    icon: ReceiptIcon
  }
];

export function HomePage() {
  const { isAuthenticated, user } = useSession();

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[36px] border border-emerald-900/10 bg-[linear-gradient(135deg,rgba(240,253,244,0.95),rgba(236,253,245,0.78)),radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_30%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
              External User Space
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
              Subscription shopping with recurring billing context built in.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Use the portal to browse products, compare recurring plans, and manage the full subscription journey from checkout to invoice tracking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                to={isAuthenticated ? '/shop' : '/signup'}
              >
                {isAuthenticated ? 'Open shop' : 'Create account'}
              </Link>
              <Link
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                to={isAuthenticated ? '/account/profile' : '/login'}
              >
                {isAuthenticated ? 'My account' : 'Login'}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[32px] border border-white/70 bg-white/80 p-5 backdrop-blur sm:grid-cols-2">
            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5 sm:col-span-2">
              <p className="text-sm font-semibold text-emerald-700">Current portal focus</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">
                {isAuthenticated ? `Welcome back, ${user?.email}` : 'Sign in to shop subscription products'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Pricing, billing cadence, and plan details stay aligned on the shop page so the portal reflects the recurring model directly.
              </p>
            </div>
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article className="rounded-[24px] border border-slate-200 bg-white p-5" key={item.title}>
                  <div className="inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="group rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-emerald-200"
              key={item.title}
              to={isAuthenticated ? item.to : '/login'}
            >
              <div className="inline-flex rounded-2xl bg-slate-950 p-3 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                Open
                <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
