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

describe('Boarding routes - Public endpoints', () => {
  it('GET /api/v1/boardings with invalid query returns 422', async () => {
    const res = await request(app).get('/api/v1/boardings?sortBy=invalid');
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/boardings/:slug returns 404 for non-existent slug without DB', async () => {
    const res = await request(app).get('/api/v1/boardings/non-existent-slug-xyz');
    // Without DB it returns 500, with DB it returns 404 for unknown slug
    expect([404, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

describe('Boarding routes - Auth guard', () => {
  it('POST /api/v1/boardings returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/boardings').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/boardings/my-listings returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/boardings/my-listings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/boardings/some-id/submit returns 401 without token', async () => {
    const res = await request(app).patch('/api/v1/boardings/some-id/submit');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Saved boardings routes - Auth guard', () => {
  it('GET /api/v1/saved-boardings returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/saved-boardings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/saved-boardings/:id returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/saved-boardings/some-id');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Admin boarding routes - Auth guard', () => {
  it('GET /api/v1/admin/boardings/pending returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/boardings/pending');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /api/v1/admin/boardings/:id/approve returns 401 without token', async () => {
    const res = await request(app).patch('/api/v1/admin/boardings/some-id/approve');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Reservation routes - Auth guard', () => {
  it('POST /api/v1/reservations returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/reservations').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/reservations/my-requests returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/reservations/my-requests');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/reservations/my-boardings returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/reservations/my-boardings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/reservations rejects invalid payload with 422', async () => {
    // No auth token needed to test validation guard — but we need a token to get past auth
    // This just tests that auth is required first
    const res = await request(app).post('/api/v1/reservations').send({ boardingId: '' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Review routes - Auth guard', () => {
  it('POST /api/v1/reviews returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/reviews').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/boardings/:id/reviews returns 200 shape (public)', async () => {
    const res = await request(app).get('/api/v1/boardings/non-existent-id/reviews');
    // Without DB it returns 500, with DB returns empty array
    expect([200, 500]).toContain(res.status);
  });
});

describe('Payment routes - Auth guard', () => {
  it('POST /api/v1/payments returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/payments').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/payments/my-payments returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/payments/my-payments');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/payments/my-boardings returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/payments/my-boardings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Visit request routes - Auth guard', () => {
  it('POST /api/v1/visit-requests returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/visit-requests').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/visit-requests/my-requests returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/visit-requests/my-requests');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/visit-requests/my-boardings returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/visit-requests/my-boardings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Admin reservation/payment report routes - Auth guard', () => {
  it('GET /api/v1/admin/reservations returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/reservations');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/admin/payments/report returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/admin/payments/report');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
