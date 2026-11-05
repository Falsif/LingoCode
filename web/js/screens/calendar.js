// Календарь: месяц с цветовыми отметками, детали дня, перенос и добавление заданий, дни отдыха
import { state, peekDay } from '../store.js';
import { esc, pl, fmtDuration } from '../util.js';
import { icon, progressBar, sheet, toast } from '../ui.js';
import { todayKey, parseKey, dateKey, weekday, WEEKDAYS, MONTHS, humanDate, addDays } from '../dates.js';
import { getPlan, liveTasks, taskProgress, taskTitle, taskMinutes, dayStatus, isRest, setRest, moveTask, addTask, removeTask, setTaskCount, toggleCustom, KINDS } from '../plan.js';
import { getLesson } from '../content/index.js';
import { go } from '../router.js';
import { checkAchievements } from '../game.js';

let ym = null; // { y, m }
const STATUS_TEXT = { done: 'Все задания выполнены', partial: 'Выполнена часть заданий', none: 'Занятий не было', rest: 'День отдыха', future: 'Запланировано', today: 'Сегодня — задания ждут', before: 'До начала обучения' };

export function renderCalendar(view, params) {
  const t = todayKey();
  let sel = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : t;
  const sd = parseKey(sel);
  if (!ym || params.date) ym = { y: sd.getFullYear(), m: sd.getMonth() };

  function draw() {
    const first = new Date(ym.y, ym.m, 1, 12);
    const startK = addDays(dateKey(first), -weekday(dateKey(first)));
    const cells = Array.from({ length: 42 }, (_, i) => addDays(startK, i));
    const lastRowNeeded = cells.slice(35).some((k) => parseKey(k).getMonth() === ym.m);
    const shown = lastRowNeeded ? cells : cells.slice(0, 35);
    const years = []; for (let y = new Date(state.createdAt).getFullYear() - 1; y <= new Date().getFullYear() + 2; y++) years.push(y);

    view.innerHTML = `<div class="page calendar">
      <h1>Календарь</h1>
      <div class="cal card">
        <div class="cal-h">
          <button class="icon-btn" data-nav="-1" aria-label="Предыдущий месяц">${icon('back')}</button>
          <div class="cal-title"><select class="sel-m" aria-label="Месяц">${MONTHS.map((n, i) => `<option value="${i}" ${i === ym.m ? 'selected' : ''}>${n}</option>`).join('')}</select><select class="sel-y" aria-label="Год">${years.map((y) => `<option ${y === ym.y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
          <button class="icon-btn" data-nav="1" aria-label="Следующий месяц">${icon('chev')}</button>
        </div>
        <div class="cal-grid wd-h">${WEEKDAYS.map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">${shown.map((k) => {
          const d = parseKey(k);
          const other = d.getMonth() !== ym.m;
          const stt = dayStatus(k);
          return `<button class="cday s-${stt} ${other ? 'other' : ''} ${k === t ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-k="${k}" aria-label="${humanDate(k)}: ${STATUS_TEXT[stt]}">${d.getDate()}</button>`;
        }).join('')}</div>
        <div class="legend"><span><i class="s-done"></i>всё выполнено</span><span><i class="s-partial"></i>часть</span><span><i class="s-none"></i>не было</span><span><i class="s-rest"></i>отдых</span></div>
        ${ym.y !== new Date().getFullYear() || ym.m !== new Date().getMonth() ? '<button class="link today-btn">Вернуться к сегодня</button>' : ''}
      </div>
      <div class="day-panel"></div>
    </div>`;
    view.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { ym.m += +b.dataset.nav; if (ym.m < 0) { ym.m = 11; ym.y -= 1; } if (ym.m > 11) { ym.m = 0; ym.y += 1; } draw(); });
    view.querySelector('.sel-m').onchange = (e) => { ym.m = +e.target.value; draw(); };
    view.querySelector('.sel-y').onchange = (e) => { ym.y = +e.target.value; draw(); };
    const tb = view.querySelector('.today-btn');
    if (tb) tb.onclick = () => { sel = t; ym = { y: new Date().getFullYear(), m: new Date().getMonth() }; draw(); };
    view.querySelectorAll('.cday').forEach((b) => b.onclick = () => {
      sel = b.dataset.k;
      const d = parseKey(sel);
      if (d.getMonth() !== ym.m) ym = { y: d.getFullYear(), m: d.getMonth() };
      draw();
      view.querySelector('.day-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    drawDay();
  }

  function drawDay() {
    const panel = view.querySelector('.day-panel');
    const d = peekDay(sel);
    const ev = d && d.ev;
    const plan = getPlan(sel, { create: false });
    const tasks = plan ? plan.tasks : [];
    const rest = isRest(sel);
    const stt = dayStatus(sel);
    const past = sel < t;
    const lessons = ev ? ev.done.map((id) => id.startsWith('test:') ? 'Итоговый тест' : (getLesson(id) || {}).title).filter(Boolean) : [];
    const moved = tasks.filter((x) => x.status === 'moved');
    panel.innerHTML = `<section class="card">
      <div class="card-h"><div><h2>${esc(humanDate(sel))}</h2><span class="status-pill s-${stt}">${STATUS_TEXT[stt]}</span></div>
        ${sel >= t ? `<button class="btn ghost sm rest-btn">${icon(rest ? 'book' : 'cup')} ${rest ? 'Сделать учебным' : 'Сделать днём отдыха'}</button>` : ''}</div>
      ${ev && (ev.xp || ev.time || lessons.length || ev.cards) ? `<div class="day-stats">
        <div><b>${ev.xp}</b><span>XP</span></div><div><b>${fmtDuration(ev.time)}</b><span>занятий</span></div><div><b>${lessons.length}</b><span>${['урок', 'урока', 'уроков'][lessons.length === 1 ? 0 : lessons.length > 1 && lessons.length < 5 ? 1 : 2]}</span></div><div><b>${ev.cards}</b><span>повторено</span></div></div>` : ''}
      <h3 class="sub">Задания</h3>
      ${liveTasks(plan).length ? `<ul class="tasks">${liveTasks(plan).map((x) => {
        const p = taskProgress(sel, x);
        const custom = x.kind === 'custom';
        return `<li class="task ${p.done ? 'done' : ''}" data-id="${x.id}">
          <button class="tick ${custom ? 'manual' : ''}" ${custom ? '' : 'disabled'} aria-label="${custom ? 'Отметить' : 'Отмечается автоматически'}">${p.done ? icon('check') : ''}</button>
          <span class="t-body"><span>${esc(taskTitle(x))}</span><span class="small muted">${custom ? 'своё задание · отмечается вручную' : `~${taskMinutes(x)} мин · ${KINDS[x.kind].xp ? `+${KINDS[x.kind].xp * x.n} XP · ` : ''}отмечается автоматически`}${x.movedFrom ? ` · перенесено с ${humanDate(x.movedFrom, false)}` : ''}</span>${!custom && x.n > 1 ? progressBar((p.cur / p.n) * 100, 'thin') : ''}</span>
          <span class="t-acts">${!custom ? `<span class="small muted">${p.cur}/${p.n}</span>` : ''}${!p.done ? `<button class="icon-btn sm t-more" aria-label="Действия">${icon('edit')}</button>` : ''}</span></li>`;
      }).join('')}</ul>` : `<p class="muted small">${rest ? 'День отдыха — заданий нет. Отдых не прерывает серию занятий.' : past ? 'В этот день план не составлялся.' : 'Заданий нет.'}</p>`}
      ${moved.length ? `<p class="small muted">Перенесено: ${moved.map((x) => `${esc(taskTitle(x))} → ${humanDate(x.movedTo, false)}`).join('; ')}</p>` : ''}
      <button class="btn ghost sm add-task">${icon('plus')} Добавить задание</button>
      ${lessons.length ? `<h3 class="sub">Пройдено</h3><ul class="plain">${lessons.map((l) => `<li>${icon('check')} ${esc(l)}</li>`).join('')}</ul>` : ''}
      ${ev && ev.words.length ? `<h3 class="sub">Изученные и повторённые слова</h3><div class="chips">${ev.words.slice(0, 40).map((w) => `<span class="chip ghost">${esc(w)}</span>`).join('')}${ev.words.length > 40 ? `<span class="muted small">и ещё ${ev.words.length - 40}</span>` : ''}</div>` : ''}
      ${ev && ev.topics.length ? `<h3 class="sub">Темы</h3><p class="small">${ev.topics.map(esc).join(' · ')}</p>` : ''}
    </section>`;

    const rb = panel.querySelector('.rest-btn');
    if (rb) rb.onclick = () => { setRest(sel, !rest); toast(rest ? 'День стал учебным' : 'День отдыха запланирован'); draw(); };
    panel.querySelector('.add-task').onclick = () => addTaskSheet(sel, draw);
    panel.querySelectorAll('.task').forEach((li) => {
      const id = li.dataset.id;
      const x = tasks.find((q) => q.id === id);
      const tick = li.querySelector('.tick.manual');
      if (tick) tick.onclick = () => { toggleCustom(sel, id); checkAchievements(); draw(); };
      const more = li.querySelector('.t-more');
      if (more) more.onclick = () => taskSheet(sel, x, draw);
    });
  }
  draw();
}

function taskSheet(k, x, redraw) {
  const t = todayKey();
  const custom = x.kind === 'custom';
  const tomorrow = addDays(k < t ? t : k, k < t ? 0 : 1);
  const s = sheet(`<h3>${esc(taskTitle(x))}</h3>
    ${!custom ? `<label class="lbl">Количество<div class="stepper"><button class="icon-btn" data-d="-1">−</button><b class="cnt">${x.n}</b><button class="icon-btn" data-d="1">${icon('plus')}</button></div></label>` : ''}
    <label class="lbl">Перенести на дату<input type="date" class="field mv-date" value="${tomorrow}" min="${t}"></label>
    <div class="col gap">
      <button class="btn primary block mv">${icon('arrow')} Перенести</button>
      ${k < t ? `<button class="btn secondary block mv-today">Выполнить сегодня</button>` : ''}
      <button class="btn ghost block danger-text del">${icon('trash')} Удалить из плана</button>
    </div>`);
  const r = s.root;
  r.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { setTaskCount(k, x.id, x.n + +b.dataset.d); r.querySelector('.cnt').textContent = x.n; redraw(); });
  r.querySelector('.mv').onclick = () => {
    const to = r.querySelector('.mv-date').value;
    if (!to || to < t) return toast('Выберите сегодняшнюю или будущую дату');
    if (to === k) return toast('Это тот же день');
    moveTask(k, x.id, to); s.close(); toast(`Перенесено на ${humanDate(to, false)}`); redraw();
  };
  const mt = r.querySelector('.mv-today');
  if (mt) mt.onclick = () => { moveTask(k, x.id, t); s.close(); toast('Задание перенесено на сегодня'); redraw(); };
  r.querySelector('.del').onclick = () => { removeTask(k, x.id); s.close(); redraw(); };
}

function addTaskSheet(k, redraw) {
  const kinds = Object.entries(KINDS).filter(([id, v]) => id !== 'custom' && state.profile.courses[v.course]);
  const s = sheet(`<h3>Новое задание · ${esc(humanDate(k, false))}</h3>
    <div class="seg small"><button class="seg-b on" data-m="auto">Учебное</button><button class="seg-b" data-m="custom">Своё</button></div>
    <div class="m-auto">${kinds.map(([id, v]) => `<label class="radio"><input type="radio" name="kind" value="${id}"> ${esc(v.label)}</label>`).join('')}
      <label class="lbl">Количество<input type="number" class="field cnt" min="1" max="50" value="1"></label>
      <p class="small muted">Учебные задания отмечаются автоматически, когда вы действительно их выполните.</p></div>
    <div class="m-custom hidden"><label class="lbl">Что сделать<input type="text" class="field txt" maxlength="120" placeholder="Например: посмотреть видео на английском"></label><p class="small muted">Своё задание отмечается вручную.</p></div>
    <button class="btn primary block ok">Добавить</button>`);
  const r = s.root;
  let mode = 'auto';
  r.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
    mode = b.dataset.m;
    r.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
    r.querySelector('.m-auto').classList.toggle('hidden', mode !== 'auto');
    r.querySelector('.m-custom').classList.toggle('hidden', mode !== 'custom');
  });
  const firstRadio = r.querySelector('input[name=kind]');
  if (firstRadio) firstRadio.checked = true;
  r.querySelector('.ok').onclick = () => {
    if (mode === 'custom') {
      const txt = r.querySelector('.txt').value.trim();
      if (!txt) return toast('Напишите, что нужно сделать');
      addTask(k, 'custom', 1, txt);
    } else {
      const kind = (r.querySelector('input[name=kind]:checked') || {}).value;
      if (!kind) return toast('Выберите задание');
      addTask(k, kind, Math.max(1, Math.min(50, +r.querySelector('.cnt').value || 1)));
    }
    s.close(); redraw();
  };
}
