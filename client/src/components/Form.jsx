import { useId } from 'react';

function Field({ label, error, help, id, children }) {
  return (
    <div className="mb-3">
      {label && <label htmlFor={id} className="form-label">{label}</label>}
      {children}
      {help && !error && <div className="form-text">{help}</div>}
      {error && <div id={`${id}-err`} className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

export function Input({ label, error, help, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} help={help} id={id}>
      <input id={id} className={`form-control ${error ? 'is-invalid' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
    </Field>
  );
}

export function Textarea({ label, error, help, rows = 3, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} help={help} id={id}>
      <textarea id={id} rows={rows} className={`form-control ${error ? 'is-invalid' : ''}`} aria-invalid={!!error} {...props} />
    </Field>
  );
}

export function Select({ label, error, help, children, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} help={help} id={id}>
      <select id={id} className={`form-select ${error ? 'is-invalid' : ''}`} aria-invalid={!!error} {...props}>{children}</select>
    </Field>
  );
}

export function SubmitButton({ busy, children, className = 'btn btn-primary', ...props }) {
  return (
    <button type="submit" className={className} disabled={busy} {...props}>
      {busy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}{children}
    </button>
  );
}
