import { titleCase } from '../utils/format.js';

const TONES = {
  pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'secondary',
  present: 'success', late: 'warning', published: 'success', draft: 'secondary', archived: 'dark',
  active: 'success', inactive: 'danger', invited: 'info', 'checked-in': 'success', 'checked-out': 'primary',
  'on-leave': 'info', absent: 'danger', 'non-working-day': 'secondary',
  hr: 'danger', manager: 'primary', employee: 'secondary',
};

export default function StatusBadge({ value, label }) {
  return <span className={`badge text-bg-${TONES[value] || 'secondary'}`}>{label || titleCase(String(value))}</span>;
}
