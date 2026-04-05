import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const makeConfigHooks = (path: string, key: string) => ({
  useList: () => useQuery({ queryKey: [key], queryFn: () => api.get(`/api/${path}`).then(r => r.data) }),
  useCreate: () => { const qc = useQueryClient(); return useMutation({ mutationFn: (d: any) => api.post(`/api/${path}`, d).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: [key] }) }); },
  useUpdate: () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: any) => api.put(`/api/${path}/${id}`, d).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: [key] }) }); },
  useDelete: () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => api.delete(`/api/${path}/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: [key] }) }); },
});

export const RecurringPlansAPI = makeConfigHooks('recurring-plans', 'recurring-plans');
export const TaxRulesAPI = makeConfigHooks('tax-rules', 'tax-rules');
export const DiscountRulesAPI = makeConfigHooks('discount-rules', 'discount-rules');
export const PaymentTermsAPI = makeConfigHooks('payment-terms', 'payment-terms');
export const QuotationTemplatesAPI = makeConfigHooks('quotation-templates', 'quotation-templates');
export const AttributesAPI = makeConfigHooks('attributes', 'attributes');

export const useRecurringPlans = () =>
  useQuery({ queryKey: ['recurring-plans'], queryFn: () => api.get('/api/recurring-plans').then(r => r.data) });
export const useTaxRules = () =>
  useQuery({ queryKey: ['tax-rules'], queryFn: () => api.get('/api/tax-rules').then(r => r.data) });
export const useAttributes = () =>
  useQuery({ queryKey: ['attributes'], queryFn: () => api.get('/api/attributes').then(r => r.data) });
export const usePaymentTerms = () =>
  useQuery({ queryKey: ['payment-terms'], queryFn: () => api.get('/api/payment-terms').then(r => r.data) });
export const useQuotationTemplates = () =>
  useQuery({ queryKey: ['quotation-templates'], queryFn: () => api.get('/api/quotation-templates').then(r => r.data) });
export const useAddAttributeValue = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.post(`/api/attributes/${id}/values`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['attributes'] }) });
};
