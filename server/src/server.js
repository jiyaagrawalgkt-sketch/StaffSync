import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

try {
  await connectDB();
} catch {
  console.error('Could not connect to MongoDB. Check MONGODB_URI and (for Atlas) the Network Access IP list.');
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`StaffSync API running on http://localhost:${env.port} (${env.nodeEnv})`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
