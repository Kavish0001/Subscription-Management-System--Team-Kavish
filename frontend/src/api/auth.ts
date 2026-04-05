import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const useLogin = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) => api.post('/api/auth/login', data).then(r => r.data),
    onSuccess: (data) => {
      login(data.user, data.accessToken);
      navigate(data.user.role === 'portal_user' ? '/' : '/admin');
    },
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string; confirmPassword: string }) =>
      api.post('/api/auth/signup', data).then(r => r.data),
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (data: { token: string }) => api.post('/api/auth/verify-email', data).then(r => r.data),
  });
};

export const useRequestPasswordReset = () =>
  useMutation({ mutationFn: (data: { email: string }) => api.post('/api/auth/reset-password', data).then(r => r.data) });

export const useConfirmPasswordReset = () =>
  useMutation({ mutationFn: (data: { token: string; password: string }) => api.post('/api/auth/reset-password/confirm', data).then(r => r.data) });
