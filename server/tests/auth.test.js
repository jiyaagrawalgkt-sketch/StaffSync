import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, clearDb, makeUser, loginAs, anon, PASSWORD, app, request } from './helpers.js';
import User from '../src/models/User.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('authentication', () => {
  it('logs in with valid credentials and sets an HttpOnly cookie', async () => {
    const u = await makeUser();
    const res = await anon().post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(u.email);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('rejects a wrong password and an unknown email with the same message', async () => {
    const u = await makeUser();
    const a = await anon().post('/api/auth/login').send({ email: u.email, password: 'WrongPass1' });
    const b = await anon().post('/api/auth/login').send({ email: 'nobody@test.dev', password: 'WrongPass1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it('rejects malformed login input with 400', async () => {
    const res = await anon().post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('stores passwords hashed, never in plain text', async () => {
    const u = await makeUser();
    const stored = await User.findById(u._id).select('+passwordHash');
    expect(stored.passwordHash).not.toBe(PASSWORD);
    expect(stored.passwordHash.startsWith('$2')).toBe(true);
  });

  it('blocks deactivated users from logging in', async () => {
    const u = await makeUser({ isActive: false });
    const res = await anon().post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it('requires a cookie for protected routes', async () => {
    const res = await anon().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('changes password and rejects the old one afterwards', async () => {
    const u = await makeUser();
    const agent = await loginAs(u);
    const bad = await agent.post('/api/auth/change-password').send({ currentPassword: 'nope12345', newPassword: 'NewPass123' });
    expect(bad.status).toBe(400);
    const good = await agent.post('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'NewPass123' });
    expect(good.status).toBe(200);
    const oldLogin = await anon().post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await anon().post('/api/auth/login').send({ email: u.email, password: 'NewPass123' });
    expect(newLogin.status).toBe(200);
  });

  it('lets users update only whitelisted profile fields', async () => {
    const u = await makeUser();
    const agent = await loginAs(u);
    const res = await agent.patch('/api/auth/me').send({ fullName: 'New Name', role: 'hr', phone: '9876543210' });
    expect(res.status).toBe(200);
    const fresh = await User.findById(u._id);
    expect(fresh.fullName).toBe('New Name');
    expect(fresh.role).toBe('employee'); // mass-assignment attempt ignored
  });
});

describe('first HR administrator setup', () => {
  const body = { fullName: 'First Admin', email: 'admin@test.dev', password: 'Password123', setupKey: 'test-setup-key' };

  it('requires the correct setup key', async () => {
    const res = await anon().post('/api/auth/setup').send({ ...body, setupKey: 'wrong' });
    expect(res.status).toBe(403);
  });

  it('creates the first HR admin once, then locks itself', async () => {
    const first = await anon().post('/api/auth/setup').send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.role).toBe('hr');
    const second = await anon().post('/api/auth/setup').send({ ...body, email: 'other@test.dev' });
    expect(second.status).toBe(409);
  });
});
