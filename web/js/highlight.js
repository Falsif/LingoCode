// Лёгкая подсветка синтаксиса Python и HTML без внешних библиотек
import { esc } from './util.js';

const PY_KW = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(' '));
const PY_BI = new Set('print input int float str bool len range list dict set tuple sum min max abs round sorted enumerate zip type open isinstance map filter any all reversed super object'.split(' '));
const PY_RE = /(#[^\n]*)|([rRbBfFuU]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_Ѐ-ӿ][\wЀ-ӿ]*)|(\s+)|([^\sA-Za-z_\d#"'Ѐ-ӿ]+)|([\s\S])/g;

export function highlightPython(code) {
  let out = '';
  let prev = '';
  let m;
  PY_RE.lastIndex = 0;
  while ((m = PY_RE.exec(code))) {
    const [tok, com, str, num, word, ws] = m;
    if (com) out += `<span class="t-com">${esc(com)}</span>`;
    else if (str) out += `<span class="t-str">${esc(str)}</span>`;
    else if (num) out += `<span class="t-num">${esc(num)}</span>`;
    else if (word) {
      if (PY_KW.has(word)) out += `<span class="t-kw">${word}</span>`;
      else if (prev === 'def' || prev === 'class') out += `<span class="t-fn">${esc(word)}</span>`;
      else if (PY_BI.has(word)) out += `<span class="t-bi">${word}</span>`;
      else out += esc(word);
      prev = word;
      continue;
    } else if (ws) { out += ws; continue; }
    else out += `<span class="t-op">${esc(tok)}</span>`;
    prev = '';
  }
  return out;
}

const HTML_RE = /(<!--[\s\S]*?(?:-->|$))|(<!DOCTYPE[^>]*>?)|(<\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"?|'[^']*'?|[^\s>]+))?)*)(\s*)(\/?>)?|([^<]+)|(<)/gi;
const ATTR_RE = /(\s+)([^\s=>/]+)(?:(\s*=\s*)("[^"]*"?|'[^']*'?|[^\s>]+))?/g;

export function highlightHTML(code) {
  let out = '';
  let m;
  HTML_RE.lastIndex = 0;
  while ((m = HTML_RE.exec(code))) {
    const [, com, doc, open, name, attrs, sp2, close, text, lt] = m;
    if (com) out += `<span class="t-com">${esc(com)}</span>`;
    else if (doc) out += `<span class="t-kw">${esc(doc)}</span>`;
    else if (name) {
      out += `<span class="t-op">${esc(open)}</span><span class="t-tag">${esc(name)}</span>`;
      if (attrs) {
        out += attrs.replace(ATTR_RE, (_, sp, an, eq, av) => `${sp}<span class="t-attr">${esc(an)}</span>${eq ? `<span class="t-op">${esc(eq)}</span><span class="t-str">${esc(av || '')}</span>` : ''}`);
      }
      if (sp2) out += sp2;
      if (close) out += `<span class="t-op">${esc(close)}</span>`;
    } else if (text) out += esc(text);
    else if (lt) out += '&lt;';
  }
  return out;
}

export function highlight(code, lang) {
  return lang === 'html' ? highlightHTML(code) : highlightPython(code);
}
