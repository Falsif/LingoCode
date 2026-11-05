// Игровая система: XP (с защитой от повторного начисления), уровни, серии, достижения.
import { state, save, flush, day, peekDay } from './store.js';
import { todayKey, addDays, dateKey } from './dates.js';
import { getLesson, getUnit, allLessons, COURSES } from './content/index.js';
import { addWord, scheduleLessonReview } from './srs.js';
import { isRest, hasActivity, dayFullyDoneWithAuto, getPlan } from './plan.js';

export const XP = { lesson: 20, exercise: 5, test: 50, dayPlan: 30, words10: 25, project: 100, streak7: 150, enLevel: 500 };

function emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); }

// Начислить XP один раз по уникальному ключу
export function award(key, xp, reason) {
  if (state.ledger[key]) return 0;
  const t = todayKey();
  state.ledger[key] = { xp, d: t };
  state.xp += xp;
  day(t).ev.xp += xp;
  emit('lc-xp', { xp, reason });
  return xp;
}

// Уровень пользователя: каждый следующий требует на 50 XP больше
export function levelInfo(xp = state.xp) {
  let level = 1, need = 100, rest = xp;
  while (rest >= need) { rest -= need; level += 1; need = 100 + (level - 1) * 50; }
  return { level, cur: rest, need, pct: Math.round((rest / need) * 100) };
}

// ---------- Прогресс по курсам ----------
export function lessonDone(id) { return !!(state.lessons[id] && state.lessons[id].done); }

export function unitProgress(unit) {
  const ls = unit.lessons || [];
  const done = ls.filter((l) => lessonDone(l.id)).length;
  return { done, total: ls.length, pct: ls.length ? Math.round((done / ls.length) * 100) : 0, testPassed: !!(state.tests[unit.id] && state.tests[unit.id].passed) };
}

export function isUnlocked(lesson) {
  if (lesson.kind === 'project') return lessonDone(lesson.after);
  if (state.unlockAll[lesson.unit]) return true;
  const unit = getUnit(lesson.unit);
  const course = COURSES[lesson.course];
  const ui = course.units.findIndex((u) => u.id === unit.id);
  if (lesson.index === 0) {
    if (ui === 0) return true;
    const prev = course.units[ui - 1];
    return !!(state.tests[prev.id] && state.tests[prev.id].passed);
  }
  return lessonDone(unit.lessons[lesson.index - 1].id);
}

export function unitTestUnlocked(unit) {
  const p = unitProgress(unit);
  return p.done === p.total || !!state.unlockAll[unit.id];
}

// Следующий урок курса для кнопки «Продолжить обучение»
export function nextLesson(courseId) {
  for (const u of COURSES[courseId].units) {
    for (const l of u.lessons || []) {
      const L = getLesson(l.id);
      if (!lessonDone(l.id) && isUnlocked(L)) return L;
    }
    if (u.lessons && !(state.tests[u.id] && state.tests[u.id].passed) && unitTestUnlocked(u)) return { test: true, unit: u, course: courseId, title: `Итоговый тест: ${u.title}` };
  }
  return null;
}

export function courseLevelLabel(courseId) {
  const c = COURSES[courseId];
  let label = c.units[0].code;
  for (const u of c.units) {
    if (state.tests[u.id] && state.tests[u.id].passed) continue;
    label = u.code; break;
  }
  return label;
}

export function coursePct(courseId) {
  // доля пройденных уроков среди уже доступного контента курса
  const ls = allLessons(courseId);
  if (!ls.length) return 0;
  return Math.round((ls.filter((l) => lessonDone(l.id)).length / ls.length) * 100);
}
// Путь английского A0–C2: каждый уровень — 1/7 пути
export function englishPathPct() {
  const units = COURSES.en.units;
  let sum = 0;
  for (const u of units) {
    if (state.tests[u.id] && state.tests[u.id].passed) sum += 1;
    else if (u.lessons) sum += unitProgress(u).done / Math.max(1, u.lessons.length) * 0.9;
  }
  return Math.round((sum / units.length) * 100);
}

// ---------- Серия занятий ----------
export function streak() {
  const t = todayKey();
  const first = dateKey(new Date(state.createdAt));
  let k = hasActivity(peekDay(t)) ? t : addDays(t, -1);
  let n = 0;
  for (let i = 0; i < 3660 && k >= first; i++) {
    const d = peekDay(k);
    if (hasActivity(d)) n += 1;
    else if (!isRest(k)) break; // запланированный отдых серию не прерывает
    k = addDays(k, -1);
  }
  return n;
}

// ---------- События обучения ----------
function afterEvent() {
  const t = todayKey();
  const s = streak();
  if (s > state.stats.bestStreak) state.stats.bestStreak = s;
  if (s > 0 && s % 7 === 0) award(`streak7:${t}`, XP.streak7, `Серия ${s} дней подряд`);
  getPlan(t); // план на сегодня фиксируется при первом учебном действии
  if (dayFullyDoneWithAuto(t)) {
    if (award(`day:${t}`, XP.dayPlan, 'Все задания дня выполнены')) emit('lc-day-done', {});
  }
  checkAchievements();
  save();
}

export function recordExercise(lessonId, idx, course, correct) {
  if (!correct) return 0;
  const ev = day(todayKey()).ev;
  ev.ex[course] = (ev.ex[course] || 0) + 1;
  const got = award(`ex:${lessonId}:${idx}`, XP.exercise, 'Упражнение выполнено');
  afterEvent();
  return got;
}

// Правильный ответ без XP (повторение, тест, диагностика) — засчитывается в план дня
export function recordPractice(course) {
  const ev = day(todayKey()).ev;
  ev.ex[course] = (ev.ex[course] || 0) + 1;
  afterEvent();
}

export function recordCodeSuccess(kind) {
  if (kind === 'py') state.stats.programsOk += 1;
  if (kind === 'html') state.stats.pagesOk += 1;
}

export function recordRun(ok) {
  state.stats.runs += 1;
  if (ok) state.stats.okRuns += 1;
  day(todayKey()).ev.runs += 1;
  afterEvent();
}

export function recordCards(n, words) {
  const ev = day(todayKey()).ev;
  ev.cards += n;
  for (const w of words || []) if (!ev.words.includes(w)) ev.words.push(w);
  afterEvent();
}

export function recordTime(sec) {
  if (sec <= 0) return;
  day(todayKey()).ev.time += sec;
  save();
}

function wordsAwards() {
  const n = Object.keys(state.words).length;
  for (let k = 10; k <= n; k += 10) award(`words:${k}`, XP.words10, `Изучено ${k} слов`);
}

export function completeLesson(id, { quizPct = 100 } = {}) {
  const L = getLesson(id);
  const t = todayKey();
  const rec = state.lessons[id] || (state.lessons[id] = { completions: 0, best: 0 });
  rec.done = true;
  rec.firstAt = rec.firstAt || t;
  rec.lastAt = t;
  rec.completions += 1;
  rec.best = Math.max(rec.best || 0, quizPct);
  scheduleLessonReview(rec);
  const ev = day(t).ev;
  ev.lessons[L.course] = (ev.lessons[L.course] || 0) + 1;
  if (!ev.done.includes(id)) ev.done.push(id);
  if (!ev.topics.includes(L.title)) ev.topics.push(L.title);
  let gained = 0;
  if (L.kind === 'project') gained += award(`project:${id}`, XP.project, `Проект «${L.title.replace('Проект: ', '')}»`);
  else gained += award(`lesson:${id}`, XP.lesson, 'Урок завершён');
  let added = 0;
  for (const w of L.words || []) {
    if (addWord(w, id)) { added += 1; if (!ev.words.includes(w.en)) ev.words.push(w.en); }
  }
  ev.newWords += added;
  wordsAwards();
  if (state.session && state.session.lessonId === id) state.session = null;
  afterEvent();
  flush();
  return { gained, added };
}

export function completeTest(unitId, pct) {
  const unit = getUnit(unitId);
  const t = todayKey();
  const rec = state.tests[unitId] || (state.tests[unitId] = { best: 0, passed: false, attempts: [] });
  rec.attempts.push({ d: t, score: pct });
  rec.best = Math.max(rec.best, pct);
  const passed = pct >= (unit.pass || 80);
  let gained = 0;
  const ev = day(t).ev;
  const topic = `Итоговый тест: ${unit.title}`;
  if (!ev.topics.includes(topic)) ev.topics.push(topic);
  if (passed) {
    if (!rec.passed) rec.passedAt = t;
    rec.passed = true;
    gained += award(`test:${unitId}`, XP.test, 'Тест пройден');
    if (unit.course === 'en') gained += award(`unit:${unitId}`, XP.enLevel, `Уровень ${unit.code} завершён!`);
  }
  ev.done.includes(`test:${unitId}`) || ev.done.push(`test:${unitId}`);
  afterEvent();
  flush();
  return { passed, gained };
}

// ---------- Достижения ----------
const lessonsDoneCount = () => Object.values(state.lessons).filter((l) => l.done).length;
const wordsCount = () => Object.keys(state.words).length;

export const ACHIEVEMENTS = [
  { id: 'first-step', icon: '👣', title: 'Первый шаг', desc: 'Завершите первый урок', goal: 1, val: lessonsDoneCount },
  { id: 'abc', icon: '🔤', title: 'Знаток алфавита', desc: 'Пройдите оба урока по алфавиту', goal: 2, val: () => ['en-a0-01', 'en-a0-02'].filter(lessonDone).length },
  { id: 'words-25', icon: '📗', title: 'Словарный запас', desc: 'Изучите 25 слов', goal: 25, val: wordsCount },
  { id: 'polyglot', icon: '🗣️', title: 'Полиглот', desc: 'Изучите 100 слов', goal: 100, val: wordsCount },
  { id: 'word-master', icon: '📚', title: 'Мастер слов', desc: 'Изучите 1000 слов', goal: 1000, val: wordsCount },
  { id: 'programmer', icon: '🐍', title: 'Программист', desc: 'Напишите первую рабочую программу', goal: 1, val: () => state.stats.programsOk },
  { id: 'webdev', icon: '🌐', title: 'Веб-разработчик', desc: 'Создайте первую HTML-страницу', goal: 1, val: () => state.stats.pagesOk },
  { id: 'project', icon: '🛠️', title: 'Первый проект', desc: 'Завершите любой практический проект', goal: 1, val: () => Object.keys(state.ledger).filter((k) => k.startsWith('project:')).length },
  { id: 'week', icon: '🔥', title: 'Неделя знаний', desc: 'Занимайтесь 7 дней подряд', goal: 7, val: () => Math.max(state.stats.bestStreak, streak()) },
  { id: 'perfect', icon: '💯', title: 'Отличник', desc: 'Сдайте итоговый тест на 100%', goal: 1, val: () => (Object.values(state.tests).some((t) => t.best === 100) ? 1 : 0) },
  { id: 'a0', icon: '🎓', title: 'Выпускник A0', desc: 'Сдайте итоговый тест уровня A0', goal: 1, val: () => (state.tests['en-A0'] && state.tests['en-A0'].passed ? 1 : 0) },
  { id: 'py-basics', icon: '⚙️', title: 'Основы Python', desc: 'Сдайте итоговый тест по основам Python', goal: 1, val: () => (state.tests['py-basics'] && state.tests['py-basics'].passed ? 1 : 0) },
  { id: 'html-basics', icon: '🧱', title: 'Основы HTML', desc: 'Сдайте итоговый тест по HTML', goal: 1, val: () => (state.tests['html-basics'] && state.tests['html-basics'].passed ? 1 : 0) },
  { id: 'master', icon: '🏆', title: 'Мастер обучения', desc: 'Завершите 100 уроков', goal: 100, val: lessonsDoneCount },
];

export function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (state.ach[a.id]) continue;
    if (a.val() >= a.goal) {
      state.ach[a.id] = todayKey();
      emit('lc-ach', a);
    }
  }
}
export function achProgress(a) { const v = Math.min(a.goal, a.val()); return { v, pct: Math.round((v / a.goal) * 100), got: state.ach[a.id] }; }
