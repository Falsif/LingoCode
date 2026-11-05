// Изолированная среда Python (Pyodide, WebAssembly) в отдельном потоке.
// - нет доступа к странице, DOM и данным приложения;
// - сетевые API потока удаляются сразу после загрузки интерпретатора;
// - файловая система виртуальная (в памяти) и очищается между запусками;
// - зависшую программу главный поток останавливает, уничтожая этот worker.
/* global loadPyodide */
const BASE = new URL('../../vendor/pyodide/', self.location).href;
importScripts(BASE + 'pyodide.js');

const SETUP = `
import sys, io, json, traceback, builtins, os, importlib

class _LCOut(io.StringIO):
    LIMIT = 20000
    def write(self, s):
        if self.tell() + len(s) > self.LIMIT:
            super().write(s[: max(0, self.LIMIT - self.tell())])
            raise _LCOutputLimit()
        return super().write(s)

class _LCOutputLimit(BaseException):
    pass

for _m in ('js', 'pyodide_js', 'pyodide.http', 'micropip', 'pyodide.webloop'):
    sys.modules[_m] = None

_LC_BASE_MODULES = set(sys.modules)
_LC_HOME = '/home/pyodide'

def _lc_clean_fs():
    for root, dirs, files in os.walk(_LC_HOME, topdown=False):
        for f in files:
            try: os.remove(os.path.join(root, f))
            except Exception: pass
        for d in dirs:
            try: os.rmdir(os.path.join(root, d))
            except Exception: pass
    os.chdir(_LC_HOME)

def _lc_err(e, filename='main.py'):
    t = type(e).__name__
    if isinstance(e, SyntaxError):
        return {'type': t, 'msg': e.msg, 'line': e.lineno, 'text': (e.text or '').rstrip('\\n'), 'file': e.filename}
    line = None
    for fr in traceback.extract_tb(e.__traceback__):
        if fr.filename == filename:
            line = fr.lineno
    return {'type': t, 'msg': str(e), 'line': line, 'text': '', 'file': filename}

def _lc_run(code, inputs, pre, post, echo):
    out = _LCOut()
    feed = list(inputs)
    def _input(prompt=''):
        if echo:
            out.write(str(prompt))
        if not feed:
            raise EOFError('LC_NO_INPUT')
        v = feed.pop(0)
        if echo:
            out.write(v + '\\n')
        return v
    ns = {'__name__': '__main__', '__builtins__': builtins, 'input': _input}
    res = {'ok': True, 'out': '', 'err': None, 'check': None, 'limit': False, 'left': 0}
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    try:
        if pre:
            exec(compile(pre, 'pre.py', 'exec'), ns)
        exec(compile(code, 'main.py', 'exec'), ns)
        if post:
            try:
                exec(compile(post, 'check.py', 'exec'), ns)
            except AssertionError as e:
                res['ok'] = False
                res['check'] = str(e) or 'Проверка не пройдена'
    except _LCOutputLimit:
        res['ok'] = False
        res['limit'] = True
    except SystemExit:
        pass
    except BaseException as e:
        res['ok'] = False
        res['err'] = _lc_err(e)
    finally:
        sys.stdout, sys.stderr = old_out, old_err
        res['out'] = out.getvalue()
        res['left'] = len(feed)
        for m in list(sys.modules):
            if m not in _LC_BASE_MODULES:
                del sys.modules[m]
        if 'random' in sys.modules:
            importlib.reload(sys.modules['random'])
        _lc_clean_fs()
    return json.dumps(res)
`;

let py = null;
let run = null;

(async () => {
  try {
    py = await loadPyodide({ indexURL: BASE, stdout: () => {}, stderr: () => {} });
    py.runPython(SETUP);
    run = py.globals.get('_lc_run');
    // Убираем всё, через что можно выйти в сеть
    for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'WebTransport']) {
      try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch (e) { /* ignore */ }
    }
    self.postMessage({ type: 'ready' });
  } catch (e) {
    self.postMessage({ type: 'fatal', msg: String(e && e.message || e) });
  }
})();

self.onmessage = (e) => {
  const { id, code, inputs = [], pre = '', post = '', echo = true } = e.data || {};
  if (!run) { self.postMessage({ type: 'result', id, res: { ok: false, out: '', err: { type: 'NotReady', msg: 'Python ещё загружается' } } }); return; }
  let res;
  try {
    const inp = py.toPy(inputs.map(String));
    res = JSON.parse(run(String(code), inp, String(pre), String(post), !!echo));
    inp.destroy();
  } catch (err) {
    res = { ok: false, out: '', err: { type: 'InternalError', msg: String(err && err.message || err) } };
  }
  self.postMessage({ type: 'result', id, res });
};
