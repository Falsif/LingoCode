// Работа с датами. Все дни хранятся как локальные ключи 'YYYY-MM-DD'.
// Время берётся по часовому поясу устройства в момент события, поэтому смена
// часового пояса не «перескакивает» уже записанные дни.

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayKey() { return dateKey(new Date()); }

// Полдень — чтобы переходы на летнее/зимнее время не сдвигали дату
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}
export function addDays(k, n) {
  const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d);
}
// 0 = понедельник … 6 = воскресенье
export function weekday(k) { return (parseKey(k).getDay() + 6) % 7; }
export function diffDays(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
export function startOfWeek(k) { return addDays(k, -weekday(k)); }

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const WEEKDAYS_FULL = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function humanDate(k, withWeekday = true) {
  const d = parseKey(k);
  const s = `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  return withWeekday ? `${WEEKDAYS_FULL[weekday(k)]}, ${s}` : s;
}
export function humanDateYear(k) {
  const d = parseKey(k);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}
