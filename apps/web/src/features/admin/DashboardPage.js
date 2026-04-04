import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { MetricCard, Surface } from '../../components/layout';
export function DashboardPage() {
    return (_jsxs(_Fragment, { children: [_jsx(MetricCard, { label: "Active subscriptions", value: "128", detail: "Live contracts under billing." }), _jsx(MetricCard, { label: "MRR", value: "INR 4.2L", detail: "Updated from paid invoices." }), _jsx(MetricCard, { label: "Overdue invoices", value: "12", detail: "Needs collection attention." }), _jsx(Surface, { title: "Workflow coverage", children: _jsx("p", { className: "max-w-3xl text-slate-300", children: "This scaffold already includes admin catalog routes, subscription creation, invoice generation, mock payments, role-based auth, and portal navigation." }) })] }));
}
