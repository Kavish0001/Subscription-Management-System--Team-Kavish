import { processNotificationJob, resolveRedisUrl } from './worker.js';

describe('worker helpers', () => {
  it('uses a sensible default redis url', () => {
    expect(resolveRedisUrl(undefined)).toBe('redis://localhost:6379');
  });

  it('returns deterministic processed metadata when a clock is supplied', async () => {
    const result = await processNotificationJob(
      {
        id: 'job-1',
        name: 'send-renewal-email',
        data: { subscriptionId: 'sub-1' }
      } as never,
      new Date('2025-01-01T00:00:00.000Z')
    );

    expect(result).toEqual({
      jobId: 'job-1',
      name: 'send-renewal-email',
      processedAt: '2025-01-01T00:00:00.000Z'
    });
  });
});
