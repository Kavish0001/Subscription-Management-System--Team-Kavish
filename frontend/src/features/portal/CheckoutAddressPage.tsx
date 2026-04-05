import { useNavigate } from 'react-router-dom';
import { useMyContacts, useCreateAddress } from '@/api/contacts';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderSummaryCard } from '@/components/OrderSummaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useState, useEffect } from 'react';
import { MapPin, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CheckoutAddressPage() {
  const navigate = useNavigate();
  const { data: contacts } = useMyContacts();
  const createAddressMut = useCreateAddress();
  const { setAddresses } = useCartStore();
  
  const [shippingId, setShippingId] = useState('');
  const [billingId, setBillingId] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddBillingForm, setShowAddBillingForm] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  
  const [formData, setFormData] = useState({ line1: '', city: '', state: '', postalCode: '', country: '' });
  const [billingFormData, setBillingFormData] = useState({ line1: '', city: '', state: '', postalCode: '', country: '' });

  const mainContact = contacts?.[0];
  const allAddresses = mainContact?.addresses ?? [];
  const validAddresses = allAddresses.filter((a: any) => a.line1 && a.city);

  useEffect(() => {
    if (!shippingId && validAddresses.length > 0) setShippingId(validAddresses[0].id);
    if (!billingId && validAddresses.length > 0) setBillingId(validAddresses[0].id);
    if (validAddresses.length === 0 && contacts) setShowAddForm(true);
  }, [contacts]);

  useEffect(() => {
    if (sameAsShipping) setBillingId(shippingId);
  }, [shippingId, sameAsShipping]);

  const handleContinue = () => {
    setAddresses(shippingId, billingId || shippingId);
    navigate('/checkout/payment');
  };

  const handleCreateAddress = () => {
    if (!mainContact) return;
    createAddressMut.mutate({ contactId: mainContact.id, type: 'shipping', ...formData }, {
      onSuccess: (newAddr) => {
        setShippingId(newAddr.id);
        if (sameAsShipping) setBillingId(newAddr.id);
        setShowAddForm(false);
        setFormData({ line1: '', city: '', state: '', postalCode: '', country: '' });
      }
    });
  };

  const handleCreateBillingAddress = () => {
    if (!mainContact) return;
    createAddressMut.mutate({ contactId: mainContact.id, type: 'billing', ...billingFormData }, {
      onSuccess: (newAddr) => {
        setBillingId(newAddr.id);
        setShowAddBillingForm(false);
        setBillingFormData({ line1: '', city: '', state: '', postalCode: '', country: '' });
      }
    });
  };

  const formatAddress = (a: any) => {
    const parts = [a.line1, a.city, a.state, a.postalCode, a.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Unnamed Address';
  };

  const getStepClass = (i: number) => {
    if (i === 1) return 'bg-primary text-primary-foreground';
    if (i < 1) return 'bg-primary/20 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  const isFormValid = formData.line1 && formData.city && formData.state && formData.postalCode && formData.country;
  const isBillingFormValid = billingFormData.line1 && billingFormData.city && billingFormData.state && billingFormData.postalCode && billingFormData.country;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="flex items-center gap-2 text-sm mb-8">
        {['Order Review', 'Address', 'Payment'].map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium", getStepClass(i))}>
              <span>{i + 1}</span><span>{step}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Shipping Address</CardTitle>
              {!showAddForm && validAddresses.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}><Plus className="h-4 w-4 mr-2" />Add New Address</Button>
              )}
            </CardHeader>
            <CardContent>
              {showAddForm ? (
                <div className="space-y-5 bg-background p-5 rounded-xl border border-border shadow-sm">
                  <h4 className="font-semibold text-base mb-1">Enter a new address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="addr-line1" className="text-xs font-medium mb-1.5 block">Street Address</label>
                      <Input id="addr-line1" placeholder="123 Main St, Apt 4B" value={formData.line1} onChange={e => setFormData({...formData, line1: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="addr-city" className="text-xs font-medium mb-1.5 block">City</label>
                      <Input id="addr-city" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="addr-state" className="text-xs font-medium mb-1.5 block">State / Province</label>
                      <Input id="addr-state" placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="addr-postal" className="text-xs font-medium mb-1.5 block">Postal Code</label>
                      <Input id="addr-postal" placeholder="ZIP / Postal" value={formData.postalCode} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                    </div>
                    <div>
                      <label htmlFor="addr-country" className="text-xs font-medium mb-1.5 block">Country</label>
                      <Input id="addr-country" placeholder="Country" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-primary w-4 h-4" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} />
                    <span className="text-sm font-medium">Set as permanent (Save to profile)</span>
                  </label>

                  <div className="flex gap-3 justify-end mt-4 pt-4 border-t">
                    {validAddresses.length > 0 && <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>}
                    <Button onClick={handleCreateAddress} disabled={!isFormValid || createAddressMut.isPending}>
                      {createAddressMut.isPending ? 'Saving...' : 'Save & Select Address'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {validAddresses.map((a: any) => (
                    <button
                      key={a.id}
                      onClick={() => setShippingId(a.id)}
                      className={cn(
                        "relative text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1",
                        shippingId === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                      )}
                    >
                      {shippingId === a.id && (
                        <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      <div className="font-semibold text-foreground mb-1">{mainContact?.name || 'Customer'}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{formatAddress(a)}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Billing Address</CardTitle>
              {!showAddForm && validAddresses.length > 0 && !sameAsShipping && !showAddBillingForm && (
                <Button variant="outline" size="sm" onClick={() => setShowAddBillingForm(true)}><Plus className="h-4 w-4 mr-2" />Add New Address</Button>
              )}
            </CardHeader>
            <CardContent>
              {!showAddForm && validAddresses.length > 0 ? (
                <>
                  <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-border bg-muted/40 mb-4 transition-colors hover:bg-muted/60">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" 
                      checked={sameAsShipping} 
                      onChange={(e) => {
                        setSameAsShipping(e.target.checked);
                        if (!e.target.checked) setBillingId('');
                      }} 
                    />
                    <span className="text-sm font-medium">Same as Shipping Address</span>
                  </label>

                  {!sameAsShipping && (
                    <div className="pt-2">
                      {showAddBillingForm ? (
                        <div className="space-y-4 bg-background p-5 rounded-xl border border-border shadow-sm">
                          <h4 className="font-semibold text-base mb-1">Enter billing address</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                              <label htmlFor="b-addr-line1" className="text-xs font-medium mb-1.5 block">Street Address</label>
                              <Input id="b-addr-line1" placeholder="123 Main St, Apt 4B" value={billingFormData.line1} onChange={e => setBillingFormData({...billingFormData, line1: e.target.value})} />
                            </div>
                            <div>
                              <label htmlFor="b-addr-city" className="text-xs font-medium mb-1.5 block">City</label>
                              <Input id="b-addr-city" placeholder="City" value={billingFormData.city} onChange={e => setBillingFormData({...billingFormData, city: e.target.value})} />
                            </div>
                            <div>
                              <label htmlFor="b-addr-state" className="text-xs font-medium mb-1.5 block">State / Province</label>
                              <Input id="b-addr-state" placeholder="State" value={billingFormData.state} onChange={e => setBillingFormData({...billingFormData, state: e.target.value})} />
                            </div>
                            <div>
                              <label htmlFor="b-addr-postal" className="text-xs font-medium mb-1.5 block">Postal Code</label>
                              <Input id="b-addr-postal" placeholder="ZIP / Postal" value={billingFormData.postalCode} onChange={e => setBillingFormData({...billingFormData, postalCode: e.target.value})} />
                            </div>
                            <div>
                              <label htmlFor="b-addr-country" className="text-xs font-medium mb-1.5 block">Country</label>
                              <Input id="b-addr-country" placeholder="Country" value={billingFormData.country} onChange={e => setBillingFormData({...billingFormData, country: e.target.value})} />
                            </div>
                          </div>
                          <div className="flex gap-3 justify-end mt-4 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setShowAddBillingForm(false)}>Cancel</Button>
                            <Button onClick={handleCreateBillingAddress} disabled={!isBillingFormValid || createAddressMut.isPending}>
                              {createAddressMut.isPending ? 'Saving...' : 'Save & Select Address'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-sm mb-3">Or choose an existing address:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {validAddresses.map((a: any) => (
                              <button
                                key={a.id}
                                onClick={() => setBillingId(a.id)}
                                className={cn(
                                  "relative text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-1",
                                  billingId === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                                )}
                              >
                                {billingId === a.id && (
                                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <Check className="h-3 w-3" />
                                  </div>
                                )}
                                <div className="font-semibold text-sm text-foreground mb-0.5">{mainContact?.name || 'Customer'}</div>
                                <div className="text-xs text-muted-foreground whitespace-pre-wrap">{formatAddress(a)}</div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Billing address will be verified in the next step.</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="lg" onClick={() => navigate('/cart')}>Back to Cart</Button>
            <Button 
              size="lg" 
              className="flex-1" 
              onClick={handleContinue} 
              disabled={Boolean(!shippingId || showAddForm || (!sameAsShipping && (!billingId || showAddBillingForm)))}
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
        <div><OrderSummaryCard /></div>
      </div>
    </div>
  );
}
