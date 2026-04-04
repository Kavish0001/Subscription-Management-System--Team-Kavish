import { Surface } from '../../components/layout';

export function HomePage() {
  return (
    <Surface title="Revenue subscriptions for modern teams">
      <p className="max-w-2xl text-slate-300">
        Sell plans, manage recurring billing, and give customers a clean self-service portal.
      </p>
    </Surface>
  );
}

export function ShopPage() {
  return (
    <Surface title="Shop">
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" placeholder="Search products" />
        <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" defaultValue="price">
          <option value="price">Sort by price</option>
          <option value="name">Sort by name</option>
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[28px] border border-white/10 bg-slate-950/50 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Annual plan</p>
          <h3 className="mt-2 text-2xl font-black">Starter Subscription</h3>
          <p className="mt-2 text-slate-400">Service</p>
          <strong className="mt-5 block text-3xl">INR 1,200</strong>
        </article>
      </div>
    </Surface>
  );
}

export function ProductPage() {
  return (
    <Surface title="Product">
      <p className="mb-4 text-slate-300">
        Variant and recurring plan pricing will be resolved by the backend pricing engine.
      </p>
      <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950" type="button">
        Add to cart
      </button>
    </Surface>
  );
}

export function CartPage() {
  return (
    <Surface title="Cart">
      <div className="grid gap-2 text-slate-200">
        <p>Subtotal: INR 1,080</p>
        <p>Tax: INR 120</p>
        <p>Total: INR 1,200</p>
      </div>
    </Surface>
  );
}

export function CheckoutAddressPage() {
  return (
    <Surface title="Address">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-200">
          Address line 1
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" defaultValue="Default billing address" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          City
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" defaultValue="Ahmedabad" />
        </label>
      </div>
    </Surface>
  );
}

export function CheckoutPaymentPage() {
  return (
    <Surface title="Payment">
      <p className="mb-4 text-slate-300">Mock gateway ready for hackathon demo flow.</p>
      <button className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-5 py-3 font-semibold text-slate-950" type="button">
        Pay now
      </button>
    </Surface>
  );
}

export function CheckoutSuccessPage() {
  return (
    <Surface title="Thank you for your order">
      <p className="text-slate-300">Order S0001 was created successfully.</p>
    </Surface>
  );
}

export function ProfilePage() {
  return (
    <Surface title="User Details">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-200">
          Name
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" defaultValue="Portal User" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Email
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" defaultValue="portal@example.com" />
        </label>
      </div>
    </Surface>
  );
}

export function OrdersPage() {
  return (
    <Surface title="My Orders">
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/10 text-slate-100">
              <td className="px-4 py-3">S0001</td>
              <td className="px-4 py-3">2026-04-04</td>
              <td className="px-4 py-3">INR 1,200</td>
              <td className="px-4 py-3">Active</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function OrderDetailPage() {
  return (
    <Surface title="Order / Subscription">
      <p className="text-slate-300">Plan: Annual Starter</p>
      <p className="mt-2 text-slate-300">Renew and close actions belong here when allowed.</p>
    </Surface>
  );
}

export function InvoiceDetailPage() {
  return (
    <Surface title="Invoice INV-0015">
      <p className="mb-4 text-slate-300">Amount due: 0</p>
      <button className="rounded-full bg-white/10 px-5 py-3 font-semibold text-white" type="button">
        Download PDF
      </button>
    </Surface>
  );
}
