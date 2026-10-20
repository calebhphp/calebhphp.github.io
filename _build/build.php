<?php
/**
 * Static site generator. Run from anywhere: php _build/build.php
 * Reads _build/data.php and writes every page, the sitemap and robots.txt into the site root.
 */

$root = dirname(__DIR__);
$data = require __DIR__.'/data.php';
$site = $data['site'];
$services = $data['services'];
$niches = $data['niches'];
$today = date('Y-m-d');
$written = [];

function e(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

function icon(string $name): string
{
    $paths = [
        'target' => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
        'globe' => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
        'bag' => '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
        'menu' => '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
        'calendar' => '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
        'chat' => '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
        'pin' => '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        'grid' => '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        'shield' => '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'bell' => '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
        'card' => '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14 10h4M14 13h3"/>',
        'chart' => '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
        'spark' => '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
        'lock' => '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5"/>',
    ];

    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.($paths[$name] ?? $paths['grid']).'</svg>';
}

function priceValue(string $price): int
{
    return preg_match('/R\$\s*([\d.]+)/', $price, $m) ? (int) str_replace('.', '', $m[1]) : 0;
}

function layout(array $o, string $body): string
{
    global $site, $services, $niches;
    $url = $site['url'].$o['path'];
    $title = e($o['title']);
    $desc = e($o['description']);
    $lang = $o['lang'] ?? 'pt-BR';
    $og = $site['url'].'/assets/'.($o['og'] ?? 'og.png');
    $schema = json_encode($o['schema'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $verify = $site['google_verification'] ? '<meta name="google-site-verification" content="'.e($site['google_verification']).'">' : '';
    // Google Analytics 4: measures visits; app.js also sends a "whatsapp_click" event for ads and conversion tracking
    if (! empty($site['ga4'])) {
        $id = e($site['ga4']);
        $verify .= "\n<script async src=\"https://www.googletagmanager.com/gtag/js?id={$id}\"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','{$id}');</script>";
    }
    $cnpjLine = ! empty($site['cnpj']) ? ' · CNPJ '.e($site['cnpj']) : '';
    $alt = '';
    if (! empty($o['alternates'])) {
        foreach ($o['alternates'] as $hl => $p) {
            $alt .= '<link rel="alternate" hreflang="'.$hl.'" href="'.$site['url'].$p.'">';
        }
    }
    $siteJs = json_encode(['whatsapp' => $site['whatsapp'], 'base' => '/'], JSON_UNESCAPED_SLASHES);
    $extraJs = $o['extra_js'] ?? '';
    $wa = e($o['wa'] ?? 'Olá, Matheus! Vi seu site e quero conversar.');
    $isEn = $lang === 'en';

    $navLinks = $isEn
        ? '<li class="hide-md"><a href="#services">Services</a></li><li class="hide-md"><a href="/">Português</a></li><li><a class="btn btn-wa btn-sm" data-wa="Hi Matheus! I found your website and would like to talk.">WhatsApp</a></li>'
        : '<li class="hide-md"><a href="/#diagnostico">Diagnóstico grátis</a></li><li class="hide-md"><a href="/#servicos">Serviços</a></li><li class="hide-md"><a href="/#pacotes">Pacotes</a></li><li class="hide-md"><a href="/#exemplos">Exemplos</a></li><li><a class="btn btn-wa btn-sm" data-wa="'.$wa.'">Falar no WhatsApp</a></li>';

    $svcLinks = '';
    foreach ($services as $slug => $s) {
        $svcLinks .= '<li><a href="/servicos/'.$slug.'/">'.e($s['name']).'</a></li>';
    }
    $nicheLinks = '';
    foreach ($niches as $slug => $n) {
        if (str_starts_with($slug, "__")) {
            continue;
        }
        $nicheLinks .= '<li><a href="/para/'.$slug.'/">'.e($n['name']).'</a></li>';
    }
    $nicheLinks .= '<li><a href="/clinicas/">Saúde ocupacional</a></li>';

    $footer = $isEn ? '' : <<<HTML
<footer>
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="34" height="34">{$site['name']}</a>
        <p style="margin-top:14px;max-width:30em">Sites, sistemas e automações para pequenos negócios. Atendimento direto, preço fechado e suporte de verdade. {$site['city']} e todo o Brasil.</p>
      </div>
      <div><h4>Serviços</h4><ul>{$svcLinks}</ul></div>
      <div><h4>Para quem</h4><ul>{$nicheLinks}</ul></div>
      <div><h4>Contato</h4><ul><li><a data-wa="Olá, Matheus! Vi seu site e quero conversar.">WhatsApp</a></li><li><a href="mailto:{$site['email']}">E-mail</a></li><li><a href="{$site['linkedin']}">LinkedIn</a></li><li><a href="{$site['github']}">GitHub</a></li><li><a href="/en/" hreflang="en">English</a></li></ul></div>
    </div>
    <div class="bottom"><span>© <span data-year>2026</span> {$site['name']} · {$site['city']}, SP{$cnpjLine}</span><span>Feito à mão, sem modelo pronto.</span></div>
  </div>
</footer>
HTML;
    if ($isEn) {
        $footer = '<footer><div class="wrap"><div class="bottom" style="margin-top:0;border-top:0;padding-top:0"><span>© <span data-year>2026</span> '.$site['name'].' · São Paulo, Brazil</span><span><a href="/" hreflang="pt-BR">Português</a> · <a href="'.$site['linkedin'].'">LinkedIn</a> · <a href="'.$site['github'].'">GitHub</a></span></div></div></footer>';
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{$title}</title>
<meta name="description" content="{$desc}">
<link rel="canonical" href="{$url}">
{$alt}
<meta name="theme-color" content="#0a0c18">
<meta property="og:type" content="website">
<meta property="og:locale" content="{$o['og_locale']}">
<meta property="og:site_name" content="{$site['name']}">
<meta property="og:url" content="{$url}">
<meta property="og:title" content="{$title}">
<meta property="og:description" content="{$desc}">
<meta property="og:image" content="{$og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{$verify}
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap">
<link rel="stylesheet" href="/assets/style.css">
<script type="application/ld+json">{$schema}</script>
</head>
<body>
<nav class="nav" aria-label="Principal">
  <div class="wrap">
    <a class="brand" href="/"><img src="/assets/logo.svg" alt="" width="34" height="34">{$site['name']}</a>
    <ul>{$navLinks}</ul>
  </div>
</nav>
<main>
{$body}
</main>
{$footer}
<a class="fab" data-wa="{$wa}" aria-label="Conversar no WhatsApp">{$GLOBALS['waIcon']}</a>
<script>window.SITE={$siteJs};{$extraJs}</script>
<script src="/assets/app.js" defer></script>
</body>
</html>
HTML;
}

$waIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>';
$GLOBALS['waIcon'] = $waIcon;

function aurora(): string { return '<div class="aurora" aria-hidden="true"><span class="a1"></span><span class="a2"></span><span class="a3"></span></div><div class="grid-lines" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>'; }

function serviceCard(string $slug, array $s): string
{
    return '<a class="card reveal" href="/servicos/'.$slug.'/"><span class="ic">'.icon($s['icon']).'</span><h3>'.e($s['name']).'</h3><p>'.e($s['short']).'</p><div class="meta"><span>a partir de</span><b>'.e($s['price']).'</b></div><span class="go">Ver detalhes →</span></a>';
}

function faqHtml(array $faq): string
{
    $h = '<div class="faq">';
    foreach ($faq as [$q, $a]) {
        $h .= '<details><summary>'.e($q).'</summary><p>'.e($a).'</p></details>';
    }

    return $h.'</div>';
}

function faqSchema(array $faq): array
{
    return ['@type' => 'FAQPage', 'mainEntity' => array_map(fn ($f) => ['@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f[1]]], $faq)];
}

function crumbsSchema(array $items): array
{
    global $site;
    $list = [];
    foreach ($items as $i => [$name, $path]) {
        $list[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name, 'item' => $site['url'].$path];
    }

    return ['@type' => 'BreadcrumbList', 'itemListElement' => $list];
}

function write(string $path, string $html): void
{
    global $root, $written;
    $file = $root.$path.(str_ends_with($path, '/') ? 'index.html' : '');
    if (! is_dir(dirname($file))) {
        mkdir(dirname($file), 0777, true);
    }
    file_put_contents($file, $html);
    $written[] = $path;
}

$business = [
    '@type' => 'ProfessionalService',
    '@id' => $site['url'].'/#negocio',
    'name' => $site['name'].' – Sites, sistemas e automações',
    'url' => $site['url'].'/',
    'image' => $site['url'].'/assets/og.png',
    'logo' => $site['url'].'/assets/logo.svg',
    'description' => 'Criação de sites, landing pages, lojas virtuais, agendamento online, atendimento automático no WhatsApp e sistemas sob medida para pequenos negócios.',
    'priceRange' => 'R$ 390 – R$ 6.900+',
    'areaServed' => [['@type' => 'City', 'name' => 'São Paulo'], ['@type' => 'Country', 'name' => 'Brasil']],
    'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'São Paulo', 'addressRegion' => 'SP', 'addressCountry' => 'BR'],
    'founder' => ['@type' => 'Person', 'name' => $site['name'], 'jobTitle' => 'Desenvolvedor de software sênior', 'sameAs' => [$site['linkedin'], $site['github']]],
    'sameAs' => [$site['linkedin'], $site['github']],
    'hasOfferCatalog' => ['@type' => 'OfferCatalog', 'name' => 'Serviços', 'itemListElement' => array_values(array_map(fn ($s) => ['@type' => 'Offer', 'itemOffered' => ['@type' => 'Service', 'name' => $s['name'], 'description' => $s['short']]], $services))],
];

if (! empty($site['cnpj'])) {
    $business['taxID'] = $site['cnpj'];
}

/* ================= HOME ================= */
$homeFaq = [
    ['Preciso entender de tecnologia?', 'Não. Você me conta como o seu negócio funciona e eu cuido de todo o resto. Te explico só o que você vai usar, em linguagem simples.'],
    ['Quanto tempo leva?', 'Um cardápio digital fica pronto em 3 dias, uma landing page em 5 e um site em 7 a 10 dias. Sistemas maiores são entregues em etapas semanais.'],
    ['Como funciona o pagamento?', 'Você recebe o preço fechado antes de começar. Normalmente é metade no início e metade na entrega. Projetos maiores são pagos por etapa.'],
    ['O site e o domínio ficam no meu nome?', 'Sim. Tudo o que eu faço é seu: domínio, conteúdo e acesso.'],
    ['E se eu precisar de ajuda depois?', 'Todo projeto tem 30 dias de ajustes grátis. Depois, você pode continuar comigo no plano de manutenção ou chamar quando precisar.'],
    ['Você atende fora de São Paulo?', 'Sim. Tudo pode ser feito online, para qualquer cidade do Brasil, e também para clientes de fora do país.'],
];

$GLOBALS['auroraHtml'] = aurora();
$GLOBALS['clockIcon'] = icon('clock');
$GLOBALS['bellIcon'] = icon('bell');
$GLOBALS['homeFaqHtml'] = faqHtml($homeFaq);

$cards = '';
foreach ($services as $slug => $s) {
    $cards .= serviceCard($slug, $s);
}

$packs = '';
foreach ($data['packages'] as $p) {
    $items = implode('', array_map(fn ($i) => '<li>'.e($i).'</li>', $p['items']));
    $badge = $p['featured'] ? '<span class="badge">MAIS ESCOLHIDO</span>' : '';
    $save = $p['save'] ? '<span class="save">'.e($p['save']).'</span>' : '';
    $cls = $p['featured'] ? 'pack featured reveal' : 'pack reveal';
    $btn = $p['featured'] ? 'btn btn-wa' : 'btn btn-glass';
    $packs .= '<article class="'.$cls.'">'.$badge.'<h3>'.e($p['name']).'</h3><p class="for">'.e($p['for']).'</p><div class="price"><b>'.e($p['price']).'</b><span>'.e($p['note']).'</span></div>'.$save.'<ul>'.$items.'</ul><a class="'.$btn.'" data-wa="Olá, Matheus! Tenho interesse no pacote '.e($p['name']).'.">Quero o pacote '.e($p['name']).'</a></article>';
}

$diagServices = [];
foreach ($services as $slug => $s) {
    $monthly = preg_match('/R\$\s*([\d.]+)\/mês/', $s['price_note'], $m) ? (int) $m[1] : 0;
    $diagServices[$slug] = ['name' => $s['name'], 'price' => ($s['price'] === 'Orçamento' ? 'sob orçamento' : 'a partir de '.$s['price']), 'value' => priceValue($s['price']), 'monthly' => $monthly, 'deadline' => $s['deadline']];
}
$diag = [
    'services' => $diagServices,
    'businesses' => [
        'clinica' => ['label' => 'Clínica ou consultório', 'title' => 'Para a sua clínica', 'article' => 'uma clínica/consultório'],
        'restaurante' => ['label' => 'Restaurante ou delivery', 'title' => 'Para o seu restaurante', 'article' => 'um restaurante/delivery'],
        'salao' => ['label' => 'Salão ou barbearia', 'title' => 'Para o seu salão', 'article' => 'um salão/barbearia'],
        'pet' => ['label' => 'Pet shop', 'title' => 'Para o seu pet shop', 'article' => 'um pet shop'],
        'loja' => ['label' => 'Loja ou comércio', 'title' => 'Para a sua loja', 'article' => 'uma loja'],
        'servicos' => ['label' => 'Prestador de serviço', 'title' => 'Para o seu serviço', 'article' => 'um negócio de prestação de serviço'],
        'academia' => ['label' => 'Academia ou estúdio', 'title' => 'Para o seu estúdio', 'article' => 'uma academia/estúdio'],
        'escola' => ['label' => 'Escola ou curso', 'title' => 'Para a sua escola', 'article' => 'uma escola/curso'],
        'saude' => ['label' => 'Saúde ocupacional', 'title' => 'Para a sua clínica de SST', 'article' => 'uma clínica de saúde ocupacional'],
        'outro' => ['label' => 'Outro', 'title' => 'Para o seu negócio', 'article' => 'um negócio'],
    ],
    'problems' => [
        'novos' => ['label' => 'Poucos clientes novos', 'why' => 'Quem não aparece no Google perde o cliente antes da primeira conversa. O primeiro passo é ser encontrado e passar confiança logo de cara.'],
        'demora' => ['label' => 'Demoro para responder', 'why' => 'Cliente que espera resposta vai para o concorrente. Responder na hora, até fora do expediente, segura essas vendas.'],
        'faltas' => ['label' => 'Faltas e remarcações', 'why' => 'Cada falta é um horário perdido. Agendamento com confirmação e lembrete automático reduz o esquecimento.'],
        'manual' => ['label' => 'Muito trabalho manual', 'why' => 'Planilha, caderno e mensagens espalhadas consomem horas. Juntar tudo num sistema devolve esse tempo para você.'],
        'site' => ['label' => 'Sem site ou site antigo', 'why' => 'Um site lento ou desatualizado afasta quem pesquisa antes de comprar. Um site profissional faz o seu negócio parecer tão bom quanto ele é.'],
        'online' => ['label' => 'Quero vender online', 'why' => 'Sua vitrine pode vender 24 horas. O caminho certo depende do que você vende, e já deixei pronto abaixo.'],
        'estoque' => ['label' => 'Não controlo o estoque', 'why' => 'Produto que acaba sem aviso é venda perdida, e produto parado é dinheiro preso. Um painel mostra tudo num relance.'],
        'seguranca' => ['label' => 'Medo de invasão ou golpe', 'why' => 'Site invadido some do Google e pode vazar dados de clientes. Uma análise encontra as brechas antes que alguém se aproveite.'],
    ],
];
$bizChips = '';
foreach ($diag['businesses'] as $k => $b) {
    $bizChips .= '<label class="chip"><input type="radio" name="negocio" value="'.$k.'"'.($k === 'clinica' ? ' checked' : '').'>'.e($b['label']).'</label>';
}
$probChips = '';
foreach ($diag['problems'] as $k => $p) {
    $probChips .= '<label class="chip"><input type="checkbox" name="problema" value="'.$k.'"'.($k === 'faltas' ? ' checked' : '').'>'.e($p['label']).'</label>';
}
$diagJs = 'window.DIAG='.json_encode($diag, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).';';

$marqueeItems = ['Clínicas', 'Restaurantes', 'Barbearias', 'Pet shops', 'Lojas', 'Estúdios de pilates', 'Dentistas', 'Advogados', 'Escolas', 'Salões de beleza', 'Contadores', 'Psicólogos', 'Docerias', 'Academias'];
$marquee = implode('', array_map(fn ($i) => '<span>'.$i.'</span>', array_merge($marqueeItems, $marqueeItems)));

$home = <<<HTML
<header class="dark hero">
  {$GLOBALS['auroraHtml']}
  <div class="wrap grid">
    <div>
      <span class="pill"><b>AGENDA ABERTA</b>Novos projetos para este mês</span>
      <h1>Mais clientes para o seu<br><span class="typer"><span class="grad-text" data-typer="negócio|restaurante|consultório|salão|pet shop|comércio|cafeteria">negócio</span><span class="caret" aria-hidden="true"></span></span><br>Menos trabalho para você.</h1>
      <p class="lede">Eu crio o site, a loja, a agenda online e o atendimento automático que fazem o seu negócio vender mais, atender rápido e parar de perder tempo com tarefa repetida. Tudo feito sob medida, com preço fechado.</p>
      <div class="ctas">
        <a class="btn btn-wa" data-magnetic data-wa="Olá, Matheus! Vi seu site e quero conversar sobre o meu negócio.">{$waIcon}Conversar no WhatsApp</a>
        <a class="btn btn-glass" href="#diagnostico">Fazer diagnóstico grátis</a>
      </div>
      <div class="trust"><span>Preço fechado antes de começar</span><span>Você aprova antes de publicar</span><span>30 dias de ajustes grátis</span></div>
    </div>
    <div style="position:relative">
      <div class="phone" aria-label="Exemplo de atendimento automático no WhatsApp">
        <div class="screen">
          <div class="bar"><i></i><div><b>Studio Bella</b><small>online</small></div></div>
          <div class="chat" data-chat>
            <div class="msg in">Oi! Vocês têm horário amanhã pra escova? 😊<time>23:47</time></div>
            <div class="msg out">Oi, Ana! Temos sim ✨ Amanhã às 10h ou às 15h30. Qual fica melhor?<time>23:47</time></div>
            <div class="msg in">15h30!<time>23:48</time></div>
            <div class="msg out">Prontinho! Escova marcada para amanhã, 15h30. Te mando um lembrete de manhã 💛<time>23:48</time></div>
            <div class="msg in">Perfeito, obrigada!<time>23:48</time></div>
          </div>
        </div>
      </div>
      <div class="float-card f1"><span class="ic">{$GLOBALS['clockIcon']}</span><div><b>3 segundos</b>para responder</div></div>
      <div class="float-card f2"><span class="ic">{$GLOBALS['bellIcon']}</span><div><b>Horário marcado</b>às 23:48, sem ninguém acordado</div></div>
    </div>
  </div>
</header>
<div class="dark marquee" aria-label="Negócios que eu atendo"><div class="track">{$marquee}</div></div>

<section id="diagnostico">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Diagnóstico grátis em 10 segundos</span>
      <h2>Me conta o seu negócio. Eu te mostro o caminho.</h2>
      <p>Escolha o tipo de negócio e o que mais te atrapalha hoje. O plano aparece na hora, com preço e prazo.</p>
    </div>
    <form class="diag" data-diag onsubmit="return false">
      <div class="diag-panel">
        <div class="diag-step"><h3><i>1</i>Qual é o seu negócio?</h3><fieldset class="chips"><legend class="sr-only">Tipo de negócio</legend>{$bizChips}</fieldset></div>
        <div class="diag-step"><h3><i>2</i>O que mais te atrapalha? <span class="muted" style="font:400 .9rem var(--body)">(pode marcar mais de um)</span></h3><fieldset class="chips"><legend class="sr-only">Problemas</legend>{$probChips}</fieldset></div>
      </div>
      <div class="diag-result" data-diag-result aria-live="polite">
        <span class="label">Seu plano em 10 segundos</span>
        <h3>Escolha o seu negócio e o que te atrapalha.</h3>
        <p class="why">O plano aparece aqui, com os serviços certos, preço e prazo.</p>
      </div>
    </form>
  </div>
</section>

<section id="servicos" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Serviços</span>
      <h2>Tudo o que o seu negócio precisa na internet, num lugar só</h2>
      <p>Do primeiro site ao sistema que organiza a empresa inteira. Você fala com uma pessoa só, do começo ao fim.</p>
    </div>
    <div class="services">{$cards}</div>
  </div>
</section>

<section id="pacotes" class="dark">
  {$GLOBALS['auroraHtml']}
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow" style="color:var(--lime)">Pacotes</span>
      <h2>Comece pelo pacote certo e economize</h2>
      <p>Juntei os serviços que mais funcionam juntos. Dá para personalizar qualquer um.</p>
    </div>
    <div class="packages">{$packs}</div>
  </div>
</section>

<section id="exemplos">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">Exemplos ao vivo</span>
      <h2>Não é print. Abra e use.</h2>
      <p>Criei estes exemplos com negócios fictícios para você testar no seu celular como ficaria no seu.</p>
    </div>
    <div class="demos">
      <a class="demo reveal" href="/exemplos/cafeteria/"><div class="demo-shot shot-cafe"><span class="s-title">Café Aroma</span><span class="s-row"><i></i><b>Cappuccino</b><em>R$ 12</em></span><span class="s-row"><i></i><b>Pão de queijo</b><em>R$ 7</em></span><span class="s-btn">Enviar pedido no WhatsApp</span></div><div class="demo-body"><span class="tag">Site + cardápio digital</span><h3>Cafeteria com pedido no WhatsApp</h3><p>O cliente monta o pedido e ele chega pronto no WhatsApp, sem comissão.</p><span class="go">Abrir exemplo →</span></div></a>
      <a class="demo reveal" href="/exemplos/cartao/"><div class="demo-shot shot-card"><span class="s-avatar"></span><span class="s-name">Dra. Júlia Mendes</span><span class="s-sub">Fisioterapeuta</span><span class="s-pill">Salvar contato</span><span class="s-pill alt">WhatsApp</span></div><div class="demo-body"><span class="tag">Cartão digital + NFC</span><h3>Cartão de visita digital</h3><p>Salva o contato em um toque, com QR Code e versão para encostar no celular.</p><span class="go">Abrir exemplo →</span></div></a>
      <a class="demo reveal" href="/exemplos/estoque/"><div class="demo-shot shot-dash"><span class="s-kpis"><i></i><i></i><i></i></span><span class="s-bars"><i style="height:40%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:90%"></i><i style="height:65%"></i><i style="height:80%"></i></span><span class="s-alert">3 produtos acabando</span></div><div class="demo-body"><span class="tag">Painel de estoque</span><h3>Dashboard de estoque e vendas</h3><p>Alerta de produto acabando, mais vendidos e faturamento do mês.</p><span class="go">Abrir exemplo →</span></div></a>
      <a class="demo reveal" href="/exemplos/assistente/"><div class="demo-shot shot-bot"><span class="s-msg in">Oi! Quero marcar uma limpeza</span><span class="s-msg out">Claro! Tenho quinta às 14h ou sexta às 9h 😊</span><span class="s-msg in">Sexta!</span></div><div class="demo-body"><span class="tag">Chatbot com IA</span><h3>Assistente virtual de clínica</h3><p>Responde dúvidas, mostra preços e marca horário sozinho.</p><span class="go">Abrir exemplo →</span></div></a>
    </div>

    <div class="section-head reveal" style="margin:88px auto 40px">
      <span class="eyebrow">O que eu construo</span>
      <h2>Se o seu negócio precisa, provavelmente eu faço</h2>
    </div>
    <div class="builds">
      <div class="build reveal"><b>Sites para cafeterias, restaurantes e lojas</b><span>Com cardápio, catálogo e pedido online</span></div>
      <div class="build reveal"><b>Cardápios e catálogos digitais</b><span>QR Code na mesa, pedido no WhatsApp, sem taxa</span></div>
      <div class="build reveal"><b>Cartões de visita digitais e NFC</b><span>Encostou no celular, salvou o contato</span></div>
      <div class="build reveal"><b>Chatbots e assistentes com IA</b><span>No WhatsApp, no site e no Instagram</span></div>
      <div class="build reveal"><b>Ferramentas com inteligência artificial</b><span>Lê documentos, escreve propostas, faz resumos</span></div>
      <div class="build reveal"><b>Dashboards de estoque e vendas</b><span>Tudo o que importa numa tela só</span></div>
      <div class="build reveal"><b>Agendamento online</b><span>Com lembrete automático e sinal por Pix</span></div>
      <div class="build reveal"><b>Lojas virtuais</b><span>Pix, cartão, frete e aviso de pedido</span></div>
      <div class="build reveal"><b>Análise de segurança</b><span>Brechas do seu site encontradas antes dos outros</span></div>
      <div class="build reveal"><b>Automações e integrações</b><span>Planilhas, ERP, Pix, e-mail e WhatsApp conversando</span></div>
      <div class="build reveal"><b>Sistemas sob medida</b><span>Cadastro, agenda, financeiro e área do cliente</span></div>
      <div class="build reveal"><b>Reforma de sites antigos</b><span>Mais rápido, bonito e achado no Google</span></div>
    </div>

    <div class="about reveal">
      <div class="avatar"><img src="/assets/logo.svg" alt="" width="80" height="80"></div>
      <div>
        <h3 style="font-size:1.6rem;margin-bottom:10px">Oi, eu sou o Matheus.</h3>
        <p>Sou desenvolvedor de software sênior em São Paulo. Já construí sozinho o sistema completo de uma empresa de saúde, liderei projetos digitais para grandes empresas farmacêuticas e trabalhei por mais de dois anos num time de tecnologia da Alemanha.</p>
        <p>Hoje uso essa bagagem, e as melhores ferramentas de inteligência artificial, para entregar a pequenos negócios a mesma tecnologia das grandes empresas, sem a burocracia e o preço de agência. Você fala direto comigo, do primeiro contato ao suporte.</p>
      </div>
    </div>
  </div>
</section>

<section class="dark" id="como-funciona">
  {$GLOBALS['auroraHtml']}
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow" style="color:var(--lime)">Como funciona</span><h2>Simples do começo ao fim</h2><p>Você não precisa entender nada de tecnologia. Essa parte é comigo.</p></div>
    <div class="steps">
      <div class="step reveal"><h3>Conversa de 15 minutos</h3><p>Você me conta o seu negócio e onde perde mais tempo ou clientes.</p></div>
      <div class="step reveal"><h3>Proposta em até 2 dias</h3><p>O que vai ser feito, o prazo e o preço fechado, por escrito.</p></div>
      <div class="step reveal"><h3>Você aprova antes</h3><p>Mostro o layout e o funcionamento antes de publicar. Ajusto até ficar do seu jeito.</p></div>
      <div class="step reveal"><h3>No ar e com suporte</h3><p>Publico, te ensino a usar e fico por perto. 30 dias de ajustes grátis.</p></div>
    </div>
  </div>
</section>

<section id="faq">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">Dúvidas</span><h2>Perguntas frequentes</h2></div>
    {$GLOBALS['homeFaqHtml']}
  </div>
</section>

<section class="dark final">
  {$GLOBALS['auroraHtml']}
  <div class="wrap">
    <h2>Seu próximo cliente está te procurando <span class="grad-text">agora.</span></h2>
    <p class="muted" style="font-size:1.15rem;max-width:36em">Vamos fazer ele te encontrar. A primeira conversa é grátis e sem compromisso.</p>
    <div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="Olá, Matheus! Quero marcar a conversa de 15 minutos.">{$waIcon}Marcar conversa de 15 min</a><a class="btn btn-glass" href="#diagnostico">Ver meu plano</a></div>
  </div>
</section>
HTML;
require __DIR__.'/pages.php';
