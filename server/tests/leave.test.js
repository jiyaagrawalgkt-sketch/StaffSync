import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, clearDb, makeUser, loginAs } from './helpers.js';
import LeaveBalance from '../src/models/LeaveBalance.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const Y = new Date().getUTCFullYear() + 1; // next year: always in the future, never spans a year boundary
const body = (over = {}) => ({ type: 'casual', startDate: `${Y}-03-10`, endDate: `${Y}-03-11`, reason: 'Family function', ...over });

async function setup() {
  const hr = await makeUser({ role: 'hr' });
  const manager = await makeUser({ role: 'manager' });
  const otherManager = await makeUser({ role: 'manager' });
  const emp = await makeUser({ manager: manager._id });
  return { hr, manager, otherManager, emp, empAgent: await loginAs(emp) };
}
const used = async (user, type = 'casual') => (await LeaveBalance.findOne({ user: user._id, year: Y, type })).used;

describe('leave application validation', () => {
  it('rejects an end date before the start date', async () => {
    const { empAgent } = await setup();
    const res = await empAgent.post('/api/leaves').send(body({ startDate: `${Y}-03-12`, endDate: `${Y}-03-10` }));
    expect(res.status).toBe(400);
  });

  it('rejects a start date in the past (non-sick)', async () => {
    const { empAgent } = await setup();
    const res = await empAgent.post('/api/leaves').send(body({ startDate: '2020-01-01', endDate: '2020-01-02' }));
    expect(res.status).toBe(400);
  });

  it('rejects overlapping requests', async () => {
    const { empAgent } = await setup();
    expect((await empAgent.post('/api/leaves').send(body())).status).toBe(201);
    expect((await empAgent.post('/api/leaves').send(body({ startDate: `${Y}-03-11`, endDate: `${Y}-03-12` }))).status).toBe(409);
  });

  it('rejects requests larger than the available balance', async () => {
    const { empAgent } = await setup();
    const res = await empAgent.post('/api/leaves').send(body({ startDate: `${Y}-04-01`, endDate: `${Y}-04-20` })); // 20 days > 12 casual
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient/);
  });
});

describe('leave approval rules and balance consistency', () => {
  it('employees cannot approve their own request', async () => {
    const { empAgent } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    expect((await empAgent.patch(`/api/leaves/${leave._id}/approve`)).status).toBe(403);
  });

  it('a manager of another team cannot approve', async () => {
    const { empAgent, otherManager } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    expect((await (await loginAs(otherManager)).patch(`/api/leaves/${leave._id}/approve`)).status).toBe(403);
  });

  it('the direct manager approves; balance is deducted; double approval is rejected', async () => {
    const { empAgent, manager, emp } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    const mAgent = await loginAs(manager);
    const ok = await mAgent.patch(`/api/leaves/${leave._id}/approve`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('approved');
    expect(await used(emp)).toBe(2);
    expect((await mAgent.patch(`/api/leaves/${leave._id}/approve`)).status).toBe(409);
    expect(await used(emp)).toBe(2); // not deducted twice
  });

  it('HR can approve any employee request', async () => {
    const { empAgent, hr } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    expect((await (await loginAs(hr)).patch(`/api/leaves/${leave._id}/approve`)).status).toBe(200);
  });

  it('rejection needs a reason and does not touch the balance', async () => {
    const { empAgent, manager, emp } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    const mAgent = await loginAs(manager);
    expect((await mAgent.patch(`/api/leaves/${leave._id}/reject`).send({})).status).toBe(400);
    const res = await mAgent.patch(`/api/leaves/${leave._id}/reject`).send({ reason: 'Project deadline' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(await LeaveBalance.countDocuments({ user: emp._id, year: Y, type: 'casual', used: 0 })).toBe(1);
  });

  it('cancelling an approved future leave restores the balance', async () => {
    const { empAgent, manager, emp } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    await (await loginAs(manager)).patch(`/api/leaves/${leave._id}/approve`);
    expect(await used(emp)).toBe(2);
    expect((await empAgent.patch(`/api/leaves/${leave._id}/cancel`)).status).toBe(200);
    expect(await used(emp)).toBe(0);
  });

  it('approval fails safely if the balance was reduced after the request was made', async () => {
    const { empAgent, manager, emp } = await setup();
    const leave = (await empAgent.post('/api/leaves').send(body())).body.data;
    await LeaveBalance.updateOne({ user: emp._id, year: Y, type: 'casual' }, { allocated: 1 });
    const res = await (await loginAs(manager)).patch(`/api/leaves/${leave._id}/approve`);
    expect(res.status).toBe(400);
    const again = await empAgent.get('/api/leaves/me');
    expect(again.body.data[0].status).toBe('pending'); // reverted
    expect(await used(emp)).toBe(0);
  });
});
