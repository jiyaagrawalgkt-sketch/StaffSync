import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/errors.js';

// Runs `fetcher` when the component mounts and whenever `deps` change.
// Ignores out-of-order responses (e.g. the user types quickly in a search box).
export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (id === latest.current) setData(res);
    } catch (e) {
      if (id === latest.current) setError(getErrorMessage(e));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}
