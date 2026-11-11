// Talks to Supabase over plain fetch: sign in, keep the session fresh, load and save the app state.
// No SDK on purpose: fewer moving parts and no third-party script inside the app.
import { SUPABASE_URL, SUPABASE_KEY, NOTIFY_URL } from './config.js';

const AUTH_KEY = 'prumo.auth';
export const enabled = () => !!(SUPABASE_URL && SUPABASE_KEY);

let session = null;
try { session = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { session = null; }

const keep = s => {
  session = s;
  try { if (s) localStorage.setItem(AUTH_KEY, JSON.stringify(s)); else localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ }
};
const who = u => ({ id: u.id, email: u.email, role: (u.app_metadata || {}).role || 'user', plan: (u.app_metadata || {}).plan || 'beta', mustChange: !!(u.user_metadata || {}).must_change_pw });
const toSession = j => ({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, user: who(j.user) });

// Links from invite and password e-mails land here with the session in the address (#access_token=...).
// Read it once, then wipe it from the address bar and history.
let linkType = null, linkError = null;
(() => {
  const h = location.hash.replace(/^#/, '');
  if (!/(^|&)(access_token|error)=/.test(h)) return;
  const p = new URLSearchParams(h);
  history.replaceState(null, '', location.pathname + location.search + '#inicio');
  if (p.get('error')) { linkError = p.get('error_code') || p.get('error'); return; }
  linkType = p.get('type');
  session = { access: p.get('access_token'), refresh: p.get('refresh_token'), exp: Date.now() + (+p.get('expires_in') || 3600) * 1000, user: null };
})();
export const fromLink = () => ({ type: linkType, error: linkError });

// Fills in who is signed in (after an e-mail link, or to pick up a role or plan change).
export async function refreshUser() {
  const u = await call('/auth/v1/user');
  keep({ ...session, user: who(u) });
  return session.user;
}

async function call(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const tok = await token();
    if (!tok) throw Object.assign(new Error('signed out'), { code: 'auth' });
    h.Authorization = 'Bearer ' + tok;
  }
  const res = await fetch(SUPABASE_URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) throw Object.assign(new Error((data && (data.msg || data.message || data.error_description)) || res.statusText), { status: res.status, data });
  return data;
}

export const user = () => session && session.user;
// A session exists (the user may still be unknown right after an e-mail link).
export const hasSession = () => !!(session && session.access);

// A valid access token, refreshed a minute before it expires.
export async function token() {
  if (!session) return null;
  if (Date.now() < session.exp - 60000) return session.access;
  try {
    const j = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: session.refresh } });
    keep(toSession(j));
    return session.access;
  } catch (e) {
    // Only a refused refresh ends the session; a failed connection keeps it for offline use.
    if (e.status === 400 || e.status === 401) keep(null);
    return e.status ? null : session && session.access;
  }
}

export async function signIn(email, password, captchaToken) {
  const j = await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password, gotrue_meta_security: { captcha_token: captchaToken || undefined } } });
  keep(toSession(j));
  return session.user;
}

export async function signOut() {
  try { if (session) await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* the local session goes anyway */ }
  keep(null);
}

export async function setPassword(password) {
  const u = await call('/auth/v1/user', { method: 'PUT', body: { password, data: { must_change_pw: false } } });
  keep({ ...session, user: who(u) });
}

// Public "forgot my password": Supabase answers the same way whether the e-mail exists or not.
export async function recover(email, captchaToken) {
  await call('/auth/v1/recover', { method: 'POST', auth: false, body: { email, gotrue_meta_security: { captcha_token: captchaToken || undefined } } });
}

// Admin actions run on the server (supabase/functions/admin); the browser never holds the service key.
export async function admin(action, data = {}) {
  return call('/functions/v1/admin', { method: 'POST', body: { action, ...data } });
}

export async function loadState() {
  const rows = await call(`/rest/v1/app_state?select=state,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}`);
  return rows && rows[0] ? rows[0] : null;
}

export async function saveState(state) {
  await call('/rest/v1/app_state?on_conflict=user_id', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: session.user.id, state, updated_at: new Date().toISOString() },
  });
}

export async function deleteMe() {
  await call('/rest/v1/rpc/delete_me', { method: 'POST', body: {} });
  keep(null);
}

// Feedback and waitlist: saved in the database, and a copy goes to the inbox. Either one is enough.
export async function sendFeedback({ kind, message, screen, contact, source = 'app' }) {
  const jobs = [];
  if (enabled()) jobs.push(call('/rest/v1/feedback', { method: 'POST', auth: !!session, headers: { Prefer: 'return=minimal' }, body: { kind, message, screen: screen || null, contact: contact || null, source } }));
  jobs.push(notify({ _subject: `Prumo: feedback (${kind})`, tipo: kind, mensagem: message, tela: screen || '', contato: contact || '', usuario: session ? session.user.email : 'sem login', origem: source }));
  const r = await Promise.allSettled(jobs);
  if (!r.some(x => x.status === 'fulfilled')) throw new Error('not sent');
}

export async function notify(fields) {
  if (!NOTIFY_URL) throw new Error('no notify');
  const res = await fetch(NOTIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _template: 'table', _captcha: 'false', ...fields }) });
  if (!res.ok) throw new Error('notify ' + res.status);
}
