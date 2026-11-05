// Точка входа LingoCode
import { state, save, flush } from './store.js';
import { route, startRouter, go, back, render, currentRoute } from './router.js';
import { applyTheme } from './theme.js';
import { icon, toast, celebrate, closeTopSheet, $ } from './ui.js';
import { todayKey } from './dates.js';
import { recordTime, checkAchievements } from './game.js';
import { renderHome } from './screens/home.js';
import { renderLearn } from './screens/learn.js';
import { renderLesson, renderUnitTest } from './screens/lesson.js';
import { renderCalendar } from './screens/calendar.js';
import { renderProgress, renderAchievements } from './screens/progress.js';
import { renderProfile, renderOnboarding } from './screens/profile.js';
import { renderDict, renderCards } from './screens/dict.js';
import { renderSandboxList, renderSandboxEdit } from './screens/sandbox.js';

applyTheme();

const NAV = [
  ['home', '#/home', 'home', 'Главная'],
  ['learn', '#/learn', 'book', 'Обучение'],
  ['calendar', '#/calendar', 'calendar', 'Календарь'],
  ['progress', '#/progress', 'chart', 'Прогресс'],
  ['profile', '#/profile', 'user', 'Профиль'],
];
const nav = $('#nav');
nav.innerHTML = NAV.map(([id, h, ic, l]) => `<a href="${h}" data-tab="${id}">${icon(ic)}<span>${l}</span></a>`).join('');

const guard = (fn) => (view, params) => {
  if (!state.onboarded) {
    renderOnboarding(view, (firstLesson) => go(`#/lesson/${firstLesson}`, { replace: true }));
    document.body.classList.add('full');
    return;
  }
  fn(view, params);
};

route('/home', guard(renderHome), { tab: 'home' });
route('/learn', guard(renderLearn), { tab: 'learn' });
route('/learn/:course', guard(renderLearn), { tab: 'learn' });
route('/lesson/:id', guard((v, p) => renderLesson(v, p.id)), { full: true, learning: true });
route('/test/:unit', guard((v, p) => renderUnitTest(v, p.unit)), { full: true, learning: true });
route('/calendar', guard(renderCalendar), { tab: 'calendar' });
route('/calendar/:date', guard(renderCalendar), { tab: 'calendar' });
route('/progress', guard(renderProgress), { tab: 'progress' });
route('/achievements', guard(renderAchievements), { tab: 'progress' });
route('/profile', guard(renderProfile), { tab: 'profile' });
route('/dict', guard(renderDict), { tab: 'learn' });
route('/cards', guard(renderCards), { full: true, learning: true });
route('/sandbox/:kind', guard((v, p) => renderSandboxList(v, p)), { tab: 'learn' });
route('/sandbox/:kind/:id', guard((v, p) => renderSandboxEdit(v, p)), { tab: 'learn', learning: true });

startRouter($('#view'), (r) => {
  document.body.classList.toggle('full', !!r.opts.full);
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === r.opts.tab));
});

// ---------- Глобальные события ----------
let xpQueue = 0, xpTimer = null;
window.addEventListener('lc-xp', (e) => {
  // в уроке мелкие награды уже видны в карточке ответа
  if (document.body.classList.contains('full') && e.detail.xp < 20) return;
  xpQueue += e.detail.xp;
  clearTimeout(xpTimer);
  xpTimer = setTimeout(() => { toast(`<b>+${xpQueue} XP</b> ${e.detail.reason || ''}`, 'xp'); xpQueue = 0; }, 150);
});
const achQueue = [];
let achShowing = false;
function showNextAch() {
  if (achShowing || !achQueue.length) return;
  // не отвлекаем посреди упражнения — покажем на итоговом экране урока
  const st = window.__lcStep;
  if (document.body.classList.contains('full') && st && st.t !== 'summary' && document.querySelector('.player')) { setTimeout(showNextAch, 1500); return; }
  achShowing = true;
  const a = achQueue.shift();
  const s = celebrate(a.icon, `Достижение: ${a.title}`, a.desc);
  const obs = new MutationObserver(() => { if (!s.root.isConnected) { obs.disconnect(); achShowing = false; setTimeout(showNextAch, 300); } });
  obs.observe(document.body, { childList: true });
}
window.addEventListener('lc-ach', (e) => { achQueue.push(e.detail); setTimeout(showNextAch, 700); });
window.addEventListener('lc-day-done', () => setTimeout(() => toast('🎉 Все задания на сегодня выполнены!', 'ok'), 1200));
window.addEventListener('lc-save-error', () => toast('Не удалось сохранить прогресс: память устройства заполнена?', 'warn'));

// ---------- Учёт времени обучения ----------
let lastInput = Date.now();
['pointerdown', 'keydown', 'scroll'].forEach((t) => window.addEventListener(t, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
setInterval(() => {
  const r = currentRoute();
  if (!r || !r.opts.learning || document.visibilityState !== 'visible') return;
  if (Date.now() - lastInput > 90000) return; // пользователь отошёл
  recordTime(15);
}, 15000);

// ---------- Смена даты (приложение открыто через полночь) ----------
let lastDay = todayKey();
function dayCheck() {
  const t = todayKey();
  if (t !== lastDay) {
    lastDay = t;
    const r = currentRoute();
    if (r && (r.opts.tab === 'home' || r.opts.tab === 'calendar')) render();
  }
}
setInterval(dayCheck, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') dayCheck(); });

// ---------- Кнопка «Назад» Android ----------
// Возвращает true, если событие обработано внутри приложения
window.lcBack = () => {
  if (closeTopSheet()) return true;
  return back();
};
window.lcPause = () => flush();
window.lcToast = (m) => toast(m);

checkAchievements();
save();
