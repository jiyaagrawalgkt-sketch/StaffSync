import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';

let mongod;
export const PASSWORD = 'Password123';

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await mongoose.syncIndexes();
}
export async function stopDb() {
  await mongoose.disconnect();
  await mongod.stop();
}
export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

let counter = 0;
export async function makeUser(overrides = {}) {
  counter += 1;
  return User.create({
    fullName: `Test User ${counter}`, email: `user${counter}@test.dev`, employeeId: `T-${1000 + counter}`,
    role: 'employee', joiningDate: '2024-01-01', activated: true,
    passwordHash: await bcrypt.hash(PASSWORD, 4), ...overrides,
  });
}
export const makeDept = (name = 'Engineering', code = 'ENG') => Department.create({ name, code });

// A supertest "agent" keeps cookies between requests, like a browser, and always sends the CSRF header.
export async function loginAs(user) {
  const agent = request.agent(app).set('X-Requested-With', 'StaffSync');
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
export const anon = () => request.agent(app).set('X-Requested-With', 'StaffSync');
export { app, request };
