import request from 'supertest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    productCategory: {
      findMany: vi.fn().mockResolvedValue([])
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0)
    },
    recurringPlan: {
      findMany: vi.fn().mockResolvedValue([])
    }
  }
}));

vi.mock('../../lib/prisma.js', () => ({
  prisma: prismaMock
}));

import { createApp } from '../../app.js';

describe('catalogRouter public browse endpoints', () => {
  afterEach(() => {
    vi.clearAllMocks();
    prismaMock.productCategory.findMany.mockResolvedValue([]);
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.count.mockResolvedValue(0);
    prismaMock.recurringPlan.findMany.mockResolvedValue([]);
  });

  it('allows anonymous users to browse the catalog list', async () => {
    const response = await request(createApp()).get('/api/v1/products');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0
    });
    expect(prismaMock.product.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.product.count).toHaveBeenCalledOnce();
  });

  it('allows anonymous users to fetch categories and recurring plans', async () => {
    const [categoriesResponse, plansResponse] = await Promise.all([
      request(createApp()).get('/api/v1/categories'),
      request(createApp()).get('/api/v1/recurring-plans')
    ]);

    expect(categoriesResponse.status).toBe(200);
    expect(categoriesResponse.body.data).toEqual([]);
    expect(plansResponse.status).toBe(200);
    expect(plansResponse.body.data).toEqual([]);
    expect(prismaMock.productCategory.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.recurringPlan.findMany).toHaveBeenCalledOnce();
  });
});
