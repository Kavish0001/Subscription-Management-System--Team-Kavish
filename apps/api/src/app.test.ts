import request from 'supertest';

import { createApp } from './app.js';

describe('createApp', () => {
  it('serves the health endpoint', async () => {
    const response = await request(createApp()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(typeof response.body.data.timestamp).toBe('string');
    expect(typeof response.body.data.uptime).toBe('number');
  });
});
