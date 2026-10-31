import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startDb, stopDb, clearDb, makeUser, loginAs } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const day = 86400000;
const payload = (over = {}) => ({
  title: 'Security Workshop', description: 'Hands-on session', startDate: new Date(Date.now() + 5 * day).toISOString(),
  endDate: new Date(Date.now() + 5 * day + 3600000).toISOString(), capacity: 1, ...over,
});

async function publishedTraining(over) {
  const hr = await makeUser({ role: 'hr' });
  const agent = await loginAs(hr);
  const t = (await agent.post('/api/trainings').send(payload(over))).body.data;
  await agent.post(`/api/trainings/${t._id}/publish`);
  return t;
}

describe('training enrollment', () => {
  it('employees cannot create trainings', async () => {
    const res = await (await loginAs(await makeUser())).post('/api/trainings').send(payload());
    expect(res.status).toBe(403);
  });

  it('enrolls once and rejects duplicate enrollment', async () => {
    const t = await publishedTraining({ capacity: 5 });
    const agent = await loginAs(await makeUser());
    expect((await agent.post(`/api/trainings/${t._id}/enroll`)).status).toBe(201);
    expect((await agent.post(`/api/trainings/${t._id}/enroll`)).status).toBe(409);
    const list = await agent.get('/api/trainings');
    expect(list.body.data[0].enrolledCount).toBe(1); // the failed duplicate did not leave an extra count
    expect(list.body.data[0].isEnrolled).toBe(true);
  });

  it('enforces capacity', async () => {
    const t = await publishedTraining({ capacity: 1 });
    const a = await loginAs(await makeUser());
    const b = await loginAs(await makeUser());
    expect((await a.post(`/api/trainings/${t._id}/enroll`)).status).toBe(201);
    const res = await b.post(`/api/trainings/${t._id}/enroll`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/full/);
  });

  it('cannot enroll in an unpublished program, and can cancel an enrollment', async () => {
    const hr = await makeUser({ role: 'hr' });
    const draft = (await (await loginAs(hr)).post('/api/trainings').send(payload())).body.data;
    const agent = await loginAs(await makeUser());
    expect((await agent.post(`/api/trainings/${draft._id}/enroll`)).status).toBe(400);

    const t = await publishedTraining({ capacity: 5 });
    await agent.post(`/api/trainings/${t._id}/enroll`);
    expect((await agent.delete(`/api/trainings/${t._id}/enroll`)).status).toBe(200);
    expect((await agent.delete(`/api/trainings/${t._id}/enroll`)).status).toBe(404);
  });
});

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes and 400 for malformed JSON', async () => {
    const agent = await loginAs(await makeUser());
    const nf = await agent.get('/api/does-not-exist');
    expect(nf.status).toBe(404);
    expect(nf.body.success).toBe(false);
    const bad = await agent.post('/api/leaves').set('Content-Type', 'application/json').send('{ broken');
    expect(bad.status).toBe(400);
  });
});
