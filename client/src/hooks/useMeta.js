import { useEffect, useState } from 'react';
import { api } from '../services/api';

let cache = null;
export const invalidateMeta = () => { cache = null; };

/** Categories, locations, departments and SLA hours (cached for the session). */
export function useMeta() {
  const [meta, setMeta] = useState(cache);
  useEffect(() => {
    if (!cache) api.get('/meta').then((m) => { cache = m; setMeta(m); }).catch(() => {});
  }, []);
  return meta || { categories: [], locations: [], departments: [], sla: [], loading: true };
}
