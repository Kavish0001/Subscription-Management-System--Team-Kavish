import { Outlet, Link, useNavigate, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import api from '@/lib/axios';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
];

export function PortalLayout() {
  const { user, logout } = useAuthStore();
  const items = useCartStore(s => s.items);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    logout();
    navigate('/login');
  };

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-lg hidden sm:block">SubMS</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map(l => (
                <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link to="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">{cartCount}</Badge>}
                </Link>
              </Button>
              {user ? (
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild><Link to="/account/profile"><User className="h-4 w-4 mr-1" />{user.email.split('@')[0]}</Link></Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
              ) : (
                <div className="hidden md:flex gap-2">
                  <Button variant="ghost" size="sm" asChild><Link to="/login">Login</Link></Button>
                  <Button size="sm" asChild><Link to="/signup">Sign Up</Link></Button>
                </div>
              )}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-2">
            {navLinks.map(l => <Link key={l.to} to={l.to} className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{l.label}</Link>)}
            {user ? (
              <>
                <Link to="/account/profile" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Profile</Link>
                <Link to="/account/orders" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>My Orders</Link>
                <button onClick={handleLogout} className="block py-2 text-sm text-destructive">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/signup" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
