import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@subscription/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { type z } from 'zod';

import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

const schema = loginSchema;
type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useSession();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'admin@example.com',
      password: 'Admin@1234'
    }
  });

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50">
      <form
        className="grid w-full max-w-md gap-4 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/30 backdrop-blur"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            setError(null);
            const user = await login(values);
            const nextPath = (location.state as { from?: string } | null)?.from;
            navigate(nextPath ?? (user.role === 'portal_user' ? '/' : '/admin'));
          } catch (submissionError) {
            setError(submissionError instanceof ApiError ? submissionError.message : 'Unable to login');
          }
        })}
      >
        <p className="text-xs uppercase tracking-[0.28em] text-amber-300">Authentication</p>
        <h1 className="text-4xl font-black">Sign in</h1>
        <label className="grid gap-2 text-sm text-slate-200">
          Email ID
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" {...form.register('email')} type="email" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Password
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" {...form.register('password')} type="password" />
        </label>
        {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <button
          className="rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Login
        </button>
        <div className="flex justify-between gap-3 text-sm text-amber-300">
          <Link to="/signup">Sign up</Link>
          <Link to="/reset-password">Forget password</Link>
        </div>
      </form>
    </div>
  );
}
