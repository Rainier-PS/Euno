export function getStorage(key, fallback) {
  try { const v = localStorage.getItem(key); if (v === null) return fallback; return JSON.parse(v); } catch { return fallback; }
}

export function setStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
