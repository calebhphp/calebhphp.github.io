// Waitlist and feedback on the landing: saved in the database and copied to Matheus's inbox.
// Runs before the kit's own form handler (capture phase), so the kit only styles these forms.
import { SUPABASE_URL, SUPABASE_KEY, NOTIFY_URL } from '../app/js/config.js';

const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,24}$/i;

async function db(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('no db');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  // 409: the e-mail is already on the list, which is fine
  if (!res.ok && res.status !== 409) throw new Error('db ' + res.status);
}
async function inbox(fields) {
  if (!NOTIFY_URL) throw new Error('no inbox');
  const res = await fetch(NOTIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _template: 'table', _captcha: 'false', ...fields }) });
  if (!res.ok) throw new Error('inbox ' + res.status);
}

function fieldError(input, msg) {
  const err = document.getElementById(input.getAttribute('aria-describedby'));
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) { err.hidden = !msg; if (msg) err.textContent = msg; }
  return !msg;
}

async function send(form, checks, jobs) {
  const status = form.querySelector('[data-form-status]');
  const bad = checks.filter(([input, msg]) => !fieldError(input, msg));
  if (bad.length) { status.textContent = bad.length === 1 ? 'Falta arrumar um campo.' : `Faltam arrumar ${bad.length} campos.`; bad[0][0].focus(); return; }
  // Bots fill every field, people never see this one.
  if (form.querySelector('[name="_honey"]')?.value) { form.reset(); status.textContent = form.dataset.sent; return; }
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true; status.textContent = 'Enviando';
  const r = await Promise.allSettled(jobs());
  btn.disabled = false;
  if (r.some(x => x.status === 'fulfilled')) { form.reset(); status.textContent = form.dataset.sent; }
  else status.textContent = 'Não enviou, a conexão falhou. O texto continua aí, tenta de novo.';
}

addEventListener('submit', e => {
  const form = e.target;
  if (!form.matches('form.wait, form.fb')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (form.matches('.wait')) {
    const email = form.querySelector('[name="email"]'), ok = form.querySelector('[name="consent"]');
    const v = email.value.trim();
    send(form, [[email, EMAIL.test(v) ? '' : 'Escreva um e-mail com @, tipo nome@exemplo.com.'], [ok, ok.checked ? '' : 'Marque a caixa para entrar na lista.']], () => [
      db('waitlist', { email: v.toLowerCase(), consent: true, source: 'landing' }),
      inbox({ _subject: 'Prumo: nova pessoa na lista de espera', email: v, consentimento: 'sim, marcou a caixa', origem: 'landing' }),
    ]);
  } else {
    const msg = form.querySelector('[name="message"]'), contact = form.querySelector('[name="contact"]'), kind = form.querySelector('[name="kind"]');
    const m = msg.value.trim(), c = contact.value.trim();
    send(form, [[msg, m.length >= 3 ? '' : 'Escreve pelo menos uma frase.'], [contact, !c || EMAIL.test(c) ? '' : 'Esse e-mail parece incompleto. Pode deixar em branco.']], () => [
      db('feedback', { kind: kind.value, message: m.slice(0, 4000), contact: c || null, source: 'landing' }),
      inbox({ _subject: `Prumo: feedback da landing (${kind.value})`, tipo: kind.value, mensagem: m, contato: c || '', origem: 'landing' }),
    ]);
  }
}, true);
