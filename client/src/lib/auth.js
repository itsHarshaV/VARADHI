const KEY = 'varadhi_auth_v1';

export function loadAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAuth({ email, token }) {
  localStorage.setItem(KEY, JSON.stringify({ email, token }));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

