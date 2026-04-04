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
      title="Subscription-ready onboarding"
      description="Create a clean portal identity for billing, subscriptions, and account access."
    >
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(
          async (values) => {
            try {
              setError(null);
              if (values.password !== confirmPassword) {
                setError('Passwords do not match');
                return;
              }
              await signup(values);
              navigate(`/verify-otp?email=${encodeURIComponent(values.email)}`);
            } catch (submissionError) {
              setError(submissionError instanceof ApiError ? submissionError.message : 'Unable to create account');
            }
          },
          () => {
            setError('Please fix the highlighted fields and try again.');
          }
        )}
      >
        <div className="mb-1">
          <p className="eyebrow">Create account</p>
          <h2 className="section-title mt-3">Provision your portal identity</h2>
        </div>
        <label className="app-label">
          <span>Name</span>
          <input className="app-input" {...form.register('name')} />
          {form.formState.errors.name ? (
            <span className="app-error">{form.formState.errors.name.message}</span>
          ) : null}
        </label>
        <label className="app-label">
          <span>Email ID</span>
          <input className="app-input" {...form.register('email')} type="email" />
          {form.formState.errors.email ? (
            <span className="app-error">{form.formState.errors.email.message}</span>
          ) : null}
        </label>
        <label className="app-label">
          <span>Password</span>
          <input className="app-input" {...form.register('password')} type="password" />
          <span className="app-help">
            Use at least 9 characters with uppercase, lowercase, and a special character.
          </span>
          {form.formState.errors.password ? (
            <span className="app-error">{form.formState.errors.password.message}</span>
          ) : null}
        </label>
        <label className="app-label">
          <span>Re-enter Password</span>
          <input className="app-input" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
          {error === 'Passwords do not match' ? (
            <span className="app-error">Passwords do not match</span>
          ) : null}
        </label>
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        <button
          className="app-btn app-btn-primary"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Sign up
        </button>
        <div className="pt-1 text-center text-sm">
          <Link className="font-semibold text-[color:var(--color-primary-strong)]" to="/login">
            Already have an account?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
