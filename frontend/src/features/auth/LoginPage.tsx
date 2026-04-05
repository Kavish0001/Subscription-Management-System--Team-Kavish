import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/api/auth';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { mutate, isPending, error } = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(d => mutate(d))} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Welcome back</h2>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>
      {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3 text-center">{(error as any).response?.data?.error ?? 'Login failed'}</div>}
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>{isPending ? 'Signing in...' : 'Sign In'}</Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link to="/reset-password" className="hover:text-primary">Forgot password?</Link>
        <Link to="/signup" className="hover:text-primary">Sign up</Link>
      </div>
    </form>
  );
}
