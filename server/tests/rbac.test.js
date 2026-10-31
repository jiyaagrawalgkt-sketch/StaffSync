import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, clearDb, makeUser, makeDept, loginAs } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function org() {
  const hr = await makeUser({ role: 'hr' });
  const m1 = await makeUser({ role: 'manager' });
  const m2 = await makeUser({ role: 'manager' });
  const e1 = await makeUser({ manager: m1._id });
  const e2 = await makeUser({ manager: m2._id });
  return { hr, m1, m2, e1, e2 };
}

describe('role based access control', () => {
  it('employees cannot list employees', async () => {
    const { e1 } = await org();
    const res = await (await loginAs(e1)).get('/api/users');
    expect(res.status).toBe(403);
  });

  it('employees cannot read another employee profile but can read their own', async () => {
    const { e1, e2 } = await org();
    const agent = await loginAs(e1);
    expect((await agent.get(`/api/users/${e2._id}`)).status).toBe(403);
    expect((await agent.get(`/api/users/${e1._id}`)).status).toBe(200);
  });

  it('managers only see their own team', async () => {
    const { m1, e1, e2 } = await org();
    const agent = await loginAs(m1);
    const list = await agent.get('/api/users');
    const ids = list.body.data.map((u) => u._id);
    expect(ids).toContain(String(e1._id));
    expect(ids).not.toContain(String(e2._id));
    expect((await agent.get(`/api/users/${e2._id}`)).status).toBe(403);
  });

  it('managers cannot create or edit employees', async () => {
    const { m1, e1 } = await org();
    const agent = await loginAs(m1);
    expect((await agent.post('/api/users').send({ fullName: 'X Y', email: 'x@y.co' })).status).toBe(403);
    expect((await agent.patch(`/api/users/${e1._id}`).send({ fullName: 'Hacked' })).status).toBe(403);
  });
});

describe('employee management (HR)', () => {
  it('creates an employee with an invite token and auto employee id', async () => {
    const { hr } = await org();
    const dept = await makeDept();
    const res = await (await loginAs(hr)).post('/api/users').send({ fullName: 'Nina Shah', email: 'Nina@Test.dev', department: String(dept._id), role: 'employee' });
    expect(res.status).toBe(201);
    expect(res.body.data.inviteToken).toHaveLength(64);
    expect(res.body.data.user.email).toBe('nina@test.dev');
    expect(res.body.data.user.employeeId).toMatch(/^EMP-\d{4}$/);
    expect(res.body.data.user.activated).toBe(false);
  });

  it('rejects duplicate email and duplicate employee id', async () => {
    const { hr, e1 } = await org();
    const agent = await loginAs(hr);
    const dupEmail = await agent.post('/api/users').send({ fullName: 'Dup Mail', email: e1.email });
    expect(dupEmail.status).toBe(409);
    const dupId = await agent.post('/api/users').send({ fullName: 'Dup Id', email: 'fresh@test.dev', employeeId: e1.employeeId });
    expect(dupId.status).toBe(409);
  });

  it('edits an employee and can assign a manager', async () => {
    const { hr, m1, e2 } = await org();
    const res = await (await loginAs(hr)).patch(`/api/users/${e2._id}`).send({ jobTitle: 'Analyst', manager: String(m1._id) });
    expect(res.status).toBe(200);
    expect(res.body.data.jobTitle).toBe('Analyst');
    expect(String(res.body.data.manager)).toBe(String(m1._id));
  });

  it('refuses to make an employee their own manager', async () => {
    const { hr, e1 } = await org();
    const res = await (await loginAs(hr)).patch(`/api/users/${e1._id}`).send({ manager: String(e1._id) });
    expect(res.status).toBe(400);
  });

  it('does not allow deactivating yourself or the last HR admin', async () => {
    const { hr } = await org();
    const res = await (await loginAs(hr)).patch(`/api/users/${hr._id}/status`).send({ isActive: false });
    expect(res.status).toBe(400);
  });

  it('invalid ids return 400, not a crash', async () => {
    const { hr } = await org();
    expect((await (await loginAs(hr)).get('/api/users/not-an-id')).status).toBe(400);
  });
});
