export function showToast(msg, type) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.setAttribute('role','status');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'toastOut 0.25s ease forwards'; setTimeout(() => t.remove(), 250); }, 2800);
}
