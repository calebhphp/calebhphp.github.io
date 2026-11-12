// ACCRÁ · loja: sol, aromas, sacola, frete por CEP ou retirada, cupom e pedido pelo WhatsApp com Pix
(function () {
  var L = window.LOJA || {};
  var PRECOS = L.produtos || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reais = function (v) { return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

  // faixa de demonstração fixa no topo: o menu e a gaveta descem a altura dela
  var barra = $(".demo-bar");
  function medirBarra() { document.documentElement.style.setProperty("--barra", (barra ? barra.offsetHeight : 0) + "px"); }
  medirBarra(); window.addEventListener("resize", medirBarra);

  // sol em espiral (traço Pincel)
  var forma = window.solVariantShapes("pincel");
  $$(".sol").forEach(function (el) {
    var c = el.getAttribute("data-cor") || "#9C4124";
    el.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">' + forma.paths.map(function (d) { return '<path fill="' + c + '" d="' + d + '"></path>'; }).join("") + "</svg>";
  });

  // ---------- estado ----------
  var itens = [], entrega = "cep", cep = "", cupomAtivo = false, ultimoRemovido = null, abridor = null;
  try { itens = JSON.parse(localStorage.getItem("accra-sacola") || "[]"); } catch (e) {}
  itens = Array.isArray(itens) ? itens.filter(function (i) { return i && PRECOS[i.id] && i.q > 0; }) : [];
  try { cep = localStorage.getItem("accra-cep") || ""; } catch (e) {}
  function salvar() {
    try { localStorage.setItem("accra-sacola", JSON.stringify(itens)); } catch (e) {}
    desenhar();
  }

  // ---------- frete (tabela de exemplo; a Accrá confirma o valor na conversa) ----------
  var GRATIS_ACIMA = 180;
  function freteDoCep(c) {
    var n = c.replace(/\D/g, "");
    if (n.length !== 8) return null;
    var p2 = +n.slice(0, 2), p5 = +n.slice(0, 5);
    if (p2 >= 1 && p2 <= 5 || p2 === 8) return { v: 14, r: "São Paulo capital", prazo: "2 a 4 dias úteis" };
    if (p5 >= 36000 && p5 <= 36099) return { v: 12, r: "Juiz de Fora", prazo: "2 a 4 dias úteis" };
    if (p2 >= 6 && p2 <= 19) return { v: 22, r: "interior e Grande São Paulo", prazo: "3 a 6 dias úteis" };
    if (p2 >= 30 && p2 <= 39) return { v: 26, r: "Minas Gerais", prazo: "3 a 6 dias úteis" };
    if (p2 >= 20 && p2 <= 28) return { v: 28, r: "Rio de Janeiro e Espírito Santo", prazo: "4 a 7 dias úteis" };
    return { v: 38, r: "demais estados", prazo: "5 a 10 dias úteis" };
  }
  function maskCep(v) { v = v.replace(/\D/g, "").slice(0, 8); return v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v; }

  function subtotal() { return itens.reduce(function (s, i) { return s + PRECOS[i.id][0] * i.q; }, 0); }
  function calculo() {
    var sub = subtotal(), desc = cupomAtivo ? Math.round(sub * 0.1 * 100) / 100 : 0, base = sub - desc;
    var frete = 0, info = "", ok = true;
    if (entrega === "retirada") { info = "Retirada combinada pelo WhatsApp, sem custo."; }
    else {
      var f = freteDoCep(cep);
      if (!cep) { ok = false; info = "Digite o CEP para ver o frete."; }
      else if (!f) { ok = false; info = "CEP incompleto: são 8 números."; }
      else if (base >= GRATIS_ACIMA) { info = "Frete grátis para " + f.r + " (pedidos a partir de " + reais(GRATIS_ACIMA) + "). Prazo: " + f.prazo + "."; }
      else { frete = f.v; info = "Frete para " + f.r + ": " + reais(f.v) + ". Prazo: " + f.prazo + ". Frete grátis a partir de " + reais(GRATIS_ACIMA) + "."; }
    }
    return { sub: sub, desc: desc, frete: frete, total: base + frete, info: info, ok: ok };
  }

  // ---------- aviso (com ação opcional) ----------
  function toast(t, acao) {
    var el = $(".toast"); el.textContent = t;
    if (acao) { var b = document.createElement("button"); b.type = "button"; b.textContent = acao.rotulo; b.addEventListener("click", function () { acao.fn(); el.classList.remove("on"); }); el.appendChild(b); }
    el.classList.add("on"); clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.classList.remove("on"); }, acao ? 7000 : 3200);
  }

  // ---------- gaveta ----------
  var gaveta = $(".sacola");
  function abrir(sim) {
    if (sim === document.body.classList.contains("sacola-aberta")) return;
    document.body.classList.toggle("sacola-aberta", sim);
    gaveta.setAttribute("aria-hidden", String(!sim));
    gaveta.inert = !sim;
    if (sim) { abridor = document.activeElement; desenhar(); setTimeout(function () { $(".fechar", gaveta).focus(); }, 30); }
    else if (abridor && abridor.focus) abridor.focus();
  }
  gaveta.inert = true;

  function desenhar() {
    var n = itens.reduce(function (s, i) { return s + i.q; }, 0);
    $$("[data-qtd]").forEach(function (el) { el.textContent = n; });
    $$("[data-abrir-sacola]").forEach(function (el) { el.setAttribute("aria-label", "Abrir sacola, " + n + (n === 1 ? " item" : " itens")); });
    var vazia = !itens.length;
    $("[data-itens]").innerHTML = vazia ? '<p class="vazia">A sacola está vazia. Esfregue devagar: o resto do dia espera.</p>' : itens.map(function (i, k) {
      var p = PRECOS[i.id], nome = p[1] + " · " + i.a;
      return '<div class="item"><span class="in">' + nome + '</span><span class="mono ip">' + reais(p[0] * i.q) + '</span><span class="mono im">' + p[2] + ' · ' + reais(p[0]) + ' cada</span>' +
        '<div class="qtd" role="group" aria-label="Quantidade de ' + nome + '"><button type="button" data-menos="' + k + '" aria-label="Tirar um ' + nome + '">−</button><span aria-live="polite">' + i.q + '</span><button type="button" data-mais="' + k + '" aria-label="Pôr mais um ' + nome + '">+</button></div>' +
        '<button type="button" class="tirar" data-tirar="' + k + '" aria-label="Remover ' + nome + ' da sacola">remover</button></div>';
    }).join("");
    var f = $(".sacola-fim", gaveta);
    f.hidden = vazia;
    var c = calculo();
    $("[data-r-sub]").textContent = reais(c.sub);
    $("[data-r-desc]").textContent = c.desc ? "− " + reais(c.desc) : "R$ 0";
    $("[data-r-linha-desc]").hidden = !c.desc;
    $("[data-r-frete]").textContent = entrega === "retirada" ? "retirada" : (c.ok ? (c.frete ? reais(c.frete) : "grátis") : "a calcular");
    $("[data-total]").textContent = reais(c.total);
    $("[data-frete-info]").textContent = c.info;
    $("[data-bloco-cep]").hidden = entrega === "retirada";
    $$("[name=entrega]").forEach(function (r) { r.checked = r.value === entrega; });
    $("[data-cupom-msg]").textContent = cupomAtivo ? "Cupom " + L.cupom + " aplicado: " + L.cupom_desc + "." : "";
    $("[data-cupom-btn]").textContent = cupomAtivo ? "Tirar" : "Aplicar";
  }

  function whats(texto) {
    window.open("https://wa.me/" + L.whatsapp + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }

  // ---------- cliques ----------
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-fechar-sacola]");
    if (!t) return;
    if (t.dataset.add) {
      var id = t.dataset.add, a = t.dataset.aroma, q = 1;
      var campoQ = t.parentNode && $("[data-q-prod]", t.parentNode);
      if (campoQ) q = Math.max(1, Math.min(20, parseInt(campoQ.value, 10) || 1));
      var it = itens.filter(function (i) { return i.id === id && i.a === a; })[0];
      if (it) it.q = Math.min(20, it.q + q); else itens.push({ id: id, a: a, q: q });
      salvar(); toast(q + "x " + PRECOS[id][1] + " · " + a + " na sacola.", { rotulo: "Ver sacola", fn: function () { abridor = t; abrir(true); } });
    } else if (t.hasAttribute("data-abrir-sacola")) abrir(true);
    else if (t.hasAttribute("data-fechar-sacola")) abrir(false);
    else if (t.dataset.mais) { var im = itens[+t.dataset.mais]; if (im.q < 20) im.q++; else toast("Máximo de 20 por item. Para mais, combine pelo WhatsApp."); salvar(); }
    else if (t.dataset.menos) { var k = +t.dataset.menos; if (itens[k].q > 1) { itens[k].q--; salvar(); } else remover(k); }
    else if (t.dataset.tirar) remover(+t.dataset.tirar);
    else if (t.hasAttribute("data-cupom-btn")) {
      if (cupomAtivo) { cupomAtivo = false; desenhar(); return; }
      var v = ($("[name=cupom]").value || "").trim().toUpperCase();
      if (v === L.cupom) { cupomAtivo = true; $("[name=cupom]").value = ""; desenhar(); }
      else $("[data-cupom-msg]").textContent = v ? "Cupom não encontrado. Confira as letras." : "Digite o cupom primeiro.";
    }
    else if (t.dataset.aromaOp) {
      var a2 = t.dataset.aromaOp;
      $$(".aroma").forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); });
      $("[data-aroma-titulo]").textContent = a2;
      $("[data-aroma-trilha]").textContent = a2;
      $("[data-aroma-texto]").textContent = t.dataset.texto;
      var nm = $("[data-aroma-nome]"); if (nm) nm.textContent = a2.toLowerCase();
      $(".comprar").dataset.aroma = a2;
    }
    else if (t.hasAttribute("data-qp-menos") || t.hasAttribute("data-qp-mais")) {
      var inp = $("[data-q-prod]", t.parentNode), nv = (parseInt(inp.value, 10) || 1) + (t.hasAttribute("data-qp-mais") ? 1 : -1);
      inp.value = Math.max(1, Math.min(20, nv));
    }
  });
  function remover(k) {
    var tirado = itens.splice(k, 1)[0]; ultimoRemovido = tirado; salvar();
    toast(PRECOS[tirado.id][1] + " · " + tirado.a + " saiu da sacola.", { rotulo: "Desfazer", fn: function () { if (ultimoRemovido) { itens.splice(Math.min(k, itens.length), 0, ultimoRemovido); ultimoRemovido = null; salvar(); } } });
  }

  document.addEventListener("keydown", function (e) {
    if (!document.body.classList.contains("sacola-aberta")) return;
    if (e.key === "Escape") { abrir(false); return; }
    if (e.key === "Tab") { // mantém o foco dentro da gaveta
      var foc = $$("button, input, select, a[href], textarea", gaveta).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!foc.length) return;
      var p = foc[0], u = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); }
      else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.name === "cep" && e.target.closest(".sacola")) {
      e.target.value = maskCep(e.target.value); cep = e.target.value;
      try { localStorage.setItem("accra-cep", cep); } catch (x) {}
      desenhar();
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.name === "entrega") { entrega = e.target.value; desenhar(); }
  });

  // ---------- envio ----------
  document.addEventListener("submit", function (e) {
    var f = e.target, tipo = f.dataset.form;
    if (!tipo) return;
    e.preventDefault();
    var d = new FormData(f);
    if (tipo === "pedido") {
      if (!itens.length) { toast("Coloque algo na sacola primeiro."); return; }
      var c = calculo();
      if (!c.ok) { $("[name=cep]").focus(); toast(c.info); return; }
      var linhas = itens.map(function (i) { return "- " + i.q + "x " + PRECOS[i.id][1] + " · " + i.a + " (" + reais(PRECOS[i.id][0] * i.q) + ")"; });
      var msg = "Olá! Quero fazer um pedido na Accrá (pedido feito pela loja de exemplo):\n" + linhas.join("\n") +
        "\n\nSubtotal: " + reais(c.sub) + (c.desc ? "\nCupom " + L.cupom + ": − " + reais(c.desc) : "") +
        "\nEntrega: " + (entrega === "retirada" ? "retirada (combinar local e horário)" : "CEP " + cep + ", frete " + (c.frete ? reais(c.frete) : "grátis")) +
        "\nTotal: " + reais(c.total) + "\nNome: " + d.get("nome") + (d.get("obs") ? "\nObservação: " + d.get("obs") : "") +
        "\nPagamento: Pix (podem me mandar a chave)";
      whats(msg);
      $("[data-aviso-envio]").textContent = "Mensagem aberta no WhatsApp com o resumo. Se não abriu, libere pop-ups e toque de novo. Sua sacola continua aqui até você apagar os itens.";
    } else if (tipo === "espera") {
      whats("Olá! Quero entrar na lista da próxima fornada da Accrá.\nNome: " + d.get("nome") + (d.get("linha") ? "\nLinha: " + d.get("linha") : "") + (L.cupom ? "\nCupom: " + L.cupom : ""));
    } else if (tipo === "carta") {
      whats("Olá! Quero receber as cartas da quitanda da Accrá.\nE-mail: " + d.get("email"));
    }
  });
  desenhar();
})();
