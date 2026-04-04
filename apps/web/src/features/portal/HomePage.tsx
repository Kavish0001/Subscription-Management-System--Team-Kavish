import { Link } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { useSession } from '../../lib/session';

export function HomePage() {
  const { isAuthenticated, user } = useSession();

  return (
    <Surface title="Revenue subscriptions for modern teams">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="max-w-2xl text-slate-300">
            Create master data first, then run the full flow: signup, shop, cart, address, payment, invoice, and subscription tracking.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950" to={isAuthenticated ? '/shop' : '/signup'}>
              {isAuthenticated ? 'Open shop' : 'Create portal account'}
            </Link>
            {user?.role !== 'portal_user' ? (
              <Link className="rounded-full border border-white/10 bg-white/6 px-5 py-3 font-semibold text-white" to="/admin">
                Open backoffice
              </Link>
            ) : null}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
          <p className="text-sm font-semibold text-slate-200">Expected flow</p>
          <ol className="mt-4 grid gap-3 text-sm text-slate-300">
            <li>1. Login or signup as portal user</li>
            <li>2. Browse products and select a recurring plan</li>
            <li>3. Apply discount in cart and confirm address</li>
            <li>4. Pay through the demo gateway</li>
            <li>5. Track orders and invoices from your account</li>
          </ol>
        </div>
      </div>
    </Surface>
  );
}
