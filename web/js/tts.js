// Озвучка английского: в Android — системный TextToSpeech через мост,
// в браузере — Web Speech API.
import { state } from './store.js';
import { toast } from './ui.js';

let voice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => /en[-_]GB/i.test(v.lang)) || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) {
  voice = pickVoice();
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}

export function ttsAvailable() {
  return !!((window.LingoAndroid && window.LingoAndroid.speak) || 'speechSynthesis' in window);
}

export function speak(text, slow = false) {
  const rate = (state.profile.ttsRate || 0.9) * (slow ? 0.6 : 1);
  if (window.LingoAndroid && window.LingoAndroid.speak) {
    window.LingoAndroid.speak(String(text), rate);
    return true;
  }
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = voice ? voice.lang : 'en-GB';
    if (voice) u.voice = voice;
    u.rate = rate;
    speechSynthesis.speak(u);
    return true;
  }
  toast('Озвучка недоступна на этом устройстве');
  return false;
}

// Вызывается из Android, если не установлены голосовые данные
window.lcTtsMissing = () => toast('Установите английский голос: Настройки → Синтез речи', 'warn');
