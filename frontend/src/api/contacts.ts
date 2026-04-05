import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useMyContacts = () =>
  useQuery({ queryKey: ['my-contacts'], queryFn: () => api.get('/api/contacts/me').then(r => r.data) });

export const useContacts = () =>
  useQuery({ queryKey: ['contacts'], queryFn: () => api.get('/api/contacts').then(r => r.data) });

export const useUpdateContact = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/api/contacts/${id}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-contacts'] }) });
};

export const useUpdateAddress = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ contactId, addressId, ...data }: any) => api.put(`/api/contacts/${contactId}/addresses/${addressId}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-contacts'] }) });
};

export const useCreateAddress = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ contactId, ...data }: any) => api.post(`/api/contacts/${contactId}/addresses`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-contacts'] }) });
};

export const useValidateDiscount = () =>
  useMutation({ mutationFn: (data: { code: string; subtotal: number }) => api.post('/api/discount-rules/validate', data).then(r => r.data) });
