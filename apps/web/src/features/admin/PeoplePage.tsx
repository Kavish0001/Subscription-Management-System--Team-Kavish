import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, ApiError, formatDate, type AdminUser, type Contact } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';

type RoleFilter = 'all' | 'portal_user' | 'internal_user' | 'admin';

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: 'admin' | 'internal_user';
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  companyName: string;
  notes: string;
  userId: string;
};

const emptyUserForm = (): UserFormState => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  role: 'internal_user'
});

const emptyContactForm = (): ContactFormState => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  companyName: '',
  notes: '',
  userId: ''
});

function summarizeContactNames(contacts: Contact[]) {
  if (contacts.length === 0) {
    return 'No linked contacts';
  }

  const visibleNames = contacts.slice(0, 2).map((contact) => contact.name);
  const hiddenCount = contacts.length - visibleNames.length;

  return hiddenCount > 0 ? `${visibleNames.join(', ')} +${hiddenCount} more` : visibleNames.join(', ');
}

export function PeoplePage() {
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [contactForm, setContactForm] = useState(emptyContactForm);

  const usersQuery = useQuery({
    queryKey: ['admin-users-management'],
    queryFn: () => apiRequest<AdminUser[]>('/users', { token })
  });

  const contactsQuery = useQuery({
    queryKey: ['admin-contacts-management'],
    queryFn: () => apiRequest<Contact[]>('/contacts', { token })
  });

  const refreshData = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-users-management'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-contacts-management'] })
    ]);

  const createUserMutation = useMutation({
    mutationFn: async () =>
      apiRequest<AdminUser>('/users', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone || undefined,
          address: userForm.address || undefined,
          password: userForm.password,
          role: userForm.role
        })
      }),
    onSuccess: async () => {
      setError(null);
      setUserForm(emptyUserForm());
      setShowUserForm(false);
      await refreshData();
    },
    onError: (mutationError) => setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to create user')
  });

  const createContactMutation = useMutation({
    mutationFn: async () =>
      apiRequest<Contact>('/contacts', {
        token,
        method: 'POST',
        body: JSON.stringify({
          userId: contactForm.userId || undefined,
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone || undefined,
          address: contactForm.address || undefined,
          companyName: contactForm.companyName || undefined,
          notes: contactForm.notes || undefined
        })
      }),
    onSuccess: async () => {
      setError(null);
      setContactForm(emptyContactForm());
      setShowContactForm(false);
      await refreshData();
    },
    onError: (mutationError) => setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to create contact')
  });

  const updateUserMutation = useMutation({
    mutationFn: async (input: { userId: string; payload: Partial<AdminUser> & { role?: 'portal_user' | 'internal_user' } }) =>
      apiRequest<AdminUser>(`/users/${input.userId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(input.payload)
      }),
    onSuccess: async () => {
      setError(null);
      await refreshData();
    },
    onError: (mutationError) => setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to update user')
  });

  const owners = useMemo(
    () => (usersQuery.data ?? []).filter((entry) => entry.role !== 'admin').sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email)),
    [usersQuery.data]
  );

  const contactsByUserId = useMemo(() => {
    const grouped = new Map<string, Contact[]>();

    for (const contact of contactsQuery.data ?? []) {
      if (!contact.userId) continue;
      const list = grouped.get(contact.userId) ?? [];
      list.push(contact);
      grouped.set(contact.userId, list);
    }

    for (const list of grouped.values()) {
      list.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
    }

    return grouped;
  }, [contactsQuery.data]);

  const normalizedSearch = search.trim().toLowerCase();
  const users = useMemo(
    () =>
      (usersQuery.data ?? []).filter((entry) => {
        const related = contactsByUserId.get(entry.id) ?? [];
        const matchesRole = roleFilter === 'all' || entry.role === roleFilter;
        const matchesSearch =
          !normalizedSearch ||
          entry.email.toLowerCase().includes(normalizedSearch) ||
          entry.name?.toLowerCase().includes(normalizedSearch) ||
          related.some((contact) => [contact.name, contact.email ?? '', contact.phone ?? ''].some((value) => value.toLowerCase().includes(normalizedSearch)));

        return matchesRole && matchesSearch;
      }),
    [contactsByUserId, normalizedSearch, roleFilter, usersQuery.data]
  );

  const unlinkedContacts = useMemo(
    () =>
      (contactsQuery.data ?? []).filter(
        (entry) =>
          !entry.userId &&
          (!normalizedSearch || [entry.name, entry.email ?? '', entry.phone ?? ''].some((value) => value.toLowerCase().includes(normalizedSearch)))
      ),
    [contactsQuery.data, normalizedSearch]
  );

  const counts = {
    users: usersQuery.data?.length ?? 0,
    contacts: contactsQuery.data?.length ?? 0,
    linkedContacts: contactsQuery.data?.filter((entry) => Boolean(entry.userId)).length ?? 0,
    unlinkedContacts: contactsQuery.data?.filter((entry) => !entry.userId).length ?? 0
  };

  return (
    <Surface title="People" description="Users and contacts together, with clear one-user-to-many-contacts visibility.">
      {error ? <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <div className="mb-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-white">People Directory</h3>
            <p className="mt-1 text-sm text-slate-400">Compact user and contact sheet with horizontal drag scroll.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-200">
              {counts.users} users
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-200">
              {counts.contacts} contacts
            </span>
            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-slate-200">
              {counts.linkedContacts} linked
            </span>
            <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => setShowUserForm((value) => !value)} type="button">
              {showUserForm ? 'Close User Form' : 'New User'}
            </button>
            <button className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowContactForm((value) => !value)} type="button">
              {showContactForm ? 'Close Contact Form' : 'New Contact'}
            </button>
          </div>
        </div>
      </div>

      {showUserForm || showContactForm ? (
        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          {showUserForm ? (
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <h3 className="text-lg font-semibold text-white">New User</h3>
              <p className="mb-4 text-sm text-slate-400">The default contact is auto-created with the user.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name"><input className={fieldClass} value={userForm.name} onChange={(event) => setUserForm((value) => ({ ...value, name: event.target.value }))} /></Field>
                <Field label="Email"><input className={fieldClass} value={userForm.email} onChange={(event) => setUserForm((value) => ({ ...value, email: event.target.value }))} /></Field>
                <Field label="Phone"><input className={fieldClass} value={userForm.phone} onChange={(event) => setUserForm((value) => ({ ...value, phone: event.target.value }))} /></Field>
                <Field label="Role">
                  <select className={fieldClass} value={userForm.role} onChange={(event) => setUserForm((value) => ({ ...value, role: event.target.value as UserFormState['role'] }))}>
                    <option value="internal_user">Internal User</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
                <Field className="md:col-span-2" label="Address"><textarea className={fieldClass} rows={3} value={userForm.address} onChange={(event) => setUserForm((value) => ({ ...value, address: event.target.value }))} /></Field>
                <Field label="Password"><input className={fieldClass} type="password" value={userForm.password} onChange={(event) => setUserForm((value) => ({ ...value, password: event.target.value }))} /></Field>
              </div>
              <button className="mt-4 rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-70" disabled={createUserMutation.isPending} onClick={() => createUserMutation.mutate()} type="button">
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          ) : null}

          {showContactForm ? (
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <h3 className="text-lg font-semibold text-white">New Contact</h3>
              <p className="mb-4 text-sm text-slate-400">Link it to a user or leave it unlinked.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name"><input className={fieldClass} value={contactForm.name} onChange={(event) => setContactForm((value) => ({ ...value, name: event.target.value }))} /></Field>
                <Field label="Email"><input className={fieldClass} value={contactForm.email} onChange={(event) => setContactForm((value) => ({ ...value, email: event.target.value }))} /></Field>
                <Field label="Phone"><input className={fieldClass} value={contactForm.phone} onChange={(event) => setContactForm((value) => ({ ...value, phone: event.target.value }))} /></Field>
                <Field label="Related User">
                  <select className={fieldClass} value={contactForm.userId} onChange={(event) => setContactForm((value) => ({ ...value, userId: event.target.value }))}>
                    <option value="">Unlinked contact</option>
                    {owners.map((entry) => <option key={entry.id} value={entry.id}>{entry.name ?? entry.email}</option>)}
                  </select>
                </Field>
                <Field className="md:col-span-2" label="Address"><textarea className={fieldClass} rows={3} value={contactForm.address} onChange={(event) => setContactForm((value) => ({ ...value, address: event.target.value }))} /></Field>
                <Field label="Company Name"><input className={fieldClass} value={contactForm.companyName} onChange={(event) => setContactForm((value) => ({ ...value, companyName: event.target.value }))} /></Field>
                <Field label="Notes"><textarea className={fieldClass} rows={3} value={contactForm.notes} onChange={(event) => setContactForm((value) => ({ ...value, notes: event.target.value }))} /></Field>
              </div>
              <button className="mt-4 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70" disabled={createContactMutation.isPending} onClick={() => createContactMutation.mutate()} type="button">
                {createContactMutation.isPending ? 'Creating...' : 'Create Contact'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mb-5 rounded-[24px] border border-white/10 bg-slate-950/25 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input className={fieldClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users or contacts" />
          <select className={fieldClass} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}>
            <option value="all">All roles</option>
            <option value="portal_user">Portal users</option>
            <option value="internal_user">Internal users</option>
            <option value="admin">Admins</option>
          </select>
          <div className="flex items-center justify-end px-1 text-sm text-slate-400">
            Drag horizontally to scan columns
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Users With Linked Contacts</h3>
            <p className="text-sm text-slate-400">One row per user. Drag sideways to scan the full sheet.</p>
          </div>
          <div className="text-sm text-slate-400">{users.length} result{users.length === 1 ? '' : 's'}</div>
        </div>

        <DragScrollArea>
          <div className="min-w-[1320px]">
            <div className="grid grid-cols-[220px_120px_110px_220px_220px_220px_130px_130px_140px] gap-4 bg-white/6 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Contacts</span>
              <span>Default Contact</span>
              <span>Actions</span>
              <span>Phone</span>
              <span>Joined</span>
              <span>Last Login</span>
            </div>

          {users.map((entry) => {
            const relatedContacts = contactsByUserId.get(entry.id) ?? [];
            const isAdmin = entry.role === 'admin';
            const isSelf = user?.id === entry.id;
            const isUpdating = updateUserMutation.isPending && updateUserMutation.variables?.userId === entry.id;

            return (
              <article className="grid grid-cols-[220px_120px_110px_220px_220px_220px_130px_130px_140px] gap-4 border-t border-white/10 px-5 py-4 text-sm first:border-t-0" key={entry.id}>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{entry.name ?? 'Unnamed user'}</p>
                  <p className="mt-1 truncate text-slate-400">{entry.email}</p>
                </div>
                <div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">{entry.role.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${entry.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>{entry.isActive ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white">{relatedContacts.length} contact{relatedContacts.length === 1 ? '' : 's'}</p>
                  <p className="mt-1 truncate text-slate-400">{summarizeContactNames(relatedContacts)}</p>
                </div>
                <div className="min-w-0">
                  {entry.defaultContact ? (
                    <>
                      <Link className="truncate font-medium text-white underline-offset-4 hover:underline" to={`/admin/contacts/${entry.defaultContact.id}`}>
                        {entry.defaultContact.name}
                      </Link>
                      <p className="mt-1 truncate text-slate-400">{entry.defaultContact.email || 'No email set'}</p>
                    </>
                  ) : (
                    <span className="text-slate-400">Missing default contact</span>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {isAdmin ? <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">Protected</span> : null}
                  {entry.role === 'portal_user' ? <button className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-3 py-1 text-xs font-semibold text-slate-950" disabled={isUpdating} onClick={() => updateUserMutation.mutate({ userId: entry.id, payload: { role: 'internal_user' } })} type="button">Internal</button> : null}
                  {entry.role === 'internal_user' ? <button className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" disabled={isUpdating} onClick={() => updateUserMutation.mutate({ userId: entry.id, payload: { role: 'portal_user' } })} type="button">Portal</button> : null}
                  {!isAdmin ? <button className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.isActive ? 'border border-rose-400/25 bg-rose-500/10 text-rose-200' : 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-200'}`} disabled={isUpdating || isSelf} onClick={() => updateUserMutation.mutate({ userId: entry.id, payload: { isActive: !entry.isActive } })} type="button">{entry.isActive ? 'Disable' : 'Enable'}</button> : null}
                </div>
                <div className="text-slate-300">{entry.phone || 'Not set'}</div>
                <div className="text-slate-300">{formatDate(entry.createdAt)}</div>
                <div className="text-slate-300">{entry.lastLoginAt ? formatDate(entry.lastLoginAt) : 'Never'}</div>
              </article>
            );
          })}
          {users.length === 0 ? <div className="px-5 py-8 text-sm text-slate-300">No users match the current filters.</div> : null}
          </div>
        </DragScrollArea>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Unlinked Contacts</h3>
            <p className="text-sm text-slate-400">Compact contact rows. Drag sideways if you need more columns.</p>
          </div>
          <div className="text-sm text-slate-400">{unlinkedContacts.length} result{unlinkedContacts.length === 1 ? '' : 's'}</div>
        </div>

        <DragScrollArea>
          <div className="min-w-[960px]">
            <div className="grid grid-cols-[220px_220px_140px_180px_140px_120px] gap-4 bg-white/6 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <span>Contact</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Company</span>
              <span>Subscriptions</span>
              <span>Action</span>
            </div>
          {unlinkedContacts.map((contact) => (
            <div className="grid grid-cols-[220px_220px_140px_180px_140px_120px] gap-4 border-t border-white/10 px-5 py-4 first:border-t-0" key={contact.id}>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{contact.name}</p>
                <p className="mt-1 text-sm text-slate-400">Unlinked contact</p>
              </div>
              <div className="truncate text-sm text-slate-300">{contact.email || 'No email set'}</div>
              <div className="text-sm text-slate-300">{contact.phone || 'Not set'}</div>
              <div className="truncate text-sm text-slate-300">{contact.companyName || 'Not set'}</div>
              <div className="text-sm text-slate-300">{contact.activeSubscriptions ?? 0}</div>
              <div>
                <Link className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white" to={`/admin/contacts/${contact.id}`}>Open Contact</Link>
              </div>
            </div>
          ))}
          {unlinkedContacts.length === 0 ? <div className="px-5 py-8 text-sm text-slate-300">No unlinked contacts match the current search.</div> : null}
          </div>
        </DragScrollArea>
      </section>
    </Surface>
  );
}

function DragScrollArea({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false
  });
  const suppressClickRef = useRef(false);

  const endDrag = (pointerId: number) => {
    const container = containerRef.current;

    if (container && dragRef.current.pointerId === pointerId) {
      if (container.hasPointerCapture(pointerId)) {
        container.releasePointerCapture(pointerId);
      }
    }

    dragRef.current.pointerId = -1;
    dragRef.current.startX = 0;
    dragRef.current.startScrollLeft = 0;
  };

  return (
    <div
      className="cursor-grab overflow-x-auto rounded-[28px] border border-white/10 bg-slate-950/30 active:cursor-grabbing"
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }
      }}
      onPointerCancel={(event) => endDrag(event.pointerId)}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        const container = containerRef.current;
        if (!container) {
          return;
        }

        dragRef.current.pointerId = event.pointerId;
        dragRef.current.startX = event.clientX;
        dragRef.current.startScrollLeft = container.scrollLeft;
        dragRef.current.moved = false;
        suppressClickRef.current = false;
        container.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const container = containerRef.current;

        if (!container || dragRef.current.pointerId !== event.pointerId) {
          return;
        }

        const delta = event.clientX - dragRef.current.startX;
        if (Math.abs(delta) > 4) {
          dragRef.current.moved = true;
          suppressClickRef.current = true;
        }

        container.scrollLeft = dragRef.current.startScrollLeft - delta;
      }}
      onPointerUp={(event) => endDrag(event.pointerId)}
      ref={containerRef}
    >
      {children}
    </div>
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
