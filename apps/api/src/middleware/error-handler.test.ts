import { errorHandler } from './error-handler.js';

function createResponseMock() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  return response;
}

describe('errorHandler', () => {
  it('returns a 409 for unique slug conflicts', () => {
    const response = createResponseMock();
    const error = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: {
        target: ['slug']
      }
    };

    errorHandler(error, {} as never, response as never, vi.fn());

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: {
        message: 'Slug already exists',
        code: 'UNIQUE_CONSTRAINT'
      }
    });
  });

  it('falls back to a generic message for other unique conflicts', () => {
    const response = createResponseMock();
    const error = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: {
        target: ['email']
      }
    };

    errorHandler(error, {} as never, response as never, vi.fn());

    expect(response.statusCode).toBe(409);
    expect(response.body).toEqual({
      error: {
        message: 'Email already exists',
        code: 'UNIQUE_CONSTRAINT'
      }
    });
  });
});
