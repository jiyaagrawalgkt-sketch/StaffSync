import Modal from './Modal.jsx';

export default function ConfirmDialog({ show, title = 'Please confirm', message, confirmLabel = 'Confirm', variant = 'danger', busy, onConfirm, onCancel }) {
  return (
    <Modal show={show} title={title} onClose={onCancel}
      footer={<>
        <button className="btn btn-light" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn btn-${variant}`} onClick={onConfirm} disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}{confirmLabel}
        </button>
      </>}>
      <p className="mb-0">{message}</p>
    </Modal>
  );
}
