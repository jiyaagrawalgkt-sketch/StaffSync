import api, { clean } from './api.js';

const get = (url, params) => api.get(url, { params: clean(params) }).then((r) => r.data);
const post = (url, body) => api.post(url, body).then((r) => r.data);
const patch = (url, body) => api.patch(url, body).then((r) => r.data);
const put = (url, body) => api.put(url, body).then((r) => r.data);
const del = (url) => api.delete(url).then((r) => r.data);

export const configApi = { get: () => get('/config') };

export const authApi = {
  setupStatus: () => get('/auth/setup-status'),
  setup: (body) => post('/auth/setup', body),
  login: (body) => post('/auth/login', body),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  updateMe: (body) => patch('/auth/me', body),
  changePassword: (body) => post('/auth/change-password', body),
  acceptInvite: (body) => post('/auth/accept-invite', body),
};

export const usersApi = {
  list: (params) => get('/users', params),
  managers: () => get('/users/managers'),
  get: (id) => get(`/users/${id}`),
  create: (body) => post('/users', body),
  update: (id, body) => patch(`/users/${id}`, body),
  setStatus: (id, isActive) => patch(`/users/${id}/status`, { isActive }),
  reinvite: (id) => post(`/users/${id}/invite`),
};

export const departmentsApi = {
  list: () => get('/departments'),
  create: (body) => post('/departments', body),
  update: (id, body) => patch(`/departments/${id}`, body),
  remove: (id) => del(`/departments/${id}`),
};

export const attendanceApi = {
  today: () => get('/attendance/today'),
  checkIn: () => post('/attendance/check-in'),
  checkOut: () => post('/attendance/check-out'),
  mine: (params) => get('/attendance/me', params),
  list: (params) => get('/attendance', params),
};

export const leavesApi = {
  balances: (params) => get('/leaves/balances', params),
  calendar: (month) => get('/leaves/calendar', { month }),
  mine: (params) => get('/leaves/me', params),
  list: (params) => get('/leaves', params),
  apply: (body) => post('/leaves', body),
  approve: (id) => patch(`/leaves/${id}/approve`),
  reject: (id, reason) => patch(`/leaves/${id}/reject`, { reason }),
  cancel: (id) => patch(`/leaves/${id}/cancel`),
};

export const announcementsApi = {
  list: (params) => get('/announcements', params),
  create: (body) => post('/announcements', body),
  update: (id, body) => patch(`/announcements/${id}`, body),
  publish: (id) => post(`/announcements/${id}/publish`),
  archive: (id) => post(`/announcements/${id}/archive`),
};

export const trainingsApi = {
  list: (params) => get('/trainings', params),
  mine: () => get('/trainings/mine'),
  create: (body) => post('/trainings', body),
  update: (id, body) => patch(`/trainings/${id}`, body),
  publish: (id) => post(`/trainings/${id}/publish`),
  archive: (id) => post(`/trainings/${id}/archive`),
  enroll: (id) => post(`/trainings/${id}/enroll`),
  cancelEnrollment: (id) => del(`/trainings/${id}/enroll`),
  enrollees: (id) => get(`/trainings/${id}/enrollees`),
};

export const notificationsApi = {
  list: (params) => get('/notifications', params),
  unreadCount: () => get('/notifications/unread-count'),
  markRead: (id) => patch(`/notifications/${id}/read`),
  markAllRead: () => patch('/notifications/read-all'),
};

export const reportsApi = { summary: (params) => get('/reports/summary', params) };
export const dashboardApi = { get: () => get('/dashboard') };
export { put };
