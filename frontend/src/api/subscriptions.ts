import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useSubscriptions = () =>
  useQuery({ queryKey: ['subscriptions'], queryFn: () => api.get('/api/subscriptions').then(r => r.data) });

export const useMySubscriptions = () =>
  useQuery({ queryKey: ['my-subscriptions'], queryFn: () => api.get('/api/subscriptions/my').then(r => r.data) });

export const useSubscription = (id: string) =>
  useQuery({ queryKey: ['subscription', id], queryFn: () => api.get(`/api/subscriptions/${id}`).then(r => r.data), enabled: !!id });

export const useCreateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/subscriptions', data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }) });
};

export const useUpdateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/api/subscriptions/${id}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }) });
};

export const useDeleteSubscription = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/subscriptions/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }) });
};

export const useSendQuotation = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/subscriptions/${id}/send-quotation`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }) });
};

export const useConfirmSubscription = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/subscriptions/${id}/confirm`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }) });
};

export const useRenewSubscription = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/subscriptions/${id}/renew`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-subscriptions'] }) });
};

export const useCloseSubscription = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.post(`/api/subscriptions/${id}/close`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-subscriptions'] }) });
};
