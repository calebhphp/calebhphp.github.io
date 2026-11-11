// Cloudflare Turnstile on the real-account login and on "forgot my password".
// Supabase Attack Protection asks for a token on those calls; the demo login never needs one.
import { TURNSTILE_KEY } from './config.js?v=2';

let widget = null, tok = null, loading = null;

export const enabled = () => !!TURNSTILE_KEY;
export const token = () => tok;

const load = () => loading || (loading = new Promise((ok, fail) => {
  if (window.turnstile) return ok();
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true; s.onload = ok; s.onerror = () => { loading = null; fail(new Error('captcha script')); };
  document.head.appendChild(s);
}));

export async function mount(el) {
  if (!enabled() || widget !== null || !el) return;
  try {
    await load();
    widget = window.turnstile.render(el, {
      sitekey: TURNSTILE_KEY, theme: 'auto', language: 'pt-br', size: 'flexible',
      callback: t => { tok = t; }, 'expired-callback': () => { tok = null; }, 'error-callback': () => { tok = null; },
    });
  } catch (e) { widget = null; }
}

// A token works once: ask for a new one after every attempt.
export function reset() {
  tok = null;
  if (widget !== null && window.turnstile) { try { window.turnstile.reset(widget); } catch (e) { /* ignore */ } }
}
