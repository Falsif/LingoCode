// Главная: приветствие, статистика, «Продолжить», задания дня, курсы, достижения, активность
import { state } from '../store.js';
import { esc, pl } from '../util.js';
import { icon, progressBar, ring } from '../ui.js';
import { todayKey, humanDate, startOfWeek, addDays, WEEKDAYS } from '../dates.js';
import { COURSES, getLesson } from '../content/index.js';
import { levelInfo, streak, nextLesson, coursePct, courseLevelLabel, ACHIEVEMENTS, achProgress } from '../game.js';
import { getPlan, liveTasks, taskProgress, taskTitle, dayStatus, KINDS } from '../plan.js';
import { sections } from '../srs.js';
import { go } from '../router.js';

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
}

export function continueTarget() {
  if (state.session && getLesson(state.session.lessonId)) return { hash: `#/lesson/${state.session.lessonId}`, label: 'Продолжить урок', sub: getLesson(state.session.lessonId).title };
  // сначала — курс из первого невыполненного задания дня
  const t = todayKey();
  const plan = getPlan(t, { create: false });
  const undone = liveTasks(plan).find((x) => x.kind !== 'custom' && !taskProgress(t, x).done);
  const order = ['en', 'py', 'html'].filter((c) => state.profile.courses[c]);
  if (undone && KINDS[undone.kind].course) order.unshift(KINDS[undone.kind].course);
  for (const c of order) {
    if (undone && undone.kind === 'en-words' && c === 'en' && Object.keys(state.words).length) return { hash: '#/cards', label: 'Повторить слова', sub: 'Карточки с интервальным повторением' };
    const n = nextLesson(c);
    if (n) return { hash: n.test ? `#/test/${n.unit.id}` : `#/lesson/${n.id}`, label: 'Продолжить обучение', sub: `${COURSES[c].title}: ${n.title}` };
  }
  return { hash: '#/learn', label: 'К урокам', sub: 'Повторите пройденное' };
}

export function renderHome(view) {
  const t = todayKey();
  const lv = levelInfo();
  const st = streak();
  const plan = getPlan(t);
  const tasks = liveTasks(plan);
  const cont = continueTarget();
  const due = sections().due.length;
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(t), i));
  const weekDone = week.filter((k) => k <= t && dayStatus(k) === 'done').length;
  const weekPlanned = week.filter((k) => !['rest', 'before'].includes(dayStatus(k))).length;
  const nearAch = ACHIEVEMENTS.map((a) => ({ a, p: achProgress(a) })).filter((x) => !x.p.got).sort((x, y) => y.p.pct - x.p.pct).slice(0, 3);
  const courses = ['en', 'py', 'html'].filter((c) => state.profile.courses[c]);
  const todayXp = (state.days[t] && state.days[t].ev && state.days[t].ev.xp) || 0;

  view.innerHTML = `<div class="page home">
    <header class="hello">
      <div><div class="muted small">${esc(humanDate(t))}</div><h1>${greeting()}${state.profile.name ? ', ' + esc(state.profile.name) : ''}!</h1></div>
      <button class="avatar" data-go="#/profile" aria-label="Профиль">${esc((state.profile.name || 'Я').slice(0, 1).toUpperCase())}</button>
    </header>

    <section class="stats-row">
      <div class="stat-card lvl" data-go="#/progress">${ring(lv.pct, String(lv.level))}<div><b>Уровень ${lv.level}</b><span class="muted small">${lv.cur}/${lv.need} XP</span></div></div>
      <div class="stat-card" data-go="#/progress"><span class="stat-ic xp">${icon('sparkle')}</span><div><b>${state.xp}</b><span class="muted small">XP · сегодня +${todayXp}</span></div></div>
      <div class="stat-card" data-go="#/calendar"><span class="stat-ic fire ${st ? 'on' : ''}">${icon('flame')}</span><div><b>${pl(st, ['день', 'дня', 'дней'])}</b><span class="muted small">подряд</span></div></div>
    </section>

    <button class="continue" data-go="${cont.hash}"><span class="c-ic">${icon('play')}</span><span class="c-txt"><b>${esc(cont.label)}</b><span>${esc(cont.sub)}</span></span>${icon('chev')}</button>

    <section class="card">
      <div class="card-h"><h2>Сегодняшние задания</h2><a class="link" href="#/calendar">План</a></div>
      ${!tasks.length ? `<p class="muted">${dayStatus(t) === 'rest' ? '☕ Сегодня запланирован отдых. Можно позаниматься по желанию — серия не прервётся.' : 'На сегодня заданий нет. Их можно добавить в календаре.'}</p>`
        : `<ul class="tasks">${tasks.map((x) => { const p = taskProgress(t, x); return `<li class="task ${p.done ? 'done' : ''}" data-go="${x.kind === 'custom' ? '#/calendar' : KINDS[x.kind].route}"><span class="tick">${p.done ? icon('check') : ''}</span><span class="t-body"><span>${esc(taskTitle(x))}</span>${x.kind !== 'custom' && x.n > 1 ? progressBar((p.cur / p.n) * 100, 'thin') : ''}</span><span class="muted small">${x.kind === 'custom' ? '' : `${p.cur}/${p.n}`}</span></li>`; }).join('')}</ul>`}
    </section>

    ${due ? `<button class="banner" data-go="#/cards">${icon('cards')}<span><b>${pl(due, ['слово ждёт', 'слова ждут', 'слов ждут'])} повторения</b><span class="small">Интервальное повторение — 2–3 минуты</span></span>${icon('chev')}</button>` : ''}

    <section class="card">
      <div class="card-h"><h2>Неделя</h2><span class="muted small">${weekDone} из ${weekPlanned} учебных дней</span></div>
      <div class="week">${week.map((k, i) => `<div class="wd ${dayStatus(k)} ${k === t ? 'is-today' : ''}" data-go="#/calendar/${k}"><span>${WEEKDAYS[i]}</span><i></i></div>`).join('')}</div>
    </section>

    <section class="courses">
      ${courses.map((c) => {
        const C = COURSES[c];
        const n = nextLesson(c);
        const pct = coursePct(c);
        return `<button class="course-card c-${c}" data-go="#/learn/${c}"><span class="cc-top"><span class="cc-emoji">${C.emoji}</span><span class="cc-level">${esc(courseLevelLabel(c))}</span></span><b>${esc(C.title)}</b><span class="small cc-next">${n ? esc(n.title) : 'Все уроки пройдены'}</span>${progressBar(pct)}<span class="small muted">${pct}% доступных уроков</span></button>`;
      }).join('')}
    </section>

    <section class="card">
      <div class="card-h"><h2>Ближайшие достижения</h2><a class="link" href="#/achievements">Все</a></div>
      ${nearAch.map(({ a, p }) => `<div class="ach-row"><span class="ach-ic">${a.icon}</span><span class="grow"><b>${esc(a.title)}</b><span class="small muted">${esc(a.desc)} · ${p.v}/${a.goal}</span>${progressBar(p.pct, 'thin')}</span></div>`).join('')}
    </section>
  </div>`;
  view.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
}
