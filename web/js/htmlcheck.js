// Проверка HTML-заданий через анализ структуры документа.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', '!doctype']);
const OPTIONAL_END = new Set(['li', 'p', 'td', 'th', 'tr', 'option', 'thead', 'tbody', 'dt', 'dd', 'html', 'head', 'body']);

export function parseHTML(src) {
  return new DOMParser().parseFromString(src, 'text/html');
}

function rx(s, flags = 'iu') { try { return new RegExp(s, flags); } catch { return /$^/; } }

function runCheck(c, doc, src) {
  if (c.src) return rx(c.src.re || c.src).test(src);
  if (c.re) return rx(c.re).test(src);
  if (c.style) {
    const css = [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    return rx(c.style).test(css);
  }
  if (c.labels) {
    const fields = [...doc.querySelectorAll('input, select, textarea')].filter((f) => !/^(hidden|submit|button|reset|image)$/i.test(f.getAttribute('type') || ''));
    if (!fields.length) return false;
    return fields.every((f) => (f.id && doc.querySelector(`label[for="${CSS.escape(f.id)}"]`)) || f.closest('label') || f.getAttribute('aria-label'));
  }
  if (c.anchors) {
    const links = [...doc.querySelectorAll('nav a[href^="#"]')].filter((a) => a.getAttribute('href').length > 1);
    if (!links.length) return false;
    return links.every((a) => { try { return !!doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); } catch { return false; } });
  }
  let els;
  try { els = [...doc.querySelectorAll(c.sel)]; } catch { return false; }
  if (c.text !== undefined) els = els.filter((e) => rx(c.text).test(e.textContent.replace(/\s+/g, ' ').trim()));
  if (c.attr) els = els.filter((e) => e.hasAttribute(c.attr) && rx(c.attrRe || '.*').test(e.getAttribute(c.attr).trim()));
  const min = c.min ?? (c.max !== undefined ? 0 : 1);
  return els.length >= min && (c.max === undefined || els.length <= c.max);
}

// Поиск незакрытых тегов — подсказка, а не причина провала
export function tagWarnings(src) {
  const warn = [];
  const stack = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*|!doctype)\b[^>]*?(\/?)>/gi;
  const clean = src.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/<(?!\/?(script|style))/gi, ' '));
  let m;
  while ((m = re.exec(clean))) {
    if (!m[2]) continue;
    const name = m[2].toLowerCase();
    if (VOID.has(name) || m[3]) continue;
    if (!m[1]) stack.push(name);
    else {
      const i = stack.lastIndexOf(name);
      if (i === -1) warn.push(`Закрывающий тег </${name}> без открывающего`);
      else {
        for (const left of stack.splice(i).slice(1)) if (!OPTIONAL_END.has(left)) warn.push(`Похоже, не закрыт тег <${left}>`);
      }
    }
  }
  for (const left of stack) if (!OPTIONAL_END.has(left)) warn.push(`Похоже, не закрыт тег <${left}>`);
  return [...new Set(warn)].slice(0, 3);
}

export function checkHTML(ex, src) {
  const doc = parseHTML(src);
  const fails = [];
  for (const s of ex.src || []) if (!runCheck({ src: s }, doc, src)) fails.push(s.msg);
  for (const c of ex.checks || []) if (!runCheck(c, doc, src)) fails.push(c.msg);
  return { pass: fails.length === 0, fails, warnings: tagWarnings(src), total: (ex.src || []).length + (ex.checks || []).length };
}

// Документ для безопасного предпросмотра в iframe sandbox (без доступа к приложению)
export function previewDoc(src) {
  const base = new URL('media/', document.baseURI).href;
  const guard = `<base href="${base}"><script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a){var h=a.getAttribute('href')||'';if(h.charAt(0)!=='#'){e.preventDefault();}}},true);document.addEventListener('submit',function(e){e.preventDefault();},true);<\/script>`;
  if (/<head[^>]*>/i.test(src)) return src.replace(/<head[^>]*>/i, (m) => m + guard);
  if (/<html[^>]*>/i.test(src)) return src.replace(/<html[^>]*>/i, (m) => m + '<head>' + guard + '</head>');
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' + guard + '<style>body{font-family:sans-serif;margin:12px;line-height:1.4}</style></head><body>' + src + '</body></html>';
}
