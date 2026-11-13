<?php
/**
 * Multilingual static site generator (PT, EN, ES). Run: php _build/site.php
 * Content: data.php / data-en.php / data-es.php (services, prices, niches), diag-*.php (diagnosis), ui.php (interface texts).
 */

$root = dirname(__DIR__);
$B = __DIR__;
$UI = require "$B/ui.php";
$timelines = $UI['__about_timeline'];
unset($UI['__about_timeline']);
$LANGS = ['pt' => 'data.php', 'en' => 'data-en.php', 'es' => 'data-es.php'];
$DATA = [];
$DIAG = [];
foreach ($LANGS as $l => $file) {
    $DATA[$l] = require "$B/$file";
    $DIAG[$l] = is_file("$B/diag-$l.php") ? require "$B/diag-$l.php" : require "$B/diag-pt.php";
}
$site = $DATA['pt']['site'];
$today = date('Y-m-d');
$pages = [];   // key => [lang => path]

function e(?string $s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

function icon(string $name): string
{
    static $p = [
        'chat' => '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/>',
        'grid' => '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
        'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        'moon' => '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
        'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.3-4 4.3-6 8-6s6.7 2 8 6"/>',
        'layers' => '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10"/>',
        'plumb' => '<path d="M12 2v7"/><path d="M8 9h8l-4 13z"/>',
    ];

    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.($p[$name] ?? $p['grid']).'</svg>';
}

// "R$ 1.497", "US$ 1,290", "1.290 €" -> 1497 / 1290
function priceValue(string $price): int
{
    if (! preg_match('/\d[\d.,]*/', $price, $m)) {
        return 0;
    }

    return (int) preg_replace('/[^\d]/', '', $m[0]);
}

function monthlyValue(string $note): int
{
    return preg_match('/(\d[\d.,]*)\s*(?:€\s*)?\/\s*(?:mês|month|mes|mo)/iu', $note, $m) ? (int) preg_replace('/[^\d]/', '', $m[1]) : 0;
}

function url(string $l, string $kind, string $slug = ''): string
{
    global $UI;
    $u = $UI[$l];
    $pre = $u['prefix'];
    $local = $u['slugs'][$slug] ?? $slug;

    return match ($kind) {
        'home' => $pre.'/',
        'service' => $pre.'/'.$u['dir']['services'].'/'.$local.'/',
        'niche' => $pre.'/'.$u['dir']['niches'].'/'.$local.'/',
        'sst' => $pre.'/'.$u['dir']['sst'].'/',
        'about' => $pre.'/'.$u['dir']['about'].'/',
    };
}

function promoOn(): bool
{
    global $site;

    return ! empty($site['promo_off']) && date('Y-m-d') <= $site['promo_end'];
}

$css = file_get_contents("$root/assets/style.css");
$css = preg_replace('!/\*.*?\*/!s', '', $css);
$INLINE_CSS = trim(preg_replace('/\s*\n\s*/', '', $css));
$APP_V = substr(md5_file("$root/assets/app.js"), 0, 8);
$WA = icon('chat');

function serviceCard(string $l, string $slug, array $s): string
{
    global $UI;
    $t = $UI[$l]['sections'];

    return '<a class="card reveal" href="'.url($l, 'service', $slug).'"><h3>'.e($s['name']).'</h3><p>'.e($s['short']).'</p><div class="meta"><span>'.e($t['card_from']).'</span><b>'.e($s['price']).'</b></div><span class="go">'.e($t['card_go']).'</span></a>';
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

function crumbs(array $items): array
{
    global $site;

    return ['@type' => 'BreadcrumbList', 'itemListElement' => array_map(fn ($it, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $it[0], 'item' => $site['url'].$it[1]], $items, array_keys($items))];
}

function business(string $l): array
{
    global $site, $DATA, $UI;
    $b = [
        '@type' => 'ProfessionalService', '@id' => $site['url'].'/#negocio',
        'name' => $site['name'], 'url' => $site['url'].url($l, 'home'), 'image' => $site['url'].'/assets/'.$UI[$l]['og'], 'logo' => $site['url'].'/assets/logo.svg',
        'description' => $UI[$l]['home']['description'], 'inLanguage' => $UI[$l]['hreflang'],
        'areaServed' => $l === 'pt' ? [['@type' => 'City', 'name' => 'São Paulo'], ['@type' => 'Country', 'name' => 'Brasil']] : 'Worldwide',
        'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'São Paulo', 'addressRegion' => 'SP', 'addressCountry' => 'BR'],
        'founder' => ['@type' => 'Person', 'name' => $site['name'], 'url' => $site['url'].url($l, 'about'), 'sameAs' => [$site['linkedin'], $site['github']]],
        'sameAs' => [$site['linkedin'], $site['github']],
        'hasOfferCatalog' => ['@type' => 'OfferCatalog', 'name' => $UI[$l]['nav']['services'], 'itemListElement' => array_values(array_map(fn ($s) => ['@type' => 'Offer', 'itemOffered' => ['@type' => 'Service', 'name' => $s['name'], 'description' => $s['short']]], $DATA[$l]['services']))],
    ];
    if (! empty($site['cnpj'])) {
        $b['taxID'] = $site['cnpj'];
    }

    return $b;
}

function layout(string $l, string $key, array $o, string $body): string
{
    global $site, $UI, $DATA, $INLINE_CSS, $APP_V, $WA, $pages, $niches_pt;
    $u = $UI[$l];
    $path = $pages[$key][$l];
    $canonical = $site['url'].$path;
    $is404 = $key === '404';
    // Google corta títulos perto de 60 caracteres: tira o nome do fim quando o título já é longo.
    $rawTitle = $o['title'];
    if ($key !== 'home' && mb_strlen($rawTitle) > 60) $rawTitle = preg_replace('/ \| Matheus Villanova$/u', '', $rawTitle);
    $title = e($rawTitle);
    $desc = e($o['description']);
    $og = $site['url'].'/assets/'.($o['og'] ?? $u['og']);
    $schema = json_encode($o['schema'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $ldTag = ! empty($o['schema']) ? '<script type="application/ld+json">'.$schema.'</script>' : '';
    $head = '';
    if (! empty($site['google_verification'])) {
        $head .= '<meta name="google-site-verification" content="'.e($site['google_verification']).'">';
    }
    $gtmBody = '';
    if (! empty($site['gtm'])) {
        $g = e($site['gtm']);
        $head .= "<script>window.dataLayer=window.dataLayer||[];(function(w,d,s,l,i){w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','{$g}');</script>";
        $gtmBody = "<noscript><iframe src=\"https://www.googletagmanager.com/ns.html?id={$g}\" title=\"Google Tag Manager\" height=\"0\" width=\"0\" style=\"display:none;visibility:hidden\"></iframe></noscript>";
    }
    if (! empty($site['ga4'])) {
        $id = e($site['ga4']);
        $head .= "<script async src=\"https://www.googletagmanager.com/gtag/js?id={$id}\"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','{$id}');</script>";
    }
    $alts = '';
    $switch = '';
    foreach ($pages[$key] as $hl => $p) {
        $alts .= '<link rel="alternate" hreflang="'.$UI[$hl]['hreflang'].'" href="'.$site['url'].$p.'">';
        $switch .= '<a href="'.$p.'" hreflang="'.$UI[$hl]['hreflang'].'" lang="'.$UI[$hl]['hreflang'].'"'.($hl === $l ? ' aria-current="true"' : '').' title="'.$UI[$hl]['name'].'">'.$UI[$hl]['label'].'</a>';
    }
    if (isset($pages[$key]['pt'])) {
        $alts .= '<link rel="alternate" hreflang="x-default" href="'.$site['url'].$pages[$key]['pt'].'">';
    }
    $head .= ! empty($o['noindex']) ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">';

    $canonicalTag = $is404 ? '' : '<link rel="canonical" href="'.$canonical.'">';
    $ogUrl = $is404 ? '' : '<meta property="og:url" content="'.$canonical.'">';
    if ($is404) {
        $alts = '';
    }
    $n = $u['nav'];
    $home = url($l, 'home');
    $wa = e($o['wa'] ?? $n['wa_msg']);
    $aboutCur = $key === 'about' ? ' aria-current="page"' : '';
    $nav = '<li class="hide-md"><a href="'.$home.'#servicos">'.e($n['services']).'</a></li>'
        .'<li class="hide-md"><a href="'.$home.'#exemplos">'.e($n['examples']).'</a></li>'
        .'<li class="hide-md hide-lg"><a href="'.$home.'#diagnostico">'.e($n['diag']).'</a></li>'
        .'<li class="hide-md"><a href="/prumo/">'.e($n['prumo']).'</a></li>'
        .'<li class="hide-md"><a href="'.url($l, 'about').'"'.$aboutCur.'>'.e($n['about']).'</a></li>'
        .'<li><nav class="langs" aria-label="'.e($n['lang']).'">'.$switch.'</nav></li>'
        .'<li><button class="theme-btn" type="button" data-theme-toggle aria-label="'.e($n['theme']).'" title="'.e($n['theme']).'"><span class="i-sun">'.icon('sun').'</span><span class="i-moon">'.icon('moon').'</span></button></li>'
        .'<li class="hide-md"><a class="btn btn-wa btn-sm" data-wa="'.$wa.'">'.e($n['wa']).'</a></li>';
    // Phone menu: the five destinations a visitor needs, labels always visible
    $tabbar = '<nav class="tabbar" aria-label="'.e($n['menu']).'">'
        .'<a href="'.$home.'#servicos">'.icon('grid').e($n['services']).'</a>'
        .'<a href="'.$home.'#exemplos">'.icon('layers').e($n['examples']).'</a>'
        .'<a class="tab-wa" data-wa="'.$wa.'">'.$WA.'WhatsApp</a>'
        .'<a href="/prumo/">'.icon('plumb').e($n['prumo']).'</a>'
        .'<a href="'.url($l, 'about').'"'.$aboutCur.'>'.icon('user').e($n['about']).'</a>'
        .'</nav>';

    $f = $u['footer'];
    $svcLinks = '';
    foreach ($DATA[$l]['services'] as $slug => $s) {
        $svcLinks .= '<li><a href="'.url($l, 'service', $slug).'">'.e($s['name']).'</a></li>';
    }
    $nicheLinks = '';
    foreach ($DATA[$l]['niches'] as $slug => $nn) {
        $nicheLinks .= '<li><a href="'.url($l, 'niche', $slug).'">'.e($nn['name']).'</a></li>';
    }
    $nicheLinks .= '<li><a href="'.url($l, 'sst').'">'.e($f['sst']).'</a></li>';
    $cnpj = ! empty($site['cnpj']) ? ' · CNPJ '.e($site['cnpj']) : '';
    $year = date('Y');

    $promo = promoOn() ? $u['promo'] : null;
    $promoBar = '';
    if ($promo) {
        $pmsg = e(str_replace('{code}', $site['promo_code'], $promo['msg']));
        $promoBar = '<div class="promo-bar" data-promo-bar><div class="wrap"><span>'.$promo['bar'].' '.e($promo['left']).'. <a data-wa="'.$pmsg.'">'.e($promo['cta']).'</a></span><button type="button" data-promo-close aria-label="'.e($promo['close']).'">×</button></div></div>';
    }
    $siteJs = json_encode(['whatsapp' => $site['whatsapp'], 'lang' => $l, 'locale' => $u['locale'], 'currency' => $u['currency'], 'promo' => $promo ? ['off' => $site['promo_off'], 'end' => $site['promo_end'], 'code' => $site['promo_code'], 'left' => $promo['left']] + $promo : null], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $extra = $o['extra_js'] ?? '';

    return <<<HTML
<!DOCTYPE html>
<html lang="{$u['hreflang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{$title}</title>
<meta name="description" content="{$desc}">
{$canonicalTag}
{$alts}
<meta name="theme-color" content="#0b0e0d">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="{$u['og_locale']}">
<meta property="og:site_name" content="{$site['name']}">
{$ogUrl}
<meta property="og:title" content="{$title}">
<meta property="og:description" content="{$desc}">
<meta property="og:image" content="{$og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{$head}
<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/manrope.woff2" as="font" type="font/woff2" crossorigin>
<style>{$INLINE_CSS}</style>
{$ldTag}
</head>
<body>
{$gtmBody}<a class="skip" href="#conteudo">{$n['skip']}</a>
{$promoBar}
<nav class="nav" aria-label="{$n['main']}">
  <div class="wrap">
    <a class="brand" href="{$home}" aria-label="{$site['name']}"><img src="/assets/logo.svg" alt="" width="32" height="32"><span>{$site['name']}</span></a>
    <ul>{$nav}</ul>
  </div>
</nav>
{$tabbar}
<main id="conteudo">
{$body}
</main>
<footer>
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="{$home}" aria-label="{$site['name']}"><img src="/assets/logo.svg" alt="" width="32" height="32"><span>{$site['name']}</span></a>
        <p style="margin-top:14px;max-width:30em">{$f['blurb']}</p>
        <p class="foot-h" style="margin-top:26px">{$f['products']}</p>
        <ul><li><a href="/prumo/">{$f['prumo']}</a></li>{$GLOBALS['prodLinks'][$l]}</ul>
      </div>
      <div><p class="foot-h">{$f['services']}</p><ul>{$svcLinks}</ul></div>
      <div><p class="foot-h">{$f['for']}</p><ul>{$nicheLinks}</ul></div>
      <div><p class="foot-h">{$f['contact']}</p><ul><li><a data-wa="{$wa}">WhatsApp</a></li><li><a href="mailto:{$site['email']}">{$f['email']}</a></li><li><a href="{$site['linkedin']}">LinkedIn</a></li><li><a href="{$site['github']}">GitHub</a></li><li><a href="{$GLOBALS['aboutLinks'][$l]}">{$f['about']}</a></li></ul></div>
    </div>
    <div class="bottom"><span>© {$year} {$site['name']} · {$f['place']}{$cnpj}</span><span>{$f['made']} · <a href="/licencas/">{$f['licenses']}</a></span></div>
  </div>
</footer>
<script>window.SITE={$siteJs};{$extra}</script>
<script src="/assets/app.js?v={$APP_V}" defer></script>
</body>
</html>
HTML;
}

function write(string $path, string $html): void
{
    global $root;
    $file = $root.$path.(str_ends_with($path, '/') ? 'index.html' : '');
    if (! is_dir(dirname($file))) {
        mkdir(dirname($file), 0777, true);
    }
    // Remember which pages really changed, so the sitemap lastmod only moves when the content does
    $GLOBALS['CHANGED'][$path] = ! is_file($file) || file_get_contents($file) !== $html;
    file_put_contents($file, $html);
}

// Related blocks: demos and ready-made products linked from niche and service pages (products exist in Portuguese only)
$NICHE_DEMO = ['clinicas-e-consultorios' => 'assistente', 'dentistas' => 'assistente', 'restaurantes-e-delivery' => 'cafeteria', 'cafeterias-e-padarias' => 'cafeteria', 'saloes-e-barbearias' => 'agenda', 'estudios-e-academias' => 'agenda', 'pet-shops' => 'agenda', 'lojas-e-comercio' => 'loja-accra', 'prestadores-de-servico' => 'orcamento', '__sst' => 'assistente'];
$PRODUCTS = [
    'cardapio' => ['path' => '/produtos/cardapio/', 'name' => 'Cardápio Digital pronto', 'services' => ['cardapio-digital'], 'niches' => ['restaurantes-e-delivery', 'cafeterias-e-padarias']],
    'agenda' => ['path' => '/produtos/agenda/', 'name' => 'Agenda Online pronta', 'services' => ['agendamento-online'], 'niches' => ['saloes-e-barbearias', 'estudios-e-academias']],
];
function productBlock(string $l, string $kind, string $slug): string
{
    global $PRODUCTS, $UI;
    if ($l !== 'pt') {
        return '';
    }
    foreach ($PRODUCTS as $p) {
        if (in_array($slug, $p[$kind], true)) {
            $t = $UI[$l]['niche'];

            return '<section style="padding-top:0"><div class="wrap" style="text-align:center"><div class="section-head reveal"><span class="eyebrow">'.e($t['prod_eyebrow']).'</span><h2>'.e($t['prod_h2']).'</h2><p>'.e(str_replace('{name}', $p['name'], $t['prod_p'])).'</p></div><a class="btn btn-outline" href="'.$p['path'].'">'.e($t['prod_cta']).'</a></div></section>';
        }
    }

    return '';
}
function demoBlock(string $l, string $slug): string
{
    global $NICHE_DEMO, $UI;
    $d = $NICHE_DEMO[$slug] ?? null;
    if (! $d) {
        return '';
    }
    foreach ($UI[$l]['demos'] as [$ds, $tag, $title, $desc]) {
        if ($ds === $d) {
            $t = $UI[$l]['niche'];

            return '<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($t['demo_eyebrow']).'</span><h2>'.e($t['demo_h2']).'</h2><p>'.e($t['demo_p']).'</p></div><div class="demos"><a class="demo reveal" href="/exemplos/'.$ds.'/"><div class="demo-body"><span class="tag">'.e($tag).'</span><h3>'.e($title).'</h3><p>'.e($desc).'</p><span class="go">'.e($UI[$l]['demo_go']).'</span></div></a></div></div></section>';
        }
    }

    return '';
}

/* ---------- Register every page and its translations ---------- */
foreach (array_keys($LANGS) as $l) {
    $pages['home'][$l] = url($l, 'home');
    $pages['about'][$l] = url($l, 'about');
    $pages['sst'][$l] = url($l, 'sst');
    foreach (array_keys($DATA[$l]['services']) as $slug) {
        $pages["svc:$slug"][$l] = url($l, 'service', $slug);
    }
    foreach (array_keys($DATA[$l]['niches']) as $slug) {
        $pages["niche:$slug"][$l] = url($l, 'niche', $slug);
    }
    $GLOBALS['aboutLinks'][$l] = url($l, 'about');
    // Ready-made products exist in Portuguese only
    $GLOBALS['prodLinks'][$l] = $l === 'pt' ? '<li><a href="/produtos/cardapio/">Cardápio Digital pronto</a></li><li><a href="/produtos/agenda/">Agenda Online pronta</a></li>' : '';
}

$FAQ = [];
foreach (array_keys($LANGS) as $l) {
    $FAQ[$l] = faqHtml($UI[$l]['faq']);
}

/* ---------- Build each language ---------- */
foreach (array_keys($LANGS) as $l) {
    $u = $UI[$l];
    $d = $DATA[$l];
    $dg = $DIAG[$l];
    $h = $u['home'];
    $s = $u['sections'];
    $services = $d['services'];

    // Diagnosis payload
    $dServices = [];
    foreach ($services as $slug => $sv) {
        $extra = $dg['services'][$slug] ?? ['promise' => $sv['short'], 'brief' => [], 'example' => ''];
        $dServices[$slug] = ['name' => $sv['name'], 'price' => priceValue($sv['price']) ? $u['diag']['from'].' '.$sv['price'] : $u['diag']['quote'], 'value' => priceValue($sv['price']), 'monthly' => monthlyValue($sv['price_note']), 'deadline' => $sv['deadline'], 'url' => url($l, 'service', $slug)] + $extra;
    }
    $diagJs = 'window.DIAG='.json_encode(['services' => $dServices, 'businesses' => $dg['businesses'], 'problems' => $dg['problems'], 'specials' => $dg['specials'] ?? [], 'ui' => $u['diag'] + $dg['ui']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).';';

    $bizChips = '';
    foreach ($dg['businesses'] as $k => $b) {
        $bizChips .= '<label class="chip"><input type="radio" name="negocio" value="'.$k.'"'.($k === 'clinica' ? ' checked' : '').'><span>'.e($b['label']).'</span></label>';
    }
    $probChips = '';
    foreach ($dg['problems'] as $k => $p) {
        $probChips .= '<label class="chip"><input type="checkbox" name="problema" value="'.$k.'"'.($k === 'faltas' ? ' checked' : '').'><span>'.e($p['label']).'</span></label>';
    }

    $cards = implode('', array_map(fn ($slug) => serviceCard($l, $slug, $services[$slug]), array_keys($services)));
    $packs = '';
    foreach ($d['packages'] as $p) {
        $items = implode('', array_map(fn ($i) => '<li>'.e($i).'</li>', $p['items']));
        $packs .= '<article class="pack'.($p['featured'] ? ' featured' : '').' reveal"><h3>'.e($p['name']).'</h3><p class="for">'.e($p['for']).'</p><div class="price"><b>'.e($p['price']).'</b><span>'.e($p['note']).'</span></div>'.($p['save'] ? '<span class="save">'.e($p['save']).'</span>' : '').'<ul>'.$items.'</ul><a class="btn '.($p['featured'] ? 'btn-wa' : 'btn-ghost').'" data-wa="'.e($s['pack_msg'].' '.$p['name'].'.').'">'.e($s['pack_cta'].' '.$p['name']).'</a></article>';
    }
    // Work: real products first, then live examples with fictional businesses. Each card shows a real screen of the page it opens.
    $demoCard = fn (string $href, string $img, string $tag, bool $real, string $title, string $desc, string $cat = '') => '<li class="demo-item" data-cat="'.$cat.'"><a class="demo" href="'.$href.'"><figure class="demo-shot"><img src="/assets/img/'.$img.'.webp" alt="" width="600" height="800" loading="lazy" decoding="async"></figure><div class="demo-body"><span class="tag'.($real ? ' real' : '').'">'.e($tag).'</span><h3>'.e($title).'</h3><p>'.e($desc).'</p><span class="go">'.e($real && ! str_starts_with($href, '/exemplos/') ? $u['work_go'] : $u['demo_go']).'</span></div></a></li>';
    $demoHtml = '';
    foreach ($u['work'] as [$href, $img, $tag, $title, $desc]) {
        $demoHtml .= $demoCard($href, $img, $tag, true, $title, $desc, 'produto');
    }
    $demoList = $u['demos'];
    usort($demoList, fn ($a, $b) => ($b[0] === 'loja-accra') <=> ($a[0] === 'loja-accra')); // the real brand right after my products
    foreach ($demoList as [$slug, $tag, $title, $desc]) {
        $real = $slug === 'loja-accra';
        $cats = ['cafeteria' => 'alimentacao', 'agenda' => 'beleza', 'fidelidade' => 'beleza', 'assistente' => 'saude', 'cartao' => 'saude', 'estoque' => 'loja', 'loja-accra' => 'loja', 'orcamento' => 'servicos'];
        $demoHtml .= $demoCard('/exemplos/'.$slug.'/', 'ex-'.$slug, $real ? $tag : $tag.' · '.$u['demo_fict'], $real, $title, $desc, $cats[$slug] ?? 'servicos');
    }
    $soonHtml = implode('', array_map(fn ($x) => '<li><span class="tag">'.e($u['soon_label']).'</span><h3>'.e($x[0]).'</h3><p>'.e($x[1]).'</p></li>', $u['soon']));
    $filterBtns = '<button type="button" class="fchip" data-f="all" aria-pressed="true">'.e($u['filters']['all']).'</button>';
    foreach (['produto', 'alimentacao', 'beleza', 'saude', 'loja', 'servicos'] as $fk) {
        $filterBtns .= '<button type="button" class="fchip" data-f="'.$fk.'" aria-pressed="false">'.e($u['filters'][$fk]).'</button>';
    }
    $builds = implode('', array_map(fn ($b) => '<div class="build reveal"><b>'.e($b[0]).'</b><span>'.e($b[1]).'</span></div>', $u['builds']));
    $steps = implode('', array_map(fn ($st) => '<div class="step reveal"><h3>'.e($st[0]).'</h3><p>'.e($st[1]).'</p></div>', $s['steps']));
    $trust = implode('', array_map(fn ($t) => '<li>'.e($t).'</li>', $h['trust']));
    $chat = implode('', array_map(fn ($m) => '<div class="msg '.$m[0].'">'.e($m[1]).'<time>'.e($m[2]).'</time></div>', $h['chat']));
    $lz = $u['launch'];
    $lzItems = implode('', array_map(fn ($i) => '<li>'.e($i).'</li>', $lz['items']));
    $shotFiles = ['home-m', 'lancar', 'chat-m', 'fila', 'tom', 'retro-char'];
    $lzShots = '';
    foreach ($lz['shots'] as $k => $cap) {
        $lzShots .= '<li><img src="/assets/img/prumo-'.$shotFiles[$k].'.webp" alt="" width="520" height="925" loading="lazy" decoding="async"><span>'.e($cap).'</span></li>';
    }
    $dgu = $u['diag'];
    $cv = $u['conv'];
    $mockItems = array_map(fn ($r) => array_combine(['k', 'label', 'url', 'name', 'tag', 's', 'cta', 'hours', 'toast'], $r), $u['mock']['items']);
    $mockJs = 'window.MOCK='.json_encode(['cap' => $u['mock']['cap'], 'see' => $u['mock']['see'], 'items' => $mockItems], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP).';';
    $chipList = ['clinicas-e-consultorios', 'advogados-e-escritorios', 'restaurantes-e-delivery', 'saloes-e-barbearias', 'lojas-e-comercio', 'escolas-e-professores', 'pet-shops', 'oficinas-e-estetica-automotiva'];
    $chips = '';
    foreach ($chipList as $cs) {
        if (! empty($d['niches'][$cs])) {
            $chips .= '<a class="fchip" href="'.url($l, 'niche', $cs).'">'.e($d['niches'][$cs]['name']).'</a>';
        }
    }
    $chips = $chips ? '<div class="hero-chips"><span>'.e($cv['chips_label']).'</span><div>'.$chips.'</div></div>' : '';
    $proofItems = implode('', array_map(fn ($p) => '<li><b>'.e($p[0]).'</b><span>'.e($p[1]).'</span></li>', $cv['proof']));
    $quotesHtml = '';
    if (! empty($site['testimonials'])) {
        $quotesHtml = '<ul class="quotes">'.implode('', array_map(fn ($t) => '<li><blockquote><p>“'.e($t['quote']).'”</p></blockquote><footer><b>'.e($t['name']).'</b><span>'.e($t['role']).'</span></footer></li>', $site['testimonials'])).'</ul>';
    }
    $proofHtml = empty($site['testimonials']) ? '' : '<section class="proof" id="prova"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($cv['proof_eyebrow']).'</span><h2>'.e($cv['proof_h2']).'</h2></div><ul class="proof-list">'.$proofItems.'</ul>'.($cv['proof_note'] ? '<p class="muted proof-note">'.e($cv['proof_note']).'</p>' : '').$quotesHtml.'</div></section>';
    $leadMsg = e($cv['wa_lead']);
    $leadHtml = '<section class="lead" id="previa"><div class="wrap lead-grid"><div class="section-head reveal"><span class="eyebrow">'.e($cv['lead_eyebrow']).'</span><h2>'.e($cv['lead_h2']).'</h2><p>'.e($cv['lead_p']).'</p></div>'
        .'<form class="lead-form" data-lead data-endpoint="https://formsubmit.co/ajax/'.e($site['email']).'" data-wamsg="'.$leadMsg.'" data-ok="'.e($cv['f_ok']).'" data-err="'.e($cv['f_err']).'" data-sending="'.e($cv['f_sending']).'" data-walabel="'.e($cv['f_wa']).'" novalidate>'
        .'<label>'.e($cv['f_name']).'<input name="nome" required autocomplete="name"></label>'
        .'<label>'.e($cv['f_biz']).'<input name="negocio" required></label>'
        .'<label>'.e($cv['f_phone']).'<input name="contato" required autocomplete="tel"></label>'
        .'<label>'.e($cv['f_need']).'<textarea name="necessidade" rows="3"></textarea></label>'
        .'<input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">'
        .'<input type="hidden" name="_subject" value="Pedido de prévia grátis (site)"><input type="hidden" name="_captcha" value="false"><input type="hidden" name="_template" value="table">'
        .'<button class="btn btn-wa" type="submit">'.e($cv['f_send']).'</button><p class="muted lead-note">'.e($cv['f_lgpd']).'</p><p class="lead-status" role="status" aria-live="polite"></p></form></div></section>';

    $body = <<<HTML
<header class="hero">
  <div class="codebg" aria-hidden="true"><pre>&lt;section class="hero" id="topo"&gt;
  &lt;h1&gt;Clínica Vida&lt;/h1&gt;
  &lt;p&gt;Atendimento com hora marcada.&lt;/p&gt;
  &lt;a class="btn" href="https://wa.me/5511999990000"&gt;Agendar&lt;/a&gt;
&lt;/section&gt;

const slots = await fetch("/api/horarios").then(r =&gt; r.json());
slots.filter(s =&gt; s.livre).forEach(renderSlot);

@media (min-width: 860px) {
  .hero { display: grid; grid-template-columns: 1.1fr .9fr; }
  .btn:hover { transform: translateY(-2px); }
}

function confirmar(cliente, horario) {
  if (!horario.livre) return false;
  enviarLembrete(cliente.telefone, horario.inicio);
  return true;
}

&lt;form data-lead novalidate&gt;
  &lt;input name="nome" required autocomplete="name"&gt;
  &lt;input name="contato" required autocomplete="tel"&gt;
  &lt;button type="submit"&gt;Quero a prévia&lt;/button&gt;
&lt;/form&gt;

document.querySelectorAll("[data-wa]").forEach(a =&gt; {
  a.href = "https://wa.me/" + numero;
});

.card { border-radius: 22px; backdrop-filter: blur(18px); }
.card:hover::after { opacity: .55; }

&lt;section class="hero" id="topo"&gt;
  &lt;h1&gt;Clínica Vida&lt;/h1&gt;
  &lt;p&gt;Atendimento com hora marcada.&lt;/p&gt;
  &lt;a class="btn" href="https://wa.me/5511999990000"&gt;Agendar&lt;/a&gt;
&lt;/section&gt;

const slots = await fetch("/api/horarios").then(r =&gt; r.json());
slots.filter(s =&gt; s.livre).forEach(renderSlot);

@media (min-width: 860px) {
  .hero { display: grid; grid-template-columns: 1.1fr .9fr; }
  .btn:hover { transform: translateY(-2px); }
}

function confirmar(cliente, horario) {
  if (!horario.livre) return false;
  enviarLembrete(cliente.telefone, horario.inicio);
  return true;
}

&lt;form data-lead novalidate&gt;
  &lt;input name="nome" required autocomplete="name"&gt;
  &lt;input name="contato" required autocomplete="tel"&gt;
  &lt;button type="submit"&gt;Quero a prévia&lt;/button&gt;
&lt;/form&gt;

document.querySelectorAll("[data-wa]").forEach(a =&gt; {
  a.href = "https://wa.me/" + numero;
});

.card { border-radius: 22px; backdrop-filter: blur(18px); }
.card:hover::after { opacity: .55; }</pre></div>
  <div class="wrap grid">
    <div>
      <span class="eyebrow">{$h['eyebrow']}</span>
      <h1>{$h['h1_pre']} <em>{$h['word']}</em>.<br>{$h['h1_post']}</h1>
      <p class="lede">{$h['lede']}</p>
      <div class="ctas">
        <a class="btn btn-wa" data-wa="{$h['cta_wa_msg']}">{$WA}{$h['cta_wa']}</a>
        <a class="btn btn-ghost" href="#diagnostico">{$h['cta_diag']}</a>
      </div>
      <ul class="trust">{$trust}</ul>
      {$chips}
    </div>
    <div class="mock-wrap"><div class="mock" data-mock="saude" data-cycle></div><p class="mock-cap" data-mock-cap></p></div>
  </div>
</header>

{$proofHtml}

<section id="servicos" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['services_eyebrow']}</span><h2>{$s['services_h2']}</h2><p>{$s['services_p']}</p></div>
    <div class="services">{$cards}</div>
  </div>
</section>

<section id="exemplos" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['examples_eyebrow']}</span><h2>{$s['examples_h2']}</h2><p>{$s['examples_p']}</p></div>
    <div class="filters" role="group" aria-label="{$u['filters']['label']}" data-filters>{$filterBtns}</div>
    <div class="carousel" data-carousel>
      <ul class="demos" tabindex="0" aria-label="{$u['nav']['examples']}" data-track>{$demoHtml}</ul>
      <div class="car-ctl"><button type="button" class="car-btn" data-prev aria-label="{$u['filters']['prev']}">←</button><span class="car-count" data-count aria-live="polite"></span><button type="button" class="car-btn" data-next aria-label="{$u['filters']['next']}">→</button></div>
    </div>
    <ul class="soon" aria-label="{$u['soon_label']}">{$soonHtml}</ul>
  </div>
</section>

<section class="dark" id="como-funciona">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['how_eyebrow']}</span><h2>{$s['how_h2']}</h2><p>{$s['how_p']}</p></div>
    <div class="steps">{$steps}</div>
  </div>
</section>

<section id="diagnostico">
  <div class="wrap">
    <div class="section-head reveal">
      <span class="eyebrow">{$dgu['eyebrow']}</span>
      <h2>{$dgu['h2']}</h2>
      <p>{$dgu['p']}</p>
    </div>
    <form class="diag" data-diag onsubmit="return false">
      <div class="diag-panel">
        <div class="diag-step"><h3><i>1</i>{$dgu['step1']}</h3><fieldset class="chips"><legend class="sr-only">{$dgu['legend1']}</legend>{$bizChips}</fieldset></div>
        <div class="diag-step"><h3><i>2</i>{$dgu['step2']} <span class="muted" style="font:400 .9rem var(--body)">{$dgu['multi']}</span></h3><fieldset class="chips"><legend class="sr-only">{$dgu['legend2']}</legend>{$probChips}</fieldset></div>
      </div>
      <div class="diag-result" data-diag-result aria-live="polite">
        <span class="label">{$dgu['label']}</span>
        <h3>{$dgu['empty_h3']}</h3>
        <p class="why">{$dgu['empty_p']}</p>
      </div>
    </form>
  </div>
</section>

<section id="pacotes" class="dark">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['packages_eyebrow']}</span><h2>{$s['packages_h2']}</h2><p>{$s['packages_p']}</p></div>
    <div class="packages">{$packs}</div>
  </div>
</section>

<section class="band launch" id="prumo" aria-labelledby="prumo-h">
  <div class="wrap">
    <div class="launch-top">
      <div>
        <span class="eyebrow">{$lz['eyebrow']}</span>
        <h2 id="prumo-h">Prumo<small>{$lz['sub']}</small></h2>
        <p>{$lz['p']}</p>
      </div>
      <div>
        <ul>{$lzItems}</ul>
        <div class="ctas"><a class="btn btn-primary" href="/prumo/app/">{$lz['cta']}</a><a class="btn btn-ghost" href="/prumo/#contact">{$lz['cta2']}</a></div>
        <p class="note muted">{$lz['note']}</p>
      </div>
    </div>
    <ul class="shots" tabindex="0" aria-label="{$lz['sub']}">{$lzShots}</ul>
  </div>
</section>

<section id="o-que-eu-faco">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['builds_eyebrow']}</span><h2>{$s['builds_h2']}</h2></div>
    <div class="builds">{$builds}</div>
    <div class="about reveal">
      <div class="avatar"><img src="/assets/logo.svg" alt="" width="64" height="64" loading="lazy" decoding="async"></div>
      <div>
        <h3 style="font-size:1.5rem;margin-bottom:10px">{$s['about_h3']}</h3>
        <p>{$s['about_p1']}</p>
        <p>{$s['about_p2']}</p>
        <p style="margin-top:14px"><a href="{$GLOBALS['aboutLinks'][$l]}" style="font-weight:700">{$s['about_link']}</a></p>
      </div>
    </div>
  </div>
</section>

<section id="faq">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['faq_eyebrow']}</span><h2>{$s['faq_h2']}</h2></div>
    {$GLOBALS['FAQ'][$l]}
  </div>
</section>

{$leadHtml}

<section class="dark final">
  <div class="wrap">
    <h2>{$s['final_h2']} <em>{$s['final_grad']}</em></h2>
    <p class="muted" style="font-size:1.15rem;max-width:36em">{$s['final_p']}</p>
    <div class="ctas"><a class="btn btn-wa" data-wa="{$s['final_cta_msg']}">{$WA}{$s['final_cta']}</a><a class="btn btn-ghost" href="#diagnostico">{$s['final_cta2']}</a></div>
  </div>
</section>
HTML;

    write($pages['home'][$l], layout($l, 'home', [
        'title' => $h['title'], 'description' => $h['description'],
        'schema' => ['@context' => 'https://schema.org', '@graph' => [business($l), ['@type' => 'WebSite', 'url' => $site['url'].$pages['home'][$l], 'name' => $site['name'], 'inLanguage' => $u['hreflang']], faqSchema($u['faq'])]],
        'extra_js' => $diagJs.$mockJs,
    ], $body));

    /* ---------- Service pages ---------- */
    $sv = $u['svc'];
    foreach ($services as $slug => $x) {
        $benefits = implode('', array_map(fn ($b) => '<div class="benefit reveal"><h3>'.e($b[0]).'</h3><p>'.e($b[1]).'</p></div>', $x['benefits']));
        $includes = implode('', array_map(fn ($i) => '<li>'.e($i).'</li>', $x['includes']));
        $others = implode('', array_map(fn ($os) => serviceCard($l, $os, $services[$os]), array_slice(array_keys(array_diff_key($services, [$slug => 1])), 0, 3)));
        $msg = str_replace('{name}', $x['name'], $sv['wa']);
        $priceLine = priceValue($x['price'])
            ? '<span>'.e($sv['from']).'</span><b>'.e($x['price']).'</b><span>'.e($x['price_note']).' · '.e($sv['ready']).' '.e($x['deadline']).'</span>'
            : '<b>'.e($sv['quote_free']).'</b><span>'.e($x['price_note']).'</span>';
        if (promoOn() && priceValue($x['price'])) {
            $priceLine .= '<span class="promo-pill">'.e(str_replace('{off}', (string) $site['promo_off'], $u['promo']['svc'])).'</span>';
        }
        $nt = $u['niche'];
        $forLinks = '';
        foreach ($d['niches'] as $ns => $nn) {
            if (in_array($slug, $nn['services'], true)) {
                $forLinks .= '<a class="btn btn-outline btn-sm" href="'.url($l, 'niche', $ns).'">'.e($nn['name']).'</a>';
            }
        }
        $forBlock = $forLinks ? '<section style="padding-top:0"><div class="wrap" style="text-align:center"><div class="section-head reveal"><span class="eyebrow">'.e($nt['svcfor_eyebrow']).'</span><h2>'.e($nt['svcfor_h2']).'</h2></div><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">'.$forLinks.'</div></div></section>' : '';
        $forBlock .= productBlock($l, 'services', $slug);
        $ex = $dg['services'][$slug]['example'] ?? '';
        $exLink = $ex ? '<a class="btn btn-ghost" href="/exemplos/'.$ex.'/">'.e($u['demo_go']).'</a>' : '<a class="btn btn-ghost" href="'.url($l, 'home').'#diagnostico">'.e($sv['cta_diag']).'</a>';
        $body = '<header class="page-hero"><div class="wrap"><div class="crumbs"><a href="'.url($l, 'home').'">'.e($sv['home']).'</a> / <a href="'.url($l, 'home').'#servicos">'.e($sv['services']).'</a> / '.e($x['name']).'</div>'
            .'<span class="eyebrow">'.e($x['name']).'</span><h1>'.e($x['h1']).'</h1><p class="lede">'.e($x['intro']).'</p><div class="price-tag">'.$priceLine.'</div>'
            .'<div class="ctas"><a class="btn btn-wa" data-wa="'.e($msg).'">'.$WA.e($sv['cta_quote']).'</a>'.$exLink.'</div></div></header>'
            .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($sv['why_eyebrow']).'</span><h2>'.e($sv['why_h2']).'</h2></div><div class="benefits">'.$benefits.'</div></div></section>'
            .'<section style="padding-top:0"><div class="wrap split"><div class="reveal"><span class="eyebrow">'.e($sv['inc_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($sv['inc_h2']).'</h2><ul class="includes">'.$includes.'</ul></div>'
            .'<div class="reveal"><span class="eyebrow">'.e($sv['faq_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($sv['faq_h2']).'</h2>'.faqHtml($x['faq']).'</div></div></section>'
            .'<section class="dark final"><div class="wrap"><h2>'.e($sv['final_h2']).'</h2><div class="ctas"><a class="btn btn-wa" data-wa="'.e($msg).'">'.$WA.e($sv['final_cta']).'</a></div></div></section>'
            .$forBlock
            .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($sv['combo_eyebrow']).'</span><h2>'.e($sv['combo_h2']).'</h2></div><div class="services">'.$others.'</div></div></section>';
        $offer = ['@type' => 'Offer', 'priceCurrency' => $u['currency'], 'description' => $x['price_note'], 'url' => $site['url'].$pages["svc:$slug"][$l]];
        if (priceValue($x['price'])) {
            $offer['priceSpecification'] = ['@type' => 'PriceSpecification', 'priceCurrency' => $u['currency'], 'minPrice' => priceValue($x['price'])];
        }
        write($pages["svc:$slug"][$l], layout($l, "svc:$slug", [
            'title' => $x['title'].' | '.$site['name'], 'description' => $x['description'], 'wa' => $msg,
            'schema' => ['@context' => 'https://schema.org', '@graph' => [
                ['@type' => 'Service', 'name' => $x['name'], 'description' => $x['description'], 'provider' => ['@id' => $site['url'].'/#negocio'], 'areaServed' => $l === 'pt' ? ['@type' => 'Country', 'name' => 'Brasil'] : 'Worldwide', 'offers' => $offer],
                crumbs([[$sv['home'], url($l, 'home')], [$sv['services'], url($l, 'home').'#servicos'], [$x['name'], $pages["svc:$slug"][$l]]]),
                faqSchema($x['faq']), business($l),
            ]],
        ], $body));
    }

    /* ---------- Niche pages (+ occupational health) ---------- */
    $nc = $u['niche'];
    $nicheList = $d['niches'];
    $nicheList['__sst'] = $d['sst'] ?? null;
    $prevMap = ['clinicas-e-consultorios' => 'saude', 'dentistas' => 'saude', 'nutricionistas-e-psicologos' => 'saude', 'restaurantes-e-delivery' => 'gastro', 'cafeterias-e-padarias' => 'gastro', 'saloes-e-barbearias' => 'beleza', 'estudios-e-academias' => 'beleza', 'pet-shops' => 'pet', 'lojas-e-comercio' => 'loja', 'advogados-e-escritorios' => 'juridico', 'contadores-e-despachantes' => 'juridico', 'escolas-e-professores' => 'escola', 'oficinas-e-estetica-automotiva' => 'auto'];
    foreach ($nicheList as $slug => $n) {
        if (! $n) {
            continue;
        }
        $key = $slug === '__sst' ? 'sst' : "niche:$slug";
        $lower = mb_strtolower($n['name']);
        $pains = implode('', array_map(fn ($p) => '<div class="pain reveal">'.e($p).'</div>', $n['pains']));
        $svc = implode('', array_map(fn ($k) => isset($services[$k]) ? serviceCard($l, $k, $services[$k]) : '', $n['services']));
        $who = $n['who'] ?? str_replace('{name}', $lower, $nc['who_default']);
        $msg = str_replace('{who}', $who, $nc['wa']);
        $extra = ($slug === '__sst' && $nc['sst_price']) ? '<section style="padding-top:0"><div class="wrap" style="text-align:center"><div class="price-tag" style="background:var(--surface);border-color:var(--line)">'.$nc['sst_price'].'</div></div></section>' : '';
        $nicheExtra = demoBlock($l, $slug).productBlock($l, 'niches', $slug);
        $nicheExtra .= '<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($nc['local_eyebrow']).'</span><h2>'.e(str_replace('{name}', $lower, $nc['local_h2'])).'</h2><p>'.e(str_replace('{name}', $lower, $nc['local_p'])).'</p></div></div></section>';
        $nFaq = $n['faq'] ?? [];
        if ($nFaq) {
            $nicheExtra .= '<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($nc['faq_eyebrow']).'</span><h2>'.e(str_replace('{name}', $lower, $nc['faq_h2'])).'</h2></div>'.faqHtml($nFaq).'</div></section>';
        }
        $others = '';
        foreach ($nicheList as $os => $on) {
            if ($on && $os !== $slug && $os !== '__sst') {
                $others .= '<a class="btn btn-outline btn-sm" href="'.url($l, 'niche', $os).'">'.e($on['name']).'</a>';
            }
        }
        $others .= $slug !== '__sst' ? '<a class="btn btn-outline btn-sm" href="'.url($l, 'sst').'">'.e($u['footer']['sst']).'</a>' : '';
        $nicheExtra .= '<section style="padding-top:0"><div class="wrap" style="text-align:center"><div class="section-head reveal"><span class="eyebrow">'.e($nc['also_eyebrow']).'</span><h2>'.e($nc['also_h2']).'</h2></div><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">'.$others.'</div></div></section>';
        $cv = $u['conv'];
        $prevImg = $l === 'pt' ? ($prevMap[$slug] ?? null) : null;
        $prevMsg = str_replace('{who}', $who, $cv['prev_wa']);
        $prevFig = $prevImg ? '<div class="mock-wrap"><div class="mock" data-mock="'.$prevImg.'"></div><p class="mock-cap">'.e($cv['prev_label']).'</p></div>' : '';
        $mockJs = 'window.MOCK='.json_encode(['cap' => $u['mock']['cap'], 'see' => $u['mock']['see'], 'items' => array_map(fn ($r) => array_combine(['k', 'label', 'url', 'name', 'tag', 's', 'cta', 'hours', 'toast'], $r), $u['mock']['items'])], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP).';';
        $body = '<header class="page-hero"><div class="wrap'.($prevImg ? ' ph-grid' : '').'"><div><div class="crumbs"><a href="'.url($l, 'home').'">'.e($sv['home']).'</a> / '.e($n['name']).'</div>'
            .'<span class="eyebrow">'.e($nc['for'].' '.$lower).'</span><h1>'.e($n['h1']).'</h1><p class="lede">'.e($n['intro']).'</p>'
            .'<div class="ctas"><a class="btn btn-wa" data-wa="'.e($prevMsg).'">'.$WA.e($cv['prev_cta']).'</a><a class="btn btn-ghost" href="'.url($l, 'home').'#diagnostico">'.e($nc['cta2']).'</a></div><ul class="trust"><li>'.e($u['home']['trust'][0]).'</li><li>'.e($u['home']['trust'][1]).'</li></ul></div>'.$prevFig.'</div></header>'
            .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($nc['pains_eyebrow']).'</span><h2>'.e($nc['pains_h2']).'</h2></div><div class="pains">'.$pains.'</div></div></section>'
            .$extra
            .'<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($nc['sol_eyebrow']).'</span><h2>'.e(str_replace('{name}', $lower, $nc['sol_h2'])).'</h2></div><div class="services">'.$svc.'</div></div></section>'
            .$nicheExtra
            .'<section class="dark final"><div class="wrap"><h2>'.e($nc['final_h2']).'</h2><p class="muted" style="font-size:1.1rem">'.e($nc['final_p']).'</p><div class="ctas"><a class="btn btn-wa" data-wa="'.e($msg).'">'.$WA.e($nc['final_cta']).'</a></div></div></section>';
        write($pages[$key][$l], layout($l, $key, [
            'title' => $n['title'].' | '.$site['name'], 'description' => $n['description'], 'wa' => $msg, 'extra_js' => $prevImg ? $mockJs : '', 'og' => $slug === '__sst' && $l === 'pt' ? 'og-clinicas.png' : null,
            'schema' => ['@context' => 'https://schema.org', '@graph' => [
                ['@type' => 'Service', 'name' => $n['title'], 'description' => $n['description'], 'url' => $site['url'].$pages[$key][$l], 'provider' => ['@id' => $site['url'].'/#negocio'], 'areaServed' => $l === 'pt' ? [['@type' => 'City', 'name' => 'São Paulo'], ['@type' => 'Country', 'name' => 'Brasil']] : 'Worldwide', 'audience' => ['@type' => 'BusinessAudience', 'audienceType' => $n['name']]],
                crumbs([[$sv['home'], url($l, 'home')], [$n['name'], $pages[$key][$l]]]), business($l),
            ] + ($nFaq ? [3 => faqSchema($nFaq)] : [])],
        ], $body));
    }

    /* ---------- About page ---------- */
    $ab = $u['about'];
    $tl = implode('', array_map(fn ($t) => '<li class="reveal"><span class="when">'.e($t[0]).'</span><h3>'.e($t[1]).'</h3><p>'.e($t[2]).'</p></li>', $timelines[$l]));
    $ch = implode('', array_map(fn ($c) => '<div class="benefit reveal"><h3>'.e($c[0]).'</h3><p>'.e($c[1]).'</p></div>', $ab['challenges']));
    $wins = implode('', array_map(fn ($w) => '<li>'.e($w).'</li>', $ab['wins']));
    $body = '<header class="page-hero"><div class="wrap"><div class="about-hero"><div class="avatar big"><img src="/assets/logo.svg" alt="" width="96" height="96"></div><div><span class="eyebrow">'.e($ab['eyebrow']).'</span><h1>'.e($ab['h1']).'</h1></div></div><p class="lede">'.e($ab['lede']).'</p>'
        .'<div class="ctas"><a class="btn btn-wa" data-wa="'.e($n_wa = $u['nav']['wa_msg']).'">'.$WA.e($ab['cta']).'</a><a class="btn btn-ghost" href="'.$site['linkedin'].'" rel="me">'.e($ab['linkedin']).'</a></div></div></header>'
        .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($ab['timeline_eyebrow']).'</span><h2>'.e($ab['timeline_h2']).'</h2></div><ol class="timeline">'.$tl.'</ol></div></section>'
        .'<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($ab['challenges_eyebrow']).'</span><h2>'.e($ab['challenges_h2']).'</h2></div><div class="benefits three">'.$ch.'</div></div></section>'
        .'<section class="dark"><div class="wrap split"><div class="reveal"><span class="eyebrow">'.e($ab['wins_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($ab['wins_h2']).'</h2><ul class="wins">'.$wins.'</ul></div><div class="reveal"><span class="eyebrow">'.e($ab['skills_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($ab['skills_h2']).'</h2><p class="skills">'.e($ab['skills']).'</p></div></div></section>'
        .'<section class="final"><div class="wrap"><h2>'.e($ab['cta_h2']).'</h2><div class="ctas"><a class="btn btn-wa" data-wa="'.e($u['nav']['wa_msg']).'">'.$WA.e($ab['cta']).'</a><a class="btn btn-outline" href="'.url($l, 'home').'#diagnostico">'.e($u['nav']['diag']).'</a></div></div></section>';
    write($pages['about'][$l], layout($l, 'about', [
        'title' => $ab['title'], 'description' => $ab['description'],
        'schema' => ['@context' => 'https://schema.org', '@graph' => [
            ['@type' => 'ProfilePage', 'url' => $site['url'].$pages['about'][$l], 'inLanguage' => $u['hreflang'], 'mainEntity' => ['@type' => 'Person', 'name' => $site['name'], 'jobTitle' => 'Senior Software Developer', 'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'São Paulo', 'addressCountry' => 'BR'], 'sameAs' => [$site['linkedin'], $site['github']], 'knowsLanguage' => ['pt', 'en']]],
            crumbs([[$sv['home'], url($l, 'home')], [$ab['eyebrow'], $pages['about'][$l]]]),
        ]],
    ], $body));
}

/* ---------- Ready-made product pages (hand-written HTML in /produtos/): SEO block between markers ---------- */
$PROD_SEO = [
    'agenda' => [
        'title' => 'Agenda online para salão e barbearia, sem mensalidade',
        'description' => 'Modelo pronto de agenda online para salão, barbearia e estética: a cliente escolhe serviço e horário e o pedido chega no WhatsApp. R$ 47, sem mensalidade.',
        'name' => 'Agenda Online pelo WhatsApp (modelo pronto)',
        'schema_description' => 'Modelo pronto de agenda online para salão, barbearia e estética. A cliente escolhe serviço, profissional, dia e horário e o pedido chega pronto no WhatsApp. Inclui três modelos visuais, guia em português e licença de uso. Pagamento único, sem mensalidade.',
        'og_title' => 'Agenda online para salão e barbearia, sem mensalidade',
    ],
    'cardapio' => [
        'title' => 'Cardápio digital com pedido no WhatsApp, sem mensalidade',
        'description' => 'Modelo pronto de cardápio digital: o cliente monta o pedido no celular e ele chega pronto no seu WhatsApp. R$ 47, sem mensalidade e sem taxa por pedido.',
        'name' => 'Cardápio Digital com Pedido no WhatsApp (modelo pronto)',
        'schema_description' => 'Modelo pronto de cardápio digital. O cliente monta o pedido no celular e ele chega pronto no WhatsApp do negócio, com total, forma de pagamento e endereço. Inclui guia em português e licença de uso. Pagamento único, sem mensalidade e sem taxa por pedido.',
        'og_title' => 'Cardápio digital com pedido no WhatsApp, sem mensalidade',
    ],
];
foreach ($PROD_SEO as $pk => $ps) {
    $file = "$root/produtos/$pk/index.html";
    $html = file_get_contents($file);
    $url = $site['url'].'/produtos/'.$pk.'/';
    // FAQ taken from the page itself so the schema never drifts from the text
    $faqItems = [];
    if (preg_match_all('#<details><summary>(.*?)</summary><p>(.*?)</p></details>#s', $html, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $m) {
            $faqItems[] = [html_entity_decode(strip_tags($m[1]), ENT_QUOTES, 'UTF-8'), html_entity_decode(strip_tags($m[2]), ENT_QUOTES, 'UTF-8')];
        }
    }
    preg_match('#href="(https://pay\.hotmart\.com/[^"]+)"#', $html, $hm);
    $graph = [
        ['@type' => 'Product', 'name' => $ps['name'], 'description' => $ps['schema_description'], 'image' => $url.'capa.png', 'url' => $url, 'category' => 'Software', 'inLanguage' => 'pt-BR',
            'brand' => ['@type' => 'Brand', 'name' => $site['name']],
            'offers' => ['@type' => 'Offer', 'url' => $url, 'price' => '47', 'priceCurrency' => 'BRL', 'availability' => 'https://schema.org/InStock', 'itemCondition' => 'https://schema.org/NewCondition', 'seller' => ['@type' => 'Person', 'name' => $site['name']]]],
        crumbs([['Início', '/'], [$ps['name'], '/produtos/'.$pk.'/']]),
    ];
    if ($faqItems) {
        $graph[] = faqSchema($faqItems);
    }
    $ld = json_encode(['@context' => 'https://schema.org', '@graph' => $graph], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $t = e($ps['title']);
    $d = e($ps['description']);
    $block = "<!--seo:start-->\n<title>{$t}</title>\n<meta name=\"description\" content=\"{$d}\">\n<meta name=\"robots\" content=\"index, follow, max-image-preview:large\">\n<link rel=\"canonical\" href=\"{$url}\">\n<link rel=\"alternate\" hreflang=\"pt-BR\" href=\"{$url}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:locale\" content=\"pt_BR\">\n<meta property=\"og:site_name\" content=\"{$site['name']}\">\n<meta property=\"og:url\" content=\"{$url}\">\n<meta property=\"og:title\" content=\"".e($ps['og_title'])."\">\n<meta property=\"og:description\" content=\"{$d}\">\n<meta property=\"og:image\" content=\"{$url}capa.png\">\n<meta property=\"og:image:width\" content=\"1080\">\n<meta property=\"og:image:height\" content=\"1080\">\n<meta name=\"twitter:card\" content=\"summary_large_image\">\n<script type=\"application/ld+json\">{$ld}</script>\n<!--seo:end-->";
    if (str_contains($html, '<!--seo:start-->')) {
        $html = preg_replace_callback('#<!--seo:start-->.*?<!--seo:end-->#s', fn () => $block, $html);
    } else {
        // first run: remove the old hand-written tags and insert the block after the viewport meta
        $html = preg_replace(['#<meta name="robots" content="noindex">\s*#', '#<title>.*?</title>\s*#s', '#<meta name="description" content="[^"]*">\s*#', '#<meta property="og:[a-z:]+" content="[^"]*">\s*#', '#<meta name="twitter:[a-z]+" content="[^"]*">\s*#'], '', $html);
        $html = preg_replace_callback('#(<meta name="viewport"[^>]*>\n)#', fn ($mm) => $mm[1].$block."\n", $html, 1);
    }
    $CHANGED['/produtos/'.$pk.'/'] = file_get_contents($file) !== $html;
    file_put_contents($file, $html);
    $pages["prod:$pk"] = ['pt' => '/produtos/'.$pk.'/'];
}

/* ---------- Licenses: fonts and images used by the site ---------- */
$pages['licenses'] = ['pt' => '/licencas/'];
$lic = '<header class="page-hero"><div class="wrap"><div class="crumbs"><a href="/">Início</a> / Licenças</div><span class="eyebrow">Licenças</span><h1>Fontes, imagens e marcas usadas neste site</h1><p class="lede">Tudo o que entra no site tem origem e licença conferidas. Esta página lista cada item.</p></div></header>'
    .'<section><div class="wrap page-text">'
    .'<h2>Fontes</h2><ul>'
    .'<li><b>JetBrains Mono</b> (rótulos), de JetBrains. SIL Open Font License 1.1. Arquivo servido por este site.</li>'
    .'<li><b>Space Grotesk</b> (títulos), de Florian Karsten. SIL Open Font License 1.1. Arquivo servido por este site.</li>'
    .'<li><b>Manrope</b> (texto), de Mikhail Sharanda. SIL Open Font License 1.1. Arquivo servido por este site.</li>'
    .'</ul>'
    .'<h2>Imagens</h2><ul>'
    .'<li>As imagens dos projetos são capturas de tela das próprias páginas deste site (exemplos, produtos e Prumo), feitas por mim.</li>'
    .'<li>Os exemplos usam negócios e pessoas fictícios. Qualquer semelhança de nome é coincidência.</li>'
    .'<li>As fotos da Loja Accrá pertencem à marca Accrá, que é minha.</li>'
    .'<li>Os ícones são SVG simples. Alguns seguem o desenho do conjunto Feather Icons, de Cole Bemis, sob licença MIT.</li>'
    .'</ul>'
    .'<h2>Marcas de terceiros</h2><p>WhatsApp, Google, Pix e outras marcas citadas pertencem aos seus donos. Elas aparecem só para descrever o serviço, sem logotipo e sem indicar parceria.</p>'
    .'<h2>Prumo</h2><p>O Prumo tem a própria página de licenças, em <a href="/prumo/licencas.html">matheusvillanova.com/prumo/licencas.html</a>.</p>'
    .'</div></section>';
write('/licencas/', layout('pt', 'licenses', ['title' => 'Licenças de fontes e imagens | Matheus Villanova', 'description' => 'Fontes, imagens e marcas usadas no site de Matheus Villanova, com autor e licença de cada uma. Manrope e JetBrains Mono sob SIL Open Font License.', 'schema' => ['@context' => 'https://schema.org', '@graph' => [crumbs([['Início', '/'], ['Licenças', '/licencas/']])]]], $lic));

/* ---------- 404, sitemap, robots ---------- */
$nf = $UI['pt']['notfound'];
$pages['404'] = ['pt' => '/404.html'];
$nfLinks = '';
foreach ($DATA['pt']['services'] as $slug => $sv404) {
    $nfLinks .= '<a class="btn btn-outline btn-sm" href="'.url('pt', 'service', $slug).'">'.e($sv404['name']).'</a>';
}
foreach ($DATA['pt']['niches'] as $slug => $nn404) {
    $nfLinks .= '<a class="btn btn-outline btn-sm" href="'.url('pt', 'niche', $slug).'">'.e($nn404['name']).'</a>';
}
$nfBlock = '<section><div class="wrap" style="text-align:center"><div class="section-head"><h2>Talvez você procure por</h2><p>Estes são os serviços e os tipos de negócio que eu atendo. Também há páginas em <a href="/en/" hreflang="en" lang="en">English</a> e <a href="/es/" hreflang="es" lang="es">Español</a>.</p></div><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">'.$nfLinks.'</div></div></section>';
file_put_contents("$root/404.html", layout('pt', '404', ['title' => $nf['title'], 'description' => $nf['p'], 'noindex' => true], '<header class="page-hero" style="min-height:50vh"><div class="wrap"><h1>'.e($nf['h1']).'</h1><p class="lede">'.e($nf['p']).'</p><div class="ctas"><a class="btn btn-primary" href="/">'.e($nf['home']).'</a><a class="btn btn-ghost" href="/#diagnostico">'.e($nf['diag']).'</a></div></div></header>'.$nfBlock));

// lastmod: keep the previous date unless the page changed in this build
$oldMod = [];
if (preg_match_all('#<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>#', (string) @file_get_contents("$root/sitemap.xml"), $mm, PREG_SET_ORDER)) {
    foreach ($mm as $m) {
        $oldMod[$m[1]] = $m[2];
    }
}
$xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'."\n";
$count = 0;
foreach ($pages as $key => $set) {
    if ((string) $key === '404') {
        continue;
    }
    foreach ($set as $l => $p) {
        $prio = $key === 'home' ? '1.0' : (str_starts_with($key, 'svc:') ? '0.9' : (str_starts_with($key, 'prod:') ? '0.7' : '0.8'));
        $mod = ! empty($CHANGED[$p]) || ! isset($oldMod[$site['url'].$p]) ? $today : $oldMod[$site['url'].$p];
        $xml .= "  <url><loc>{$site['url']}{$p}</loc><lastmod>{$mod}</lastmod><priority>{$prio}</priority>";
        foreach ($set as $hl => $hp) {
            $xml .= '<xhtml:link rel="alternate" hreflang="'.$UI[$hl]['hreflang'].'" href="'.$site['url'].$hp.'"/>';
        }
        $xml .= "</url>\n";
        $count++;
    }
}
// Prumo is published by its own deploy into /prumo/ (never touched here): copy its URLs and dates from its sitemap
if (preg_match_all('#<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>#', (string) @file_get_contents("$root/prumo/sitemap.xml"), $mm, PREG_SET_ORDER)) {
    foreach ($mm as $m) {
        $xml .= '  <url><loc>'.$m[1].'</loc><lastmod>'.$m[2].'</lastmod><priority>'.(str_ends_with($m[1], '/prumo/') ? '0.9' : '0.3')."</priority></url>\n";
        $count++;
    }
}
file_put_contents("$root/sitemap.xml", $xml."</urlset>\n");
file_put_contents("$root/robots.txt", "User-agent: *\nAllow: /\nDisallow: /_build/\n\nSitemap: {$site['url']}/sitemap.xml\nSitemap: {$site['url']}/prumo/sitemap.xml\n");
echo "$count páginas geradas em ".count($LANGS)." idiomas.\n";
