// Профиль и настройки, резервные копии; первый запуск
import { state, save, exportBackup, importBackup, resetAll } from '../store.js';
import { esc } from '../util.js';
import { icon, toast, confirmBox, saveTextFile, pickTextFile, sheet } from '../ui.js';
import { WEEKDAYS, todayKey } from '../dates.js';
import { levelInfo, ACHIEVEMENTS } from '../game.js';
import { refreshPlans, getPlan, taskTitle, liveTasks } from '../plan.js';
import { speak, ttsAvailable } from '../tts.js';
import { applyTheme } from '../theme.js';
import { go } from '../router.js';
import { renderPlacement } from './lesson.js';
import { COURSES } from '../content/index.js';

const LOADS = [[10, 'Лёгкая', '10 минут'], [20, 'Обычная', '20 минут'], [40, 'Интенсивная', '40 минут']];

function coursesHtml(sel) {
  return ['en', 'py', 'html'].map((c) => `<label class="check-card ${sel[c] ? 'on' : ''}"><input type="checkbox" data-c="${c}" ${sel[c] ? 'checked' : ''}><span class="cc-emoji">${COURSES[c].emoji}</span><span><b>${COURSES[c].title}</b><span class="small muted">${{ en: 'с нуля до C2', py: 'программирование с нуля', html: 'создание сайтов' }[c]}</span></span></label>`).join('');
}
function loadHtml(min) {
  const custom = !LOADS.some(([m]) => m === min);
  return `<div class="load-grid">${LOADS.map(([m, t, s]) => `<button type="button" class="load ${m === min ? 'on' : ''}" data-min="${m}"><b>${t}</b><span class="small">${s}</span></button>`).join('')}
    <button type="button" class="load ${custom ? 'on' : ''}" data-min="custom"><b>Своя</b><span class="small"><input type="number" class="cmin" min="5" max="180" value="${custom ? min : 30}"> мин</span></button></div>`;
}
function daysHtml(days) {
  return `<div class="days">${WEEKDAYS.map((d, i) => `<button type="button" class="dchip ${days[i] ? 'on' : ''}" data-d="${i}">${d}</button>`).join('')}</div><p class="small muted">Отмеченные дни — учебные, остальные — запланированный отдых. Дни отдыха не прерывают серию.</p>`;
}
function bindLoad(root, set) {
  root.querySelectorAll('.load').forEach((b) => b.addEventListener('click', (e) => {
    if (e.target.classList.contains('cmin')) return;
    root.querySelectorAll('.load').forEach((x) => x.classList.toggle('on', x === b));
    set(b.dataset.min === 'custom' ? Math.max(5, Math.min(180, +root.querySelector('.cmin').value || 30)) : +b.dataset.min);
  }));
  const cm = root.querySelector('.cmin');
  cm.addEventListener('input', () => { if (cm.closest('.load').classList.contains('on')) set(Math.max(5, Math.min(180, +cm.value || 30))); });
}

export function renderProfile(view) {
  const p = state.profile;
  const lv = levelInfo();
  view.innerHTML = `<div class="page profile">
    <h1>Профиль</h1>
    <section class="card me"><div class="avatar big">${esc((p.name || 'Я').slice(0, 1).toUpperCase())}</div><div class="grow"><input class="title-input name" value="${esc(p.name)}" placeholder="Ваше имя" maxlength="30" aria-label="Имя"><div class="small muted">Уровень ${lv.level} · ${state.xp} XP · ${Object.keys(state.ach).length}/${ACHIEVEMENTS.length} достижений</div></div></section>

    <div class="tools"><button class="tool" data-go="#/achievements">${icon('trophy')}<span><b>Достижения</b></span></button><button class="tool" data-go="#/dict">${icon('book')}<span><b>Словарь</b></span></button></div>

    <section class="card"><h2>Направления</h2><div class="courses-pick">${coursesHtml(p.courses)}</div></section>
    <section class="card"><h2>Нагрузка в день</h2>${loadHtml(p.minutes)}</section>
    <section class="card"><h2>Дни занятий</h2>${daysHtml(p.studyDays)}</section>

    <section class="card"><h2>Оформление</h2><div class="seg">${[['system', 'Системная'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([v, l]) => `<button class="seg-b ${p.theme === v ? 'on' : ''}" data-theme="${v}">${l}</button>`).join('')}</div></section>

    <section class="card"><h2>Озвучка</h2>
      <label class="lbl">Скорость речи: <b class="rate-v">${Math.round(p.ttsRate * 100)}%</b><input type="range" min="0.5" max="1.3" step="0.05" value="${p.ttsRate}" class="rate"></label>
      <button class="btn ghost sm tts-test">${icon('volume')} Проверить: «Hello! How are you?»</button>
      ${ttsAvailable() ? '' : '<p class="small warn-text">Синтез речи на устройстве не найден.</p>'}
    </section>

    <section class="card"><h2>Данные</h2>
      <p class="small muted">Прогресс хранится только на этом устройстве и сохраняется автоматически. Регистрация не нужна. Сделайте резервную копию, чтобы перенести прогресс на другой телефон.</p>
      <div class="col gap"><button class="btn secondary block exp">${icon('download')} Создать резервную копию</button>
      <button class="btn ghost block imp">${icon('upload')} Восстановить из копии</button>
      <button class="btn ghost block danger-text rst">${icon('trash')} Сбросить весь прогресс</button></div>
    </section>

    <p class="small muted center about">LingoCode 1.0 · бесплатно и без рекламы<br>Сертификаты и награды приложения — внутренние, не являются официальными квалификациями.</p>
  </div>`;
  const r = view;
  r.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  const name = r.querySelector('.name');
  name.onchange = () => { p.name = name.value.trim().slice(0, 30); save(); toast('Имя сохранено'); };
  r.querySelectorAll('[data-c]').forEach((cb) => cb.onchange = () => {
    const next = { ...p.courses, [cb.dataset.c]: cb.checked };
    if (!next.en && !next.py && !next.html) { cb.checked = true; return toast('Нужно хотя бы одно направление'); }
    p.courses = next; cb.closest('.check-card').classList.toggle('on', cb.checked); refreshPlans(); toast('План обновлён');
  });
  bindLoad(r, (m) => { p.minutes = m; refreshPlans(); });
  r.querySelectorAll('.dchip').forEach((b) => b.onclick = () => {
    const i = +b.dataset.d; p.studyDays[i] = !p.studyDays[i];
    if (!p.studyDays.some(Boolean)) { p.studyDays[i] = true; return toast('Оставьте хотя бы один учебный день'); }
    b.classList.toggle('on', p.studyDays[i]); refreshPlans();
  });
  r.querySelectorAll('[data-theme]').forEach((b) => b.onclick = () => { p.theme = b.dataset.theme; save(); applyTheme(); r.querySelectorAll('[data-theme]').forEach((x) => x.classList.toggle('on', x === b)); });
  const rate = r.querySelector('.rate');
  rate.oninput = () => { p.ttsRate = +rate.value; r.querySelector('.rate-v').textContent = Math.round(p.ttsRate * 100) + '%'; save(); };
  r.querySelector('.tts-test').onclick = () => speak('Hello! How are you?');
  r.querySelector('.exp').onclick = () => { saveTextFile(`lingocode-backup-${todayKey()}.json`, exportBackup()); };
  r.querySelector('.imp').onclick = async () => {
    const text = await pickTextFile();
    if (!text) return;
    if (!(await confirmBox('Восстановить прогресс?', 'Текущий прогресс на этом устройстве будет заменён данными из копии.', 'Восстановить'))) return;
    try { importBackup(text); toast('Прогресс восстановлен'); location.hash = '#/home'; location.reload(); } catch (e) { toast(e.message, 'warn'); }
  };
  r.querySelector('.rst').onclick = async () => {
    if (!(await confirmBox('Сбросить прогресс?', 'Будут удалены все уроки, XP, слова, программы и календарь. Отменить это нельзя. Рекомендуем сначала сделать резервную копию.', 'Сбросить всё', true))) return;
    resetAll(); location.hash = '#/home'; location.reload();
  };
}

// ---------- Первый запуск ----------
export function renderOnboarding(view, done) {
  const draft = { name: '', courses: { en: true, py: true, html: true }, minutes: 20, studyDays: [true, true, true, true, true, false, false], enStart: 'A0' };
  let step = 0;
  const steps = ['welcome', 'name', 'courses', 'load', 'days', 'english', 'plan'];

  function nextStep() {
    step += 1;
    if (steps[step] === 'english' && !draft.courses.en) step += 1;
    draw();
  }
  function prevStep() {
    step -= 1;
    if (steps[step] === 'english' && !draft.courses.en) step -= 1;
    draw();
  }
  function commit() {
    Object.assign(state.profile, { name: draft.name, courses: draft.courses, minutes: draft.minutes, studyDays: draft.studyDays, enStart: draft.enStart });
    if (draft.enStart !== 'A0') state.unlockAll['en-A0'] = true;
    state.onboarded = true;
    refreshPlans();
    save();
  }

  function draw() {
    const id = steps[step];
    let html = '';
    let nextLabel = 'Дальше';
    if (id === 'welcome') {
      html = `<div class="ob-hero"><img src="icon.svg" alt="" width="96" height="96"><h1>LingoCode</h1><p>Английский с нуля до C2, Python и HTML — бесплатно, без рекламы и регистрации.</p>
        <ul class="ob-list"><li>${icon('book')} Настоящие уроки с упражнениями и озвучкой</li><li>${icon('code')} Редакторы Python и HTML прямо в телефоне</li><li>${icon('calendar')} Календарь, план на день и серия занятий</li><li>${icon('sparkle')} Очки, уровни и достижения</li></ul></div>`;
      nextLabel = 'Начать';
    } else if (id === 'name') {
      html = `<h2>Как к вам обращаться?</h2><p class="muted">Имя или псевдоним. Его можно поменять позже.</p><input class="field big ob-name" maxlength="30" placeholder="Например, Сергей" value="${esc(draft.name)}">`;
    } else if (id === 'courses') {
      html = `<h2>Что будем изучать?</h2><p class="muted">Можно выбрать одно направление или все сразу. Не обязательно заниматься всем каждый день — план будет чередовать темы.</p><div class="courses-pick">${coursesHtml(draft.courses)}</div>`;
    } else if (id === 'load') {
      html = `<h2>Сколько времени в день?</h2><p class="muted">От этого зависит объём ежедневного плана.</p>${loadHtml(draft.minutes)}`;
    } else if (id === 'days') {
      html = `<h2>В какие дни заниматься?</h2>${daysHtml(draft.studyDays)}`;
    } else if (id === 'english') {
      html = `<h2>Ваш английский</h2><p class="muted">Можно начать с самого начала или пройти короткую диагностику (около 3 минут).</p>
        <div class="col gap"><button type="button" class="choice-card ${draft.enStart === 'A0' ? 'on' : ''}" data-en="A0"><b>Начать с нуля (A0)</b><span class="small muted">Алфавит, звуки, первые слова. Подходит, даже если вы не знаете ни одной буквы.</span></button>
        <button type="button" class="choice-card" data-en="test"><b>Пройти диагностический тест</b><span class="small muted">12 вопросов от простых к сложным</span></button></div>
        ${draft.enStart !== 'A0' ? `<p class="ok-text">Результат теста: ${esc(draft.enStart)}. Уроки A0 будут открыты сразу.</p>` : ''}`;
    } else if (id === 'plan') {
      commit();
      const plan = getPlan(todayKey());
      const tasks = liveTasks(plan);
      html = `<h2>Ваш план готов!</h2><p class="muted">${draft.minutes} мин в день · ${draft.studyDays.filter(Boolean).length} учебных дней в неделю</p>
        <div class="card"><h3>Сегодня</h3>${tasks.length ? `<ul class="plain">${tasks.map((t) => `<li>${icon('target')} ${esc(taskTitle(t))}</li>`).join('')}</ul>` : '<p class="muted">Сегодня по плану отдых — но первый урок можно пройти прямо сейчас!</p>'}</div>
        <p class="small muted">Задания отмечаются сами, когда вы их выполняете. Всё можно изменить в профиле и календаре.</p>`;
      nextLabel = 'Открыть первый урок';
    }
    view.innerHTML = `<div class="onboarding">
      <div class="ob-top">${step > 0 && id !== 'plan' ? `<button class="icon-btn ob-back" aria-label="Назад">${icon('back')}</button>` : '<span></span>'}<div class="dots">${steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div><span></span></div>
      <div class="ob-body">${html}</div>
      <div class="ob-foot"><button class="btn primary block lg ob-next">${nextLabel}</button></div></div>`;
    const b = view.querySelector('.ob-back');
    if (b) b.onclick = prevStep;
    const nb = view.querySelector('.ob-next');
    const nameIn = view.querySelector('.ob-name');
    if (nameIn) { setTimeout(() => nameIn.focus(), 200); nameIn.onkeydown = (e) => { if (e.key === 'Enter') nb.click(); }; }
    view.querySelectorAll('[data-c]').forEach((cb) => cb.onchange = () => {
      draft.courses[cb.dataset.c] = cb.checked;
      if (!draft.courses.en && !draft.courses.py && !draft.courses.html) { draft.courses[cb.dataset.c] = true; cb.checked = true; toast('Выберите хотя бы одно направление'); }
      cb.closest('.check-card').classList.toggle('on', cb.checked);
    });
    if (view.querySelector('.load')) bindLoad(view, (m) => { draft.minutes = m; });
    view.querySelectorAll('.dchip').forEach((x) => x.onclick = () => {
      const i = +x.dataset.d; draft.studyDays[i] = !draft.studyDays[i];
      if (!draft.studyDays.some(Boolean)) { draft.studyDays[i] = true; toast('Оставьте хотя бы один учебный день'); }
      x.classList.toggle('on', draft.studyDays[i]);
    });
    view.querySelectorAll('[data-en]').forEach((x) => x.onclick = () => {
      if (x.dataset.en === 'A0') { draft.enStart = 'A0'; draw(); return; }
      renderPlacement(view, (level) => { draft.enStart = level; draw(); }, () => draw());
    });
    nb.onclick = () => {
      if (id === 'name') draft.name = nameIn.value.trim().slice(0, 30);
      if (id === 'plan') {
        const first = draft.courses.en ? 'en-a0-01' : draft.courses.py ? 'py-01' : 'html-01';
        done(first);
        return;
      }
      nextStep();
    };
  }
  draw();
  void sheet;
}
