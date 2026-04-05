import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function AuthLayout() {
  const { user } = useAuthStore();
  if (user) return <Navigate to={user.role === 'portal_user' ? '/' : '/admin'} replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary rounded-xl mb-3">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">SubMS</h1>
          <p className="text-muted-foreground text-sm">Subscription Management System</p>
        </div>
        <div className="bg-card rounded-2xl shadow-lg p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
