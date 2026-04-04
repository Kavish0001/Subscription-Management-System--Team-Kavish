import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@subscription/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { type z } from 'zod';

import { AuthShell, MessageBanner } from '../../components/layout';
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
      email: '',
      password: ''
    }
  });

  return (
    <AuthShell
      eyebrow="Authentication"
      title="Secure access for recurring operations"
      description="Use your backoffice or portal credentials to enter the subscription workspace."
    >
      <form
        className="grid gap-5 auth-form-stack"
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
        <div className="mb-1">
          <p className="eyebrow">Sign in</p>
          <h2 className="section-title mt-3">Continue to your workspace</h2>
        </div>
        <label className="grid gap-2 text-sm">
          <span className="muted">Email ID</span>
          <input className="app-input" autoCapitalize="none" autoComplete="username" spellCheck={false} {...form.register('email')} type="email" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="muted">Password</span>
          <input className="app-input" autoComplete="current-password" {...form.register('password')} type="password" />
        </label>
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        <button
          className="app-btn app-btn-primary"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Login
        </button>
        <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-1 text-sm">
          <Link className="text-[color:var(--color-secondary)]" to="/signup">
            Sign up
          </Link>
          <Link className="text-[color:var(--color-secondary)]" to="/reset-password">
            Forget password
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
