import { useState } from 'react';

// Tiny form helper: values + per-field errors + a bind(name) helper for inputs.
export default function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const bind = (name) => ({
    name,
    value: values[name] ?? '',
    error: errors[name],
    onChange: (e) => {
      const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setValues((prev) => ({ ...prev, [name]: v }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
  });

  return { values, setValues, errors, setErrors, bind, reset: (v = initial) => { setValues(v); setErrors({}); } };
}
