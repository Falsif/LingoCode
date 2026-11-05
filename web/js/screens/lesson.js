// Прохождение урока, проекта или теста: шаги, проверка, обратная связь, итог.
import { state, save } from '../store.js';
import { esc, md, seeded, shuffle, pl } from '../util.js';
import { el, icon, confirmBox, toast } from '../ui.js';
import { speak } from '../tts.js';
import { renderExercise, typeLabel, bindSay } from '../exercises.js';
import { getLesson, getUnit } from '../content/index.js';
import { completeLesson, completeTest, recordExercise, recordPractice, recordRun, recordCodeSuccess, nextLesson, lessonDone } from '../game.js';
import { addWord } from '../srs.js';
import { todayKey } from '../dates.js';
import { go } from '../router.js';

// ---------- Теория ----------
export function renderTheory(blocks) {
  return blocks.map((b) => {
    if (b.t === 'p') return `<p>${md(b.text)}</p>`;
    if (b.t === 'tip') return `<div class="tip">${icon('bulb')}<div>${md(b.text)}</div></div>`;
    if (b.t === 'code') return `<pre class="code-view ${b.lang === 'html' ? 'lang-html' : ''}"><code>${esc(b.code)}</code></pre>`;
    if (b.t === 'ex') return `<div class="example"><button type="button" class="say" data-say="${esc(b.en.replace(/\s+—\s+/g, ', '))}" aria-label="Прослушать">${icon('volume')}</button><div><div class="en">${esc(b.en)} ${b.tr ? `<span class="tr">${esc(b.tr)}</span>` : ''}</div><div class="ru">${esc(b.ru)}</div></div></div>`;
    if (b.t === 'letters') return `<div class="letters">${b.items.map((x) => `<button type="button" class="letter" data-say="${esc(x.say)}"><span class="L">${esc(x.l)}</span><span class="n">«${esc(x.name)}» ${esc(x.tr)}</span><span class="w">${esc(x.w)}</span></button>`).join('')}</div>`;
    if (b.t === 'table') return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c, i) => `<td>${b.say === i ? `<button type="button" class="say xs" data-say="${esc(c)}">${icon('volume')}</button> ` : ''}${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return '';
  }).join('');
}

// ---------- Построение шагов ----------
function reviewSteps(L, rnd) {
  if (L.course !== 'en') return [];
  const pool = Object.entries(state.words).filter(([, w]) => w.lesson !== L.id);
  if (pool.length < 3) return [];
  const pick = shuffle(pool, rnd).slice(0, 2);
  return pick.map(([en, w], i) => {
    const others = shuffle(pool.filter(([e]) => e !== en), rnd).slice(0, 2).map(([, o]) => o.ru);
    const opts = [w.ru, ...others];
    return i === 0
      ? { k: 'choice', q: `Повторение: как переводится **${en}**?`, say: en, opts, a: 0, why: `${en} — ${w.ru}` }
      : { k: 'listen', say: en, q: 'Повторение: что вы услышали?', opts, a: 0, why: `${en} — ${w.ru}` };
  });
}

function lessonSteps(L) {
  const rnd = seeded(L.id + todayKey());
  const s = [];
  s.push({ t: 'theory' });
  if (L.words && L.words.length) s.push({ t: 'words' });
  L.exercises.forEach((ex, i) => s.push({ t: 'ex', ex, phase: 'ex', key: `${L.id}:${i}` }));
  const rev = reviewSteps(L, rnd);
  rev.forEach((ex, i) => s.push({ t: 'ex', ex, phase: 'review', key: `${L.id}:r${i}`, noXp: true }));
  if (L.quiz && L.quiz.length) {
    s.push({ t: 'phase', title: 'Мини-тест', text: `${pl(L.quiz.length, ['вопрос', 'вопроса', 'вопросов'])} по уроку. Отвечайте сами — подсказок не будет.` });
    L.quiz.forEach((ex, i) => s.push({ t: 'ex', ex, phase: 'quiz', key: `${L.id}:q${i}` }));
  }
  s.push({ t: 'summary' });
  s.forEach((x, i) => { x.bi = i; });
  return s;
}

// Итоговый тест юнита: вопросы мини-тестов и упражнений всех уроков + задачи с кодом
export function unitTestSteps(unit, attempt) {
  const rnd = seeded(unit.id + ':' + attempt);
  const simple = [];
  const code = [];
  for (const l of unit.lessons) {
    for (const q of l.quiz || []) simple.push(q);
    for (const e of l.exercises) {
      if (['choice', 'input', 'listen', 'error'].includes(e.k)) simple.push(e);
      if ((e.k === 'py' || e.k === 'html') && (e.tests ? e.tests.some((t) => t.in && t.in.length) || e.check : (e.checks || []).length >= 3)) code.push(e);
    }
  }
  const items = shuffle(simple, rnd).slice(0, unit.course === 'en' ? 20 : 15).concat(shuffle(code, rnd).slice(0, unit.course === 'en' ? 0 : 2));
  const s = [{ t: 'phase', title: `Итоговый тест: ${unit.title}`, text: `${pl(items.length, ['задание', 'задания', 'заданий'])}. Для прохождения нужно ${unit.pass || 80}% правильных ответов. Если не получится — ничего страшного: повторите сложные темы и попробуйте снова.` }];
  items.forEach((ex, i) => s.push({ t: 'ex', ex, phase: 'quiz', key: null, noXp: true, tkey: `${unit.id}:t${i}` }));
  s.push({ t: 'summary' });
  s.forEach((x, i) => { x.bi = i; });
  return s;
}

// ---------- Плеер ----------
export function runSteps(view, cfg) {
  const { steps, title, mode } = cfg;
  let idx = Math.min(cfg.startBi ? steps.findIndex((s) => s.bi >= cfg.startBi) : 0, steps.length - 1);
  if (idx < 0) idx = 0;
  const res = { exTotal: 0, exCorrect: 0, quizTotal: 0, quizCorrect: 0, wrong: [], xpStart: state.xp };
  const retried = new Set();
  let current = null;

  view.innerHTML = `<div class="player">
    <header class="pl-head"><button class="icon-btn pl-close" aria-label="Выйти">${icon('x')}</button><div class="bar pl-bar"><i></i></div><span class="pl-count small muted"></span></header>
    <div class="pl-body"></div>
    <footer class="pl-foot"></footer>
  </div>`;
  const body = view.querySelector('.pl-body');
  const foot = view.querySelector('.pl-foot');
  view.querySelector('.pl-close').onclick = async () => {
    const st = steps[idx];
    if (cfg.onExit) return cfg.onExit();
    if (st.t === 'summary') return go(cfg.exitTo || '#/learn');
    const msg = mode === 'lesson' ? 'Место в уроке сохранится — вы сможете продолжить с этого шага.' : 'Результат этой попытки не будет засчитан.';
    if (await confirmBox('Выйти?', msg, 'Выйти')) go(cfg.exitTo || '#/learn');
  };

  function persist() {
    if (mode !== 'lesson') return;
    const st = steps[idx];
    state.session = st.t === 'summary' ? null : { lessonId: cfg.lessonId, bi: st.bi, at: Date.now() };
    save();
  }

  function setProgress() {
    const total = steps.length - 1;
    view.querySelector('.pl-bar i').style.width = `${Math.round((idx / total) * 100)}%`;
    const exSteps = steps.filter((s) => s.t === 'ex');
    const n = exSteps.indexOf(steps[idx]);
    view.querySelector('.pl-count').textContent = n >= 0 ? `${n + 1}/${exSteps.length}` : '';
  }

  function next() {
    if (current && current.destroy) current.destroy();
    idx = Math.min(idx + 1, steps.length - 1);
    show();
  }

  function footButton(label, onClick, cls = 'primary', disabled = false) {
    foot.innerHTML = `<button class="btn ${cls} block lg">${label}</button>`;
    const b = foot.querySelector('button');
    b.disabled = disabled;
    b.onclick = onClick;
    return b;
  }

  function feedback(st, r) {
    const ok = r.correct;
    const why = st.ex.why ? md(st.ex.why) : '';
    let ansHtml = '';
    if (!ok && r.answer) ansHtml = `<div class="fb-ans">${r.skipped ? '' : 'Правильный ответ: '}<b>${esc(r.answer).replace(/\n/g, '<br>')}</b></div>`;
    const note = r.note ? `<div class="small">${esc(r.note)}</div>` : '';
    const title = ok ? (r.usedSolution ? 'Решено с подсказкой' : ['Верно!', 'Отлично!', 'Так держать!', 'Правильно!'][Math.floor(Math.random() * 4)]) : r.skipped ? 'Задание пропущено' : r.almost ? 'Почти! Обратите внимание на заглавную букву' : 'Не совсем';
    foot.innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><div class="fb-title">${icon(ok ? 'check' : 'x')} ${title}${r.xp ? `<span class="fb-xp">+${r.xp} XP</span>` : ''}</div>${note}${ansHtml}${why && (!ok || st.phase !== 'quiz') ? `<div class="fb-why">${why}</div>` : ''}<button class="btn ${ok ? 'success' : 'danger'} block lg fb-next">Дальше</button></div>`;
    foot.querySelector('.fb-next').onclick = next;
    foot.querySelector('.fb-next').focus({ preventScroll: true });
  }

  function onResult(st, r) {
    // учёт результата
    const firstTry = !r.usedSolution && !r.skipped;
    if (st.phase === 'quiz') { res.quizTotal += 1; if (r.correct && firstTry) res.quizCorrect += 1; }
    else { res.exTotal += 1; if (r.correct) res.exCorrect += 1; }
    if (!r.correct && !r.skipped) res.wrong.push(st.ex);
    r.xp = 0;
    const course = cfg.course;
    if (r.correct && firstTry && !st.noXp && st.key) {
      const before = state.xp;
      recordExercise(cfg.lessonId, st.key.split(':')[1], course, true);
      r.xp = state.xp - before;
    } else if (r.correct) recordPractice(course);
    if (r.code && r.correct) { recordCodeSuccess(st.ex.k); save(); }
    // ошибочное упражнение повторяем один раз в конце блока упражнений
    if (!r.correct && st.phase === 'ex' && !r.skipped && !['py', 'html', 'match'].includes(st.ex.k) && !retried.has(st.key)) {
      retried.add(st.key);
      const insertAt = steps.findIndex((s, i) => i > idx && s.phase !== 'ex' && s.phase !== 'retry');
      const copy = { ...st, phase: 'retry', bi: steps[insertAt].bi, noXp: true, seedSalt: 'r' };
      steps.splice(insertAt, 0, copy);
    }
    feedback(st, r);
  }

  function show() {
    const st = steps[idx];
    window.__lcStep = st; // для автотестов
    setProgress();
    persist();
    body.scrollTop = 0;
    current = null;
    if (st.t === 'theory') {
      const L = cfg.lesson;
      body.innerHTML = `<div class="theory"><div class="kicker">${L.kind === 'project' ? 'Практический проект' : 'Урок'}</div><h2>${esc(L.title)}</h2><p class="goal">${icon('target')} ${esc(L.goal)}</p>${renderTheory(L.theory)}</div>`;
      bindSay(body);
      footButton(L.exercises.length ? 'К упражнениям' : 'Дальше', next);
    } else if (st.t === 'words') {
      const L = cfg.lesson;
      body.innerHTML = `<div class="theory"><div class="kicker">Новые слова</div><h2>${pl(L.words.length, ['слово', 'слова', 'слов'])}</h2><p class="muted">Нажмите на слово, чтобы услышать произношение. Звёздочка добавляет слово в избранное.</p>
        <div class="wordlist">${L.words.map((w) => `<div class="word" data-say="${esc(w.en)}"><div class="w-main"><b>${esc(w.en)}</b> <span class="tr">${esc(w.tr)}</span><div class="ru">${esc(w.ru)}</div>${w.ex ? `<div class="w-ex">${esc(w.ex)} <span class="muted">— ${esc(w.exRu)}</span></div>` : ''}</div><button type="button" class="icon-btn fav ${state.words[w.en] && state.words[w.en].fav ? 'on' : ''}" data-en="${esc(w.en)}" aria-label="В избранное">${icon(state.words[w.en] && state.words[w.en].fav ? 'star-f' : 'star')}</button></div>`).join('')}</div></div>`;
      body.querySelectorAll('.word').forEach((w) => w.addEventListener('click', () => speak(w.dataset.say)));
      body.querySelectorAll('.fav').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const w = L.words.find((x) => x.en === b.dataset.en);
        addWord(w, L.id);
        const rec = state.words[w.en];
        rec.fav = !rec.fav; save();
        b.classList.toggle('on', rec.fav);
        b.innerHTML = icon(rec.fav ? 'star-f' : 'star');
      }));
      footButton('Я посмотрел(а) слова', next);
    } else if (st.t === 'phase') {
      body.innerHTML = `<div class="phase-card"><div class="phase-ic">${icon('target')}</div><h2>${esc(st.title)}</h2><p class="muted">${esc(st.text)}</p></div>`;
      footButton('Начать', next);
    } else if (st.t === 'ex') {
      const label = st.phase === 'quiz' ? 'Мини-тест' : st.phase === 'review' ? 'Повторение' : st.phase === 'retry' ? 'Исправляем ошибку' : typeLabel(st.ex);
      body.innerHTML = `<div class="ex-wrap"><div class="kicker">${esc(label)}</div></div>`;
      let skipAllowed = false;
      const ctx = {
        seed: (st.key || st.tkey || 'x') + (st.seedSalt || ''),
        codeKey: st.key ? 'lesson:' + st.key : null,
        changed() { const b = foot.querySelector('.btn.check'); if (b && current && current.ready) b.disabled = !current.ready(); },
        submit() { const b = foot.querySelector('.btn.check'); if (b && !b.disabled) b.click(); },
        finish(r) { onResult(st, r); },
        onRun(ok) { recordRun(ok); },
        allowSkip() {
          if (skipAllowed) return; skipAllowed = true;
          foot.innerHTML = '<button class="btn ghost block">Пропустить задание</button>';
          foot.querySelector('button').onclick = () => onResult(st, { correct: false, skipped: true, answer: 'Можно вернуться к нему позже, повторив урок.' });
        },
      };
      current = renderExercise(st.ex, ctx);
      body.querySelector('.ex-wrap').appendChild(current.el);
      if (current.auto) foot.innerHTML = '';
      else {
        const b = footButton('Проверить', () => { const r = current.check(); onResult(st, r); }, 'primary check', true);
        b.classList.add('check');
      }
    } else if (st.t === 'summary') {
      foot.innerHTML = '';
      cfg.onSummary(body, foot, res);
    }
  }
  show();
}

// ---------- Экран урока ----------
export function renderLesson(view, id) {
  const L = getLesson(id);
  if (!L) { view.innerHTML = '<p class="pad">Урок не найден.</p>'; return; }
  const steps = lessonSteps(L);
  const startBi = state.session && state.session.lessonId === id ? state.session.bi : 0;
  runSteps(view, {
    mode: 'lesson', lesson: L, lessonId: id, course: L.course, title: L.title, steps, startBi, exitTo: `#/learn/${L.course}`,
    onSummary(body, foot, res) {
      const quizPct = res.quizTotal ? Math.round((res.quizCorrect / res.quizTotal) * 100) : 100;
      const wasDone = lessonDone(id);
      const { added } = completeLesson(id, { quizPct });
      const gained = state.xp - res.xpStart;
      const nxt = nextLesson(L.course);
      body.innerHTML = `<div class="summary">
        <div class="sum-badge">${quizPct >= 80 ? '🎉' : quizPct >= 50 ? '👍' : '💪'}</div>
        <h2>${L.kind === 'project' ? 'Проект завершён!' : 'Урок пройден!'}</h2><p class="muted">${esc(L.title)}</p>
        <div class="sum-grid">
          <div class="sum-tile"><b>+${gained}</b><span>XP</span></div>
          ${res.quizTotal ? `<div class="sum-tile"><b>${quizPct}%</b><span>мини-тест</span></div>` : `<div class="sum-tile"><b>${res.exCorrect}/${res.exTotal}</b><span>заданий</span></div>`}
          ${L.words ? `<div class="sum-tile"><b>${added}</b><span>${['новое слово', 'новых слова', 'новых слов'][added === 1 ? 0 : added > 1 && added < 5 ? 1 : 2]}</span></div>` : ''}
        </div>
        ${wasDone ? '<p class="small muted">Повторное прохождение: награды за урок уже получены, но повторение укрепляет память и отмечается в плане дня.</p>' : ''}
        ${quizPct < 60 && res.quizTotal ? '<p class="tip-inline">Мини-тест дался непросто — повторите урок завтра, это нормально. Он уже добавлен в список для повторения.</p>' : ''}
        ${res.wrong.length ? `<details class="mistakes"><summary>Ошибки в уроке (${res.wrong.length})</summary>${res.wrong.map((e) => `<div class="mist">${md(e.q || e.task || '')}${e.why ? `<div class="small muted">${md(e.why)}</div>` : ''}</div>`).join('')}</details>` : ''}
      </div>`;
      foot.innerHTML = `<div class="col gap">
        ${nxt ? `<button class="btn primary block lg" data-next>${nxt.test ? 'К итоговому тесту' : 'Следующий урок'} ${icon('arrow')}</button>` : ''}
        <div class="row gap"><button class="btn ghost grow" data-again>${icon('refresh')} Ещё раз</button><button class="btn ghost grow" data-home>${icon('home')} Главная</button></div></div>`;
      const nb = foot.querySelector('[data-next]');
      if (nb) nb.onclick = () => go(nxt.test ? `#/test/${nxt.unit.id}` : `#/lesson/${nxt.id}`);
      foot.querySelector('[data-again]').onclick = () => { state.session = null; renderLesson(view, id); };
      foot.querySelector('[data-home]').onclick = () => go('#/home');
    },
  });
}

// ---------- Итоговый тест юнита ----------
export function renderUnitTest(view, unitId) {
  const unit = getUnit(unitId);
  if (!unit || !unit.lessons) { view.innerHTML = '<p class="pad">Тест не найден.</p>'; return; }
  const attempt = ((state.tests[unitId] && state.tests[unitId].attempts.length) || 0) + 1;
  const steps = unitTestSteps(unit, attempt + todayKey());
  runSteps(view, {
    mode: 'test', lesson: null, lessonId: unitId, course: unit.course, title: unit.title, steps, exitTo: `#/learn/${unit.course}`,
    onSummary(body, foot, res) {
      const pct = res.quizTotal ? Math.round((res.quizCorrect / res.quizTotal) * 100) : 0;
      const { passed } = completeTest(unitId, pct);
      const gained = state.xp - res.xpStart;
      body.innerHTML = `<div class="summary"><div class="sum-badge">${passed ? '🏅' : '📘'}</div>
        <h2>${passed ? 'Тест сдан!' : 'Пока не хватило совсем немного'}</h2>
        <p class="muted">${esc(unit.title)}: ${res.quizCorrect} из ${res.quizTotal} правильно</p>
        <div class="sum-grid"><div class="sum-tile"><b>${pct}%</b><span>результат</span></div><div class="sum-tile"><b>${unit.pass || 80}%</b><span>порог</span></div><div class="sum-tile"><b>+${gained}</b><span>XP</span></div></div>
        ${passed ? (unit.course === 'en' ? '<p>Уровень завершён. Следующий уровень откроется, как только будет готов его контент — следите за обновлениями.</p>' : '<p>Вы освоили основы! Продолжайте практиковаться в песочнице и проектах.</p>')
          : '<p>Рекомендуем повторить уроки с ошибками ниже и попробовать снова — количество попыток не ограничено, новые вопросы будут в другом порядке.</p>'}
        ${res.wrong.length ? `<details class="mistakes" ${passed ? '' : 'open'}><summary>Ошибки (${res.wrong.length})</summary>${res.wrong.map((e) => `<div class="mist">${md(e.q || e.task || '')}${e.why ? `<div class="small muted">${md(e.why)}</div>` : ''}</div>`).join('')}</details>` : ''}
      </div>`;
      foot.innerHTML = `<div class="row gap">${passed ? '' : `<button class="btn primary grow" data-again>${icon('refresh')} Ещё попытка</button>`}<button class="btn ${passed ? 'primary' : 'ghost'} grow" data-back>К урокам</button></div>`;
      const a = foot.querySelector('[data-again]');
      if (a) a.onclick = () => renderUnitTest(view, unitId);
      foot.querySelector('[data-back]').onclick = () => go(`#/learn/${unit.course}`);
    },
  });
}

// ---------- Диагностический тест английского (первый запуск) ----------
const PLACEMENT = [
  { k: 'choice', lvl: 'A0', q: 'Как называется буква **H**?', opts: ['эйч', 'аш', 'хэ'], a: 0 },
  { k: 'listen', lvl: 'A0', say: 'yellow', q: 'Какой цвет вы услышали?', opts: ['жёлтый', 'белый', 'зелёный'], a: 0 },
  { k: 'choice', lvl: 'A0', q: 'Как будет **15**?', opts: ['fifty', 'fifteen', 'five'], a: 1 },
  { k: 'choice', lvl: 'A0', q: 'She ___ my sister.', opts: ['am', 'is', 'are'], a: 1 },
  { k: 'choice', lvl: 'A0', q: '___ apple', opts: ['a', 'an'], a: 1 },
  { k: 'input', lvl: 'A0', q: 'Переведите: **семья**', a: ['family'] },
  { k: 'choice', lvl: 'A1', q: 'He ___ to school every day.', opts: ['go', 'goes', 'going'], a: 1 },
  { k: 'choice', lvl: 'A1', q: 'Look! The children ___ in the garden.', opts: ['play', 'are playing', 'plays'], a: 1 },
  { k: 'choice', lvl: 'A1', q: 'There ___ two cats on the sofa.', opts: ['is', 'are', 'be'], a: 1 },
  { k: 'choice', lvl: 'A2', q: 'Yesterday we ___ a great film.', opts: ['watch', 'watched', 'have watch'], a: 1 },
  { k: 'choice', lvl: 'A2', q: 'This is the ___ day of my life!', opts: ['good', 'better', 'best'], a: 2 },
  { k: 'choice', lvl: 'A2', q: 'You ___ wear a helmet when you ride a bike.', opts: ['should', 'can to', 'must to'], a: 0 },
];
export function renderPlacement(view, onDone, onExit) {
  const steps = [{ t: 'phase', title: 'Диагностика английского', text: '12 коротких вопросов от простых к сложным. Если не знаете ответ — выбирайте наугад или пишите что угодно, это не экзамен.' }];
  PLACEMENT.forEach((ex, i) => steps.push({ t: 'ex', ex, phase: 'quiz', noXp: true, tkey: 'pl' + i }));
  steps.push({ t: 'summary' });
  steps.forEach((x, i) => { x.bi = i; });
  const answers = [];
  runSteps(view, {
    mode: 'placement', steps, course: 'en', exitTo: '#/home', lessonId: 'placement', onExit,
    onSummary(body, foot, res) {
      // в res.wrong — неверно отвеченные; считаем по уровням
      const wrongSet = new Set(res.wrong);
      const score = (lvl) => PLACEMENT.filter((q) => q.lvl === lvl && !wrongSet.has(q)).length;
      const a0 = score('A0'), a1 = score('A1'), a2 = score('A2');
      let level = 'A0', text;
      if (a0 >= 5 && a1 >= 2 && a2 >= 2) level = 'A2';
      else if (a0 >= 5 && a1 >= 2) level = 'A1';
      else if (a0 >= 5) level = 'A0+';
      if (level === 'A0') text = 'Начнём с самых основ — уровня A0. Так вы ничего не пропустите.';
      else text = `Вы уже знаете основы (примерно ${level === 'A0+' ? 'конец A0' : level}). Все уроки A0 открыты сразу — можно пройти их выборочно и сдать итоговый тест A0. Уровни A1–C2 появятся в следующих обновлениях.`;
      body.innerHTML = `<div class="summary"><div class="sum-badge">🧭</div><h2>Ваш уровень: ${level === 'A0+' ? 'A0 (уверенный)' : level}</h2><p>${esc(text)}</p>
        <div class="sum-grid"><div class="sum-tile"><b>${a0}/6</b><span>A0</span></div><div class="sum-tile"><b>${a1}/3</b><span>A1</span></div><div class="sum-tile"><b>${a2}/3</b><span>A2</span></div></div></div>`;
      foot.innerHTML = '<button class="btn primary block lg">Продолжить</button>';
      foot.querySelector('button').onclick = () => onDone(level);
      void answers;
    },
  });
}
