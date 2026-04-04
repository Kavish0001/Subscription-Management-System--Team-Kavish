import { Link } from 'react-router-dom';

import { CalendarRepeatIcon, CreditCardIcon, CubeIcon, ReceiptIcon } from '../../components/icons';
import { Surface } from '../../components/layout';
import { useSession } from '../../lib/session';

const highlights = [
  {
    title: 'Connected catalog',
    detail: 'Products and recurring plans stay aligned for every subscription offer.',
    icon: CubeIcon
  },
  {
    title: 'Recurring cycles',
    detail: 'Checkout, activation, invoicing, and renewals follow one consistent loop.',
    icon: CalendarRepeatIcon
  },
  {
    title: 'Accounting precision',
    detail: 'Invoices, taxes, discounts, and payments keep commercial actions audit-friendly.',
    icon: ReceiptIcon
  },
  {
    title: 'Fast checkout',
    detail: 'Low-noise purchase flows reduce friction from quote to first payment.',
    icon: CreditCardIcon
  }
];

export function HomePage() {
  const { isAuthenticated, user } = useSession();

  return (
    <Surface
      title="Revenue subscriptions with clean operational flow"
      description="The portal and backoffice share the same recurring commerce model: products, plans, discounts, taxes, invoices, and subscription lifecycle tracking."
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="app-card p-6">
          <p className="eyebrow">System flow</p>
          <div className="mt-4 grid gap-3 text-sm muted">
            <p>1. Create or manage subscription-ready products and plans.</p>
            <p>2. Add items to cart, confirm address, and complete payment.</p>
            <p>3. Track subscription status, invoices, and renewals over time.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="app-btn app-btn-primary" to={isAuthenticated ? '/shop' : '/signup'}>
              {isAuthenticated ? 'Open shop' : 'Create portal account'}
            </Link>
            {user?.role !== 'portal_user' ? (
              <Link className="app-btn app-btn-secondary" to="/admin">
                Open backoffice
              </Link>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <article className="module-card" key={item.title}>
                <div className="mb-4 inline-flex rounded-2xl bg-[linear-gradient(135deg,var(--color-primary),var(--color-secondary))] p-3 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.03em]">{item.title}</h3>
                <p className="mt-2 text-sm muted">{item.detail}</p>
              </article>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}
