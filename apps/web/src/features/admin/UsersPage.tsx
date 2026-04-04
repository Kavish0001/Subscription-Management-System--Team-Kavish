import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Surface } from '../../components/layout';
import { apiRequest, ApiError, formatDate, type AdminUser } from '../../lib/api';
import { useSession } from '../../lib/session';

const fieldClass = 'app-input';

type RoleFilter = 'all' | 'portal_user' | 'internal_user' | 'admin';

type UserFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: 'admin' | 'internal_user';
};

const emptyUserForm = (): UserFormState => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  password: '',
  role: 'internal_user',
});

export function UsersPage() {
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);

  const usersQuery = useQuery({
    queryKey: ['admin-users-management'],
    queryFn: () => apiRequest<AdminUser[]>('/users', { token }),
  });

  const createUserMutation = useMutation({
    mutationFn: async () =>
      apiRequest<AdminUser>('/users', {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          password: form.password,
          role: form.role,
        }),
      }),
    onSuccess: async () => {
      setError(null);
      setForm(emptyUserForm());
      setShowCreateForm(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-users-management'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (input: {
      userId: string;
      payload: Partial<AdminUser> & { role?: 'portal_user' | 'internal_user' };
    }) =>
      apiRequest<AdminUser>(`/users/${input.userId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(input.payload),
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users-management'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to update user');
    },
  });

  const users = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (usersQuery.data ?? []).filter((entry) => {
      const matchesRole = roleFilter === 'all' ? true : entry.role === roleFilter;
      const matchesSearch =
        !normalizedSearch ||
        entry.email.toLowerCase().includes(normalizedSearch) ||
        entry.name?.toLowerCase().includes(normalizedSearch) ||
        entry.defaultContact?.name?.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, usersQuery.data]);

  const counts = useMemo(
    () => ({
      all: usersQuery.data?.length ?? 0,
      admin: usersQuery.data?.filter((entry) => entry.role === 'admin').length ?? 0,
      internal_user: usersQuery.data?.filter((entry) => entry.role === 'internal_user').length ?? 0,
      portal_user: usersQuery.data?.filter((entry) => entry.role === 'portal_user').length ?? 0,
    }),
    [usersQuery.data],
  );

  return (
    <Surface
      title="Users"
      description="Admin-managed user records with an auto-linked default contact."
    >
      {error ? <p className="theme-message theme-message-error mb-4">{error}</p> : null}

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">
            Create User
          </h3>
          <p className="text-sm muted">Default contact auto-linked on creation.</p>
        </div>
        <button
          className="app-btn app-btn-primary"
          onClick={() => {
            setShowCreateForm((value) => !value);
            setError(null);
          }}
          type="button"
        >
          {showCreateForm ? 'Close' : 'New User'}
        </button>
      </div>

      {showCreateForm ? (
        <div className="app-card mb-6 p-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--color-text-primary)]">
              New User
            </h3>
            <p className="text-sm muted">Default contact auto-linked on creation.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <input
                className={fieldClass}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                value={form.name}
              />
            </Field>
            <Field label="Email">
              <input
                className={fieldClass}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
                value={form.email}
              />
            </Field>
            <Field label="Phone">
              <input
                className={fieldClass}
                onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                value={form.phone}
              />
            </Field>
            <Field label="Role">
              <select
                className={fieldClass}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    role: event.target.value as 'admin' | 'internal_user',
                  }))
                }
                value={form.role}
              >
                <option value="internal_user">Internal User</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field className="md:col-span-2" label="Address">
              <textarea
                className={fieldClass}
                onChange={(event) =>
                  setForm((value) => ({ ...value, address: event.target.value }))
                }
                rows={3}
                value={form.address}
              />
            </Field>
            <Field label="Password">
              <input
                className={fieldClass}
                onChange={(event) =>
                  setForm((value) => ({ ...value, password: event.target.value }))
                }
                type="password"
                value={form.password}
              />
            </Field>
          </div>
          <div className="mt-4">
            <button
              className="app-btn app-btn-primary"
              onClick={() => createUserMutation.mutate()}
              type="button"
            >
              Create User
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          className={fieldClass}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by email, name, or default contact"
          value={search}
        />
        <select
          className={fieldClass}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          value={roleFilter}
        >
          <option value="all">All roles</option>
          <option value="portal_user">Portal users</option>
          <option value="internal_user">Internal users</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="app-chip">All {counts.all}</span>
        <span className="app-chip app-chip-info">Admins {counts.admin}</span>
        <span className="app-chip app-chip-warning">Internal {counts.internal_user}</span>
        <span className="app-chip app-chip-success">Portal {counts.portal_user}</span>
      </div>

      <div className="table-shell">
        <table className="app-table min-w-[1180px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Related Contact</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-8" colSpan={7}>
                  No users match the current filter. If `Admins` is selected, only the protected
                  admin account will appear.
                </td>
              </tr>
            ) : null}
            {users.map((entry) => {
              const isSelf = user?.id === entry.id;
              const isAdmin = entry.role === 'admin';
              const isUpdating =
                updateUserMutation.isPending && updateUserMutation.variables?.userId === entry.id;

              return (
                <tr key={entry.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-[color:var(--color-text-primary)]">
                        {entry.name ?? 'Unnamed user'}
                      </p>
                      <p className="text-sm muted">{entry.email}</p>
                      <p className="text-xs subtle">Joined {formatDate(entry.createdAt)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="app-chip app-chip-info whitespace-nowrap text-[11px]">
                      {entry.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        entry.isActive
                          ? 'app-chip app-chip-success text-[11px]'
                          : 'app-chip text-[11px]'
                      }
                    >
                      {entry.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 muted">{entry.phone || 'Not set'}</td>
                  <td className="px-4 py-3">
                    {entry.defaultContact ? (
                      <Link
                        className="inline-flex max-w-[180px] rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text-primary)]"
                        title={entry.defaultContact.name}
                        to={`/admin/contacts/${entry.defaultContact.id}`}
                      >
                        <span className="truncate">{entry.defaultContact.name}</span>
                      </Link>
                    ) : (
                      <span className="muted">Missing default contact</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap muted">
                    {entry.lastLoginAt ? formatDate(entry.lastLoginAt) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin ? (
                        <span className="app-chip app-chip-info whitespace-nowrap text-[11px]">
                          Protected admin
                        </span>
                      ) : null}
                      {entry.role === 'portal_user' ? (
                        <button
                          className="app-btn app-btn-soft whitespace-nowrap px-3 py-1 text-xs"
                          disabled={isUpdating}
                          onClick={() =>
                            updateUserMutation.mutate({
                              userId: entry.id,
                              payload: { role: 'internal_user' },
                            })
                          }
                          type="button"
                        >
                          Make Internal
                        </button>
                      ) : null}
                      {entry.role === 'internal_user' ? (
                        <button
                          className="app-btn app-btn-secondary whitespace-nowrap px-3 py-1 text-xs"
                          disabled={isUpdating}
                          onClick={() =>
                            updateUserMutation.mutate({
                              userId: entry.id,
                              payload: { role: 'portal_user' },
                            })
                          }
                          type="button"
                        >
                          Remove Internal
                        </button>
                      ) : null}
                      {!isAdmin ? (
                        <button
                          className={
                            entry.isActive
                              ? 'app-btn app-btn-danger whitespace-nowrap px-3 py-1 text-xs'
                              : 'app-btn app-btn-soft whitespace-nowrap px-3 py-1 text-xs'
                          }
                          disabled={isUpdating || isSelf}
                          onClick={() =>
                            updateUserMutation.mutate({
                              userId: entry.id,
                              payload: {
                                isActive: !entry.isActive,
                              },
                            })
                          }
                          type="button"
                        >
                          {entry.isActive ? 'Disable' : 'Enable'}
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

export function UserDetailPage() {
  const { id } = useParams();
  const { token } = useSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<
    Omit<UserFormState, 'password' | 'role'> & { role: 'portal_user' | 'internal_user' | 'admin' }
  >({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: 'portal_user',
  });

  const userQuery = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => apiRequest<AdminUser>(`/users/${id}`, { token }),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!userQuery.data) {
      return;
    }

    setForm({
      name: userQuery.data.name ?? '',
      email: userQuery.data.email,
      phone: userQuery.data.phone ?? '',
      address: userQuery.data.address ?? '',
      role: userQuery.data.role,
    });
  }, [userQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      apiRequest<AdminUser>(`/users/${id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          address: form.address || null,
          role: form.role === 'admin' ? undefined : form.role,
        }),
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users-management'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] }),
        queryClient.invalidateQueries({ queryKey: ['admin-contacts-management'] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to save user');
    },
  });

  const entry = userQuery.data;

  return (
    <Surface
      title={entry?.name ?? 'User'}
      description="User profile data stays synchronized with the linked default contact."
    >
      {error ? <p className="theme-message theme-message-error mb-4">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            className={fieldClass}
            onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            value={form.name}
          />
        </Field>
        <Field label="Email">
          <input
            className={fieldClass}
            onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
            value={form.email}
          />
        </Field>
        <Field label="Phone">
          <input
            className={fieldClass}
            onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
            value={form.phone}
          />
        </Field>
        <Field label="Role">
          <select
            className={fieldClass}
            disabled={entry?.role === 'admin'}
            onChange={(event) =>
              setForm((value) => ({
                ...value,
                role: event.target.value as 'portal_user' | 'internal_user' | 'admin',
              }))
            }
            value={form.role}
          >
            <option value="portal_user">Portal User</option>
            <option value="internal_user">Internal User</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field className="md:col-span-2" label="Address">
          <textarea
            className={fieldClass}
            onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))}
            rows={4}
            value={form.address}
          />
        </Field>
        <Field label="Related Contact">
          {entry?.defaultContact ? (
            <Link
              className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card-muted)] px-4 py-3 text-sm font-semibold text-[color:var(--color-text-primary)]"
              to={`/admin/contacts/${entry.defaultContact.id}`}
            >
              {entry.defaultContact.name} | Open Contact
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-border)] px-4 py-3 text-sm muted">
              Default contact auto-linked
            </div>
          )}
        </Field>
      </div>
      <div className="mt-6">
        <button
          className="app-btn app-btn-primary"
          onClick={() => saveMutation.mutate()}
          type="button"
        >
          Save
        </button>
      </div>
    </Surface>
  );
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`app-label ${className ?? ''}`}>
      {label}
      {children}
    </label>
  );
}
