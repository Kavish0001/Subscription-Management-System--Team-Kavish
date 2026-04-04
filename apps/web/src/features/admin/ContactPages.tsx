import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, ApiError, formatDate, type AdminUser, type Contact } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  notes: string;
  userId: string;
};

const emptyContactForm = (): ContactFormState => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  companyName: '',
  notes: '',
  userId: ''
});

export function ContactListPage() {
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyContactForm);

  const contactsQuery = useQuery({
    queryKey: ['admin-contacts-management'],
    queryFn: () => apiRequest<Contact[]>('/contacts', { token })
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users-management', 'contact-owner-options'],
    queryFn: () => apiRequest<AdminUser[]>('/users', { token })
  });

  const createContactMutation = useMutation({
    mutationFn: async () =>
      apiRequest<Contact>('/contacts', {
        token,
        method: 'POST',
        body: JSON.stringify({
          userId: form.userId || undefined,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          companyName: form.companyName || undefined,
          notes: form.notes || undefined
        })
      }),
    onSuccess: async () => {
      setError(null);
      setForm(emptyContactForm());
      await queryClient.invalidateQueries({ queryKey: ['admin-contacts-management'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to create contact');
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) =>
      apiRequest<void>(`/contacts/${contactId}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-contacts-management'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete contact');
    }
  });

  const contacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (contactsQuery.data ?? []).filter((entry) =>
      !normalizedSearch ||
      entry.name.toLowerCase().includes(normalizedSearch) ||
      entry.email?.toLowerCase().includes(normalizedSearch) ||
      entry.user?.email.toLowerCase().includes(normalizedSearch)
    );
  }, [contactsQuery.data, search]);

  const owners = useMemo(
    () =>
      (usersQuery.data ?? []).filter((entry) => entry.role !== 'admin').sort((left, right) =>
        (left.name ?? left.email).localeCompare(right.name ?? right.email)
      ),
    [usersQuery.data]
  );

  return (
    <Surface title="Contacts" description="Customer/contact records with active subscription counts and default-contact linkage.">
      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">New Contact</h3>
          <p className="text-sm text-slate-400">Default contacts are auto-created from users. Use this form for additional contact records.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
          </Field>
          <Field label="Email">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} value={form.email} />
          </Field>
          <Field label="Phone">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} value={form.phone} />
          </Field>
          <Field label="Related User">
            <select className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, userId: event.target.value }))} value={form.userId}>
              <option value="">Unlinked contact</option>
              {owners.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name ?? entry.email}
                </option>
              ))}
            </select>
          </Field>
          <Field className="md:col-span-2" label="Address">
            <textarea className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} rows={3} value={form.address} />
          </Field>
          <Field label="Company Name">
            <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))} value={form.companyName} />
          </Field>
          <Field label="Notes">
            <textarea className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} rows={3} value={form.notes} />
          </Field>
        </div>
        <div className="mt-4">
          <button
            className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={createContactMutation.isPending}
            onClick={() => createContactMutation.mutate()}
            type="button"
          >
            {createContactMutation.isPending ? 'Creating...' : 'Create Contact'}
          </button>
        </div>
      </div>

      <div className="mb-5">
        <input className={fieldClass} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts" value={search} />
      </div>
      <div className="overflow-x-auto overflow-y-hidden rounded-3xl border border-white/10">
        <table className="min-w-[1080px] w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Subscriptions</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((entry) => {
              const isDeleting = deleteContactMutation.isPending && deleteContactMutation.variables === entry.id;

              return (
                <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold">{entry.name}</p>
                      <p className="text-xs text-slate-400">{entry.isDefault ? 'Default contact' : 'Additional contact'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{entry.user?.name ?? entry.user?.email ?? 'Unlinked'}</td>
                  <td className="px-4 py-3">{entry.email ?? 'Not set'}</td>
                  <td className="px-4 py-3">{entry.phone ?? 'Not set'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                      {entry.isActive ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white" to={`/admin/subscriptions?contactId=${entry.id}&status=active`}>
                      Subscriptions ({entry.activeSubscriptions ?? 0})
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" to={`/admin/contacts/${entry.id}`}>
                        View
                      </Link>
                      {!entry.isDefault && entry.isActive ? (
                        <button
                          className="rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200"
                          disabled={isDeleting}
                          onClick={() => deleteContactMutation.mutate(entry.id)}
                          type="button"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(emptyContactForm);

  const contactQuery = useQuery({
    queryKey: ['admin-contact-detail', id],
    queryFn: () => apiRequest<Contact>(`/contacts/${id}`, { token }),
    enabled: Boolean(id)
  });

  useEffect(() => {
    if (!contactQuery.data) {
      return;
    }

    setForm({
      name: contactQuery.data.name,
      email: contactQuery.data.email ?? '',
      phone: contactQuery.data.phone ?? '',
      address: contactQuery.data.address ?? '',
      companyName: contactQuery.data.companyName ?? '',
      notes: contactQuery.data.notes ?? '',
      userId: contactQuery.data.userId ?? ''
    });
  }, [contactQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (payload?: { isDefault?: boolean }) =>
      apiRequest<Contact>(`/contacts/${id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          name: payload?.isDefault ? undefined : form.name,
          email: payload?.isDefault ? undefined : form.email,
          phone: payload?.isDefault ? undefined : form.phone || undefined,
          address: payload?.isDefault ? undefined : form.address || undefined,
          companyName: payload?.isDefault ? undefined : form.companyName || undefined,
          notes: payload?.isDefault ? undefined : form.notes || undefined,
          isDefault: payload?.isDefault
        })
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-contacts-management'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-contact-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-users-management'] })
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save contact');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      apiRequest<void>(`/contacts/${id}`, {
        token,
        method: 'DELETE'
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-contacts-management'] });
      navigate('/admin/contacts');
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to delete contact');
    }
  });

  const contact = contactQuery.data;

  return (
    <Surface title={contact?.name ?? 'Contact'} description="Subscriptions belong to contacts, and only one default contact can exist per user.">
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <div className="mb-5 flex flex-wrap gap-3">
        <Link className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white" to={`/admin/subscriptions?contactId=${contact?.id ?? ''}&status=active`}>
          Subscriptions ({contact?.activeSubscriptions ?? 0})
        </Link>
        {contact?.userId && !contact.isDefault ? (
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ isDefault: true })}
            type="button"
          >
            Set As Default
          </button>
        ) : null}
        {!contact?.isDefault ? (
          <button
            className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            type="button"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} value={form.name} />
        </Field>
        <Field label="Email">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} value={form.email} />
        </Field>
        <Field label="Phone">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} value={form.phone} />
        </Field>
        <ReadOnlyField label="Owner User" value={contact?.user?.email ?? 'Unlinked'} />
        <Field className="md:col-span-2" label="Address">
          <textarea className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} rows={3} value={form.address} />
        </Field>
        <Field label="Company Name">
          <input className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))} value={form.companyName} />
        </Field>
        <Field label="Notes">
          <textarea className={fieldClass} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} rows={3} value={form.notes} />
        </Field>
        <ReadOnlyField label="Created" value={formatDate(contact?.createdAt)} />
        <ReadOnlyField label="Updated" value={formatDate(contact?.updatedAt)} />
      </div>

      <div className="mt-6">
        <button
          className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(undefined)}
          type="button"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Surface>
  );
}

function Field({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <label className={`grid gap-2 text-sm text-slate-200 ${className ?? ''}`}>
      {label}
      {children}
    </label>
  );
}

function ReadOnlyField({ className, label, value }: { className?: string; label: string; value: string }) {
  return (
    <div className={`grid gap-2 text-sm text-slate-200 ${className ?? ''}`}>
      <span>{label}</span>
      <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-white">{value}</div>
    </div>
  );
}
