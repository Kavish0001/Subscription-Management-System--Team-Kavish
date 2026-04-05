import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthShell, MessageBanner } from '../../components/layout';
import { ApiError, apiRequest } from '../../lib/api';
import { useSession } from '../../lib/session';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useSession();
  const token = searchParams.get('token') ?? '';
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, user?.email]);

  const requestMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string; resetLink?: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    onSuccess: (result) => {
      setError(null);
      setMessage(result.message);
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to request reset');
    }
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>('/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      }),
    onSuccess: (result) => {
      setError(null);
      setMessage(result.message);
      window.setTimeout(() => navigate(isAuthenticated ? '/account/profile' : '/login'), 800);
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to reset password');
    }
  });

  const title = useMemo(() => (isResetMode ? 'Set new password' : 'Forgot password'), [isResetMode]);
  const hasExpiredLinkError = isResetMode && error === 'Reset link is invalid or expired';
  const isSubmitting = isResetMode ? confirmMutation.isPending : requestMutation.isPending;
  const backTarget = isAuthenticated ? '/account/profile' : '/login';
  const backLabel = isAuthenticated ? 'Back to account' : 'Back to login';

  return (
    <AuthShell
      eyebrow={isResetMode ? 'Reset password' : 'Reset access'}
      title={isResetMode ? 'Reset password' : title}
      description="Password recovery keeps the access flow simple without exposing subscription operations to unauthorized users."
    >
      <div className="auth-form-stack grid gap-4">
        <div className="mb-1">
          <p className="eyebrow">{isResetMode ? 'Password recovery' : 'Reset access'}</p>
          <h2 className="section-title mt-3">{isResetMode ? 'Create a new password' : 'Forgot password'}</h2>
        </div>
        {isResetMode ? (
          <>
            <label className="app-label">
              <span>New Password</span>
              <input className="app-input" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </label>
            <label className="app-label">
              <span>Re-enter Password</span>
              <input className="app-input" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
            </label>
          </>
        ) : (
          <label className="app-label">
            <span>Enter Email ID</span>
            <input className="app-input" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
          </label>
        )}
        {isResetMode ? (
          <p className="text-sm muted">Only the latest reset link works. If you requested a newer one, older links become invalid.</p>
        ) : isAuthenticated ? (
          <p className="text-sm muted">We will send the reset link to your current account email address.</p>
        ) : null}
        {message ? <MessageBanner tone="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {hasExpiredLinkError ? (
          <Link className="app-btn app-btn-secondary justify-self-start" to="/reset-password">
            Request New Link
          </Link>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            className="app-btn app-btn-primary"
            disabled={isSubmitting}
            onClick={() => (isResetMode ? confirmMutation.mutate() : requestMutation.mutate())}
            type="button"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color:rgba(2,6,23,0.18)] border-t-[color:var(--color-text-primary)]" />
                {isResetMode ? 'Updating...' : 'Sending...'}
              </>
            ) : isResetMode ? (
              'Update Password'
            ) : (
              'Submit'
            )}
          </button>
          <Link
            aria-disabled={isSubmitting}
            className={`app-btn app-btn-secondary ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}
            to={backTarget}
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
