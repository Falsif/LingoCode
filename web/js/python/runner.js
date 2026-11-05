// Запуск Python-кода в отдельном потоке с ограничением времени.
let worker = null;
let ready = null;
let readyResolve = null;
let seq = 0;
const pending = new Map();
let state = 'idle'; // idle | loading | ready | error
const statusListeners = new Set();

function setState(s) { state = s; statusListeners.forEach((f) => f(s)); }
export function onPyStatus(fn) { statusListeners.add(fn); fn(state); return () => statusListeners.delete(fn); }
export function pyState() { return state; }

function boot() {
  setState('loading');
  ready = new Promise((r) => { readyResolve = r; });
  worker = new Worker(new URL('./worker.js', import.meta.url));
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'ready') { setState('ready'); readyResolve(true); }
    else if (m.type === 'fatal') { setState('error'); readyResolve(false); console.error('Pyodide:', m.msg); }
    else if (m.type === 'result') {
      const p = pending.get(m.id);
      if (p) { clearTimeout(p.timer); pending.delete(m.id); p.resolve(m.res); }
    }
  };
  worker.onerror = (e) => {
    console.error('Python worker error', e.message);
    if (state === 'loading') { setState('error'); readyResolve(false); }
  };
}

export function warmPython() { if (!worker) boot(); return ready; }

function restart() {
  try { worker && worker.terminate(); } catch (e) { /* ignore */ }
  worker = null;
  for (const p of pending.values()) { clearTimeout(p.timer); p.resolve({ ok: false, out: '', err: { type: 'Restart', msg: '' } }); }
  pending.clear();
  boot();
}

let chain = Promise.resolve();
// Запуски выполняются строго по очереди
export function runPython(code, opts = {}) {
  const job = chain.then(() => runOne(code, opts));
  chain = job.catch(() => {});
  return job;
}

async function runOne(code, { inputs = [], pre = '', post = '', echo = true, timeout = 5000 } = {}) {
  if (!worker) boot();
  const ok = await ready;
  if (!ok) return { ok: false, out: '', err: { type: 'LoadError', msg: 'Не удалось загрузить Python' } };
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ ok: false, out: '', timeout: true });
      restart(); // бесконечный цикл — пересоздаём изолированную среду
    }, timeout);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, code, inputs, pre, post, echo });
  });
}

const norm = (s) => String(s).replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');

// Проверка решения по набору тестов. Возвращает { pass, results, firstFail }
export async function checkPython(ex, code) {
  const tests = ex.tests && ex.tests.length ? ex.tests : [{}];
  const results = [];
  if (ex.need && ex.need.length) {
    const has = (s) => code.includes(s);
    const okNeed = ex.needAny ? ex.need.some(has) : ex.need.every(has);
    if (!okNeed) {
      const miss = ex.needAny ? ex.need.join(' или ') : ex.need.filter((s) => !has(s)).join(', ');
      return { pass: false, firstFail: { kind: 'need', msg: `В решении нужно использовать: ${miss.trim()}` }, results };
    }
  }
  for (const t of tests) {
    const res = await runPython(code, { inputs: t.in || [], pre: ex.pre || '', post: ex.check || '', echo: false, timeout: 6000 });
    let pass = res.ok;
    let kind = null, msg = '';
    if (res.timeout) { pass = false; kind = 'timeout'; }
    else if (res.err) { pass = false; kind = 'error'; }
    else if (res.check) { pass = false; kind = 'check'; msg = res.check; }
    else if (res.limit) { pass = false; kind = 'limit'; }
    else if (t.out !== undefined && norm(res.out) !== norm(t.out)) { pass = false; kind = 'output'; }
    const r = { test: t, res, pass, kind, msg };
    results.push(r);
    if (!pass) return { pass: false, results, firstFail: r };
  }
  return { pass: true, results };
}
