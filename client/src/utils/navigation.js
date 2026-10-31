import { FiHome, FiUsers, FiGrid, FiClock, FiCalendar, FiMessageSquare, FiBookOpen, FiBarChart2, FiBell, FiUser } from 'react-icons/fi';

const ALL = ['hr', 'manager', 'employee'];

export const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: FiHome, roles: ALL },
  { to: '/app/employees', label: 'Employees', icon: FiUsers, roles: ['hr'] },
  { to: '/app/employees', label: 'My Team', icon: FiUsers, roles: ['manager'] },
  { to: '/app/departments', label: 'Departments', icon: FiGrid, roles: ['hr'] },
  { to: '/app/attendance', label: 'Attendance', icon: FiClock, roles: ALL },
  { to: '/app/leaves', label: 'Leave', icon: FiCalendar, roles: ALL },
  { to: '/app/announcements', label: 'Announcements', icon: FiMessageSquare, roles: ALL },
  { to: '/app/trainings', label: 'Training', icon: FiBookOpen, roles: ALL },
  { to: '/app/reports', label: 'Reports', icon: FiBarChart2, roles: ['hr', 'manager'] },
  { to: '/app/notifications', label: 'Notifications', icon: FiBell, roles: ALL },
  { to: '/app/profile', label: 'Profile', icon: FiUser, roles: ALL },
];
