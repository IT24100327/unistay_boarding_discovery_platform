import request from 'supertest';
import app from '../app';

// These tests use a real DB if DATABASE_URL is set, otherwise they test
// the response structure for routes that don't require DB.

describe('Health check', () => {
  it('GET /health returns 200 with success shape', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('NotFound');
  });
});

describe('Auth - Input validation', () => {
  it('POST /api/auth/register rejects invalid payload with 422', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('ValidationError');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('POST /api/auth/login rejects missing fields with 422', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/refresh rejects missing token with 422', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/forgot-password rejects invalid email with 422', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-valid' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('User routes - Auth guard', () => {
  it('GET /api/v1/users/me returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/v1/users/me returns 401 without token', async () => {
    const res = await request(app).put('/api/v1/users/me').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Admin routes - Auth guard', () => {
  it('GET /api/v1/admin/users returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
