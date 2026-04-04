import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
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
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50">
      <Surface title={title}>
        <div className="grid w-full max-w-md gap-4">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300">
            {isResetMode ? 'Reset password' : 'Reset access'}
          </p>
          {isResetMode ? (
            <>
              <label className="grid gap-2 text-sm text-slate-200">
                New Password
                <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                Re-enter Password
                <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} />
              </label>
            </>
          ) : (
            <label className="grid gap-2 text-sm text-slate-200">
              Enter Email ID
              <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
            </label>
          )}
          {message ? <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
          {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {!isResetMode && resetLink ? (
            <a className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100" href={resetLink}>
              Open demo reset link
            </a>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-5 py-3 font-semibold text-slate-950"
              onClick={() => (isResetMode ? confirmMutation.mutate() : requestMutation.mutate())}
              type="button"
            >
              {isResetMode ? 'Update Password' : 'Submit'}
            </button>
            <Link className="rounded-full border border-white/10 bg-white/6 px-5 py-3 font-semibold text-white" to="/login">
              Back to login
            </Link>
          </div>
        </div>
      </Surface>
    </div>
  );
}
