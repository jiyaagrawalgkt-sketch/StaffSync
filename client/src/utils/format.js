// Times are stored in UTC on the server and shown in the ORGANISATION timezone (from /api/config).
let timezone = 'Asia/Kolkata';
export const setTimezone = (tz) => { if (tz) timezone = tz; };

export const fmtDateTime = (iso) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';

export const fmtTime = (iso) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';

// "YYYY-MM-DD" strings are plain calendar dates: format them without any timezone shifting.
export const fmtDate = (s) =>
  s ? new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', dateStyle: 'medium' }).format(new Date(`${s}T00:00:00Z`)) : '—';

export const fmtHours = (minutes) => (minutes || minutes === 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—');

// ISO string  <->  value for <input type="datetime-local"> (in the browser's local time)
export const toInputDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromInputDateTime = (value) => (value ? new Date(value).toISOString() : '');

export const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
export const titleCase = (s = '') => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
