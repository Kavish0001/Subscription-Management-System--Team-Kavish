import api from '@/lib/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useProducts = (params?: { page?: number; pageSize?: number; categoryId?: string; search?: string }) =>
  useQuery({ queryKey: ['products', params], queryFn: () => api.get('/api/products', { params }).then(r => r.data) });

export const useProductBySlug = (slug: string) =>
  useQuery({ queryKey: ['product', slug], queryFn: () => api.get(`/api/products/slug/${slug}`).then(r => r.data), enabled: !!slug });

export const useProductById = (id: string) =>
  useQuery({ queryKey: ['product-id', id], queryFn: () => api.get(`/api/products/${id}`).then(r => r.data), enabled: !!id });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api.get('/api/categories').then(r => r.data) });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: any) => api.post('/api/products', data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/api/products/${id}`, data).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/api/products/${id}`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
};

export const useAddVariant = () =>
  useMutation({ mutationFn: ({ id, attributeValueIds }: { id: string; attributeValueIds: string[] }) => api.post(`/api/products/${id}/variants`, { attributeValueIds }).then(r => r.data) });

export const useAddPlanPricing = () =>
  useMutation({ mutationFn: ({ id, ...data }: any) => api.post(`/api/products/${id}/plan-pricing`, data).then(r => r.data) });
