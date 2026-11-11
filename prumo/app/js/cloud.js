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
const toSession = j => ({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, user: { id: j.user.id, email: j.user.email } });

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

export async function signIn(email, password) {
  const j = await call('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } });
  keep(toSession(j));
  return session.user;
}

export async function signOut() {
  try { if (session) await call('/auth/v1/logout', { method: 'POST' }); } catch (e) { /* the local session goes anyway */ }
  keep(null);
}

export async function setPassword(password) {
  await call('/auth/v1/user', { method: 'PUT', body: { password } });
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
