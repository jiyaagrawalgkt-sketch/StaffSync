export default function StatCard({ label, value, icon: Icon, tone = 'primary', hint }) {
  return (
    <div className="card stat-card h-100">
      <div className="card-body d-flex align-items-center gap-3">
        <div className={`stat-icon bg-${tone}-subtle text-${tone}`}>{Icon && <Icon aria-hidden="true" />}</div>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="stat-value">{value ?? '—'}</div>
          {hint && <div className="text-muted small">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
