// Простой hash-роутер
const routes = [];
let depth = 0;
let view = null;
let onRoute = null;
let current = null;

export function route(pattern, handler, opts = {}) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ re, keys, handler, opts });
}

export function go(hash, { replace = false } = {}) {
  if (location.hash === hash) { render(); return; }
  if (replace) location.replace(hash);
  else { depth += 1; location.hash = hash; }
}

export function back() {
  if (depth > 0) { depth -= 1; history.back(); return true; }
  if (location.hash !== '#/home') { location.replace('#/home'); return true; }
  return false;
}

export function currentRoute() { return current; }

export function render() {
  const path = (location.hash || '#/home').slice(1);
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      current = { path, params, opts: r.opts };
      onRoute && onRoute(current);
      view.scrollTop = 0;
      window.scrollTo(0, 0);
      r.handler(view, params);
      return;
    }
  }
  location.replace('#/home');
}

export function startRouter(v, cb) {
  view = v; onRoute = cb;
  window.addEventListener('hashchange', render);
  render();
}
