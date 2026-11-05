// Общие вспомогательные функции

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Мини-разметка учебных текстов: **жирный**, `код`, переносы строк
export function md(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

export function plural(n, forms) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
export const pl = (n, forms) => `${n} ${plural(n, forms)}`;

// Детерминированный генератор случайных чисел (одинаковый порядок при восстановлении урока)
export function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Нормализация ответа для сравнения: регистр, пробелы, конечная пунктуация, типографские апострофы
export function normAnswer(s, caseSensitive = false) {
  let t = String(s ?? '').replace(/[’‘`´]/g, "'").replace(/[“”«»]/g, '"').replace(/\s+/g, ' ').trim();
  t = t.replace(/[.!?,;:]+$/g, '').replace(/\s+([,.!?])/g, '$1').trim();
  if (!caseSensitive) t = t.toLowerCase().replace(/ё/g, 'е');
  return t;
}

export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export function fmtDuration(sec) {
  sec = Math.round(sec || 0);
  if (sec < 60) return `${sec} с`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} ч ${mm} мин` : `${h} ч`;
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
