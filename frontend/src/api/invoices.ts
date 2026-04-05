import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useInvoices = () =>
  useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/api/invoices').then(r => r.data) });

export const useInvoice = (id: string) =>
  useQuery({ queryKey: ['invoice', id], queryFn: () => api.get(`/api/invoices/${id}`).then(r => r.data), enabled: !!id });

export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (subscriptionOrderId: string) => api.post('/api/invoices', { subscriptionOrderId }).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }) });
};

export const useMockPayment = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (invoiceId: string) => api.post('/api/payments/mock', { invoiceId }).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['subscriptions'] }); } });
};
