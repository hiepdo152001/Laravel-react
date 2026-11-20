const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace(/\/+$/, '');
const SESSION_KEY = 'moc.auth.session';

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

async function request(path, { token, body, method = 'POST' } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Không thể kết nối máy chủ. Vui lòng thử lại sau.', 0);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : {};

  if (!response.ok) {
    const fields = Object.fromEntries(
      Object.entries(payload.errors || {}).map(([name, messages]) => [name, messages[0]])
    );
    throw new ApiError(
      payload.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
      response.status,
      fields
    );
  }

  return payload;
}

export function readSession() {
  const saved = window.sessionStorage.getItem(SESSION_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function storeSession(session) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

export async function login(credentials) {
  return request('login', { body: credentials });
}

export async function register(details) {
  return request('register', { body: details });
}

export async function getCurrentUser(token) {
  const result = await request('user', { method: 'GET', token });
  return result.user;
}

export async function logout(token) {
  return request('logout', { token });
}

export async function forgotPassword(details) {
  return request('forgot-password', { body: details });
}

export async function resetPassword(details) {
  return request('reset-password', { body: details });
}
