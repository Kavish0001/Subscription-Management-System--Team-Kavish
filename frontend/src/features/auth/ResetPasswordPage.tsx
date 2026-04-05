import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequestPasswordReset, useConfirmPasswordReset } from '@/api/auth';
import { useState } from 'react';

const requestSchema = z.object({ email: z.string().email() });
const confirmSchema = z.object({
  token: z.string().length(6, 'Please enter exactly 6 digits'),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[^a-zA-Z0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  
  const { mutate: reqMutate, isPending: reqPending, error: reqError, isSuccess: reqSuccess } = useRequestPasswordReset();
  const { mutate: confMutate, isPending: confPending, error: confError } = useConfirmPasswordReset();
  
  const reqForm = useForm({ resolver: zodResolver(requestSchema) });
  const confForm = useForm({ resolver: zodResolver(confirmSchema) });

  if (success) return <div className="text-center"><div className="text-green-600 font-medium mb-2">Password reset successfully!</div><Link to="/login" className="text-primary hover:underline text-sm block mt-4 bg-primary/10 py-2 rounded-md font-semibold">Back to login</Link></div>;

  if (reqSuccess) {
    return (
      <form onSubmit={confForm.handleSubmit(d => confMutate({ token: d.token as string, password: d.password as string }, { onSuccess: () => setSuccess(true) }))} className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold">Verify Reset Code</h2>
          <p className="text-sm text-muted-foreground mt-1">We sent a 6-digit OTP code to your email.</p>
        </div>
        {confError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 text-center">{(confError as any).response?.data?.error ?? 'Verification failed'}</div>}
        <div className="space-y-1">
          <Label>6-digit OTP</Label>
          <Input type="text" maxLength={6} placeholder="123456" className="text-center tracking-widest font-bold text-lg" {...confForm.register('token')} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, ''); confForm.setValue('token', e.target.value); }} />
          {confForm.formState.errors.token && <p className="text-xs text-destructive">{confForm.formState.errors.token.message as string}</p>}
        </div>
        <div className="space-y-1">
          <Label>New Password</Label>
          <Input type="password" {...confForm.register('password')} />
          {confForm.formState.errors.password && <p className="text-xs text-destructive">{confForm.formState.errors.password.message as string}</p>}
        </div>
        <div className="space-y-1">
          <Label>Confirm Password</Label>
          <Input type="password" {...confForm.register('confirmPassword')} />
          {confForm.formState.errors.confirmPassword && <p className="text-xs text-destructive">{confForm.formState.errors.confirmPassword.message as string}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={confPending}>{confPending ? 'Saving...' : 'Set New Password'}</Button>
        <div className="text-center mt-4"><button type="button" onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">Start over</button></div>
      </form>
    );
  }

  return (
    <form onSubmit={reqForm.handleSubmit(d => reqMutate(d))} className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold">Reset password</h2>
        <p className="text-sm text-muted-foreground mt-1">Receive a secure code to reset your access.</p>
      </div>
      {reqError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 text-center">{(reqError as any).response?.data?.error ?? 'Request failed'}</div>}
      <div className="space-y-1"><Label>Email Address</Label><Input type="email" placeholder="you@example.com" {...reqForm.register('email')} />{reqForm.formState.errors.email && <p className="text-xs text-destructive">{reqForm.formState.errors.email.message as string}</p>}</div>
      <Button type="submit" className="w-full" disabled={reqPending}>{reqPending ? 'Sending...' : 'Send Reset Code'}</Button>
      <div className="text-center mt-4"><Link to="/login" className="text-sm text-primary hover:underline">Back to login</Link></div>
    </form>
  );
}
