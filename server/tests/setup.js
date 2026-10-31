// Runs before every test file. Environment variables must exist BEFORE src/config/env.js is imported.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.SETUP_KEY = 'test-setup-key';
process.env.MONGODB_URI = 'mongodb://placeholder';
process.env.WEEKEND_DAYS = ''; // every day counts as a workday so tests do not depend on today's weekday
process.env.HOLIDAYS = '';
process.env.ORG_TIMEZONE = 'UTC';
