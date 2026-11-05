// Песочницы: свои программы на Python и свои HTML-страницы (сохраняются локально)
import { state, save } from '../store.js';
import { esc, uid, debounce } from '../util.js';
import { icon, toast, confirmBox, sheet } from '../ui.js';
import { createEditor } from '../editor.js';
import { runPython, warmPython, onPyStatus } from '../python/runner.js';
import { explainError } from '../python/errors.js';
import { previewDoc } from '../htmlcheck.js';
import { recordRun, recordCodeSuccess, checkAchievements } from '../game.js';
import { go } from '../router.js';
import { humanDateYear, dateKey } from '../dates.js';

const CFG = {
  py: { list: 'programs', title: 'Песочница Python', item: 'программа', starter: '# Моя программа\nname = input("Как тебя зовут? ")\nprint(f"Привет, {name}!")\n', sample: 'Мир' },
  html: { list: 'pages', title: 'Песочница HTML', item: 'страница', starter: '<!DOCTYPE html>\n<html lang="ru">\n  <head>\n    <meta charset="UTF-8">\n    <title>Моя страница</title>\n    <style>\n      body { font-family: sans-serif; background: #F8F7FF; }\n      h1 { color: #8B5CF6; }\n    </style>\n  </head>\n  <body>\n    <h1>Привет!</h1>\n    <p>Это моя страница.</p>\n    <img src="cat.svg" alt="Кот" width="120">\n  </body>\n</html>\n' },
};

export function renderSandboxList(view, { kind }) {
  const c = CFG[kind];
  if (!c) return go('#/learn');
  const items = state[c.list].slice().sort((a, b) => b.updated - a.updated);
  view.innerHTML = `<div class="page">
    <header class="page-h"><button class="icon-btn back-btn" aria-label="Назад">${icon('back')}</button><h1>${c.title}</h1></header>
    <p class="muted">${kind === 'py' ? 'Пишите и запускайте свои программы. Код выполняется в безопасной песочнице прямо на телефоне, без интернета.' : 'Создавайте свои страницы и сразу смотрите результат. Доступны картинки cat.svg, mountains.svg, logo.svg, avatar.svg.'}</p>
    <button class="btn primary block lg new">${icon('plus')} Новая ${c.item}</button>
    <div class="list">${items.map((p) => `<button class="list-item" data-id="${p.id}">${icon(kind === 'py' ? 'code' : 'eye')}<span class="grow"><b>${esc(p.name)}</b><span class="small muted">изменено ${humanDateYear(dateKey(new Date(p.updated)))}</span></span>${icon('chev')}</button>`).join('') || `<p class="muted center pad">Здесь будут ваши ${kind === 'py' ? 'программы' : 'страницы'}.</p>`}</div>
  </div>`;
  view.querySelector('.back-btn').onclick = () => history.back();
  view.querySelector('.new').onclick = () => {
    const n = state[c.list].length + 1;
    const item = { id: uid(), name: kind === 'py' ? `Программа ${n}` : `Страница ${n}`, code: c.starter, updated: Date.now() };
    state[c.list].push(item); save();
    go(`#/sandbox/${kind}/${item.id}`);
  };
  view.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => go(`#/sandbox/${kind}/${b.dataset.id}`));
}

export function renderSandboxEdit(view, { kind, id }) {
  const c = CFG[kind];
  const item = c && state[c.list].find((p) => p.id === id);
  if (!item) return go(`#/sandbox/${kind}`, { replace: true });
  const persist = debounce(() => { item.updated = Date.now(); save(); }, 500);

  view.innerHTML = `<div class="page sandbox">
    <header class="page-h"><button class="icon-btn back-btn" aria-label="Назад">${icon('back')}</button><input class="title-input" value="${esc(item.name)}" maxlength="40" aria-label="Название"><button class="icon-btn more" aria-label="Ещё">${icon('gear')}</button></header>
    <div class="ed-slot"></div>
    ${kind === 'py' ? `
      <details class="stdin-box"><summary>Ввод для input()</summary><textarea class="field mono stdin" rows="2" spellcheck="false" autocapitalize="off" placeholder="Каждая строка — один input()">${esc(item.stdin ?? c.sample)}</textarea></details>
      <button class="btn primary block lg run">${icon('play')} Запустить код</button>
      <div class="py-status muted small"></div>
      <div class="console"><div class="console-h">Вывод программы</div><pre class="console-out muted">Нажмите «Запустить код»</pre></div>
      <div class="code-result"></div>`
    : `<div class="preview-box"><div class="preview-h"><span>${icon('eye')} Результат</span><button class="link full">Во весь экран</button></div><iframe class="preview tall" sandbox="allow-scripts" title="Предпросмотр"></iframe></div>`}
  </div>`;
  view.querySelector('.back-btn').onclick = () => history.back();
  const titleIn = view.querySelector('.title-input');
  titleIn.oninput = () => { item.name = titleIn.value.trim() || 'Без названия'; persist(); };

  let frame = view.querySelector('.preview');
  const upd = debounce((v) => { if (frame) frame.srcdoc = previewDoc(v); }, 300);
  const ed = createEditor({ lang: kind, value: item.code, minRows: 14, onChange: (v) => { item.code = v; persist(); if (kind === 'html') upd(v); } });
  view.querySelector('.ed-slot').appendChild(ed.root);

  view.querySelector('.more').onclick = () => {
    const s = sheet(`<h3>${esc(item.name)}</h3><div class="col gap">
      <button class="btn ghost block dup">Сделать копию</button>
      <button class="btn ghost block reset">Вернуть пример кода</button>
      <button class="btn ghost block danger-text del">${icon('trash')} Удалить</button></div>`);
    s.root.querySelector('.dup').onclick = () => { const cp = { ...item, id: uid(), name: item.name + ' (копия)', updated: Date.now() }; state[c.list].push(cp); save(); s.close(); go(`#/sandbox/${kind}/${cp.id}`, { replace: true }); };
    s.root.querySelector('.reset').onclick = async () => { s.close(); if (await confirmBox('Вернуть пример?', 'Текущий код будет заменён.', 'Заменить')) { ed.value = c.starter; item.code = c.starter; save(); upd(c.starter); } };
    s.root.querySelector('.del').onclick = async () => { s.close(); if (await confirmBox('Удалить?', `«${item.name}» будет удалена без возможности восстановления.`, 'Удалить', true)) { state[c.list] = state[c.list].filter((p) => p !== item); save(); go(`#/sandbox/${kind}`, { replace: true }); } };
  };

  if (kind === 'html') {
    frame.srcdoc = previewDoc(item.code);
    if (!item.counted && /<\w+/.test(item.code)) { item.counted = true; recordCodeSuccess('html'); checkAchievements(); save(); }
    view.querySelector('.full').onclick = () => {
      const s = sheet(`<div class="full-preview"><iframe class="preview full" sandbox="allow-scripts" title="Страница"></iframe><button class="btn primary block" data-close>Закрыть</button></div>`);
      s.root.querySelector('iframe').srcdoc = previewDoc(ed.value);
    };
    return;
  }

  const out = view.querySelector('.console-out');
  const result = view.querySelector('.code-result');
  const stdin = view.querySelector('.stdin');
  const status = view.querySelector('.py-status');
  stdin.oninput = () => { item.stdin = stdin.value; persist(); };
  const unsub = onPyStatus((s) => { if (!view.contains(status)) return unsub(); status.textContent = s === 'loading' ? 'Загружаю Python…' : s === 'error' ? 'Python не загрузился' : ''; });
  warmPython();
  view.querySelector('.run').onclick = async () => {
    ed.markLine(null);
    out.classList.remove('muted');
    out.textContent = '…';
    result.innerHTML = '';
    const inputs = stdin.value === '' ? [] : stdin.value.replace(/\r/g, '').split('\n');
    const res = await runPython(ed.value, { inputs, echo: true, timeout: 8000 });
    out.textContent = res.out || (res.ok ? '(программа ничего не вывела)' : '');
    if (res.timeout) result.innerHTML = '<div class="err-box"><b>Программа работала слишком долго</b><p>Выполнение остановлено. Проверьте, нет ли бесконечного цикла.</p></div>';
    else if (res.limit) result.innerHTML = '<div class="err-box"><b>Слишком много вывода</b><p>Программа остановлена: она напечатала слишком много текста.</p></div>';
    else if (res.err) {
      const e = explainError(res.err);
      ed.markLine(e.line);
      result.innerHTML = `<div class="err-box"><b>${esc(e.title)}${e.line ? ` — строка ${e.line}` : ''}</b><p>${esc(e.text)}</p><code class="raw">${esc(e.raw)}</code></div>`;
    }
    const ok = res.ok && !!res.out;
    recordRun(res.ok);
    if (ok && !item.counted) { item.counted = true; recordCodeSuccess('py'); checkAchievements(); save(); }
    if (ok) toast('Программа выполнена');
  };
}
