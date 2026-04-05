import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: () => api.get('/api/users').then(r => r.data) });

export const useUser = (id: string) =>
  useQuery({ queryKey: ['user', id], queryFn: () => api.get(`/api/users/${id}`).then(r => r.data), enabled: !!id });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/users', data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/api/users/${id}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
};
