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

  it('returns a guest session payload when no access token is present', async () => {
    const response = await request(createApp()).get('/api/v1/auth/me');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      user: null,
      canRefresh: false
    });
  });

  it('returns an empty refresh payload when no refresh token is present', async () => {
    const response = await request(createApp()).post('/api/v1/auth/refresh');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      user: null
    });
  });
});
