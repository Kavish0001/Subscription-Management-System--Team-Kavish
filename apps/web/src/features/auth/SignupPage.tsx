import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@subscription/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { type z } from 'zod';

import { AuthShell, MessageBanner } from '../../components/layout';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

const schema = signupSchema;
type SignupForm = z.infer<typeof schema>;

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const form = useForm<SignupForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      name: '',
      password: ''
    }
  });

  return (
    <AuthShell
      eyebrow="Portal onboarding"
      title="Create a subscription-ready customer account"
      description="Start with the portal, then move into quotes, invoices, payments, and active subscriptions without changing systems."
    >
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            setError(null);
            if (values.password !== confirmPassword) {
              setError('Passwords do not match');
              return;
            }
            await signup(values);
            navigate('/');
          } catch (submissionError) {
            setError(submissionError instanceof ApiError ? submissionError.message : 'Unable to create account');
          }
        })}
      >
        <div>
          <p className="eyebrow">Create account</p>
          <h2 className="section-title mt-3">Provision your portal identity</h2>
        </div>
        <label className="grid gap-2 text-sm">
          <span className="muted">Name</span>
          <input className="app-input" {...form.register('name')} />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="muted">Email ID</span>
          <input className="app-input" {...form.register('email')} type="email" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="muted">Password</span>
          <input className="app-input" {...form.register('password')} type="password" />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="muted">Re-enter Password</span>
          <input className="app-input" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
        </label>
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        <button
          className="app-btn app-btn-primary"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Sign up
        </button>
        <button className="app-btn app-btn-secondary" type="button">
          Continue with Google
        </button>
        <div className="text-sm">
          <Link className="text-[color:var(--color-secondary)]" to="/login">
            Already have an account?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
