// Вкладка «Прогресс»: общая статистика, курсы, графики активности, регулярность
import { state } from '../store.js';
import { esc, fmtDuration, pl } from '../util.js';
import { icon, progressBar, ring } from '../ui.js';
import { todayKey, addDays, parseKey, MONTHS, WEEKDAYS, weekday } from '../dates.js';
import { COURSES } from '../content/index.js';
import { levelInfo, streak, coursePct, courseLevelLabel, englishPathPct, ACHIEVEMENTS, achProgress } from '../game.js';
import { dayStatus, isRest } from '../plan.js';
import { sections } from '../srs.js';
import { go } from '../router.js';

let period = 'week';
let metric = 'xp';

function dayVal(k) {
  const d = state.days[k];
  if (!d || !d.ev) return 0;
  return metric === 'xp' ? d.ev.xp : Math.round(d.ev.time / 60);
}

function series() {
  const t = todayKey();
  if (period === 'week') return Array.from({ length: 7 }, (_, i) => { const k = addDays(t, i - 6); return { label: WEEKDAYS[weekday(k)], v: dayVal(k), hl: k === t }; });
  if (period === 'month') return Array.from({ length: 30 }, (_, i) => { const k = addDays(t, i - 29); const d = parseKey(k).getDate(); return { label: (i % 5 === 4 || i === 29) ? String(d) : '', v: dayVal(k), hl: k === t }; });
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const prefix = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    let v = 0;
    for (const [k, d] of Object.entries(state.days)) if (k.startsWith(prefix) && d.ev) v += metric === 'xp' ? d.ev.xp : Math.round(d.ev.time / 60);
    return { label: MONTHS[dt.getMonth()].slice(0, 3), v, hl: i === 11 };
  });
}

function barChart(data) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const w = 320, h = 140, pad = 18, bw = (w - 8) / data.length;
  const bars = data.map((d, i) => {
    const bh = Math.round((d.v / max) * (h - pad - 18));
    const x = 4 + i * bw + bw * 0.15;
    return `<rect x="${x.toFixed(1)}" y="${h - pad - bh}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(bh, d.v ? 2 : 0)}" rx="3" class="${d.hl ? 'hl' : ''}"><title>${d.v}</title></rect>${d.label ? `<text x="${(x + bw * 0.35).toFixed(1)}" y="${h - 4}" text-anchor="middle">${esc(d.label)}</text>` : ''}${d.v && data.length <= 12 ? `<text class="val" x="${(x + bw * 0.35).toFixed(1)}" y="${h - pad - bh - 4}" text-anchor="middle">${d.v}</text>` : ''}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="График активности"><line x1="0" x2="${w}" y1="${h - pad}" y2="${h - pad}" class="axis"/>${bars}</svg>`;
}

function regularity(days) {
  const t = todayKey();
  let planned = 0, done = 0, active = 0;
  for (let i = 0; i < days; i++) {
    const k = addDays(t, -i);
    if (k < todayKeyOf(state.createdAt)) break;
    const s = dayStatus(k);
    if (!isRest(k)) planned += 1;
    if (s === 'done') done += 1;
    if (s === 'done' || s === 'partial') active += 1;
  }
  return { planned, done, active, pct: planned ? Math.round((active / planned) * 100) : 0 };
}
function todayKeyOf(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export function renderProgress(view) {
  const lv = levelInfo();
  const lessonsDone = Object.values(state.lessons).filter((l) => l.done).length;
  const totalTime = Object.values(state.days).reduce((s, d) => s + ((d.ev && d.ev.time) || 0), 0);
  const words = Object.keys(state.words).length;
  const known = sections().known.length;
  const programs = state.programs.length + Object.keys(state.code).filter((k) => /^lesson:py/.test(k)).length;
  const pages = state.pages.length + Object.keys(state.code).filter((k) => /^lesson:html/.test(k)).length;
  const reg = regularity(30);
  const achGot = Object.keys(state.ach).length;

  function draw() {
    view.innerHTML = `<div class="page progress">
      <h1>Прогресс</h1>
      <section class="card lvl-card">${ring(lv.pct, String(lv.level), 84)}<div><div class="muted small">Общий уровень</div><b class="big">Уровень ${lv.level}</b><div class="small">${state.xp} XP всего · до следующего ${lv.need - lv.cur} XP</div>${progressBar(lv.pct)}</div></section>

      <section class="tiles">
        <div class="tile"><b>${lessonsDone}</b><span>уроков пройдено</span></div>
        <div class="tile"><b>${fmtDuration(totalTime)}</b><span>время обучения</span></div>
        <div class="tile"><b>${words}</b><span>английских слов${known ? ` · ${known} хорошо` : ''}</span></div>
        <div class="tile"><b>${streak()}</b><span>дней подряд · рекорд ${state.stats.bestStreak}</span></div>
        <div class="tile"><b>${programs}</b><span>программ на Python</span></div>
        <div class="tile"><b>${pages}</b><span>HTML-страниц</span></div>
      </section>

      <section class="card">
        <div class="card-h"><h2>Курсы</h2></div>
        <div class="crow"><span>🇬🇧 Английский <span class="pill sm">${esc(courseLevelLabel('en'))}</span></span><b>${englishPathPct()}%</b></div>${progressBar(englishPathPct())}
        <p class="small muted">Освоение пути A0 → C2 (каждый уровень — седьмая часть пути)</p>
        <div class="crow"><span>🐍 Python <span class="pill sm">${esc(courseLevelLabel('py'))}</span></span><b>${coursePct('py')}%</b></div>${progressBar(coursePct('py'))}
        <div class="crow"><span>🌐 HTML <span class="pill sm">${esc(courseLevelLabel('html'))}</span></span><b>${coursePct('html')}%</b></div>${progressBar(coursePct('html'))}
        <p class="small muted">Освоение оценивается не только по XP: учитываются пройденные уроки и итоговые тесты.</p>
      </section>

      <section class="card">
        <div class="card-h"><h2>Активность</h2>
          <div class="seg small"><button class="seg-b ${metric === 'xp' ? 'on' : ''}" data-mt="xp">XP</button><button class="seg-b ${metric === 'min' ? 'on' : ''}" data-mt="min">Минуты</button></div></div>
        <div class="seg small">${[['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']].map(([p, l]) => `<button class="seg-b ${period === p ? 'on' : ''}" data-p="${p}">${l}</button>`).join('')}</div>
        ${barChart(series())}
      </section>

      <section class="card">
        <div class="card-h"><h2>Регулярность за 30 дней</h2><b>${reg.pct}%</b></div>
        ${progressBar(reg.pct)}
        <p class="small muted">Занятия в ${pl(reg.active, ['день', 'дня', 'дней'])} из ${reg.planned} учебных; полностью выполненный план — ${pl(reg.done, ['день', 'дня', 'дней'])}. Дни отдыха не учитываются.</p>
      </section>

      <button class="banner" data-go="#/achievements">${icon('trophy')}<span><b>Достижения: ${achGot} из ${ACHIEVEMENTS.length}</b><span class="small">Коллекция значков</span></span>${icon('chev')}</button>
    </div>`;
    view.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { period = b.dataset.p; draw(); });
    view.querySelectorAll('[data-mt]').forEach((b) => b.onclick = () => { metric = b.dataset.mt; draw(); });
    view.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  }
  draw();
}

export function renderAchievements(view) {
  view.innerHTML = `<div class="page">
    <header class="page-h"><button class="icon-btn" onclick="history.back()" aria-label="Назад">${icon('back')}</button><h1>Достижения</h1></header>
    <div class="ach-grid">${ACHIEVEMENTS.map((a) => { const p = achProgress(a); return `<div class="ach ${p.got ? 'got' : ''}"><div class="ach-badge">${a.icon}</div><b>${esc(a.title)}</b><span class="small muted">${esc(a.desc)}</span>${p.got ? `<span class="small ok-text">Получено ${p.got.split('-').reverse().join('.')}</span>` : `${progressBar(p.pct, 'thin')}<span class="small muted">${p.v} / ${a.goal}</span>`}</div>`; }).join('')}</div>
  </div>`;
}
