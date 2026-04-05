import { Link } from 'react-router-dom';
import { useMyContacts, useUpdateContact, useUpdateAddress } from '@/api/contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Save, User } from 'lucide-react';

export function ProfilePage() {
  const { data: contacts, isLoading } = useMyContacts();
  const updateContact = useUpdateContact();
  const updateAddress = useUpdateAddress();

  const defaultContact = contacts?.find((c: any) => c.isDefault) ?? contacts?.[0];
  const billing = defaultContact?.addresses?.find((a: any) => a.type === 'billing');
  const shipping = defaultContact?.addresses?.find((a: any) => a.type === 'shipping');

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [billAddr, setBillAddr] = useState({ line1: '', city: '', state: '', postalCode: '', country: 'India' });
  const [shipAddr, setShipAddr] = useState({ line1: '', city: '', state: '', postalCode: '', country: 'India' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (defaultContact) {
      setProfile({ name: defaultContact.name ?? '', email: defaultContact.email ?? '', phone: defaultContact.phone ?? '' });
    }
    if (billing) {
      setBillAddr({ line1: billing.line1 ?? '', city: billing.city ?? '', state: billing.state ?? '', postalCode: billing.postalCode ?? '', country: billing.country ?? 'India' });
    }
    if (shipping) {
      setShipAddr({ line1: shipping.line1 ?? '', city: shipping.city ?? '', state: shipping.state ?? '', postalCode: shipping.postalCode ?? '', country: shipping.country ?? 'India' });
    }
  }, [contacts]);

  const handleSave = () => {
    if (defaultContact) updateContact.mutate({ id: defaultContact.id, ...profile });
    if (billing) updateAddress.mutate({ contactId: defaultContact?.id, addressId: billing.id, ...billAddr });
    if (shipping) updateAddress.mutate({ contactId: defaultContact?.id, addressId: shipping.id, ...shipAddr });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isSaving = updateContact.isPending || updateAddress.isPending;

  const addressFields: [string, string][] = [
    ['line1', 'Street Address'],
    ['city', 'City'],
    ['state', 'State / Province'],
    ['postalCode', 'Postal Code'],
    ['country', 'Country'],
  ];

  return (
    <div>
      {/* Account tabs */}
      <div className="flex gap-2 mb-6">
        <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">My Profile</div>
        <Link to="/account/orders" className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">My Orders</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">My Profile</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Personal info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {([['name', 'Full Name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel']] as const).map(([key, label, type]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={type}
                  value={(profile as any)[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Billing address */}
        <Card>
          <CardHeader><CardTitle className="text-base">Billing Address</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {addressFields.map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`bill-${key}`}>{label}</Label>
                <Input
                  id={`bill-${key}`}
                  value={(billAddr as any)[key]}
                  onChange={e => setBillAddr(a => ({ ...a, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Shipping address */}
        <Card>
          <CardHeader><CardTitle className="text-base">Shipping Address</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {addressFields.map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`ship-${key}`}>{label}</Label>
                <Input
                  id={`ship-${key}`}
                  value={(shipAddr as any)[key]}
                  onChange={e => setShipAddr(a => ({ ...a, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
