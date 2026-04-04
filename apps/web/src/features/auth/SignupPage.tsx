import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@subscription/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { type z } from 'zod';

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
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-50">
      <form
        className="grid w-full max-w-md gap-4 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-2xl shadow-black/30 backdrop-blur"
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
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-300">Portal onboarding</p>
        <h1 className="text-4xl font-black">Create account</h1>
        <label className="grid gap-2 text-sm text-slate-200">
          Name
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" {...form.register('name')} />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Email ID
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" {...form.register('email')} type="email" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Password
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" {...form.register('password')} type="password" />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Re-enter Password
          <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3" onChange={(event) => setConfirmPassword(event.target.value)} value={confirmPassword} type="password" />
        </label>
        {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        <button
          className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          Sign up
        </button>
        <button className="rounded-full border border-white/10 bg-white/6 px-5 py-3 font-semibold text-white" type="button">
          Continue with Google
        </button>
        <div className="text-sm text-emerald-300">
          <Link to="/login">Already have an account?</Link>
        </div>
      </form>
    </div>
  );
}
