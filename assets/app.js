(() => {
  const SITE = window.SITE || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const waLink = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // WhatsApp links with a ready message
  const wire = (root = document) => root.querySelectorAll('[data-wa]').forEach((el) => {
    el.href = waLink(el.dataset.wa);
    el.target = '_blank';
    el.rel = 'noopener';
  });
  wire();

  // Light / dark theme: follows the system until the visitor picks one
  const root = document.documentElement;
  const sysDark = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const sync = () => btn.setAttribute('aria-pressed', current() === 'dark');
    sync();
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
    sysDark.addEventListener('change', sync);
  });

  // Launch promotion: one static bar the visitor can close
  const P = SITE.promo;
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const promoLive = P && new Date() <= new Date(P.end + "T23:59:59");
  document.querySelectorAll("[data-promo-bar]").forEach((bar) => {
    if (!promoLive || store.get("promo-bar-closed") === P.end) { bar.hidden = true; return; }
    bar.querySelector("[data-promo-close]")?.addEventListener("click", () => { bar.hidden = true; store.set("promo-bar-closed", P.end); });
  });
  // Hairline under the top bar after leaving the top
  const nav = document.querySelector('.nav');
  // (an observer on a 1px marker, so nothing forces a layout while the page loads)
  if (nav && 'IntersectionObserver' in window) {
    const mark = document.createElement('div');
    mark.style.cssText = 'position:absolute;top:12px;left:0;width:1px;height:1px;pointer-events:none';
    mark.setAttribute('aria-hidden', 'true');
    document.body.prepend(mark);
    new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting)).observe(mark);
  }

  // Google Analytics conversion: WhatsApp clicks
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="https://wa.me"]');
    if (a && typeof window.gtag === 'function') window.gtag('event', 'whatsapp_click', { page_path: location.pathname, link_text: a.textContent.trim().slice(0, 60) });
  });

  /* ---------- Interactive diagnosis ---------- */
  const form = document.querySelector('[data-diag]');
  if (form && window.DIAG) {
    const { services, businesses, problems, specials, ui } = window.DIAG;
    const out = document.querySelector('[data-diag-result]');
    const money = (n) => new Intl.NumberFormat(SITE.locale || 'pt-BR', { style: 'currency', currency: SITE.currency || 'BRL', maximumFractionDigits: 0 }).format(n);
    const agenda = new Set(['clinica', 'salao', 'pet', 'academia', 'escola', 'saude']);
    const food = new Set(['restaurante', 'cafeteria']);
    let answers = {};
    let onInput = null;

    const pick = (biz, probs) => {
      const list = [];
      const add = (s) => { if (services[s] && !list.includes(s)) list.push(s); };
      probs.forEach((p) => {
        if (p === 'novos') { food.has(biz) ? add('cardapio-digital') : add('google-meu-negocio'); add(biz === 'servicos' ? 'landing-page' : 'site-profissional'); if (biz === 'servicos') add('cartao-digital'); if (food.has(biz)) add('google-meu-negocio'); }
        if (p === 'demora') { add('atendimento-whatsapp'); if (agenda.has(biz)) add('agendamento-online'); if (food.has(biz)) add('cardapio-digital'); }
        if (p === 'faltas') { add('agendamento-online'); add('atendimento-whatsapp'); }
        if (p === 'manual') { add(biz === 'loja' || food.has(biz) ? 'painel-estoque' : 'ferramentas-ia'); if (agenda.has(biz)) add('agendamento-online'); add('sistema-sob-medida'); }
        if (p === 'site') { add('site-profissional'); add('google-meu-negocio'); }
        if (p === 'online') { add(food.has(biz) ? 'cardapio-digital' : biz === 'loja' ? 'loja-virtual' : 'landing-page'); add('atendimento-whatsapp'); }
        if (p === 'estoque') { add('painel-estoque'); }
        if (p === 'seguranca') { add('analise-seguranca'); add('manutencao-e-suporte'); }
      });
      return list.slice(0, 3);
    };

    const fill = (text, b) => String(text).replace(/\{clientes\}/g, b.clientes || '').replace(/\{cliente\}/g, b.cliente || '');

    const render = (animate) => {
      const biz = form.querySelector('input[name="negocio"]:checked')?.value;
      const probs = [...form.querySelectorAll('input[name="problema"]:checked')].map((i) => i.value);
      if (!biz || !probs.length) {
        out.innerHTML = `<span class="label">${esc(ui.label)}</span><h3>${esc(ui.empty_h3)}</h3><p class="why">${esc(ui.empty_p)}</p>`;
        return;
      }
      const b = businesses[biz];
      const plan = pick(biz, probs);
      const main = problems[probs[0]];
      const total = plan.reduce((s, k) => s + (services[k].value || 0), 0);
      const monthly = plan.reduce((s, k) => s + (services[k].monthly || 0), 0);
      const hasQuote = plan.some((k) => !services[k].value);
      const headline = fill(ui.headline.replace('{title}', b.title).replace('{headline}', main.headline), b);

      const items = plan.map((k) => {
        const sv = services[k];
        const special = specials[`${biz}:${k}`];
        const ex = sv.example ? `<a href="/exemplos/${sv.example}/">${esc(ui.see_example)} ↗</a>` : '';
        return `<li><div class="pl-top"><b>${esc(sv.name)}</b><span>${esc(sv.price)}</span></div><p>${esc(fill(sv.promise, b))}${special ? ` <strong>${esc(special)}</strong>` : ''}</p><div class="pl-links"><a href="${sv.url}">${esc(ui.details)} →</a>${ex}</div></li>`;
      }).join('');

      const tips = [...new Set(probs.flatMap((p) => problems[p].tips || []))].slice(0, 3);
      const questions = [...new Set(plan.flatMap((k) => services[k].brief || []))].slice(0, 4);
      const why = probs.slice(0, 2).map((p) => `<p>${esc(fill(problems[p].why, b))}</p>`).join('');

      out.innerHTML = `
        <span class="label">${esc(ui.label)}</span>
        <h3>${esc(headline)}</h3>
        <div class="dg-block"><span class="dg-h">${esc(ui.why_h)}</span>${why}</div>
        <div class="dg-block"><span class="dg-h">${esc(ui.plan_h)}</span><ul class="plan-list">${items}</ul>
          <div class="diag-total"><span>${esc(ui.invest)}: <b>${total ? (promoLive ? `${esc(ui.from)} <s>${money(total)}</s> ${money(Math.round(total * (100 - P.off) / 100))} <span class="off">${esc(P.diag_tag.replace('{off}', P.off))}</span>` : `${esc(ui.from)} ${money(total)}`) : esc(ui.quote)}${hasQuote && total ? ` ${esc(ui.plus_quote)}` : ''}</b></span>${monthly ? `<span>${esc(ui.monthly)}: <b>${esc(ui.from)} ${money(monthly)}</b></span>` : ''}<span>${esc(ui.deadline)}: <b>${esc(services[plan[0]].deadline)}</b></span></div></div>
        <div class="dg-block"><span class="dg-h">${esc(ui.diy_h)}</span><ol class="diy">${tips.map((t) => `<li>${esc(fill(t, b))}</li>`).join('')}</ol></div>
        <div class="dg-block"><span class="dg-h">${esc(ui.brief_h)}</span><p class="dg-p">${esc(ui.brief_p)}</p>
          <div class="brief">${questions.map((q, i) => `<label><span>${esc(fill(q, b))}</span><input type="text" data-q="${esc(fill(q, b))}" id="bq${i}" value="${esc(answers[fill(q, b)] || '')}" autocomplete="off"></label>`).join('')}</div></div>
        <a class="btn btn-wa" data-send>${esc(ui.cta)}</a>
        <p class="muted" style="font-size:.85rem">${esc(ui.note)}</p>`;

      const send = out.querySelector('[data-send]');
      const update = () => {
        out.querySelectorAll('[data-q]').forEach((inp) => { answers[inp.dataset.q] = inp.value.trim(); });
        const filled = Object.entries(answers).filter(([q, a]) => a && questions.map((x) => fill(x, b)).includes(q));
        let text = ui.wa.replace('{biz}', b.article).replace('{probs}', probs.map((p) => problems[p].label.toLowerCase()).join(', ')).replace('{plan}', plan.map((k) => services[k].name).join(' + '));
        if (promoLive) text += `\n\n${P.wa_code.replace('{code}', P.code)}`;
        if (filled.length) text +=`\n\n${ui.brief_intro}\n${filled.map(([q, a]) => `• ${q} ${a}`).join('\n')}`;
        send.href = waLink(text);
        send.target = '_blank';
        send.rel = 'noopener';
      };
      if (onInput) out.removeEventListener('input', onInput);
      onInput = update;
      out.addEventListener('input', update);
      update();
      if (!reduce && animate) out.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
    };
    form.addEventListener('change', () => render(true));
    if (window.requestIdleCallback) requestIdleCallback(() => render(false), { timeout: 300 }); else setTimeout(() => render(false), 0);
  }
})();
