import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest } from '../../lib/api';
import { ApiError } from '../../lib/api';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>('/auth/reset-password', {
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

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50">
      <Surface title="Forgot password">
        <div className="grid w-full max-w-md gap-4">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-300">Reset access</p>
          <label className="grid gap-2 text-sm text-slate-200">
            Enter Email ID
            <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
          </label>
          {message ? <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
          {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-gradient-to-r from-sky-300 to-indigo-400 px-5 py-3 font-semibold text-slate-950" onClick={() => resetMutation.mutate()} type="button">
              Submit
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
