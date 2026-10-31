import { EmptyState } from './Feedback.jsx';

export default function ChartCard({ title, description, empty, children, height = 260 }) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <h2 className="h6 mb-1">{title}</h2>
        {description && <p className="text-muted small mb-3">{description}</p>}
        {empty ? <EmptyState title="No data for this period" /> : <div style={{ width: '100%', height }}>{children}</div>}
      </div>
    </div>
  );
}
