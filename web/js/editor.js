// Редактор кода: textarea поверх подсвеченного <pre>, номера строк,
// автоотступы и панель символов для телефона.
import { highlight } from './highlight.js';
import { el } from './ui.js';

const KEYS = {
  py: ['⇥', '(', ')', ':', '"', "'", '=', '[', ']', '{', '}', '+', '-', '*', '/', '<', '>', '#', '_', ',', '.', '←', '→'],
  html: ['⇥', '<', '>', '/', '=', '"', '<p>', '<h1>', '<a>', '<img>', '<li>', '<div>', '!', '-', '#', '←', '→'],
};
const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);

export function createEditor({ lang = 'py', value = '', onChange, minRows = 8 } = {}) {
  const root = el(`<div class="editor" data-lang="${lang}">
    <div class="ed-wrap">
      <div class="ed-gutter" aria-hidden="true"></div>
      <div class="ed-main">
        <pre class="ed-hl" aria-hidden="true"><code></code></pre>
        <textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Редактор кода"></textarea>
      </div>
    </div>
    <div class="ed-keys" role="toolbar" aria-label="Символы"></div>
  </div>`);
  const ta = root.querySelector('.ed-ta');
  const code = root.querySelector('.ed-hl code');
  const hl = root.querySelector('.ed-hl');
  const gutter = root.querySelector('.ed-gutter');
  const keys = root.querySelector('.ed-keys');
  ta.value = value;
  root.style.setProperty('--rows', minRows);

  function render() {
    code.innerHTML = highlight(ta.value, lang) + '\n';
    const lines = ta.value.split('\n').length;
    if (gutter.childElementCount !== lines) gutter.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
    syncScroll();
  }
  function syncScroll() {
    hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  }
  function changed() { render(); onChange && onChange(ta.value); }

  function insert(text, caretBack = 0) {
    ta.focus();
    // execCommand сохраняет историю отмены (Ctrl+Z); setRangeText — запасной путь
    if (!document.execCommand || !document.execCommand('insertText', false, text)) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      ta.setRangeText(text, s, e, 'end');
      changed();
    }
    if (caretBack) { const p = ta.selectionStart - caretBack; ta.setSelectionRange(p, p); }
  }
  function currentLine() {
    const s = ta.selectionStart;
    const start = ta.value.lastIndexOf('\n', s - 1) + 1;
    return ta.value.slice(start, s);
  }
  function newline() {
    const line = currentLine();
    let indent = (line.match(/^[ \t]*/) || [''])[0];
    if (lang === 'py' && /:\s*(#.*)?$/.test(line)) indent += '    ';
    if (lang === 'html') {
      const m = line.match(/<([a-zA-Z][\w-]*)[^>]*>\s*$/);
      const after = ta.value.slice(ta.selectionStart);
      if (m && !VOID.has(m[1].toLowerCase()) && !/<\//.test(line.slice(line.lastIndexOf(m[0])))) {
        if (after.startsWith(`</${m[1]}>`)) { insert('\n' + indent + '  ' + '\n' + indent, indent.length + 1); return; }
        indent += '  ';
      }
    }
    insert('\n' + indent);
  }

  ta.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') { e.preventDefault(); newline(); }
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); insert(lang === 'py' ? '    ' : '  '); }
    else if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
      const line = currentLine();
      if (lang === 'py' && line.length >= 4 && /^ +$/.test(line) && line.length % 4 === 0) {
        e.preventDefault();
        ta.setSelectionRange(ta.selectionStart - 4, ta.selectionStart);
        insert('');
      }
    }
  });
  ta.addEventListener('input', changed);
  ta.addEventListener('scroll', syncScroll);

  for (const k of KEYS[lang] || KEYS.py) {
    const b = el(`<button type="button" class="ed-key"></button>`);
    b.textContent = k;
    b.addEventListener('pointerdown', (e) => e.preventDefault()); // не убирать клавиатуру
    b.addEventListener('click', () => {
      if (k === '⇥') return insert(lang === 'py' ? '    ' : '  ');
      if (k === '←' || k === '→') {
        ta.focus();
        const p = Math.max(0, Math.min(ta.value.length, ta.selectionStart + (k === '←' ? -1 : 1)));
        ta.setSelectionRange(p, p); return;
      }
      if (lang === 'html' && /^<\w+>$/.test(k)) {
        const name = k.slice(1, -1);
        if (name === 'img') return insert('<img src="" alt="">', 9);
        if (name === 'a') return insert('<a href=""></a>', 6);
        return insert(`<${name}></${name}>`, name.length + 3);
      }
      if (PAIRS[k] && ta.selectionStart === ta.selectionEnd) return insert(k + PAIRS[k], 1);
      insert(k);
    });
    keys.appendChild(b);
  }
  render();

  return {
    root,
    get value() { return ta.value; },
    set value(v) { ta.value = v; render(); },
    focus() { ta.focus(); },
    markLine(n) {
      gutter.querySelectorAll('.err').forEach((x) => x.classList.remove('err'));
      if (n && gutter.children[n - 1]) gutter.children[n - 1].classList.add('err');
    },
  };
}
