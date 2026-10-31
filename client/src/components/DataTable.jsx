import { Loader, ErrorState, EmptyState } from './Feedback.jsx';

// columns: [{ key, header, render?(row) }]
export default function DataTable({ columns, rows, loading, error, onRetry, emptyTitle, emptyMessage, rowKey = (r) => r._id }) {
  if (loading && !rows?.length) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows?.length) return <EmptyState title={emptyTitle} message={emptyMessage} />;
  return (
    <div className="table-responsive" style={{ opacity: loading ? 0.6 : 1 }}>
      <table className="table table-hover mb-0">
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
