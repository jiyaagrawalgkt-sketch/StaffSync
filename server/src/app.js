import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { csrfGuard } from './middleware/csrf.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes, { authController } from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import departmentRoutes from './routes/department.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import trainingRoutes from './routes/training.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reportRoutes, { dashboardRouter } from './routes/report.routes.js';

const app = express();

if (env.isProd) app.set('trust proxy', 1); // we run behind the hosting provider's proxy
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || env.clientUrls.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
if (!env.isTest && !env.isProd) app.use(morgan('dev'));
if (env.isProd) app.use(morgan('combined', { skip: (req, res) => res.statusCode < 400 }));

if (!env.isTest) {
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1500, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' } }));
}
app.use('/api', csrfGuard);

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected, message: connected ? 'StaffSync API is running' : 'Database not connected',
    data: { environment: env.nodeEnv, database: connected ? 'connected' : 'disconnected' },
  });
});
app.get('/api/config', authController.config);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
