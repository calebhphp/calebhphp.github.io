// ACCRÁ — loja fase 1: sol, aromas, sacola e pedido pelo WhatsApp
(function () {
  var L = window.LOJA || {};
  var PRECOS = L.produtos || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reais = function (v) { return "R$ " + v.toLocaleString("pt-BR"); };

  // sol em espiral (traço Pincel)
  var forma = window.solVariantShapes("pincel");
  $$(".sol").forEach(function (el) {
    var c = el.getAttribute("data-cor") || "#9C4124";
    el.innerHTML = '<svg viewBox="0 0 200 200">' + forma.paths.map(function (d) { return '<path fill="' + c + '" d="' + d + '"></path>'; }).join("") + "</svg>";
  });

  // sacola (guardada só neste navegador)
  var itens = [];
  try { itens = JSON.parse(localStorage.getItem("accra-sacola") || "[]"); } catch (e) {}
  itens = Array.isArray(itens) ? itens.filter(function (i) { return i && PRECOS[i.id] && i.q > 0; }) : [];
  function salvar() { try { localStorage.setItem("accra-sacola", JSON.stringify(itens)); } catch (e) {} desenhar(); }
  function toast(t) { var el = $(".toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove("on"); }, 2600); }
  function abrir(sim) { document.body.classList.toggle("sacola-aberta", sim); $(".sacola").setAttribute("aria-hidden", String(!sim)); }
  function total() { return itens.reduce(function (s, i) { return s + PRECOS[i.id][0] * i.q; }, 0); }
  function desenhar() {
    var n = itens.reduce(function (s, i) { return s + i.q; }, 0);
    $$("[data-qtd]").forEach(function (el) { el.textContent = n; });
    $("[data-total]").textContent = reais(total());
    $("[data-itens]").innerHTML = itens.length ? itens.map(function (i, k) {
      var p = PRECOS[i.id];
      return '<div class="item"><span class="in">' + p[1] + " · " + i.a + '</span><span class="mono ip">' + reais(p[0] * i.q) + '</span><span class="mono im">' + p[2] + '</span>' +
        '<div class="qtd"><button data-menos="' + k + '" aria-label="menos um">−</button><span>' + i.q + '</span><button data-mais="' + k + '" aria-label="mais um">+</button></div></div>';
    }).join("") : '<p class="vazia">A sacola está vazia. Esfregue devagar: o resto do dia espera.</p>';
  }
  function whats(texto) {
    if (!L.whatsapp) { toast("Loja em pré-lançamento. Os pedidos abrem em breve: entre na lista da próxima fornada."); return; }
    window.open("https://wa.me/" + L.whatsapp + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-fechar-sacola]");
    if (!t) return;
    if (t.dataset.add) {
      var id = t.dataset.add, a = t.dataset.aroma;
      var it = itens.filter(function (i) { return i.id === id && i.a === a; })[0];
      if (it) it.q++; else itens.push({ id: id, a: a, q: 1 });
      salvar(); toast(PRECOS[id][1] + " · " + a + " foi pra sacola.");
    } else if (t.hasAttribute("data-abrir-sacola")) abrir(true);
    else if (t.hasAttribute("data-fechar-sacola")) abrir(false);
    else if (t.dataset.mais) { itens[+t.dataset.mais].q++; salvar(); }
    else if (t.dataset.menos) { var k = +t.dataset.menos; if (--itens[k].q < 1) itens.splice(k, 1); salvar(); }
    else if (t.dataset.aromaOp) {
      var a2 = t.dataset.aromaOp;
      $$(".aroma").forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); });
      $("[data-aroma-titulo]").textContent = a2;
      $("[data-aroma-trilha]").textContent = a2;
      $("[data-aroma-texto]").textContent = t.dataset.texto;
      var nm = $("[data-aroma-nome]"); if (nm) nm.textContent = a2.toLowerCase();
      $(".comprar").dataset.aroma = a2;
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") abrir(false); });

  document.addEventListener("submit", function (e) {
    var f = e.target, tipo = f.dataset.form;
    if (!tipo) return;
    e.preventDefault();
    var d = new FormData(f);
    if (tipo === "pedido") {
      if (!itens.length) { toast("Coloque algo na sacola primeiro."); return; }
      var linhas = itens.map(function (i) { return "- " + i.q + "x " + PRECOS[i.id][1] + " · " + i.a + " (" + reais(PRECOS[i.id][0] * i.q) + ")"; });
      whats("Olá! Quero fazer um pedido na Accrá:\n" + linhas.join("\n") + "\nSubtotal: " + reais(total()) +
        "\nNome: " + d.get("nome") + (d.get("cep") ? "\nCEP: " + d.get("cep") : "") + "\nPagamento: Pix");
    } else if (tipo === "espera") {
      whats("Olá! Quero entrar na lista da próxima fornada da Accrá.\nNome: " + d.get("nome") + (d.get("linha") ? "\nLinha: " + d.get("linha") : "") + (L.cupom ? "\nCupom: " + L.cupom : ""));
    } else if (tipo === "carta") {
      whats("Olá! Quero receber as cartas da quitanda da Accrá.\nE-mail: " + d.get("email"));
    }
  });
  desenhar();
})();
