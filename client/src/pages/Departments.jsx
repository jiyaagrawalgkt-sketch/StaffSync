import { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { departmentsApi } from '../services/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import useFetch from '../hooks/useFetch.js';
import useForm from '../hooks/useForm.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Input, Textarea, SubmitButton } from '../components/Form.jsx';
import { getErrorMessage, fieldErrors } from '../utils/errors.js';

export default function Departments() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => departmentsApi.list(), []);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const { values, setValues, bind, errors, setErrors } = useForm({ name: '', code: '', description: '' });

  const open = (dept) => {
    setErrors({});
    setValues(dept ? { name: dept.name, code: dept.code, description: dept.description || '' } : { name: '', code: '', description: '' });
    setEditing(dept);
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await departmentsApi.update(editing._id, values); else await departmentsApi.create(values);
      toast.success(editing ? 'Department updated' : 'Department created');
      setEditing(undefined); reload();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await departmentsApi.remove(toDelete._id); toast.success('Department deleted'); reload(); }
    catch (err) { toast.error(getErrorMessage(err)); } finally { setBusy(false); setToDelete(null); }
  };

  const columns = [
    { key: 'name', header: 'Department', render: (d) => <strong>{d.name}</strong> },
    { key: 'code', header: 'Code' },
    { key: 'description', header: 'Description', render: (d) => d.description || '—' },
    { key: 'employeeCount', header: 'Active employees' },
    { key: 'actions', header: '', render: (d) => (
      <div className="d-flex gap-1">
        <button className="btn btn-sm btn-outline-primary" onClick={() => open(d)}>Edit</button>
        <button className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(d)}>Delete</button>
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Departments" subtitle="Organise employees into departments">
        <button className="btn btn-primary" onClick={() => open(null)}><FiPlus className="me-1" />Add department</button>
      </PageHeader>
      <div className="card"><div className="card-body">
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} emptyTitle="No departments yet" emptyMessage="Create your first department to get started." />
      </div></div>

      <Modal show={editing !== undefined} onClose={() => setEditing(undefined)} title={editing ? 'Edit department' : 'Add department'}>
        <form onSubmit={save} noValidate>
          <Input label="Name" required {...bind('name')} />
          <Input label="Code" help="2-10 letters or numbers, e.g. ENG" required {...bind('code')} />
          <Textarea label="Description" {...bind('description')} />
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-light" onClick={() => setEditing(undefined)}>Cancel</button>
            <SubmitButton busy={busy}>Save</SubmitButton>
          </div>
        </form>
      </Modal>
      <ConfirmDialog show={!!toDelete} busy={busy} title="Delete department?" message={`Delete "${toDelete?.name}"? This only works if no employees belong to it.`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
