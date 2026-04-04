import { zodResolver } from '@hookform/resolvers/zod';
import { verifyOtpSchema } from '@subscription/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { type z } from 'zod';

import { AuthShell, MessageBanner } from '../../components/layout';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOtp, resendOtp } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const email = searchParams.get('email') || '';

  const form = useForm<VerifyOtpForm>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email,
      otp: ''
    }
  });

  const onResend = async () => {
    try {
      setError(null);
      setMessage(null);
      await resendOtp({ email });
      setMessage('A new verification code has been sent to your email.');
    } catch (submissionError) {
      setError(submissionError instanceof ApiError ? submissionError.message : 'Unable to resend code');
    }
  };

  return (
    <AuthShell
      eyebrow="Identity verification"
      title="Protecting your account with secure access"
      description="We've sent a 6-digit verification code to your email address. Please enter it below to confirm your identity and complete your registration."
    >
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit(
          async (values) => {
            try {
              setError(null);
              setMessage(null);
              await verifyOtp(values);
              navigate('/');
            } catch (submissionError) {
              setError(submissionError instanceof ApiError ? submissionError.message : 'Invalid or expired verification code');
            }
          },
          () => {
            setError('Please enter the 6-digit code sent to your email.');
          }
        )}
      >
        <div className="mb-1">
          <p className="eyebrow">Verify email</p>
          <h2 className="section-title mt-3">Enter verification code</h2>
        </div>

        <label className="app-label">
          <span>Verification Code</span>
          <input
            className="app-input text-center text-2xl tracking-[1em] font-mono"
            maxLength={6}
            placeholder="000000"
            {...form.register('otp')}
          />
          {form.formState.errors.otp ? (
            <span className="app-error">{form.formState.errors.otp.message}</span>
          ) : null}
        </label>

        {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}
        {message ? <MessageBanner tone="success">{message}</MessageBanner> : null}

        <button
          className="app-btn app-btn-primary"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? 'Verifying...' : 'Verify account'}
        </button>

        <div className="pt-2 text-center text-sm">
          <p className="muted mb-2">Didn't receive the code?</p>
          <button
            className="font-semibold text-[color:var(--color-primary-strong)] hover:underline"
            onClick={onResend}
            type="button"
          >
            Resend verification code
          </button>
        </div>

        <div className="border-t border-[color:var(--color-border)] pt-4 text-center text-sm">
          <Link className="muted hover:text-[color:var(--color-text-primary)]" to="/login">
            Back to login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
