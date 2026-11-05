// Ежедневный план: задания создаются автоматически по выбранным курсам и нагрузке,
// а отмечаются выполненными сами — по настоящим учебным событиям дня.
import { state, save, day, peekDay } from './store.js';
import { todayKey, weekday, diffDays } from './dates.js';
import { pl, uid } from './util.js';

export const KINDS = {
  'en-lesson': { label: 'Английский: урок', course: 'en', min: 7, xp: 20, metric: (ev) => ev.lessons.en, title: (n) => `Английский — пройти ${pl(n, ['урок', 'урока', 'уроков'])}`, route: '#/learn/en' },
  'en-words': { label: 'Английский: слова (карточки)', course: 'en', min: 1, xp: 0, metric: (ev) => ev.cards + ev.newWords, title: (n) => `Английский — выучить или повторить ${pl(n, ['слово', 'слова', 'слов'])}`, route: '#/cards' },
  'py-lesson': { label: 'Python: урок', course: 'py', min: 8, xp: 20, metric: (ev) => ev.lessons.py, title: (n) => `Python — пройти ${pl(n, ['урок', 'урока', 'уроков'])}`, route: '#/learn/py' },
  'py-ex': { label: 'Python: упражнения', course: 'py', min: 3, xp: 5, metric: (ev) => ev.ex.py, title: (n) => `Python — решить ${pl(n, ['упражнение', 'упражнения', 'упражнений'])}`, route: '#/learn/py' },
  'html-lesson': { label: 'HTML: урок', course: 'html', min: 7, xp: 20, metric: (ev) => ev.lessons.html, title: (n) => `HTML — пройти ${pl(n, ['урок', 'урока', 'уроков'])}`, route: '#/learn/html' },
  'html-ex': { label: 'HTML: задания', course: 'html', min: 3, xp: 5, metric: (ev) => ev.ex.html, title: (n) => `HTML — выполнить ${pl(n, ['задание', 'задания', 'заданий'])}`, route: '#/learn/html' },
  custom: { course: null, min: 0, xp: 0, metric: null, title: (n, t) => t.text },
};
const BASE = {
  en: [['en-lesson', 1], ['en-words', 5]],
  py: [['py-lesson', 1], ['py-ex', 2]],
  html: [['html-lesson', 1], ['html-ex', 2]],
};

function firstDay() {
  const c = new Date(state.createdAt);
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
}

export function isRest(k) {
  const d = peekDay(k);
  if (d && typeof d.rest === 'boolean') return d.rest;
  return !state.profile.studyDays[weekday(k)];
}

function activeCourses() {
  return ['en', 'py', 'html'].filter((c) => state.profile.courses[c]);
}

function makeTask(kind, n) { return { id: uid(), kind, n, status: null }; }

export function generateTasks(k) {
  const courses = activeCourses();
  if (!courses.length) return [];
  const budget = Math.max(5, state.profile.minutes || 20);
  // ротация: каждый день первым идёт другое направление — не нужно учить всё каждый день
  const shift = Math.abs(diffDays('2024-01-01', k)) % courses.length;
  const order = courses.slice(shift).concat(courses.slice(0, shift));
  const pool = [...order.map((c) => BASE[c][0]), ...order.map((c) => BASE[c][1])];
  const tasks = [];
  let used = 0;
  for (const [kind, n] of pool) {
    const cost = KINDS[kind].min * n;
    if (tasks.length === 0 || used + cost <= budget + 3) { tasks.push(makeTask(kind, n)); used += cost; }
  }
  // на большой нагрузке увеличиваем объём уже выбранных заданий
  let guard = 0;
  while (used < budget * 0.8 && guard++ < 20) {
    const t = tasks[guard % tasks.length];
    const step = t.kind.endsWith('lesson') ? 1 : t.kind === 'en-words' ? 5 : 1;
    t.n += step; used += KINDS[t.kind].min * step;
  }
  return tasks;
}

// План дня. Для прошлых дней план существует, только если приложение его создавало.
export function getPlan(k, { create = true } = {}) {
  const t = todayKey();
  const d = peekDay(k);
  if (d && d.plan) return d.plan;
  if (k < t) return null;
  if (isRest(k)) return null;
  const plan = { tasks: generateTasks(k), edited: false, created: Date.now() };
  if (create && k === t) { day(k).plan = plan; save(); }
  return plan;
}
function materialize(k) {
  const d = day(k);
  if (!d.plan) d.plan = getPlan(k, { create: false }) || { tasks: [], edited: true, created: Date.now() };
  d.plan.edited = true;
  return d.plan;
}

export function taskProgress(k, task) {
  if (task.kind === 'custom') return { cur: task.status === 'done' ? 1 : 0, n: 1, done: task.status === 'done' };
  const d = peekDay(k);
  const ev = d && d.ev;
  const cur = ev ? Math.min(task.n, KINDS[task.kind].metric(ev)) : 0;
  return { cur, n: task.n, done: cur >= task.n };
}

export function liveTasks(plan) { return plan ? plan.tasks.filter((t) => t.status !== 'moved') : []; }

export function hasActivity(d) {
  if (!d || !d.ev) return false;
  const e = d.ev;
  return e.done.length > 0 || e.cards > 0 || e.ex.en + e.ex.py + e.ex.html > 0 || e.runs > 0;
}

// 'done' зелёный, 'partial' жёлтый, 'none' серый, 'rest' синий, 'future' — ещё не наступил
export function dayStatus(k) {
  const t = todayKey();
  const d = peekDay(k);
  if (k < firstDay() && !hasActivity(d)) return 'before';
  const plan = d && d.plan ? d.plan : (k >= t ? getPlan(k, { create: false }) : null);
  const tasks = liveTasks(plan);
  const prog = tasks.map((x) => taskProgress(k, x).done);
  if (tasks.length && prog.every(Boolean)) return 'done';
  if (isRest(k)) return 'rest';
  if (prog.some(Boolean) || hasActivity(d)) return 'partial';
  if (k > t) return 'future';
  return k === t ? 'today' : 'none';
}

// Бонус за день даётся, только если в плане есть хотя бы одно настоящее учебное задание
export function dayFullyDoneWithAuto(k) {
  const d = peekDay(k);
  const tasks = liveTasks(d && d.plan);
  return tasks.some((x) => x.kind !== 'custom') && tasks.every((x) => taskProgress(k, x).done);
}

export function addTask(k, kind, n, text) {
  const plan = materialize(k);
  if (kind === 'custom') plan.tasks.push({ id: uid(), kind, n: 1, text: text.trim().slice(0, 120), status: null });
  else {
    const same = plan.tasks.find((t) => t.kind === kind && t.status !== 'moved');
    if (same) same.n += n; else plan.tasks.push(makeTask(kind, n));
  }
  save();
}
export function removeTask(k, id) {
  const plan = materialize(k);
  plan.tasks = plan.tasks.filter((t) => t.id !== id);
  save();
}
export function setTaskCount(k, id, n) {
  const plan = materialize(k);
  const t = plan.tasks.find((x) => x.id === id);
  if (t) t.n = Math.max(1, Math.min(50, n));
  save();
}
// Ручная отметка разрешена только для собственных заданий пользователя.
export function toggleCustom(k, id) {
  const plan = materialize(k);
  const t = plan.tasks.find((x) => x.id === id);
  if (!t || t.kind !== 'custom') return false;
  t.status = t.status === 'done' ? null : 'done';
  save();
  return true;
}
export function moveTask(from, id, to) {
  if (from === to) return;
  const src = materialize(from);
  const t = src.tasks.find((x) => x.id === id);
  if (!t) return;
  const left = t.kind === 'custom' ? 1 : t.n - taskProgress(from, t).cur;
  if (left <= 0) return;
  t.status = 'moved'; t.movedTo = to;
  const dst = materialize(to);
  if (t.kind === 'custom') dst.tasks.push({ ...t, id: uid(), status: null, movedFrom: from, movedTo: undefined });
  else {
    const same = dst.tasks.find((x) => x.kind === t.kind && x.status !== 'moved');
    if (same) same.n += left; else dst.tasks.push({ id: uid(), kind: t.kind, n: left, status: null, movedFrom: from });
  }
  save();
}
export function setRest(k, rest) {
  const d = day(k);
  d.rest = rest;
  if (rest && d.plan && !d.plan.edited && !hasActivity(d)) delete d.plan;
  save();
}
// После изменения настроек пересоздаём неизменённые планы на сегодня и будущее
export function refreshPlans() {
  const t = todayKey();
  for (const [k, d] of Object.entries(state.days)) {
    if (k >= t && d.plan && !d.plan.edited) {
      const done = liveTasks(d.plan).some((x) => taskProgress(k, x).cur > 0);
      if (!done) delete d.plan;
    }
  }
  save();
}

export function taskTitle(t) { return KINDS[t.kind].title(t.n, t); }
export function taskMinutes(t) { return KINDS[t.kind].min * t.n; }
