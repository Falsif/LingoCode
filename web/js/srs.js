// Интервальное повторение (упрощённый SM-2).
// Оценки: 0 — «Не помню», 1 — «Трудно», 2 — «Хорошо», 3 — «Легко».
// Забытое слово просто возвращается в повторение — без штрафов и потери XP.
import { state, save } from './store.js';
import { todayKey, addDays } from './dates.js';

export function addWord(w, lessonId) {
  const key = w.en;
  if (state.words[key]) return false;
  state.words[key] = {
    ru: w.ru, tr: w.tr || '', ex: w.ex || '', exRu: w.exRu || '', lesson: lessonId,
    added: todayKey(), due: addDays(todayKey(), 1), interval: 0, ease: 2.5, reps: 0, lapses: 0, fav: false, hist: [],
  };
  return true;
}

export function gradeWord(en, g) {
  const w = state.words[en];
  if (!w) return;
  const t = todayKey();
  w.hist.push({ d: t, g });
  if (w.hist.length > 50) w.hist.splice(0, w.hist.length - 50);
  if (g === 0) {
    w.lapses += 1;
    w.interval = 0;
    w.ease = Math.max(1.3, w.ease - 0.2);
    w.due = t;
  } else if (g === 1) {
    w.interval = Math.max(1, Math.round(w.interval * 1.2));
    w.ease = Math.max(1.3, w.ease - 0.15);
    w.due = addDays(t, w.interval);
  } else if (g === 2) {
    w.interval = w.interval < 1 ? 1 : w.interval < 3 ? 3 : Math.round(w.interval * w.ease);
    w.due = addDays(t, w.interval);
  } else {
    w.interval = w.interval < 1 ? 3 : Math.round(Math.max(w.interval, 2) * w.ease * 1.3);
    w.ease = Math.min(3.2, w.ease + 0.15);
    w.due = addDays(t, w.interval);
  }
  w.reps += 1;
  save();
}

export function wordList() {
  return Object.entries(state.words).map(([en, w]) => ({ en, ...w }));
}

export function sections() {
  const t = todayKey();
  const all = wordList();
  return {
    all,
    due: all.filter((w) => w.due <= t),
    fresh: all.filter((w) => w.reps === 0),
    hard: all.filter((w) => w.lapses >= 2 || (w.reps > 0 && w.ease < 2.1)),
    fav: all.filter((w) => w.fav),
    known: all.filter((w) => w.interval >= 21),
  };
}

export function nextReviewText(w) {
  if (w.due <= todayKey()) return 'сегодня';
  const days = Math.round((new Date(w.due) - new Date(todayKey())) / 86400000);
  return days === 1 ? 'завтра' : `через ${days} дн.`;
}

// Повторение уроков: 1, 3, 7, 14, 30, 60 дней после прохождения
const LESSON_STEPS = [1, 3, 7, 14, 30, 60];
export function scheduleLessonReview(rec) {
  const t = todayKey();
  if (!rec.reviewDue || rec.reviewDue <= t) {
    rec.reviewStep = Math.min((rec.reviewStep ?? -1) + 1, LESSON_STEPS.length - 1);
    rec.reviewDue = addDays(t, LESSON_STEPS[rec.reviewStep]);
  }
}
export function needsReview(rec) { return !!(rec && rec.done && rec.reviewDue && rec.reviewDue <= todayKey()); }
