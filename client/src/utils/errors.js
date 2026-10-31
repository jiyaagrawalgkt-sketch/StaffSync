export function getErrorMessage(error) {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK' || !error?.response) return 'Cannot reach the server. Is the backend running?';
  return 'Something went wrong. Please try again.';
}

// Server validation errors look like: { errors: [{ path: 'email', message: '...' }] }
export function fieldErrors(error) {
  const out = {};
  for (const e of error?.response?.data?.errors || []) if (e.path && !out[e.path]) out[e.path] = e.message;
  return out;
}
