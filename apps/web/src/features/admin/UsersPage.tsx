import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { Surface } from '../../components/layout';
import { apiRequest, formatDate, type AdminUser } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';

type RoleFilter = 'all' | 'portal_user' | 'internal_user' | 'admin';

export function UsersPage() {
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [error, setError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users-management'],
    queryFn: () => apiRequest<AdminUser[]>('/users', { token })
  });

  const updateUserMutation = useMutation({
    mutationFn: async (input: { userId: string; role?: 'portal_user' | 'internal_user'; isActive?: boolean }) =>
      apiRequest<AdminUser>(`/users/${input.userId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({
          role: input.role,
          isActive: input.isActive
        })
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-users-management'] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'Unable to update user');
    }
  });

  const users = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (usersQuery.data ?? []).filter((entry) => {
      const matchesRole = roleFilter === 'all' ? true : entry.role === roleFilter;
      const matchesSearch =
        !normalizedSearch ||
        entry.email.toLowerCase().includes(normalizedSearch) ||
        entry.name?.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, usersQuery.data]);

  const activeInternalUsers = (usersQuery.data ?? []).filter(
    (entry) => entry.role === 'internal_user' && entry.isActive
  ).length;
  const activePortalUsers = (usersQuery.data ?? []).filter(
    (entry) => entry.role === 'portal_user' && entry.isActive
  ).length;

  return (
    <Surface title="Users">
      <p className="mb-4 text-slate-300">
        Admin-only staff access control. Internal users keep normal backoffice access, but they cannot manage this module.
      </p>
      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      <div className="mb-5 grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1.1fr]">
        <StatCard label="All users" value={String(usersQuery.data?.length ?? 0)} />
        <StatCard label="Internal staff" value={String(activeInternalUsers)} />
        <StatCard label="Portal users" value={String(activePortalUsers)} />
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          className={fieldClass}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by email or name"
          value={search}
        />
        <select className={fieldClass} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} value={roleFilter}>
          <option value="all">All roles</option>
          <option value="portal_user">Portal users</option>
          <option value="internal_user">Internal users</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((entry) => {
              const isSelf = user?.id === entry.id;
              const isAdmin = entry.role === 'admin';
              const isUpdating = updateUserMutation.isPending && updateUserMutation.variables?.userId === entry.id;

              return (
                <tr className="border-t border-white/10 text-slate-100" key={entry.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{entry.name ?? 'Unnamed user'}</p>
                      <p className="text-sm text-slate-300">{entry.email}</p>
                      <p className="text-xs text-slate-500">Joined {formatDate(entry.createdAt)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                      {entry.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-300'}`}>
                      {entry.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{entry.lastLoginAt ? formatDate(entry.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {entry.role === 'portal_user' ? (
                        <button
                          className="rounded-full bg-gradient-to-r from-emerald-300 to-sky-400 px-3 py-1 text-xs font-semibold text-slate-950"
                          disabled={isUpdating}
                          onClick={() => updateUserMutation.mutate({ userId: entry.id, role: 'internal_user' })}
                          type="button"
                        >
                          Make Internal
                        </button>
                      ) : null}
                      {entry.role === 'internal_user' ? (
                        <button
                          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white"
                          disabled={isUpdating}
                          onClick={() => updateUserMutation.mutate({ userId: entry.id, role: 'portal_user' })}
                          type="button"
                        >
                          Remove Internal
                        </button>
                      ) : null}
                      {!isAdmin ? (
                        <button
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.isActive ? 'border border-rose-400/25 bg-rose-500/10 text-rose-200' : 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-200'}`}
                          disabled={isUpdating || isSelf}
                          onClick={() =>
                            updateUserMutation.mutate({
                              userId: entry.id,
                              isActive: !entry.isActive
                            })
                          }
                          type="button"
                        >
                          {entry.isActive ? 'Disable' : 'Enable'}
                        </button>
                      ) : (
                        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                          Admin locked
                        </span>
                      )}
                      {isSelf ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
                          Current admin
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr className="border-t border-white/10 text-slate-400">
                <td className="px-4 py-6" colSpan={5}>
                  No users matched the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

const fieldClass = 'rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3';
