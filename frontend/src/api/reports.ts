import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

export const useReportsSummary = () =>
  useQuery({ queryKey: ['reports-summary'], queryFn: () => api.get('/api/reports/summary').then(r => r.data) });
