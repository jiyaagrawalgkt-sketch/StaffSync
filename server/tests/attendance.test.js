import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, clearDb, makeUser, loginAs } from './helpers.js';
import Attendance from '../src/models/Attendance.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('attendance rules', () => {
  it('checks in once and rejects a duplicate check-in', async () => {
    const agent = await loginAs(await makeUser());
    const first = await agent.post('/api/attendance/check-in');
    expect(first.status).toBe(201);
    const second = await agent.post('/api/attendance/check-in');
    expect(second.status).toBe(409);
  });

  it('does not allow check-out before check-in', async () => {
    const agent = await loginAs(await makeUser());
    const res = await agent.post('/api/attendance/check-out');
    expect(res.status).toBe(400);
  });

  it('checks out after check-in and rejects a second check-out', async () => {
    const agent = await loginAs(await makeUser());
    await agent.post('/api/attendance/check-in');
    const out = await agent.post('/api/attendance/check-out');
    expect(out.status).toBe(200);
    expect(out.body.data.checkOut).toBeTruthy();
    expect((await agent.post('/api/attendance/check-out')).status).toBe(409);
  });

  it('the database unique index blocks duplicate records even if the service check is bypassed', async () => {
    const u = await makeUser();
    const doc = { user: u._id, workDate: '2026-01-05', checkIn: new Date(), status: 'present' };
    await Attendance.create(doc);
    await expect(Attendance.create(doc)).rejects.toMatchObject({ code: 11000 });
  });

  it('employees cannot read the organisation-wide attendance report', async () => {
    const agent = await loginAs(await makeUser());
    expect((await agent.get('/api/attendance')).status).toBe(403);
  });

  it('managers cannot query attendance of someone outside their team', async () => {
    const m = await makeUser({ role: 'manager' });
    const stranger = await makeUser();
    const res = await (await loginAs(m)).get(`/api/attendance?user=${stranger._id}`);
    expect(res.status).toBe(403);
  });
});
