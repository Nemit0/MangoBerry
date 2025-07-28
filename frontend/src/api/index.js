// Central API client functions
// Base API path: use no prefix in development (CRA proxy), '/api' in production (Nginx proxy)
export const API_ROOT = '/api';

// Login: returns JWT access token and user ID
export async function login(email, password) {
  const res = await fetch(`${API_ROOT}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Login failed: ${res.status} ${msg}`);
  }
  const data = await res.json(); // { access_token, token_type, user_id }
  return data;
}

// Generic fetch with Authorization header
export async function fetchWithAuth(path, token, options = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Request failed: ${res.status} ${msg}`);
  }
  return res.json();
}

// Get current user profile
export function getProfile(token) {
  return fetchWithAuth('/users/me', token);
}

// User registration
export async function register(payload) {
  const res = await fetch(`${API_ROOT}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Registration failed: ${res.status} ${msg}`);
  }
  return res.json();
}

// Check if email is available
export async function checkEmail(email) {
  const res = await fetch(`${API_ROOT}/register/check_email?email=${encodeURIComponent(email)}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Email check failed: ${res.status}`);
  const data = await res.json();
  return data.available;
}

// Check if nickname is available
export async function checkNickname(nickname) {
  const res = await fetch(`${API_ROOT}/register/check_nickname?nickname=${encodeURIComponent(nickname)}`, { method: 'POST' });
  if (!res.ok) throw new Error(`Nickname check failed: ${res.status}`);
  const data = await res.json();
  return data.available;
}
