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

export function parseMarkdown(md) {
  if (!md) return '';
  let html = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const codeBlocks = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(`<pre><code>${code}</code></pre>`);
    return `\n@@CODEBLOCK_${codeBlocks.length - 1}@@\n`;
  });
  html = html.replace(/!\[([^\]]*)\]\(data:image[^)]+\)/g, (m, alt, src) => `<img alt="${alt}" src="${m.slice(m.indexOf('(')+1, -1)}">`).replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>').replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>').replace(/^---+$/gm,'<hr>').replace(/^\d+\. (.+)$/gm,'<li class="ol-item">$1</li>').replace(/^[-*] (.+)$/gm,'<li class="ul-item">$1</li>');
  html = html.replace(/(<li class="ol-item">.*?<\/li>(\n|$))+/g, m => '<ol>' + m.replace(/ class="ol-item"/g,'') + '</ol>');
  html = html.replace(/(<li class="ul-item">.*?<\/li>(\n|$))+/g, m => '<ul>' + m.replace(/ class="ul-item"/g,'') + '</ul>');
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (/^<(h[123]|ul|ol|li|blockquote|hr)/.test(trimmed) || trimmed.startsWith('@@CODEBLOCK_')) return line;
    return '<p>' + line + '</p>';
  }).filter(Boolean).join('');
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`<p>@@CODEBLOCK_${idx}@@</p>`, block).replace(`@@CODEBLOCK_${idx}@@`, block);
  });
  return html;
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
