import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignup, useVerifyEmail } from '@/api/auth';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[^a-zA-Z0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });
type FormData = z.infer<typeof schema>;

export function SignupPage() {
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  
  const { mutate: signupMutate, isPending: isSignupPending, error: signupError } = useSignup();
  const { mutate: verifyMutate, isPending: isVerifyPending, error: verifyError } = useVerifyEmail();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmitSignup = (data: FormData) => {
    signupMutate(data, {
      onSuccess: () => setIsVerifying(true),
    });
  };

  const onSubmitVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutate({ token: otp }, {
      onSuccess: () => navigate('/login'),
    });
  };

  if (isVerifying) {
    return (
      <form onSubmit={onSubmitVerify} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">Verify your email</h2>
          <p className="text-muted-foreground text-sm">We've sent a 6-digit OTP code to your inbox.</p>
        </div>
        {verifyError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 text-center">{(verifyError as any).response?.data?.error ?? 'Verification failed'}</div>}
        <div className="space-y-1">
          <Label htmlFor="otp">Enter 6-digit Code</Label>
          <Input id="otp" type="text" placeholder="123456" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="text-center tracking-widest text-lg font-bold" />
        </div>
        <Button type="submit" className="w-full" disabled={isVerifyPending || otp.length !== 6}>
          {isVerifyPending ? 'Verifying...' : 'Complete Verification'}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4"><button type="button" onClick={() => setIsVerifying(false)} className="text-primary hover:underline">Change email address</button></p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmitSignup)} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Create account</h2>
        <p className="text-muted-foreground text-sm">Start your subscription today</p>
      </div>
      {signupError && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 text-center">{(signupError as any).response?.data?.error ?? 'Signup failed'}</div>}
      {[
        { id: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', key: 'name' as const },
        { id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', key: 'email' as const },
        { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', key: 'password' as const },
        { id: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••', key: 'confirmPassword' as const },
      ].map(f => (
        <div key={f.id} className="space-y-1">
          <Label htmlFor={f.id}>{f.label}</Label>
          <Input id={f.id} type={f.type} placeholder={f.placeholder} {...register(f.key)} />
          {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]?.message}</p>}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Password must be 8+ chars with uppercase, lowercase, and special character.</p>
      <Button type="submit" className="w-full" disabled={isSignupPending}>{isSignupPending ? 'Creating account...' : 'Create Account'}</Button>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
    </form>
  );
}
