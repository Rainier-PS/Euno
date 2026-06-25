export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export function sanitizeNum(n, min, max) {
  const v = parseInt(n, 10);
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export function sanitizeDate(s) {
  if (typeof s !== 'string') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

export function sanitizeTime(s) {
  if (typeof s !== 'string') return '';
  return /^\d{2}:\d{2}$/.test(s) ? s : '';
}

const md =
  typeof window !== 'undefined' && window.markdownit
    ? window.markdownit({
      html: false,
      linkify: true,
      breaks: true
    })
    : null;

export function parseMarkdown(text) {
  if (!text) return '';

  if (!md) {
    return sanitize(text).replace(/\n/g, '<br>');
  }

  return md.render(text);
}

export function debounce(fn, ms) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
}

export function matchesQuery(query, fields) {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some(f => f && f.toLowerCase().includes(q));
}

export function stableSort(arr, cmp) {
  return arr.map((v, i) => ({ v, i })).sort((a, b) => cmp(a.v, b.v) || (a.i - b.i)).map(x => x.v);
}
