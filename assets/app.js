(() => {
  const SITE = window.SITE || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waLink = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;

  // WhatsApp links with a ready message
  const wire = (root = document) => root.querySelectorAll('[data-wa]').forEach((el) => {
    el.href = waLink(el.dataset.wa);
    el.target = '_blank';
    el.rel = 'noopener';
  });
  wire();

  // Translucent nav after leaving the top
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 12);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  // Rotating word in the hero
  document.querySelectorAll('[data-rotator]').forEach((box) => {
    const items = [...box.children];
    if (reduce || items.length < 2) return;
    let i = 0;
    setInterval(() => {
      items[i].classList.remove('on');
      i = (i + 1) % items.length;
      items[i].classList.add('on');
    }, 2200);
  });

  // Live WhatsApp conversation in the phone
  const chat = document.querySelector('[data-chat]');
  if (chat && !reduce) {
    const msgs = [...chat.querySelectorAll('.msg')];
    chat.classList.add('animate');
    const play = () => {
      msgs.forEach((m) => m.classList.remove('show'));
      msgs.forEach((m, n) => setTimeout(() => m.classList.add('show'), 500 + n * 1100));
    };
    play();
    setInterval(play, 500 + msgs.length * 1100 + 4500);
  }

  // Spotlight that follows the pointer on cards
  if (finePointer) {
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
    // Magnetic primary buttons
    if (!reduce) {
      document.querySelectorAll('[data-magnetic]').forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
          const r = btn.getBoundingClientRect();
          const x = (e.clientX - r.left - r.width / 2) * 0.18;
          const y = (e.clientY - r.top - r.height / 2) * 0.25;
          btn.style.transform = `translate(${x}px, ${y}px)`;
        });
        btn.addEventListener('pointerleave', () => (btn.style.transform = ''));
      });
    }
  }

  // Counters that roll up when they come into view
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const end = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / 1200);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    }), { threshold: 0.6 });
    counters.forEach((c) => io.observe(c));
  }

  // ---------- Diagnosis: pick your business and problems, see the plan instantly ----------
  const form = document.querySelector('[data-diag]');
  if (form && window.DIAG) {
    const { services, businesses, problems } = window.DIAG;
    const out = document.querySelector('[data-diag-result]');
    const agenda = new Set(['clinica', 'salao', 'pet', 'academia', 'escola', 'saude']);

    const pick = (biz, probs) => {
      const list = [];
      const add = (s) => { if (!list.includes(s)) list.push(s); };
      probs.forEach((p) => {
        if (p === 'novos') { biz === 'restaurante' ? add('cardapio-digital') : add('google-meu-negocio'); add(biz === 'servicos' ? 'landing-page' : 'site-profissional'); }
        if (p === 'demora') { add('atendimento-whatsapp'); if (agenda.has(biz)) add('agendamento-online'); if (biz === 'restaurante') add('cardapio-digital'); }
        if (p === 'faltas') { add('agendamento-online'); add('atendimento-whatsapp'); }
        if (p === 'manual') { add('sistema-sob-medida'); if (agenda.has(biz)) add('agendamento-online'); }
        if (p === 'site') { add('site-profissional'); add('google-meu-negocio'); }
        if (p === 'online') { add(biz === 'restaurante' ? 'cardapio-digital' : biz === 'loja' ? 'loja-virtual' : 'landing-page'); add('atendimento-whatsapp'); }
      });
      return list.slice(0, 3);
    };

    const render = () => {
      const biz = form.querySelector('input[name="negocio"]:checked')?.value;
      const probs = [...form.querySelectorAll('input[name="problema"]:checked')].map((i) => i.value);
      if (!biz || !probs.length) return;
      const plan = pick(biz, probs);
      const b = businesses[biz];
      const first = problems[probs[0]];
      const total = plan.reduce((sum, s) => sum + (services[s].value || 0), 0);
      const hasQuote = plan.some((s) => !services[s].value);
      const monthly = plan.reduce((sum, s) => sum + (services[s].monthly || 0), 0);
      const text = `Olá, Matheus! Fiz o diagnóstico no seu site. Tenho ${b.article} e meu desafio é: ${probs.map((p) => problems[p].label.toLowerCase()).join(', ')}. O plano sugerido foi: ${plan.map((s) => services[s].name).join(' + ')}. Podemos conversar?`;
      out.innerHTML = `
        <span class="label">Seu plano em 10 segundos</span>
        <h3>${b.title}: comece por ${services[plan[0]].name.toLowerCase()}.</h3>
        <p class="why">${first.why}</p>
        <ul class="diag-list">${plan.map((s) => `<li><b><a href="${SITE.base}servicos/${s}/" style="color:inherit">${services[s].name}</a></b><span>${services[s].price}</span></li>`).join('')}</ul>
        <div class="diag-total"><span>Investimento inicial: <b>${total ? 'a partir de R$ ' + total.toLocaleString('pt-BR') : 'sob orçamento'}${hasQuote && total ? ' + orçamento' : ''}</b></span>${monthly ? `<span>Mensal: <b>a partir de R$ ${monthly}</b></span>` : ''}<span>Prazo: <b>${services[plan[0]].deadline}</b></span></div>
        <a class="btn btn-wa" data-wa="${text.replace(/"/g, '&quot;')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>Quero esse plano</a>
        <p class="muted" style="font-size:.85rem">Preço final fechado depois de uma conversa de 15 minutos. Sem compromisso.</p>`;
      wire(out);
      if (!reduce) { out.classList.remove('diag-anim'); void out.offsetWidth; out.classList.add('diag-anim'); }
    };
    form.addEventListener('change', render);
    render();
  }

  document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
})();
