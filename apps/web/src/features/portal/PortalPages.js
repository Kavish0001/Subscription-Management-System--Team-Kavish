import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Surface } from '../../components/layout';
export function HomePage() {
    return (_jsx(Surface, { title: "Revenue subscriptions for modern teams", children: _jsx("p", { className: "max-w-2xl text-slate-300", children: "Sell plans, manage recurring billing, and give customers a clean self-service portal." }) }));
}
export function ShopPage() {
    return (_jsxs(Surface, { title: "Shop", children: [_jsxs("div", { className: "mb-5 grid gap-3 md:grid-cols-[1fr_220px]", children: [_jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", placeholder: "Search products" }), _jsxs("select", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", defaultValue: "price", children: [_jsx("option", { value: "price", children: "Sort by price" }), _jsx("option", { value: "name", children: "Sort by name" })] })] }), _jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: _jsxs("article", { className: "rounded-[28px] border border-white/10 bg-slate-950/50 p-5", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.28em] text-emerald-300", children: "Annual plan" }), _jsx("h3", { className: "mt-2 text-2xl font-black", children: "Starter Subscription" }), _jsx("p", { className: "mt-2 text-slate-400", children: "Service" }), _jsx("strong", { className: "mt-5 block text-3xl", children: "INR 1,200" })] }) })] }));
}
export function ProductPage() {
    return (_jsxs(Surface, { title: "Product", children: [_jsx("p", { className: "mb-4 text-slate-300", children: "Variant and recurring plan pricing will be resolved by the backend pricing engine." }), _jsx("button", { className: "rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950", type: "button", children: "Add to cart" })] }));
}
export function CartPage() {
    return (_jsx(Surface, { title: "Cart", children: _jsxs("div", { className: "grid gap-2 text-slate-200", children: [_jsx("p", { children: "Subtotal: INR 1,080" }), _jsx("p", { children: "Tax: INR 120" }), _jsx("p", { children: "Total: INR 1,200" })] }) }));
}
export function CheckoutAddressPage() {
    return (_jsx(Surface, { title: "Address", children: _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Address line 1", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", defaultValue: "Default billing address" })] }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["City", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", defaultValue: "Ahmedabad" })] })] }) }));
}
export function CheckoutPaymentPage() {
    return (_jsxs(Surface, { title: "Payment", children: [_jsx("p", { className: "mb-4 text-slate-300", children: "Mock gateway ready for hackathon demo flow." }), _jsx("button", { className: "rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-5 py-3 font-semibold text-slate-950", type: "button", children: "Pay now" })] }));
}
export function CheckoutSuccessPage() {
    return (_jsx(Surface, { title: "Thank you for your order", children: _jsx("p", { className: "text-slate-300", children: "Order S0001 was created successfully." }) }));
}
export function ProfilePage() {
    return (_jsx(Surface, { title: "User Details", children: _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Name", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", defaultValue: "Portal User" })] }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Email", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", defaultValue: "portal@example.com" })] })] }) }));
}
export function OrdersPage() {
    return (_jsx(Surface, { title: "My Orders", children: _jsx("div", { className: "overflow-hidden rounded-3xl border border-white/10", children: _jsxs("table", { className: "min-w-full text-left text-sm", children: [_jsx("thead", { className: "bg-white/6 text-slate-300", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Order" }), _jsx("th", { className: "px-4 py-3", children: "Date" }), _jsx("th", { className: "px-4 py-3", children: "Total" }), _jsx("th", { className: "px-4 py-3", children: "Status" })] }) }), _jsx("tbody", { children: _jsxs("tr", { className: "border-t border-white/10 text-slate-100", children: [_jsx("td", { className: "px-4 py-3", children: "S0001" }), _jsx("td", { className: "px-4 py-3", children: "2026-04-04" }), _jsx("td", { className: "px-4 py-3", children: "INR 1,200" }), _jsx("td", { className: "px-4 py-3", children: "Active" })] }) })] }) }) }));
}
export function OrderDetailPage() {
    return (_jsxs(Surface, { title: "Order / Subscription", children: [_jsx("p", { className: "text-slate-300", children: "Plan: Annual Starter" }), _jsx("p", { className: "mt-2 text-slate-300", children: "Renew and close actions belong here when allowed." })] }));
}
export function InvoiceDetailPage() {
    return (_jsxs(Surface, { title: "Invoice INV-0015", children: [_jsx("p", { className: "mb-4 text-slate-300", children: "Amount due: 0" }), _jsx("button", { className: "rounded-full bg-white/10 px-5 py-3 font-semibold text-white", type: "button", children: "Download PDF" })] }));
}
