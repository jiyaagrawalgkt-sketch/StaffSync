import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import 'dotenv/config';

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

if (!isTest) {
  for (const key of ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL']) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key} (copy server/.env.example to server/.env)`);
    }
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

const list = (value, fallback = '') =>
  (value ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '8h',
  cookieMaxAgeMs: 8 * 60 * 60 * 1000,
  clientUrls: list(process.env.CLIENT_URL),
  crossSiteCookies: process.env.CROSS_SITE_COOKIES === 'true',
  setupKey: process.env.SETUP_KEY || '',
  timezone: process.env.ORG_TIMEZONE || 'Asia/Kolkata',
  workStart: process.env.WORK_START || '09:30',
  lateGraceMinutes: Number(process.env.LATE_GRACE_MINUTES ?? 15),
  weekendDays: list(process.env.WEEKEND_DAYS, '0,6').map(Number),
  holidays: list(process.env.HOLIDAYS),
  bcryptRounds: isTest ? 4 : 12,
  leaveAllocations: { casual: 12, sick: 10, earned: 15 },
};
