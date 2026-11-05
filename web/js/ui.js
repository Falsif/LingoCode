// Общие элементы интерфейса: иконки, тосты, нижние листы, подтверждения, празднования
import { esc } from './util.js';

const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  chart: 'M6 20V11 M12 20V5 M18 20v-6 M3 20h18',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  play: 'M7 4l13 8-13 8z',
  volume: 'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12',
  turtle: 'M4 14a8 6 0 0 1 16 0z M2 14h20 M7 14v3 M17 14v3 M20 11l2-1',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6 6 18',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2 3 3 0-2 0-4 0-6z',
  bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  back: 'M15 5l-7 7 7 7',
  chev: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H4a3 3 0 0 0 4 4 M16 6h4a3 3 0 0 1-4 4 M12 13v4 M9 17h6v4H9z',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  upload: 'M12 20V9 M7 14l5-5 5 5 M5 4h14',
  code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5',
  cards: 'M7 4h11a2 2 0 0 1 2 2v11 M4 8h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  cup: 'M17 8h1a3 3 0 0 1 0 6h-1 M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z M7 2v3 M11 2v3',
  save: 'M5 3h11l3 3v15H5z M8 3v5h7V3 M8 21v-7h8v7',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
};
export function icon(name, cls = '') {
  const fill = name === 'play' || name === 'star-f' ? 'currentColor' : 'none';
  const n = name === 'star-f' ? 'star' : name;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- Тосты ----------
export function toast(text, kind = '') {
  const box = $('#toasts');
  while (box.childElementCount >= 3) box.firstElementChild.remove();
  const t = el(`<div class="toast ${kind}">${text}</div>`);
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ---------- Нижний лист (модальное окно) ----------
let sheetStack = [];
export function sheet(html, { onClose } = {}) {
  const back = el(`<div class="sheet-back"><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div></div>`);
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add('show'));
  const api = {
    root: back.querySelector('.sheet'),
    close() {
      if (!back.isConnected) return;
      back.classList.remove('show');
      sheetStack = sheetStack.filter((s) => s !== api);
      setTimeout(() => back.remove(), 250);
      onClose && onClose();
    },
  };
  back.addEventListener('click', (e) => { if (e.target === back) api.close(); });
  back.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => api.close()));
  sheetStack.push(api);
  return api;
}
export function closeTopSheet() {
  const s = sheetStack[sheetStack.length - 1];
  if (s) { s.close(); return true; }
  return false;
}

export function confirmBox(title, text, okLabel = 'Да', danger = false) {
  return new Promise((resolve) => {
    let answered = false;
    const s = sheet(`<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>
      <div class="row gap"><button class="btn ghost grow" data-no>Отмена</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-yes>${esc(okLabel)}</button></div>`,
    { onClose: () => { if (!answered) resolve(false); } });
    s.root.querySelector('[data-no]').onclick = () => { answered = true; resolve(false); s.close(); };
    s.root.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); s.close(); };
  });
}

// ---------- Празднование ----------
export function celebrate(emoji, title, text) {
  const colors = ['#8B5CF6', '#C4B5FD', '#60A5FA', '#34D399', '#FBBF24', '#F472B6'];
  const bits = Array.from({ length: 26 }, (_, i) => `<i style="--x:${Math.round(Math.random() * 100)}%;--d:${(Math.random() * 0.6).toFixed(2)}s;--r:${Math.round(Math.random() * 360)}deg;background:${colors[i % colors.length]}"></i>`).join('');
  const s = sheet(`<div class="celebrate"><div class="confetti">${bits}</div><div class="cel-badge">${emoji}</div><h3>${esc(title)}</h3><p class="muted">${esc(text)}</p><button class="btn primary block" data-close>Отлично!</button></div>`);
  return s;
}

export function progressBar(pct, cls = '') {
  return `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
}

export function ring(pct, label, size = 64) {
  const r = 26, c = 2 * Math.PI * r;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/><text x="32" y="37" text-anchor="middle">${esc(label)}</text></svg>`;
}

// Сохранение файла: через Android-мост или скачивание в браузере
export function saveTextFile(name, text, mime = 'application/json') {
  if (window.LingoAndroid && window.LingoAndroid.saveFile) { window.LingoAndroid.saveFile(name, mime, text); return; }
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Файл сохранён в «Загрузки»');
}
export function pickTextFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept;
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsText(f);
    };
    inp.click();
  });
}
