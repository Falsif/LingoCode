import { state } from './store.js';

const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function applyTheme() {
  const t = state.profile.theme;
  const dark = t === 'dark' || (t === 'system' && mq && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const bg = dark ? '#141221' : '#F8F7FF';
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = bg;
  if (window.LingoAndroid && window.LingoAndroid.setDark) window.LingoAndroid.setDark(dark);
}
if (mq) mq.addEventListener('change', applyTheme);
