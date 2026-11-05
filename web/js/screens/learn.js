// Вкладка «Обучение»: курсы, уровни, уроки, проекты, итоговые тесты, инструменты
import { state } from '../store.js';
import { esc } from '../util.js';
import { icon, progressBar, sheet } from '../ui.js';
import { COURSES, COURSE_IDS, getLesson } from '../content/index.js';
import { isUnlocked, lessonDone, unitProgress, unitTestUnlocked, courseLevelLabel } from '../game.js';
import { needsReview, sections } from '../srs.js';
import { go } from '../router.js';

function lessonRow(L, n) {
  const rec = state.lessons[L.id];
  const done = lessonDone(L.id);
  const open = isUnlocked(L);
  const review = needsReview(rec);
  const cls = done ? (review ? 'review' : 'done') : open ? 'open' : 'locked';
  const badge = done ? (review ? icon('refresh') : icon('check')) : open ? (L.kind === 'project' ? icon('code') : String(n)) : icon('lock');
  const sub = L.kind === 'project' && !open ? `Откроется после урока «${getLesson(L.after).title}»` : review ? 'Пора повторить' : L.goal;
  return `<button class="lesson-row ${cls}" data-id="${L.id}" ${open ? '' : 'data-locked="1"'}><span class="lr-badge">${badge}</span><span class="lr-txt"><b>${esc(L.title)}</b><span class="small muted">${esc(sub)}</span></span>${open ? icon('chev') : ''}</button>`;
}

export function renderLearn(view, params) {
  const enabled = COURSE_IDS.filter((c) => state.profile.courses[c]);
  const tab = params.course && COURSES[params.course] ? params.course : enabled[0] || 'en';
  const C = COURSES[tab];
  const dueWords = sections().due.length;

  const tools = {
    en: [['#/dict', 'book', 'Словарь', `${Object.keys(state.words).length} слов`], ['#/cards', 'cards', 'Карточки', dueWords ? `${dueWords} на сегодня` : 'повторение']],
    py: [['#/sandbox/py', 'code', 'Песочница Python', 'пишите свои программы']],
    html: [['#/sandbox/html', 'eye', 'Песочница HTML', 'свои страницы']],
  }[tab];

  view.innerHTML = `<div class="page learn">
    <h1>Обучение</h1>
    <div class="seg">${COURSE_IDS.map((c) => `<button class="seg-b ${c === tab ? 'on' : ''} ${state.profile.courses[c] ? '' : 'off'}" data-tab="${c}">${COURSES[c].emoji} ${COURSES[c].title}</button>`).join('')}</div>
    ${state.profile.courses[tab] ? '' : `<p class="note">Это направление не выбрано в плане — его уроки доступны, но не попадают в задания дня. Включить можно в профиле.</p>`}
    <div class="tools">${tools.map(([h, ic, t, s]) => `<button class="tool" data-go="${h}">${icon(ic)}<span><b>${t}</b><span class="small muted">${s}</span></span></button>`).join('')}</div>
    <div class="level-now muted small">Текущий уровень: <b>${esc(courseLevelLabel(tab))}</b></div>
    ${C.units.map((u) => {
      if (!u.lessons) {
        return `<section class="unit soon"><div class="unit-h"><span class="unit-code">${esc(u.code)}</span><div><b>${esc(u.title)}</b><div class="small muted">${esc(u.desc)}</div></div><span class="pill">Готовится</span></div>
          <div class="soon-topics">${u.topics.map((t) => `<span class="chip ghost">${esc(t)}</span>`).join('')}</div></section>`;
      }
      const p = unitProgress(u);
      const tr = state.tests[u.id];
      const testOpen = unitTestUnlocked(u);
      const lessons = u.lessons.map((l, i) => lessonRow(getLesson(l.id), i + 1)).join('');
      const projects = (u.projects || []).map((l) => lessonRow(getLesson(l.id))).join('');
      return `<section class="unit">
        <div class="unit-h"><span class="unit-code">${esc(u.code)}</span><div class="grow"><b>${esc(u.title)}</b><div class="small muted">${p.done} из ${p.total} уроков${tr && tr.passed ? ' · тест сдан ✓' : ''}</div>${progressBar(p.pct, 'thin')}</div></div>
        <div class="lessons">${lessons}</div>
        ${projects ? `<div class="sub-h">${icon('code')} Практические проекты</div><div class="lessons">${projects}</div>` : ''}
        <button class="lesson-row test ${testOpen ? 'open' : 'locked'}" data-test="${u.id}" ${testOpen ? '' : 'data-locked="1"'}><span class="lr-badge">${icon(tr && tr.passed ? 'check' : 'trophy')}</span><span class="lr-txt"><b>Итоговый тест</b><span class="small muted">${tr ? `Лучший результат: ${tr.best}% · порог ${u.pass}%` : testOpen ? `Порог прохождения — ${u.pass}%` : 'Откроется после всех уроков уровня'}</span></span>${testOpen ? icon('chev') : ''}</button>
      </section>`;
    }).join('')}
  </div>`;

  view.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => go(`#/learn/${b.dataset.tab}`, { replace: true }));
  view.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  view.querySelectorAll('.lesson-row[data-id]').forEach((b) => b.onclick = () => {
    if (b.dataset.locked) {
      const L = getLesson(b.dataset.id);
      sheet(`<h3>${icon('lock')} Урок пока закрыт</h3><p class="muted">${L.kind === 'project' ? `Проект откроется после урока «${esc(getLesson(L.after).title)}».` : 'Уроки открываются по порядку: пройдите предыдущий урок. Пройденные уроки можно повторять сколько угодно.'}</p><button class="btn primary block" data-close>Понятно</button>`);
      return;
    }
    go(`#/lesson/${b.dataset.id}`);
  });
  view.querySelectorAll('[data-test]').forEach((b) => b.onclick = () => {
    if (b.dataset.locked) { sheet('<h3>Итоговый тест</h3><p class="muted">Тест откроется, когда все уроки уровня будут пройдены.</p><button class="btn primary block" data-close>Понятно</button>'); return; }
    go(`#/test/${b.dataset.test}`);
  });
}
