import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@subscription/shared';
import { Link } from 'react-router-dom';
const schema = signupSchema;
export function SignupPage() {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
            name: '',
            password: ''
        }
    });
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50", children: _jsxs("form", { className: "grid w-full max-w-md gap-4 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/30 backdrop-blur", onSubmit: form.handleSubmit(console.log), children: [_jsx("p", { className: "text-xs uppercase tracking-[0.28em] text-emerald-300", children: "Portal onboarding" }), _jsx("h1", { className: "text-4xl font-black", children: "Create account" }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Name", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", ...form.register('name') })] }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Email", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", ...form.register('email'), type: "email" })] }), _jsxs("label", { className: "grid gap-2 text-sm text-slate-200", children: ["Password", _jsx("input", { className: "rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3", ...form.register('password'), type: "password" })] }), _jsx("button", { className: "rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950", type: "submit", children: "Sign up" }), _jsx("div", { className: "text-sm text-emerald-300", children: _jsx(Link, { to: "/login", children: "Already have an account?" }) })] }) }));
}
