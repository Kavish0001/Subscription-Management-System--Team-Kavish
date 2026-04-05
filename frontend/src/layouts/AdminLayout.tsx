import { Outlet, NavLink, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Package, FileText, Users, Settings, ChevronDown, Menu, LogOut, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

const configLinks = [
  { label: 'Attributes', to: '/admin/config/attributes' },
  { label: 'Recurring Plans', to: '/admin/config/recurring-plans' },
  { label: 'Quotation Templates', to: '/admin/config/quotation-templates' },
  { label: 'Discounts', to: '/admin/config/discounts' },
  { label: 'Taxes', to: '/admin/config/taxes' },
  { label: 'Payment Terms', to: '/admin/config/payment-terms' },
];

export function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [configOpen, setConfigOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || (user.role !== 'admin' && user.role !== 'internal_user')) {
    return <Navigate to="/login" replace />;
  }
  
  const isInternal = user.role === 'internal_user';


  const handleLogout = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    logout();
    navigate('/login');
  };

  const navItem = (to: string, icon: React.ReactNode, label: string) => (
    <NavLink to={to} end={to === '/admin'} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
      {icon}<span>{label}</span>
    </NavLink>
  );

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">S</span></div>
          <span className="font-bold text-lg">SubMS Admin</span>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItem('/admin', <LayoutDashboard className="h-4 w-4" />, 'Dashboard')}
        {navItem('/admin/subscriptions', <FileText className="h-4 w-4" />, 'Subscriptions')}
        {!isInternal && navItem('/admin/products', <Package className="h-4 w-4" />, 'Products')}
        {navItem('/admin/reports', <BarChart3 className="h-4 w-4" />, 'Reports')}
        {!isInternal && navItem('/admin/users', <Users className="h-4 w-4" />, 'Users & Contacts')}
        {!isInternal && (
          <div>
            <button onClick={() => setConfigOpen(!configOpen)} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full">
              <Settings className="h-4 w-4" /><span className="flex-1 text-left">Configuration</span><ChevronDown className={cn('h-4 w-4 transition-transform', configOpen && 'rotate-180')} />
            </button>
            {configOpen && (
              <div className="ml-7 mt-1 space-y-1">
                {configLinks.map(l => (
                  <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('block px-3 py-1.5 rounded-md text-xs font-medium transition-colors', isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">{user.email[0].toUpperCase()}</div>
          <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{user.email}</p><p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p></div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r">{sidebar}</aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            role="button" 
            tabIndex={0} 
            onClick={() => setMobileOpen(false)} 
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMobileOpen(false); }}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-14 border-b bg-card flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}><Menu className="h-5 w-5" /></Button>
          <span className="font-semibold">SubMS Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
