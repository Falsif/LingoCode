// Отрисовка и проверка упражнений всех типов.
// Каждый рендерер возвращает { el, auto?, ready(), check() } либо сам вызывает ctx.finish() (auto).
import { esc, md, shuffle, normAnswer, seeded, debounce } from './util.js';
import { el, icon, toast } from './ui.js';
import { speak } from './tts.js';
import { state, save } from './store.js';
import { createEditor } from './editor.js';
import { runPython, checkPython, warmPython, onPyStatus } from './python/runner.js';
import { explainError } from './python/errors.js';
import { checkHTML, previewDoc } from './htmlcheck.js';

const TYPE_LABEL = {
  choice: 'Выберите ответ', listen: 'Аудирование', input: 'Впишите ответ', order: 'Составьте предложение', match: 'Найдите пары',
  error: 'Найдите ошибку', write: 'Напишите сами', read: 'Чтение', py: 'Задача на Python', html: 'Задание по HTML',
};
export function typeLabel(ex) { return ex.k === 'choice' && ex.code ? 'Что выведет код?' : TYPE_LABEL[ex.k] || 'Упражнение'; }

function sayBtn(text, big = false) {
  return `<button type="button" class="say ${big ? 'big' : ''}" data-say="${esc(text)}" aria-label="Прослушать">${icon('volume')}</button>`;
}
export function bindSay(root) {
  root.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); speak(b.dataset.say, b.dataset.slow === '1'); }));
}
function codeBlock(code) { return `<pre class="code-view"><code>${esc(code)}</code></pre>`; }

export function renderExercise(ex, ctx) {
  const fn = R[ex.k];
  if (!fn) return { el: el('<div>Неизвестный тип упражнения</div>'), ready: () => true, check: () => ({ correct: true }) };
  return fn(ex, ctx);
}

const R = {};

// ---------- Выбор ответа и аудирование ----------
R.choice = R.listen = (ex, ctx) => {
  const rnd = seeded(ctx.seed);
  const order = ex.noShuffle ? ex.opts.map((_, i) => i) : shuffle(ex.opts.map((_, i) => i), rnd);
  const isListen = ex.k === 'listen';
  const root = el(`<div class="ex ex-choice">
    ${isListen ? `<div class="listen-box">${sayBtn(ex.say, true)}<button type="button" class="say slow" data-say="${esc(ex.say)}" data-slow="1" aria-label="Медленно">${icon('turtle')}</button></div>` : ''}
    <div class="ex-q">${md(ex.q || '')}${!isListen && ex.say ? ' ' + sayBtn(ex.say) : ''}</div>
    ${ex.code ? codeBlock(ex.code) : ''}
    <div class="opts">${order.map((i) => `<button type="button" class="opt ${/\n/.test(ex.opts[i]) ? 'mono' : ''}" data-i="${i}">${esc(ex.opts[i]).replace(/\n/g, '<br>')}</button>`).join('')}</div>
  </div>`);
  bindSay(root);
  let sel = null;
  root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
    if (root.classList.contains('locked')) return;
    root.querySelectorAll('.opt').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel'); sel = +b.dataset.i; ctx.changed();
  }));
  if (isListen) setTimeout(() => speak(ex.say), 350);
  return {
    el: root,
    ready: () => sel !== null,
    check() {
      root.classList.add('locked');
      const ok = sel === ex.a;
      root.querySelector(`.opt[data-i="${ex.a}"]`).classList.add('right');
      if (!ok) root.querySelector(`.opt[data-i="${sel}"]`).classList.add('wrong');
      return { correct: ok, answer: ex.opts[ex.a] };
    },
  };
};

// ---------- Ввод ответа ----------
R.input = (ex, ctx) => {
  const root = el(`<div class="ex ex-input">
    <div class="ex-q">${md(ex.q)}${ex.say ? ' ' + sayBtn(ex.say) : ''}</div>
    <input class="field big" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Ваш ответ">
    ${ex.hint ? `<button type="button" class="link hint-btn">${icon('bulb')} Подсказка</button><div class="hint hidden">${md(ex.hint)}</div>` : ''}
  </div>`);
  bindSay(root);
  const inp = root.querySelector('input');
  inp.addEventListener('input', () => ctx.changed());
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) ctx.submit(); });
  const hb = root.querySelector('.hint-btn');
  if (hb) hb.onclick = () => root.querySelector('.hint').classList.remove('hidden');
  setTimeout(() => inp.focus(), 300);
  return {
    el: root,
    ready: () => inp.value.trim().length > 0,
    check() {
      inp.disabled = true;
      const v = normAnswer(inp.value, ex.caseSensitive);
      const ok = ex.a.some((a) => normAnswer(a, ex.caseSensitive) === v);
      inp.classList.add(ok ? 'right' : 'wrong');
      return { correct: ok, answer: ex.a[0], almost: !ok && ex.caseSensitive && ex.a.some((a) => normAnswer(a) === normAnswer(inp.value)) };
    },
  };
};

// ---------- Составить предложение ----------
R.order = (ex, ctx) => {
  const rnd = seeded(ctx.seed);
  let bank = shuffle(ex.words.map((w, i) => ({ w, i })), rnd);
  if (bank.map((x) => x.w).join(' ') === ex.words.join(' ') && bank.length > 1) bank = bank.slice(1).concat(bank[0]);
  const picked = [];
  const root = el(`<div class="ex ex-order"><div class="ex-q">${md(ex.q)}</div><div class="order-line"></div><div class="order-bank"></div></div>`);
  const line = root.querySelector('.order-line');
  const bankEl = root.querySelector('.order-bank');
  function draw() {
    line.innerHTML = picked.length ? picked.map((x, j) => `<button type="button" class="chip on" data-j="${j}">${esc(x.w)}</button>`).join('') : '<span class="muted small">Нажимайте на слова по порядку</span>';
    bankEl.innerHTML = bank.map((x) => `<button type="button" class="chip ${picked.includes(x) ? 'used' : ''}" data-i="${x.i}" ${picked.includes(x) ? 'disabled' : ''}>${esc(x.w)}</button>`).join('');
    line.querySelectorAll('.chip').forEach((b) => b.onclick = () => { if (root.classList.contains('locked')) return; picked.splice(+b.dataset.j, 1); draw(); ctx.changed(); });
    bankEl.querySelectorAll('.chip').forEach((b) => b.onclick = () => { if (root.classList.contains('locked')) return; picked.push(bank.find((x) => x.i === +b.dataset.i)); draw(); ctx.changed(); });
  }
  draw();
  return {
    el: root,
    ready: () => picked.length === bank.length,
    check() {
      root.classList.add('locked');
      const v = normAnswer(picked.map((x) => x.w).join(' '));
      const ok = ex.a.some((a) => normAnswer(a) === v);
      line.classList.add(ok ? 'right' : 'wrong');
      return { correct: ok, answer: ex.a[0] };
    },
  };
};

// ---------- Соединить пары ----------
R.match = (ex, ctx) => {
  const rnd = seeded(ctx.seed);
  const left = shuffle(ex.pairs.map((p, i) => ({ t: p[0], i })), rnd);
  const right = shuffle(ex.pairs.map((p, i) => ({ t: p[1], i })), rnd);
  const root = el(`<div class="ex ex-match"><div class="ex-q">${md(ex.q || 'Соедините пары')}</div>
    <div class="match-grid"><div class="mcol">${left.map((x) => `<button type="button" class="mitem" data-side="l" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
    <div class="mcol">${right.map((x) => `<button type="button" class="mitem" data-side="r" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div></div>`);
  let selL = null, selR = null, mistakes = 0, done = 0;
  const latin = (s) => /[a-z]/i.test(s) && !/[а-я]/i.test(s);
  function tryPair() {
    if (!selL || !selR) return;
    const a = selL, b = selR; selL = selR = null;
    if (a.dataset.i === b.dataset.i) {
      a.classList.add('matched'); b.classList.add('matched'); a.disabled = b.disabled = true;
      a.classList.remove('sel'); b.classList.remove('sel');
      done += 1;
      if (done === ex.pairs.length) setTimeout(() => ctx.finish({ correct: mistakes <= 1, note: mistakes ? `Ошибок: ${mistakes}` : 'Без единой ошибки!' }), 250);
    } else {
      mistakes += 1;
      a.classList.add('bad'); b.classList.add('bad');
      setTimeout(() => { a.classList.remove('bad', 'sel'); b.classList.remove('bad', 'sel'); }, 450);
    }
  }
  root.querySelectorAll('.mitem').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    if (latin(b.textContent)) speak(b.textContent);
    const side = b.dataset.side;
    root.querySelectorAll(`.mitem[data-side="${side}"]`).forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    if (side === 'l') selL = b; else selR = b;
    tryPair();
  }));
  return { el: root, auto: true };
};

// ---------- Найти ошибку ----------
R.error = (ex, ctx) => {
  const root = el(`<div class="ex ex-error"><div class="ex-q">${md(ex.q)}</div>
    <div class="tokens ${ex.tokens.some((t) => t.length > 14) ? 'col' : ''}">${ex.tokens.map((t, i) => `<button type="button" class="chip tok" data-i="${i}">${esc(t)}</button>`).join('')}</div></div>`);
  let sel = null;
  root.querySelectorAll('.tok').forEach((b) => b.onclick = () => {
    if (root.classList.contains('locked')) return;
    root.querySelectorAll('.tok').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel'); sel = +b.dataset.i; ctx.changed();
  });
  return {
    el: root,
    ready: () => sel !== null,
    check() {
      root.classList.add('locked');
      const ok = sel === ex.a;
      root.querySelector(`.tok[data-i="${ex.a}"]`).classList.add('wrong-token');
      if (!ok) root.querySelector(`.tok[data-i="${sel}"]`).classList.add('wrong');
      return { correct: ok, answer: ex.fix ? `Ошибка: «${ex.tokens[ex.a]}». Правильно: ${ex.fix}` : `Ошибка: ${ex.tokens[ex.a]}` };
    },
  };
};

// ---------- Написать самостоятельно ----------
R.write = (ex, ctx) => {
  const root = el(`<div class="ex ex-write"><div class="ex-q">${md(ex.q)}</div>
    <textarea class="field" rows="3" autocapitalize="sentences" spellcheck="false" placeholder="Пишите по-английски"></textarea></div>`);
  const ta = root.querySelector('textarea');
  ta.addEventListener('input', () => ctx.changed());
  return {
    el: root,
    ready: () => ta.value.trim().length >= 3,
    check() {
      ta.disabled = true;
      const v = normAnswer(ta.value);
      const letters = v.replace(/[^a-zа-я]/gi, '');
      const latinShare = letters ? letters.replace(/[^a-z]/gi, '').length / letters.length : 0;
      const ok = latinShare > 0.8 && (ex.need || []).every((r) => new RegExp(r, 'i').test(v));
      ta.classList.add(ok ? 'right' : 'wrong');
      return { correct: ok, answer: `Пример: ${ex.sample}`, note: ok ? `Отлично! Пример другого ответа: ${ex.sample}` : (latinShare <= 0.8 ? 'Напишите ответ английскими буквами.' : '') };
    },
  };
};

// ---------- Чтение текста с вопросами ----------
R.read = (ex, ctx) => {
  const root = el(`<div class="ex ex-read">
    <div class="read-text"><div class="row between"><b>Прочитайте текст</b>${sayBtn(ex.text.replace(/—/g, ''))}</div>
    <p class="en-text">${esc(ex.text).replace(/\n/g, '<br>')}</p>
    ${ex.textRu ? `<button type="button" class="link tr-btn">${icon('eye')} Показать перевод</button><p class="ru-text hidden">${esc(ex.textRu).replace(/\n/g, '<br>')}</p>` : ''}</div>
    ${ex.qs.map((q, qi) => `<div class="read-q" data-q="${qi}"><div class="ex-q small">${md(q.q)}</div><div class="opts compact">${q.opts.map((o, i) => `<button type="button" class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div></div>`).join('')}
  </div>`);
  bindSay(root);
  const tb = root.querySelector('.tr-btn');
  if (tb) tb.onclick = () => { root.querySelector('.ru-text').classList.toggle('hidden'); };
  const ans = ex.qs.map(() => null);
  root.querySelectorAll('.read-q').forEach((qEl) => {
    const qi = +qEl.dataset.q;
    qEl.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
      if (root.classList.contains('locked')) return;
      qEl.querySelectorAll('.opt').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel'); ans[qi] = +b.dataset.i; ctx.changed();
    });
  });
  return {
    el: root,
    ready: () => ans.every((a) => a !== null),
    check() {
      root.classList.add('locked');
      let ok = true;
      ex.qs.forEach((q, qi) => {
        const qEl = root.querySelector(`.read-q[data-q="${qi}"]`);
        qEl.querySelector(`.opt[data-i="${q.a}"]`).classList.add('right');
        if (ans[qi] !== q.a) { ok = false; qEl.querySelector(`.opt[data-i="${ans[qi]}"]`).classList.add('wrong'); }
      });
      return { correct: ok, answer: ex.qs.map((q) => `${q.q} — ${q.opts[q.a]}`).join('\n') };
    },
  };
};

// ---------- Общие части для задач с кодом ----------
function hintsBlock(ex) {
  return `<div class="code-help"><button type="button" class="btn ghost sm hint-next">${icon('bulb')} Подсказка <span class="hint-count">0/${(ex.hints || []).length}</span></button>
    <button type="button" class="btn ghost sm sol-btn hidden">${icon('eye')} Показать решение</button></div><div class="hints"></div>`;
}
function bindHints(root, ex, getFails, onSolution) {
  let shown = 0;
  const btn = root.querySelector('.hint-next');
  const box = root.querySelector('.hints');
  const solBtn = root.querySelector('.sol-btn');
  btn.onclick = () => {
    if (shown >= (ex.hints || []).length) { toast(getFails() >= 2 ? 'Подсказки закончились — можно посмотреть решение' : 'Подсказки закончились. Попробуйте ещё раз!'); if (getFails() >= 2) solBtn.classList.remove('hidden'); return; }
    box.insertAdjacentHTML('beforeend', `<div class="hint">${icon('bulb')}<span>${md(ex.hints[shown])}</span></div>`);
    shown += 1;
    root.querySelector('.hint-count').textContent = `${shown}/${ex.hints.length}`;
  };
  solBtn.onclick = onSolution;
  return { revealSolutionButton() { solBtn.classList.remove('hidden'); } };
}

// ---------- Python ----------
R.py = (ex, ctx) => {
  const key = ctx.codeKey;
  const saved = key ? state.code[key] : null;
  const root = el(`<div class="ex ex-code">
    <div class="ex-q">${md(ex.task)}</div>
    <div class="ed-slot"></div>
    <details class="stdin-box" ${ex.stdin ? 'open' : ''}><summary>Ввод для input() <span class="muted small">— каждая строка = один input()</span></summary><textarea class="field mono stdin" rows="2" spellcheck="false" autocapitalize="off"></textarea></details>
    <div class="row gap wrap code-btns">
      <button type="button" class="btn secondary run-btn">${icon('play')} Запустить</button>
      <button type="button" class="btn primary check-btn">${icon('check')} Проверить</button>
    </div>
    <div class="py-status muted small"></div>
    <div class="console hidden"><div class="console-h">Вывод программы</div><pre class="console-out"></pre></div>
    <div class="code-result"></div>
    ${hintsBlock(ex)}
  </div>`);
  const ed = createEditor({ lang: 'py', value: saved ?? ex.starter ?? '', onChange: debounce((v) => { if (key) { state.code[key] = v; save(); } }, 400) });
  root.querySelector('.ed-slot').appendChild(ed.root);
  const stdin = root.querySelector('.stdin');
  stdin.value = ex.stdin || '';
  const out = root.querySelector('.console-out');
  const consoleBox = root.querySelector('.console');
  const result = root.querySelector('.code-result');
  const status = root.querySelector('.py-status');
  let fails = 0, usedSolution = false, finished = false;
  const unsub = onPyStatus((s) => { status.textContent = s === 'loading' ? 'Загружаю Python… (первый раз может занять несколько секунд)' : s === 'error' ? 'Python не загрузился. Перезапустите приложение.' : ''; });
  warmPython();

  function showErr(res) {
    if (res.timeout) return `<div class="err-box"><b>Программа работала слишком долго</b><p>Выполнение остановлено через несколько секунд. Скорее всего, это бесконечный цикл: проверьте, что условие while когда-нибудь станет ложным.</p></div>`;
    if (res.limit) return `<div class="err-box"><b>Слишком много вывода</b><p>Программа напечатала очень много текста и была остановлена. Возможно, print находится внутри бесконечного цикла.</p></div>`;
    const ex2 = explainError(res.err);
    if (!ex2) return '';
    ed.markLine(ex2.line);
    return `<div class="err-box"><b>${esc(ex2.title)}${ex2.line ? ` — строка ${ex2.line}` : ''}</b><p>${esc(ex2.text)}</p><code class="raw">${esc(ex2.raw)}</code></div>`;
  }
  root.querySelector('.run-btn').onclick = async () => {
    ed.markLine(null);
    result.innerHTML = '';
    consoleBox.classList.remove('hidden');
    out.textContent = '…';
    const inputs = stdin.value === '' ? [] : stdin.value.replace(/\r/g, '').split('\n');
    const res = await runPython(ed.value, { inputs, echo: true });
    out.textContent = res.out || (res.ok ? '(программа ничего не вывела)' : '');
    result.innerHTML = res.ok ? '' : showErr(res);
    ctx.onRun && ctx.onRun(res.ok && !!res.out);
  };
  const hints = bindHints(root, ex, () => fails, () => {
    usedSolution = true;
    result.innerHTML = `<div class="sol-box"><b>Решение</b><p class="muted small">Это один из возможных вариантов. Разберитесь в нём, затем нажмите «Проверить».</p>${codeBlock(ex.solution)}<button type="button" class="btn ghost sm use-sol">Вставить в редактор</button></div>`;
    result.querySelector('.use-sol').onclick = () => { ed.value = ex.solution; if (key) { state.code[key] = ex.solution; save(); } };
    ctx.allowSkip && ctx.allowSkip();
  });
  const checkBtn = root.querySelector('.check-btn');
  checkBtn.onclick = async () => {
    if (finished) return;
    checkBtn.disabled = true;
    ed.markLine(null);
    result.innerHTML = '<div class="muted small">Проверяю на тестах…</div>';
    const r = await checkPython(ex, ed.value);
    checkBtn.disabled = false;
    if (r.pass) {
      finished = true;
      consoleBox.classList.add('hidden');
      const n = (ex.tests || []).length || 1;
      result.innerHTML = `<div class="ok-box">${icon('check')} Все проверки пройдены (${n} из ${n})</div>`;
      unsub();
      ctx.finish({ correct: true, usedSolution, code: true });
      return;
    }
    fails += 1;
    if (fails >= 3) hints.revealSolutionButton();
    const f = r.firstFail;
    let html = '';
    if (f.kind === 'need') html = `<div class="err-box"><b>Почти!</b><p>${esc(f.msg)}</p></div>`;
    else if (f.kind === 'check') html = `<div class="err-box"><b>Проверка не пройдена</b><p>${esc(f.msg)}</p></div>`;
    else if (f.kind === 'output') {
      const inp = f.test.in && f.test.in.length ? `<div class="small muted">Ввод:</div><pre class="mini">${esc(f.test.in.join('\n'))}</pre>` : '';
      html = `<div class="err-box"><b>Вывод не совпадает</b>${inp}<div class="diff"><div><div class="small muted">Ожидалось:</div><pre class="mini">${esc(f.test.out)}</pre></div><div><div class="small muted">Ваша программа вывела:</div><pre class="mini">${esc(f.res.out || '(ничего)')}</pre></div></div><p class="small muted">Проверьте каждый символ: пробелы, запятые, регистр букв.</p></div>`;
    } else html = showErr(f.res);
    result.innerHTML = html;
  };
  return { el: root, auto: true, destroy: unsub };
};

// ---------- HTML ----------
R.html = (ex, ctx) => {
  const key = ctx.codeKey;
  const saved = key ? state.code[key] : null;
  const root = el(`<div class="ex ex-code">
    <div class="ex-q">${md(ex.task)}</div>
    <div class="ed-slot"></div>
    <div class="preview-box"><div class="preview-h"><span>${icon('eye')} Результат</span><span class="muted small">обновляется сразу</span></div><iframe class="preview" sandbox="allow-scripts" title="Предпросмотр страницы"></iframe></div>
    <div class="row gap wrap code-btns"><button type="button" class="btn primary check-btn">${icon('check')} Проверить</button></div>
    <div class="code-result"></div>
    ${hintsBlock(ex)}
  </div>`);
  const frame = root.querySelector('.preview');
  const update = debounce((v) => { frame.srcdoc = previewDoc(v); }, 300);
  const ed = createEditor({ lang: 'html', value: saved ?? ex.starter ?? '', onChange: (v) => { update(v); if (key) { state.code[key] = v; saveLater(); } } });
  const saveLater = debounce(save, 400);
  root.querySelector('.ed-slot').appendChild(ed.root);
  frame.srcdoc = previewDoc(ed.value);
  const result = root.querySelector('.code-result');
  let fails = 0, usedSolution = false, finished = false;
  const hints = bindHints(root, ex, () => fails, () => {
    usedSolution = true;
    result.innerHTML = `<div class="sol-box"><b>Решение</b><p class="muted small">Один из правильных вариантов. Можно оформить иначе — проверяется структура, а не точный текст.</p>${codeBlock(ex.solution)}<button type="button" class="btn ghost sm use-sol">Вставить в редактор</button></div>`;
    result.querySelector('.use-sol').onclick = () => { ed.value = ex.solution; frame.srcdoc = previewDoc(ex.solution); if (key) { state.code[key] = ex.solution; save(); } };
    ctx.allowSkip && ctx.allowSkip();
  });
  root.querySelector('.check-btn').onclick = () => {
    if (finished) return;
    const r = checkHTML(ex, ed.value);
    frame.srcdoc = previewDoc(ed.value);
    if (r.pass) {
      finished = true;
      result.innerHTML = `<div class="ok-box">${icon('check')} Все требования выполнены (${r.total} из ${r.total})</div>`;
      ctx.finish({ correct: true, usedSolution, code: true });
      return;
    }
    fails += 1;
    if (fails >= 3) hints.revealSolutionButton();
    const done = r.total - r.fails.length;
    result.innerHTML = `<div class="err-box"><b>Выполнено ${done} из ${r.total} требований</b><ul>${r.fails.slice(0, 3).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>${r.warnings.length ? `<p class="small muted">${r.warnings.map(esc).join('<br>')}</p>` : ''}</div>`;
  };
  return { el: root, auto: true };
};
