import { env } from '../config/env.js';

// Attendance and leave use "date strings" (YYYY-MM-DD) in the ORGANISATION timezone.
// Timestamps (check-in/out) are stored as real UTC Dates.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function toWorkDate(date = new Date(), tz = env.timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function localMinutes(date = new Date(), tz = env.timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get('hour') * 60 + get('minute');
}

export const parseHM = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const dayOfWeek = (s) => new Date(`${s}T00:00:00Z`).getUTCDay();
export const isWeekend = (s) => env.weekendDays.includes(dayOfWeek(s));
export const isHoliday = (s) => env.holidays.includes(s);
export const isWorkday = (s) => !isWeekend(s) && !isHoliday(s);

export function eachDate(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export const countWorkdays = (start, end) => eachDate(start, end).filter(isWorkday).length;

export const daysBetween = (s, e) =>
  Math.round((new Date(`${e}T00:00:00Z`) - new Date(`${s}T00:00:00Z`)) / 86400000);

// Build the UTC instant for "HH:MM on dateStr in timezone tz" (used by the seed script).
export function zonedToUtc(dateStr, hh, mm, tz = env.timezone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guess));
  const g = (k) => Number(parts.find((p) => p.type === k).value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return new Date(guess - (asUtc - guess));
}
