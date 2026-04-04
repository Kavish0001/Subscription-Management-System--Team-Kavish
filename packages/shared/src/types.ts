import type { UserRole } from './enums.js';

export interface ApiError {
  message: string;
  code?: string;
  issues?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AuthSession {
  user: SessionUser;
}

export interface PricingBreakdown {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}
