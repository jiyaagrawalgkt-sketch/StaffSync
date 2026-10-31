export default function Pagination({ meta, onChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  return (
    <nav className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" aria-label="Pagination">
      <span className="text-muted small">Page {page} of {totalPages} · {total} records</span>
      <div className="btn-group">
        <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </nav>
  );
}
