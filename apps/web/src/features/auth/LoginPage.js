import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@subscription/shared';
import { Link } from 'react-router-dom';
const schema = loginSchema;
export function LoginPage() {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: 'admin@example.com',
            password: 'Admin@1234'
        }
    });
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50", children: _jsxs("form", { className: "grid w-full max-w-md gap-4 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/30 backdrop-blur", onSubmit: form.handleSubmit(console.log), children: [_jsx("p", { className: "text-xs uppercase tracking-[0.28em] text-amber-300", children: "Authentication" }), _jsx("h1", { className: "text-4xl font-black", children: "Sign in" }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Email", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", ...form.register('email'), type: "email" })] }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Password", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", ...form.register('password'), type: "password" })] }), _jsx("button", { className: "rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-5 py-3 font-semibold text-slate-950", type: "submit", children: "Login" }), _jsxs("div", { className: "flex justify-between gap-3 text-sm text-amber-300", children: [_jsx(Link, { to: "/signup", children: "Sign up" }), _jsx(Link, { to: "/reset-password", children: "Forget password" })] })] }) }));
}
