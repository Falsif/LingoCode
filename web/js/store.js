// Локальное хранилище прогресса. Работает без регистрации и интернета.
// Данные пишутся в localStorage (в Android — постоянное хранилище WebView),
// плюс ежедневная резервная копия на случай повреждения основной записи.
import { todayKey } from './dates.js';

const KEY = 'lingocode.v1';
const BAK = 'lingocode.v1.bak';
export const SCHEMA = 1;

function defaults() {
  return {
    v: SCHEMA,
    createdAt: Date.now(),
    onboarded: false,
    profile: {
      name: '',
      courses: { en: true, py: true, html: true },
      minutes: 20,
      studyDays: [true, true, true, true, true, false, false], // Пн..Вс
      theme: 'system',
      ttsRate: 0.9,
      enStart: 'A0',
    },
    unlockAll: {},     // { 'en-A0': true } — после диагностического теста
    lessons: {},       // id -> { done, firstAt, lastAt, completions, best, reviewDue, reviewStep }
    tests: {},         // unitId -> { best, passed, passedAt, attempts: [{d, score}] }
    words: {},         // en -> { ru, tr, ex, exRu, lesson, added, due, interval, ease, reps, lapses, fav, hist: [] }
    ledger: {},        // ключ награды -> { xp, d } — защита от повторного начисления
    xp: 0,
    days: {},          // 'YYYY-MM-DD' -> { plan, ev, rest }
    code: {},          // сохранённый код заданий: ключ -> текст
    programs: [],      // песочница Python: { id, name, code, updated }
    pages: [],         // песочница HTML
    ach: {},           // id достижения -> дата получения
    stats: { runs: 0, okRuns: 0, bestStreak: 0, programsOk: 0, pagesOk: 0 },
    session: null,     // незавершённый урок: { lessonId, step, at }
  };
}

function merge(base, data) {
  // аккуратно накладываем сохранённые данные на значения по умолчанию
  const out = { ...base, ...data };
  out.profile = { ...base.profile, ...(data.profile || {}) };
  out.stats = { ...base.stats, ...(data.stats || {}) };
  return out;
}

function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  if (!s.v) s.v = 1;
  // будущие миграции схемы: if (s.v < 2) { ...; s.v = 2; }
  return merge(defaults(), s);
}

function readKey(k) {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function load() {
  return migrate(readKey(KEY)) || migrate(readKey(BAK)) || defaults();
}

export let state = load();

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

let timer = null;
let lastBakDay = null;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
  listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
export function flush() {
  clearTimeout(timer);
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    const t = todayKey();
    if (lastBakDay !== t) { localStorage.setItem(BAK, raw); lastBakDay = t; }
  } catch (e) {
    console.error('Не удалось сохранить прогресс', e);
    window.dispatchEvent(new CustomEvent('lc-save-error'));
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
window.addEventListener('pagehide', flush);

export function exportBackup() {
  flush();
  return JSON.stringify({ app: 'LingoCode', exportedAt: new Date().toISOString(), data: state }, null, 1);
}

export function importBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('Файл повреждён или это не резервная копия LingoCode.'); }
  const data = obj && obj.app === 'LingoCode' ? obj.data : obj;
  if (!data || typeof data !== 'object' || !data.profile || !data.lessons) throw new Error('В файле нет данных LingoCode.');
  if (data.v > SCHEMA) throw new Error('Копия создана более новой версией приложения. Обновите LingoCode.');
  state = migrate(data);
  flush();
}

export function resetAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(BAK);
  state = defaults();
  flush();
}

// День: создаётся при первом обращении
export function day(k) {
  if (!state.days[k]) state.days[k] = {};
  const d = state.days[k];
  if (!d.ev) d.ev = { lessons: { en: 0, py: 0, html: 0 }, ex: { en: 0, py: 0, html: 0 }, cards: 0, newWords: 0, time: 0, xp: 0, done: [], topics: [], words: [], runs: 0 };
  return d;
}
export function peekDay(k) { return state.days[k] || null; }
