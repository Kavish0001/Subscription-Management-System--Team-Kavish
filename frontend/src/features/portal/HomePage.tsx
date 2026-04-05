import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProducts } from '@/api/products';
import { useRecurringPlans } from '@/api/config';
import { formatCurrency } from '@/lib/formatters';
import { ShoppingCart, Zap, Shield, Headphones, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

export function HomePage() {
  const { data: productsData, isLoading } = useProducts({ pageSize: 6 });
  const { data: plans } = useRecurringPlans();
  const { addItem } = useCartStore();
  const { user } = useAuthStore();

  return (
    <div className="space-y-20">
      {/* Hero */}
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Zap className="h-4 w-4" />Subscription Management Made Simple
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
          Manage Your Subscriptions<br />
          <span className="text-primary">Effortlessly</span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Choose from flexible subscription plans tailored to your needs. Start today and scale as you grow.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button size="lg" asChild>
            <Link to="/shop">Browse Plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          {!user && (
            <Button size="lg" variant="outline" asChild>
              <Link to="/signup">Get Started Free</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: Zap, title: 'Flexible Plans', desc: 'Monthly, 6-month, or yearly — choose what works for you.' },
          { icon: Shield, title: 'Secure Payments', desc: 'Your payment data is always safe and encrypted.' },
          { icon: Headphones, title: '24/7 Support', desc: 'We are here whenever you need help.' },
        ].map(f => (
          <div key={f.title} className="text-center p-6 rounded-xl bg-card border hover:shadow-md transition-shadow">
            <div className="inline-flex p-3 bg-primary/10 rounded-xl mb-4">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-muted-foreground text-sm">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing cards */}
      {plans && plans.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-center mb-2">Simple, Transparent Pricing</h2>
          <p className="text-center text-muted-foreground mb-8">No hidden fees. Cancel anytime.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.slice(0, 3).map((plan: any, i: number) => (
              <Card key={plan.id} className={i === 1 ? 'border-primary shadow-lg relative' : ''}>
                {i === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <CardContent className="pt-8 pb-6 text-center">
                  <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
                  <p className="text-3xl font-bold text-primary mb-1">{formatCurrency(plan.price)}</p>
                  <p className="text-sm text-muted-foreground mb-6">per {plan.intervalCount > 1 ? `${plan.intervalCount} ${plan.intervalUnit}s` : plan.intervalUnit}</p>
                  <Button className="w-full" variant={i === 1 ? 'default' : 'outline'} asChild>
                    <Link to="/shop">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Featured products */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground text-sm mt-1">Top picks from our catalog</p>
          </div>
          <Button variant="outline" asChild><Link to="/shop">View All</Link></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />)
            : productsData?.items?.map((product: any) => (
              <Card key={product.id} className="group hover:shadow-md transition-all">
                <div className="aspect-video bg-gradient-to-br from-violet-100 to-indigo-100 rounded-t-lg flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl.split(',')[0]} alt={product.name} className="w-full h-full object-cover rounded-t-lg" />
                  ) : (
                    <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">{product.name[0]}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description || 'Premium subscription plan'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">{formatCurrency(product.baseSalesPrice)}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/products/${product.slug}`}>Details</Link>
                      </Button>
                      <Button size="sm" onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: Number(product.baseSalesPrice), quantity: 1 })}>
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </div>
      </div>
    </div>
  );
}
