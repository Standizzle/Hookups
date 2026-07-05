const BASE = '/api';

function getToken() {
  return localStorage.getItem('hookups_token');
}

export function setToken(token) {
  localStorage.setItem('hookups_token', token);
}

export function clearToken() {
  localStorage.removeItem('hookups_token');
  localStorage.removeItem('hookups_user');
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.code   = data.code;
    err.status = res.status;
    throw err;
  }

  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
};
