import { useParams, useNavigate } from 'react-router-dom';
import { useUser, useCreateUser, useUpdateUser } from '@/api/users';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Card, CardContent } from '../../components/ui/card';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/formatters';

export function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { isAdmin, isInternal } = useAuthStore();
  const { data: user } = useUser(isNew ? '' : (id ?? ''));
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'portal_user' as string,
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        email: user.email,
        name: user.contacts?.[0]?.name ?? '',
        phone: user.contacts?.[0]?.phone ?? '',
        role: user.role,
        isActive: user.isActive,
      }));
    }
  }, [user]);

  const handleSave = () => {
    if (isNew) {
      createMut.mutate(form, { onSuccess: d => navigate(`/admin/users/${d.id}`) });
    } else {
      updateMut.mutate({ id: id ?? '', role: form.role, isActive: form.isActive });
    }
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'New User' : form.email}
        subtitle={!isNew && user ? `Joined ${formatDate(user.createdAt)}` : 'Create a new system user'}
        actions={
          <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {isNew ? 'Create User' : 'Save Changes'}
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e: any) => setForm(f => ({ ...f, email: e.target.value }))}
              disabled={!isNew}
              placeholder="user@example.com"
            />
          </div>

          {isNew && (
            <>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e: any) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e: any) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e: any) => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9999999999"
                />
              </div>
            </>
          )}

          {(isAdmin() || isInternal()) && (
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="internal_user">Internal User</SelectItem>
                  <SelectItem value="portal_user">Portal User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isNew && (
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="active-switch"
                checked={form.isActive}
                onCheckedChange={(v: any) => setForm(f => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="active-switch">Account Active</Label>
            </div>
          )}
        </CardContent>
      </Card>

      {!isNew && user?.contacts && user.contacts.length > 0 && (
        <Card className="max-w-lg mt-4">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Contact Info</h3>
            {user.contacts.map((c: any) => (
              <div key={c.id} className="space-y-2">
                <p className="font-medium">{c.name}</p>
                {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
                {c.addresses?.map((a: any) => (
                  <div key={a.id} className="text-sm text-muted-foreground border-l-2 pl-3">
                    <span className="capitalize text-xs font-medium">{a.type}:</span> {a.line1}, {a.city}, {a.country}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
