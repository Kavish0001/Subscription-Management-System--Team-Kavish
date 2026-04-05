import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProducts, useCategories } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/formatters';
import { Search, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function ShopPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const { data: productsData, isLoading } = useProducts({ search, categoryId, page, pageSize: 12 });
  const { data: categories } = useCategories();
  const { addItem } = useCartStore();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Shop</h1>
        <p className="text-muted-foreground text-sm">Browse all available products and subscription plans</p>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="md:w-56 flex-shrink-0">
          <div className="bg-card border rounded-lg p-4 sticky top-20">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Categories</h3>
            <div className="space-y-1">
              {[{ id: '', name: 'All Products' }, ...(categories ?? [])].map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id); setPage(1); }}
                  className={cn('w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center', categoryId === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground')}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : productsData?.items?.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No products found</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(''); setCategoryId(''); }}>Clear filters</Button>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                {productsData?.total ?? 0} products found
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productsData?.items?.map((product: any) => (
                  <Card key={product.id} className="hover:shadow-md transition-all group">
                    <div className="aspect-video bg-gradient-to-br from-violet-50 to-indigo-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl.split(',')[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-xl font-bold text-primary">{product.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      {product.category && <Badge variant="secondary" className="text-xs mb-2">{product.category.name}</Badge>}
                      <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description || '—'}</p>
                      <div className="flex items-center justify-between">
                        {product.baseSalesPrice > 0 ? (
                          <span className="font-bold text-primary">{formatCurrency(product.baseSalesPrice)}</span>
                        ) : product.planPricing?.length > 0 ? (
                          <span className="font-bold text-primary">
                            From {formatCurrency(Math.min(...product.planPricing.map((p: any) => Number(p.price))))}
                          </span>
                        ) : (
                          <span className="font-bold text-primary">Free</span>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/products/${product.slug}`}>View</Link>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => addItem({ productId: product.id, productName: product.name, unitPrice: Number(product.baseSalesPrice), quantity: 1 })}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {productsData && productsData.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
                  <span className="flex items-center text-sm text-muted-foreground px-3">Page {page} of {productsData.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === productsData.totalPages}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
