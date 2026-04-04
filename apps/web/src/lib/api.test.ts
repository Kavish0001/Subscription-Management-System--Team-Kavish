import {
  ApiError,
  apiRequest,
  formatCurrency,
  formatDate,
  normalizeSessionUser,
  planIntervalLabel
} from './api';

describe('web api helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats INR currency without fractions', () => {
    expect(formatCurrency(1499)).toBe('₹1,499');
  });

  it('formats recurring plan intervals', () => {
    expect(planIntervalLabel({ intervalCount: 1, intervalUnit: 'month' })).toBe('1 month');
    expect(planIntervalLabel({ intervalCount: 3, intervalUnit: 'year' })).toBe('3 years');
  });

  it('normalizes session user ids from both shapes', () => {
    expect(normalizeSessionUser({ id: '1', email: 'a@b.com', role: 'admin' }).id).toBe('1');
    expect(normalizeSessionUser({ userId: '2', email: 'a@b.com', role: 'portal_user' }).id).toBe('2');
  });

  it('returns parsed data from successful requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { value: 42 } })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ value: number }>('/health');

    expect(result).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/health',
      expect.objectContaining({
        credentials: 'include'
      })
    );
  });

  it('throws ApiError for failed responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } })
      })
    );

    await expect(apiRequest('/secure')).rejects.toEqual(new ApiError('Unauthorized', 401));
  });

  it('formats missing dates defensively', () => {
    expect(formatDate(null)).toBe('Not available');
  });
});
