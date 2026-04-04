import {
  confirmPasswordResetSchema,
  createInternalUserSchema,
  createSubscriptionSchema,
  signupSchema
} from './schemas.js';

describe('shared schemas', () => {
  it('accepts a strong signup payload', () => {
    const payload = signupSchema.parse({
      email: 'owner@veltrix.com',
      password: 'Strong@123',
      name: 'Veltrix Admin'
    });

    expect(payload.email).toBe('owner@veltrix.com');
  });

  it('rejects weak signup passwords', () => {
    expect(() =>
      signupSchema.parse({
        email: 'owner@veltrix.com',
        password: 'lowercase1',
        name: 'Veltrix Admin'
      })
    ).toThrowError(/uppercase/i);
  });

  it('rejects mismatched password reset confirmation', () => {
    expect(() =>
      confirmPasswordResetSchema.parse({
        token: 'a'.repeat(32),
        password: 'Strong@123',
        confirmPassword: 'Wrong@123'
      })
    ).toThrowError(/passwords do not match/i);
  });

  it('prevents portal users from being created through the internal user schema', () => {
    expect(() =>
      createInternalUserSchema.parse({
        email: 'portal@veltrix.com',
        password: 'Strong@123',
        name: 'Portal User',
        role: 'portal_user'
      })
    ).toThrowError(/signup for portal users/i);
  });

  it('requires at least one subscription line', () => {
    expect(() =>
      createSubscriptionSchema.parse({
        customerContactId: '11111111-1111-1111-1111-111111111111',
        lines: []
      })
    ).toThrowError();
  });
});
