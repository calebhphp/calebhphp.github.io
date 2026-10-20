<?php
// Writes every page. Included by build.php, which defines $site, $services, $niches, $home, helpers and globals.

write('/', layout([
    'path' => '/',
    'title' => 'Sites, lojas virtuais e automação de WhatsApp | Matheus Villanova',
    'description' => 'Sites, landing pages, lojas virtuais, agendamento online e atendimento automático no WhatsApp para pequenos negócios. Diagnóstico grátis e preço fechado.',
    'og_locale' => 'pt_BR',
    'alternates' => ['pt-BR' => '/', 'en' => '/en/', 'x-default' => '/'],
    'schema' => ['@context' => 'https://schema.org', '@graph' => [$business, ['@type' => 'WebSite', 'url' => $site['url'].'/', 'name' => $site['name'], 'inLanguage' => 'pt-BR'], faqSchema($homeFaq)]],
    'extra_js' => $diagJs,
], $home));

/* ================= SERVICE PAGES ================= */
foreach ($services as $slug => $s) {
    $benefits = implode('', array_map(fn ($b) => '<div class="benefit reveal"><h3>'.e($b[0]).'</h3><p>'.e($b[1]).'</p></div>', $s['benefits']));
    $includes = implode('', array_map(fn ($i) => '<li>'.e($i).'</li>', $s['includes']));
    $others = '';
    foreach (array_slice(array_diff_key($services, [$slug => 1]), 0, 3, true) as $os => $o) {
        $others .= serviceCard($os, $o);
    }
    $msg = 'Olá, Matheus! Vi a página de '.$s['name'].' no seu site e quero saber mais.';
    $priceLine = $s['price'] === 'Orçamento'
        ? '<b>Orçamento grátis</b><span>'.e($s['price_note']).'</span>'
        : '<span>a partir de</span><b>'.e($s['price']).'</b><span>'.e($s['price_note']).' · pronto em '.e($s['deadline']).'</span>';
    $faq = faqHtml($s['faq']);

    $body = '<header class="dark page-hero">'.aurora().'<div class="wrap">'
        .'<div class="crumbs"><a href="/">Início</a> / <a href="/#servicos">Serviços</a> / '.e($s['name']).'</div>'
        .'<span class="eyebrow" style="color:var(--lime)">'.e($s['name']).'</span><h1>'.e($s['h1']).'</h1><p class="lede">'.e($s['intro']).'</p>'
        .'<div class="price-tag">'.$priceLine.'</div>'
        .'<div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$waIcon.'Pedir orçamento no WhatsApp</a><a class="btn btn-glass" href="/#diagnostico">Fazer diagnóstico grátis</a></div>'
        .'</div></header>'
        .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">Por que vale a pena</span><h2>O que muda no seu negócio</h2></div><div class="benefits">'.$benefits.'</div></div></section>'
        .'<section style="padding-top:0"><div class="wrap split">'
        .'<div class="reveal"><span class="eyebrow">O que está incluso</span><h2 style="margin:14px 0 24px">Sem letra miúda</h2><ul class="includes">'.$includes.'</ul></div>'
        .'<div class="reveal"><span class="eyebrow">Dúvidas</span><h2 style="margin:14px 0 24px">Perguntas frequentes</h2>'.$faq.'</div>'
        .'</div></section>'
        .'<section class="dark final">'.aurora().'<div class="wrap"><h2>Vamos colocar isso para funcionar no seu negócio?</h2><div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$waIcon.'Conversar no WhatsApp</a></div></div></section>'
        .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">Combina com</span><h2>Outros serviços</h2></div><div class="services">'.$others.'</div></div></section>';

    write("/servicos/$slug/", layout([
        'path' => "/servicos/$slug/",
        'title' => $s['title'].' | Matheus Villanova',
        'description' => $s['description'],
        'og_locale' => 'pt_BR',
        'wa' => $msg,
        'schema' => ['@context' => 'https://schema.org', '@graph' => [
            ['@type' => 'Service', 'name' => $s['name'], 'description' => $s['description'], 'provider' => ['@id' => $site['url'].'/#negocio'], 'areaServed' => ['@type' => 'Country', 'name' => 'Brasil'],
                'offers' => ['@type' => 'Offer', 'priceCurrency' => 'BRL', 'price' => (string) priceValue($s['price']), 'description' => $s['price_note']]],
            crumbsSchema([['Início', '/'], ['Serviços', '/#servicos'], [$s['name'], "/servicos/$slug/"]]),
            faqSchema($s['faq']),
            $business,
        ]],
    ], $body));
}

/* ================= NICHE PAGES ================= */
$niches['__sst'] = [
    'name' => 'Clínicas de saúde ocupacional',
    'title' => 'Automação para clínicas de saúde ocupacional e SST',
    'description' => 'Agendamento no WhatsApp, lembrete de exames periódicos e alerta de prazos do eSocial (S-2220) para clínicas de medicina do trabalho e consultorias de SST.',
    'h1' => 'Menos faltas, menos telefone, nenhum prazo do eSocial perdido',
    'intro' => 'Eu já construí o sistema completo de uma empresa de saúde ocupacional, com ASO, RH e financeiro. Sei como a recepção perde o dia agendando exame por exame. Seu sistema de SST continua sendo o centro: eu automatizo o operacional em volta dele.',
    'pains' => ['Recepção presa agendando exame por exame', 'Trabalhador que não aparece no admissional', 'Periódico vencido e S-2220 em cima do prazo'],
    'services' => ['agendamento-online', 'atendimento-whatsapp', 'sistema-sob-medida', 'site-profissional'],
    'who' => 'uma clínica de saúde ocupacional',
    'extra' => '<section style="padding-top:0"><div class="wrap" style="text-align:center"><div class="price-tag" style="background:var(--surface);border-color:var(--line)"><span class="muted">Piloto de 30 dias a partir de</span><b>R$ 1.500</b><span class="muted">de implantação + R$ 400/mês. Cancele quando quiser.</span></div></div></section>',
];

foreach ($niches as $slug => $n) {
    $path = $slug === '__sst' ? '/clinicas/' : "/para/$slug/";
    $lower = mb_strtolower($n['name']);
    $pains = implode('', array_map(fn ($p) => '<div class="pain reveal">'.e($p).'</div>', $n['pains']));
    $svc = implode('', array_map(fn ($k) => serviceCard($k, $services[$k]), $n['services']));
    $msg = 'Olá, Matheus! Tenho '.($n['who'] ?? 'um negócio ('.$lower.')').' e vi seu site. Quero conversar.';

    $body = '<header class="dark page-hero">'.aurora().'<div class="wrap">'
        .'<div class="crumbs"><a href="/">Início</a> / Para '.e($lower).'</div>'
        .'<span class="eyebrow" style="color:var(--lime)">Para '.e($lower).'</span><h1>'.e($n['h1']).'</h1><p class="lede">'.e($n['intro']).'</p>'
        .'<div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$waIcon.'Conversar no WhatsApp</a><a class="btn btn-glass" href="/#diagnostico">Ver meu plano</a></div>'
        .'</div></header>'
        .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">Você reconhece isso?</span><h2>O que mais atrapalha hoje</h2></div><div class="pains">'.$pains.'</div></div></section>'
        .($n['extra'] ?? '')
        .'<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">A solução</span><h2>O que eu faço para '.e($lower).'</h2></div><div class="services">'.$svc.'</div></div></section>'
        .'<section class="dark final">'.aurora().'<div class="wrap"><h2>Vamos ver como ficaria no seu negócio?</h2><p class="muted" style="font-size:1.1rem">Conversa de 15 minutos, grátis e sem compromisso.</p><div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$waIcon.'Marcar conversa</a></div></div></section>';

    write($path, layout([
        'path' => $path,
        'title' => $n['title'].' | Matheus Villanova',
        'description' => $n['description'],
        'og_locale' => 'pt_BR',
        'og' => $slug === '__sst' ? 'og-clinicas.png' : 'og.png',
        'wa' => $msg,
        'schema' => ['@context' => 'https://schema.org', '@graph' => [
            ['@type' => 'Service', 'name' => $n['title'], 'description' => $n['description'], 'provider' => ['@id' => $site['url'].'/#negocio'], 'audience' => ['@type' => 'BusinessAudience', 'audienceType' => $n['name']]],
            crumbsSchema([['Início', '/'], [$n['name'], $path]]),
            $business,
        ]],
    ], $body));
}
unset($niches['__sst']);

/* ================= ENGLISH ================= */
$enCard = fn ($ic, $t, $d, $pfx, $p) => '<div class="card"><span class="ic">'.icon($ic).'</span><h3>'.$t.'</h3><p>'.$d.'</p><div class="meta"><span>'.$pfx.'</span><b>'.$p.'</b></div></div>';
$enBody = '<header class="dark hero">'.aurora().'<div class="wrap" style="max-width:900px">'
    .'<span class="pill"><b>AVAILABLE</b>For new projects</span>'
    .'<h1>Websites, automations and AI assistants that bring you customers.</h1>'
    .'<p class="lede">I\'m a senior developer from São Paulo with 8+ years of experience, including 2+ years on a remote team at a German tech company. I build websites, online stores, booking systems and AI customer assistants for small businesses, and Laravel + Vue/React products with AI features for tech teams.</p>'
    .'<div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="Hi Matheus! I found your website and would like to talk.">'.$waIcon.'Message me on WhatsApp</a><a class="btn btn-glass" href="mailto:'.$site['email'].'?subject=Project%20inquiry">Email me</a></div>'
    .'</div></header>'
    .'<section id="services"><div class="wrap"><div class="section-head"><span class="eyebrow">Services</span><h2>What I can build for you</h2><p>Fixed price before any work starts. You talk to me directly, from the first call to support.</p></div><div class="services">'
    .$enCard('chat', 'AI customer assistant', 'Answers customers 24/7 on your website or WhatsApp, books appointments and hands off to you when needed.', 'from', 'US$ 750')
    .$enCard('globe', 'Website or landing page', 'Fast, unique and built to turn visitors into leads. Live in about a week.', 'from', 'US$ 500')
    .$enCard('grid', 'Custom software', 'Booking, customer records, payments, dashboards and internal tools.', 'quote in', '2 days')
    .$enCard('bag', 'Online store', 'Catalog, checkout and order notifications, ready to sell.', 'from', 'US$ 900')
    .$enCard('shield', 'Laravel + Vue/React development', 'Features, legacy upgrades, APIs and LLM integrations (Claude, OpenAI) for product teams.', 'from', 'US$ 40/h')
    .$enCard('clock', 'Care plan', 'Uptime checks, backups, updates and small changes every month.', 'from', 'US$ 49/mo')
    .'</div></div></section>'
    .'<section class="dark final">'.aurora().'<div class="wrap"><h2>Tell me what you\'re building.</h2><p class="muted" style="font-size:1.1rem">I usually reply the same day.</p><div class="ctas"><a class="btn btn-wa" data-wa="Hi Matheus! I found your website and would like to talk.">'.$waIcon.'WhatsApp</a><a class="btn btn-glass" href="'.$site['linkedin'].'">LinkedIn</a></div></div></section>';

write('/en/', layout([
    'path' => '/en/',
    'lang' => 'en',
    'title' => 'Websites, automations and AI assistants for small businesses | Matheus Villanova',
    'description' => 'Senior developer building websites, online stores, booking systems, AI customer assistants and Laravel + Vue/React products with AI features. Fixed prices, direct communication.',
    'og_locale' => 'en_US',
    'og' => 'og-en.png',
    'alternates' => ['pt-BR' => '/', 'en' => '/en/'],
    'wa' => 'Hi Matheus! I found your website and would like to talk.',
    'schema' => ['@context' => 'https://schema.org', '@graph' => [$business]],
], $enBody));

/* ================= 404, SITEMAP, ROBOTS ================= */
$notFound = layout([
    'path' => '/404.html', 'title' => 'Página não encontrada | Matheus Villanova', 'description' => 'Página não encontrada.', 'og_locale' => 'pt_BR',
], '<header class="dark page-hero" style="min-height:70vh">'.aurora().'<div class="wrap"><h1>Essa página não existe mais.</h1><p class="lede">Mas o que você procura deve estar aqui.</p><div class="ctas"><a class="btn btn-primary" href="/">Ir para o início</a><a class="btn btn-glass" href="/#diagnostico">Fazer diagnóstico grátis</a></div></div></header>');
file_put_contents($root.'/404.html', str_replace('<meta name="description"', '<meta name="robots" content="noindex">'."\n".'<meta name="description"', $notFound));

$priority = fn ($p) => $p === '/' ? '1.0' : (str_starts_with($p, '/servicos/') ? '0.9' : '0.8');
$xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
foreach ($written as $p) {
    $xml .= "  <url><loc>{$site['url']}{$p}</loc><lastmod>{$today}</lastmod><priority>{$priority($p)}</priority></url>\n";
}
file_put_contents($root.'/sitemap.xml', $xml."</urlset>\n");
file_put_contents($root.'/robots.txt', "User-agent: *\nAllow: /\nDisallow: /_build/\n\nSitemap: {$site['url']}/sitemap.xml\n");

echo count($written)." páginas geradas:\n  ".implode("\n  ", $written)."\n";
