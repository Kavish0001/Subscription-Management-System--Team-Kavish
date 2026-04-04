import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AuthShell, MessageBanner } from '../../components/layout';
import { ApiError, apiRequest } from '../../lib/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const requestMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string; resetLink?: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    onSuccess: (result) => {
      setError(null);
      setMessage(result.message);
      setResetLink(result.resetLink ?? null);
    },
    onError: (mutationError) => {
      setMessage(null);
      setResetLink(null);
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
      window.setTimeout(() => navigate('/login'), 800);
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to reset password');
    }
  });

  const title = useMemo(() => (isResetMode ? 'Set new password' : 'Forgot password'), [isResetMode]);

  return (
    <AuthShell
      eyebrow={isResetMode ? 'Reset password' : 'Reset access'}
      title={title}
      description="Password recovery keeps the access flow simple without exposing subscription operations to unauthorized users."
    >
      <div className="grid gap-4">
        {isResetMode ? (
          <>
            <label className="grid gap-2 text-sm">
              <span className="muted">New Password</span>
              <input className="app-input" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="muted">Re-enter Password</span>
              <input className="app-input" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
            </label>
          </>
        ) : (
          <label className="grid gap-2 text-sm">
            <span className="muted">Enter Email ID</span>
            <input className="app-input" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
          </label>
        )}
        {message ? <MessageBanner tone="success">{message}</MessageBanner> : null}
        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {!isResetMode && resetLink ? (
          <a className="app-btn app-btn-secondary justify-self-start" href={resetLink}>
            Open demo reset link
          </a>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            className="app-btn app-btn-primary"
            onClick={() => (isResetMode ? confirmMutation.mutate() : requestMutation.mutate())}
            type="button"
          >
            {isResetMode ? 'Update Password' : 'Submit'}
          </button>
          <Link className="app-btn app-btn-secondary" to="/login">
            Back to login
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
