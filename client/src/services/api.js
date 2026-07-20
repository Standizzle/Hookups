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
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Fastify's JSON body parser rejects a request that declares
  // application/json but sends no body at all — only set the header
  // (and a body) when there's actually a body to send.
  if (body !== undefined) headers['Content-Type'] = 'application/json';

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
    err.body   = data;
    throw err;
  }

  return data;
}

async function requestForm(method, path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { method, headers, body: formData });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.code   = data.code;
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data;
}

async function download(path, filename) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.code   = data.code;
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
  postForm: (path, formData) => requestForm('POST', path, formData),
  download,
};
