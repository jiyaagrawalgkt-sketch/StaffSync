import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import AcceptInvite from './pages/AcceptInvite.jsx';
import { Unauthorized, NotFound } from './pages/ErrorPages.jsx';

// Pages inside the app are loaded on demand (code splitting) so the first load stays small.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Employees = lazy(() => import('./pages/Employees.jsx'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail.jsx'));
const Departments = lazy(() => import('./pages/Departments.jsx'));
const Attendance = lazy(() => import('./pages/Attendance.jsx'));
const Leaves = lazy(() => import('./pages/Leaves.jsx'));
const Announcements = lazy(() => import('./pages/Announcements.jsx'));
const Trainings = lazy(() => import('./pages/Trainings.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/app" element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="trainings" element={<Trainings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route element={<ProtectedRoute roles={['hr', 'manager']} />}>
            <Route path="employees" element={<Employees />} />
            <Route path="employees/:id" element={<EmployeeDetail />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          <Route element={<ProtectedRoute roles={['hr']} />}>
            <Route path="departments" element={<Departments />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
