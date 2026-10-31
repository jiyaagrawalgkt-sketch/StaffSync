import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);
import mongoose from 'mongoose';
import { env } from './env.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tries a few times before giving up, so a slow Atlas cold start does not crash the server.
export async function connectDB(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log('MongoDB connected');
      return;
    } catch (error) {
      console.error(`MongoDB connection failed (attempt ${attempt}/${retries}): ${error.message}`);
      if (attempt === retries) throw error;
      await sleep(delayMs);
    }
  }
}

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
