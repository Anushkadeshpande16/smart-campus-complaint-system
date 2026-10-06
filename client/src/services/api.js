const BASE = import.meta.env.VITE_API_URL || '';
const API = `${BASE}/api`;

export const fileUrl = (p) => (p ? (p.startsWith('http') ? p : `${BASE}${p}`) : null);
export const getToken = () => localStorage.getItem('scc_token');
export const setToken = (t) => (t ? localStorage.setItem('scc_token', t) : localStorage.removeItem('scc_token'));

async function request(method, path, { body, params } = {}) {
  const url = new URL(`${API}${path}`, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('scc:unauthorized'));
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  del: (path) => request('DELETE', path),
};
