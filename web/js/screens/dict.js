// Словарь изученных слов и карточки с интервальным повторением
import { state, save } from '../store.js';
import { esc, pl, shuffle } from '../util.js';
import { icon, sheet } from '../ui.js';
import { speak } from '../tts.js';
import { sections, gradeWord, nextReviewText } from '../srs.js';
import { getLesson } from '../content/index.js';
import { humanDateYear, todayKey } from '../dates.js';
import { recordCards } from '../game.js';
import { go } from '../router.js';

let tab = 'all';
let query = '';
const TABS = [['all', 'Все'], ['due', 'На сегодня'], ['fresh', 'Новые'], ['hard', 'Сложные'], ['fav', 'Избранные'], ['known', 'Изучены']];

export function renderDict(view) {
  function draw() {
    const S = sections();
    const list = (S[tab] || S.all).filter((w) => !query || w.en.toLowerCase().includes(query) || w.ru.toLowerCase().includes(query)).sort((a, b) => a.en.localeCompare(b.en));
    view.innerHTML = `<div class="page dict">
      <header class="page-h"><button class="icon-btn back-btn" aria-label="Назад">${icon('back')}</button><h1>Словарь</h1></header>
      <button class="continue" data-cards>${icon('cards')}<span class="c-txt"><b>Карточки</b><span>${S.due.length ? `${pl(S.due.length, ['слово', 'слова', 'слов'])} на повторение сегодня` : 'Повторение по желанию'}</span></span>${icon('chev')}</button>
      <input class="field search" type="search" placeholder="Поиск по словам" value="${esc(query)}">
      <div class="seg scroll">${TABS.map(([id, l]) => `<button class="seg-b ${tab === id ? 'on' : ''}" data-t="${id}">${l} <span class="cnt">${S[id].length}</span></button>`).join('')}</div>
      ${list.length ? `<div class="wordlist">${list.map((w) => `<div class="word" data-en="${esc(w.en)}"><button class="say" data-say="${esc(w.en)}" aria-label="Прослушать">${icon('volume')}</button><div class="w-main"><b>${esc(w.en)}</b> <span class="tr">${esc(w.tr)}</span><div class="ru">${esc(w.ru)}</div></div><span class="small muted nowrap">${nextReviewText(w)}</span><button class="icon-btn fav ${w.fav ? 'on' : ''}" aria-label="Избранное">${icon(w.fav ? 'star-f' : 'star')}</button></div>`).join('')}</div>`
        : `<p class="muted pad">${Object.keys(state.words).length ? 'В этом разделе пока пусто.' : 'Слова появятся здесь после первых уроков английского.'}</p>`}
    </div>`;
    view.querySelector('.back-btn').onclick = () => history.back();
    view.querySelector('[data-cards]').onclick = () => go('#/cards');
    const s = view.querySelector('.search');
    s.oninput = () => { query = s.value.trim().toLowerCase(); const pos = s.selectionStart; draw(); const n = view.querySelector('.search'); n.focus(); n.setSelectionRange(pos, pos); };
    view.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { tab = b.dataset.t; draw(); });
    view.querySelectorAll('.word').forEach((row) => {
      const en = row.dataset.en;
      row.querySelector('.say').onclick = (e) => { e.stopPropagation(); speak(en); };
      row.querySelector('.fav').onclick = (e) => { e.stopPropagation(); state.words[en].fav = !state.words[en].fav; save(); draw(); };
      row.onclick = () => wordSheet(en);
    });
  }
  draw();
}

const GRADE = ['Не помню', 'Трудно', 'Хорошо', 'Легко'];
function wordSheet(en) {
  const w = state.words[en];
  const L = getLesson(w.lesson);
  const s = sheet(`<div class="word-sheet"><div class="row between"><div><h2>${esc(en)}</h2><span class="tr">${esc(w.tr)}</span></div><button class="say big" data-say="${esc(en)}">${icon('volume')}</button></div>
    <p class="big-ru">${esc(w.ru)}</p>
    ${w.ex ? `<div class="example"><button class="say" data-say="${esc(w.ex)}">${icon('volume')}</button><div><div class="en">${esc(w.ex)}</div><div class="ru">${esc(w.exRu)}</div></div></div>` : ''}
    <dl class="meta"><dt>Урок</dt><dd>${L ? `${esc(L.title)} (${L.unit.replace('en-', '')})` : '—'}</dd><dt>Впервые изучено</dt><dd>${humanDateYear(w.added)}</dd><dt>Следующее повторение</dt><dd>${nextReviewText(w)}</dd><dt>Повторений</dt><dd>${w.reps}${w.lapses ? `, забыто ${w.lapses} раз` : ''}</dd></dl>
    ${w.hist.length ? `<div class="hist">${w.hist.slice(-12).map((h) => `<span class="h g${h.g}" title="${h.d}: ${GRADE[h.g]}"></span>`).join('')}</div><p class="small muted">История последних повторений: красный — не помню, зелёный — легко.</p>` : ''}
    <button class="btn primary block" data-close>Закрыть</button></div>`);
  s.root.querySelectorAll('[data-say]').forEach((b) => b.onclick = () => speak(b.dataset.say));
}

// ---------- Карточки ----------
export function renderCards(view) {
  const S = sections();
  let queue = S.due.length ? shuffle(S.due).slice(0, 20) : [];
  let mode = 'due';
  let reverse = false;
  let reviewed = 0;
  const graded = [];

  function startExtra() {
    const pool = S.hard.length >= 5 ? S.hard : S.all;
    queue = shuffle(pool).slice(0, 10);
    mode = 'extra';
    show();
  }

  function finish() {
    view.innerHTML = `<div class="player"><div class="pl-body"><div class="summary"><div class="sum-badge">${reviewed ? '🧠' : '🌿'}</div>
      <h2>${reviewed ? 'Повторение завершено' : 'На сегодня всё повторено'}</h2>
      <p class="muted">${reviewed ? `Вы повторили ${pl(reviewed, ['слово', 'слова', 'слов'])}. Слова, которые вы помните хорошо, вернутся реже, а трудные — скорее.` : Object.keys(state.words).length ? 'Новые слова для повторения появятся завтра. Можно потренироваться дополнительно.' : 'Сначала пройдите урок английского — слова из него появятся в карточках.'}</p></div></div>
      <footer class="pl-foot"><div class="col gap">${Object.keys(state.words).length >= 3 ? '<button class="btn secondary block extra">Потренироваться ещё (без влияния на расписание)</button>' : ''}<button class="btn primary block done">Готово</button></div></footer></div>`;
    const ex = view.querySelector('.extra');
    if (ex) ex.onclick = startExtra;
    view.querySelector('.done').onclick = () => history.length > 1 ? history.back() : go('#/home');
  }

  function show() {
    if (!queue.length) return finish();
    const w = queue[0];
    const front = reverse ? `<div class="big-ru">${esc(w.ru)}</div>` : `<div class="card-en">${esc(w.en)}</div><div class="tr">${esc(w.tr)}</div>`;
    view.innerHTML = `<div class="player">
      <header class="pl-head"><button class="icon-btn pl-close" aria-label="Закрыть">${icon('x')}</button><div class="bar pl-bar"><i style="width:${Math.round((reviewed / (reviewed + queue.length)) * 100)}%"></i></div><button class="btn ghost sm flipmode">${reverse ? 'RU → EN' : 'EN → RU'}</button></header>
      <div class="pl-body"><div class="flash ${mode === 'extra' ? 'extra' : ''}"><div class="flash-face">${front}<button class="say big" aria-label="Прослушать">${icon('volume')}</button></div>
        <div class="flash-back hidden">${reverse ? `<div class="card-en">${esc(w.en)}</div><div class="tr">${esc(w.tr)}</div>` : `<div class="big-ru">${esc(w.ru)}</div>`}${w.ex ? `<div class="w-ex">${esc(w.ex)}<br><span class="muted">${esc(w.exRu)}</span></div>` : ''}</div></div>
        <p class="muted small center">${mode === 'extra' ? 'Тренировка: ответы не меняют расписание повторений' : 'Вспомните перевод, затем откройте карточку и честно оцените себя'}</p></div>
      <footer class="pl-foot"><button class="btn primary block lg reveal">Показать ответ</button></footer></div>`;
    view.querySelector('.pl-close').onclick = () => { if (graded.length) recordCards(0, []); history.length > 1 ? history.back() : go('#/home'); };
    view.querySelector('.flipmode').onclick = () => { reverse = !reverse; show(); };
    view.querySelector('.say').onclick = () => speak(w.en);
    if (!reverse) setTimeout(() => speak(w.en), 250);
    view.querySelector('.reveal').onclick = () => {
      view.querySelector('.flash-back').classList.remove('hidden');
      view.querySelector('.flash').classList.add('open');
      if (reverse) speak(w.en);
      const foot = view.querySelector('.pl-foot');
      foot.innerHTML = `<div class="grades">${GRADE.map((g, i) => `<button class="grade g${i}" data-g="${i}">${g}</button>`).join('')}</div>`;
      foot.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
        const g = +b.dataset.g;
        if (mode === 'due') gradeWord(w.en, g);
        reviewed += 1;
        graded.push(w.en);
        recordCards(1, [w.en]);
        queue.shift();
        if (g === 0 && mode === 'due') { queue.push({ ...state.words[w.en], en: w.en }); } // забытое — ещё раз в конце
        show();
      });
    };
  }
  void todayKey;
  show();
}
