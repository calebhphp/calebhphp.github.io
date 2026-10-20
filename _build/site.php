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
        'sun' => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        'moon' => '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
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

function aurora(): string { return '<div class="aurora" aria-hidden="true"><span class="a1"></span><span class="a2"></span><span class="a3"></span></div><div class="grid-lines" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>'; }

$css = file_get_contents("$root/assets/style.css");
$css = preg_replace('!/\*.*?\*/!s', '', $css);
$INLINE_CSS = trim(preg_replace('/\s*\n\s*/', '', $css));
$WA = icon('chat');

function serviceCard(string $l, string $slug, array $s): string
{
    global $UI;
    $t = $UI[$l]['sections'];

    return '<a class="card reveal" href="'.url($l, 'service', $slug).'"><span class="ic">'.icon($s['icon']).'</span><h3>'.e($s['name']).'</h3><p>'.e($s['short']).'</p><div class="meta"><span>'.e($t['card_from']).'</span><b>'.e($s['price']).'</b></div><span class="go">'.e($t['card_go']).'</span></a>';
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
    global $site, $UI, $DATA, $INLINE_CSS, $WA, $pages, $niches_pt;
    $u = $UI[$l];
    $path = $pages[$key][$l];
    $canonical = $site['url'].$path;
    // Google corta títulos perto de 60 caracteres: tira o nome do fim quando o título já é longo.
    $rawTitle = $o['title'];
    if ($key !== 'home' && mb_strlen($rawTitle) > 62) $rawTitle = preg_replace('/ \| Matheus Villanova$/u', '', $rawTitle);
    $title = e($rawTitle);
    $desc = e($o['description']);
    $og = $site['url'].'/assets/'.($o['og'] ?? $u['og']);
    $schema = json_encode($o['schema'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $head = '';
    if (! empty($site['google_verification'])) {
        $head .= '<meta name="google-site-verification" content="'.e($site['google_verification']).'">';
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
    if (! empty($o['noindex'])) {
        $head .= '<meta name="robots" content="noindex">';
    }

    $n = $u['nav'];
    $home = url($l, 'home');
    $wa = e($o['wa'] ?? $n['wa_msg']);
    $nav = '<li class="hide-md"><a href="'.$home.'#diagnostico">'.e($n['diag']).'</a></li>'
        .'<li class="hide-md"><a href="'.$home.'#servicos">'.e($n['services']).'</a></li>'
        .'<li class="hide-md"><a href="'.$home.'#exemplos">'.e($n['examples']).'</a></li>'
        .'<li class="hide-md"><a href="'.url($l, 'about').'">'.e($n['about']).'</a></li>'
        .'<li><nav class="langs" aria-label="'.e($n['lang']).'">'.$switch.'</nav></li>'
        .'<li><button class="theme-btn" type="button" data-theme-toggle aria-label="'.e($n['theme']).'" title="'.e($n['theme']).'"><span class="i-sun">'.icon('sun').'</span><span class="i-moon">'.icon('moon').'</span></button></li>'
        .'<li><a class="btn btn-wa btn-sm" data-wa="'.$wa.'"><span class="hide-sm">'.e($n['wa']).'</span><span class="show-sm">WhatsApp</span></a></li>';

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
    $promoBar = $promoCard = '';
    if ($promo) {
        $daysLeft = max(0, (int) ceil((strtotime($site['promo_end'].' 23:59:59') - time()) / 86400));
        $pmsg = e(str_replace('{code}', $site['promo_code'], $promo['msg']));
        $promoBar = '<div class="promo-bar" data-promo-bar><div class="wrap"><span>'.$promo['bar'].' <em data-days-left>'.e(str_replace('{d}', (string) $daysLeft, $promo['left'])).'</em></span><a data-wa="'.$pmsg.'">'.e($promo['cta']).' →</a><button type="button" data-promo-close aria-label="'.e($promo['close']).'">×</button></div></div>';
        $promoCard = '<aside class="promo-card" data-promo-card hidden aria-live="polite"><button type="button" class="pc-close" data-promo-card-close aria-label="'.e($promo['close']).'">×</button><span class="pc-badge">–'.$site['promo_off'].'%</span><h2>'.e($promo['card_h']).'</h2><p>'.e($promo['card_p']).'</p><div class="pc-ctas"><a class="btn btn-wa btn-sm" data-wa="'.$pmsg.'">'.e($promo['card_cta']).'</a><a class="btn btn-outline btn-sm" href="'.url($l, 'home').'#diagnostico" data-promo-card-close>'.e($promo['card_alt']).'</a></div></aside>';
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
<link rel="canonical" href="{$canonical}">
{$alts}
<meta name="theme-color" content="#0a0c18">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="{$u['og_locale']}">
<meta property="og:site_name" content="{$site['name']}">
<meta property="og:url" content="{$canonical}">
<meta property="og:title" content="{$title}">
<meta property="og:description" content="{$desc}">
<meta property="og:image" content="{$og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
{$head}
<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&display=swap"></noscript>
<style>{$INLINE_CSS}</style>
<script type="application/ld+json">{$schema}</script>
</head>
<body>
<nav class="nav" aria-label="{$n['main']}">
{$promoBar}
  <div class="wrap">
    <a class="brand" href="{$home}"><img src="/assets/logo.svg" alt="" width="34" height="34">{$site['name']}</a>
    <ul>{$nav}</ul>
  </div>
</nav>
<main>
{$body}
</main>
<footer>
  <div class="wrap">
    <div class="cols">
      <div>
        <a class="brand" href="{$home}"><img src="/assets/logo.svg" alt="" width="34" height="34">{$site['name']}</a>
        <p style="margin-top:14px;max-width:30em">{$f['blurb']}</p>
      </div>
      <div><p class="foot-h">{$f['services']}</p><ul>{$svcLinks}</ul></div>
      <div><p class="foot-h">{$f['for']}</p><ul>{$nicheLinks}</ul></div>
      <div><p class="foot-h">{$f['contact']}</p><ul><li><a data-wa="{$wa}">WhatsApp</a></li><li><a href="mailto:{$site['email']}">{$f['email']}</a></li><li><a href="{$site['linkedin']}">LinkedIn</a></li><li><a href="{$site['github']}">GitHub</a></li><li><a href="{$GLOBALS['aboutLinks'][$l]}">{$f['about']}</a></li></ul></div>
    </div>
    <div class="bottom"><span>© {$year} {$site['name']} · {$f['place']}{$cnpj}</span><span>{$f['made']}</span></div>
  </div>
</footer>
{$promoCard}
<a class="fab" data-wa="{$wa}" aria-label="{$u['fab']}">{$WA}</a>
<script>window.SITE={$siteJs};{$extra}</script>
<script src="/assets/app.js" defer></script>
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
    file_put_contents($file, $html);
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
}

$ICON_CLOCK = icon('clock');
$ICON_BELL = icon('bell');
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
        $bizChips .= '<label class="chip"><input type="radio" name="negocio" value="'.$k.'"'.($k === 'clinica' ? ' checked' : '').'>'.e($b['label']).'</label>';
    }
    $probChips = '';
    foreach ($dg['problems'] as $k => $p) {
        $probChips .= '<label class="chip"><input type="checkbox" name="problema" value="'.$k.'"'.($k === 'faltas' ? ' checked' : '').'>'.e($p['label']).'</label>';
    }

    $cards = implode('', array_map(fn ($slug) => serviceCard($l, $slug, $services[$slug]), array_keys($services)));
    $packs = '';
    foreach ($d['packages'] as $p) {
        $items = implode('', array_map(fn ($i) => '<li>'.e($i).'</li>', $p['items']));
        $packs .= '<article class="pack'.($p['featured'] ? ' featured' : '').' reveal">'.($p['featured'] ? '<span class="badge">'.e($s['badge']).'</span>' : '').'<h3>'.e($p['name']).'</h3><p class="for">'.e($p['for']).'</p><div class="price"><b>'.e($p['price']).'</b><span>'.e($p['note']).'</span></div>'.($p['save'] ? '<span class="save">'.e($p['save']).'</span>' : '').'<ul>'.$items.'</ul><a class="btn '.($p['featured'] ? 'btn-wa' : 'btn-glass').'" data-wa="'.e($s['pack_msg'].' '.$p['name'].'.').'">'.e($s['pack_cta'].' '.$p['name']).'</a></article>';
    }
    $demoHtml = '';
    foreach ($u['demos'] as [$slug, $tag, $title, $desc, $shot]) {
        $shotHtml = match ($slug) {
            'cafeteria' => '<div class="demo-shot shot-cafe"><span class="s-title">'.e($shot[0]).'</span><span class="s-row"><i></i><b>'.e($shot[1]).'</b><em>'.e($shot[2]).'</em></span><span class="s-row"><i></i><b>'.e($shot[3]).'</b><em>'.e($shot[4]).'</em></span><span class="s-btn">'.e($shot[5]).'</span></div>',
            'cartao' => '<div class="demo-shot shot-card"><span class="s-avatar"></span><span class="s-name">'.e($shot[0]).'</span><span class="s-sub">'.e($shot[1]).'</span><span class="s-pill">'.e($shot[2]).'</span><span class="s-pill alt">'.e($shot[3]).'</span></div>',
            'estoque' => '<div class="demo-shot shot-dash"><span class="s-kpis"><i></i><i></i><i></i></span><span class="s-bars"><i style="height:40%"></i><i style="height:70%"></i><i style="height:55%"></i><i style="height:90%"></i><i style="height:65%"></i><i style="height:80%"></i></span><span class="s-alert">'.e($shot[0]).'</span></div>',
            'assistente' => '<div class="demo-shot shot-bot"><span class="s-msg in">'.e($shot[0]).'</span><span class="s-msg out">'.e($shot[1]).'</span><span class="s-msg in">'.e($shot[2]).'</span></div>',
            'agenda' => '<div class="demo-shot shot-agenda"><span class="s-day">'.e($shot[0]).'</span><span class="s-slots"><i>'.e($shot[1]).'</i><i class="x">'.e($shot[2]).'</i><i class="on">'.e($shot[3]).'</i><i>'.e($shot[4]).'</i></span><span class="s-pix">'.e($shot[5]).'</span></div>',
            'orcamento' => '<div class="demo-shot shot-quote"><span class="s-range"><i></i></span><span class="s-chips"><i></i><i></i><i></i></span><span class="s-total"><small>'.e($shot[0]).'</small>'.e($shot[1]).'</span><span class="s-btn">'.e($shot[2]).'</span></div>',
            'fidelidade' => '<div class="demo-shot shot-loyal"><span class="s-stamps">'.str_repeat('<i class="on">✂</i>', 7).'<i></i><i></i><i class="g">🎁</i></span><span class="s-left">'.e($shot[0]).'</span></div>',
            'loja-accra' => '<div class="demo-shot shot-shop"><span class="s-logo">'.e($shot[0]).'</span><span class="s-prod"><i></i><span><b>'.e($shot[1]).'</b><em>'.e($shot[2]).'</em></span></span><span class="s-btn">'.e($shot[3]).'</span></div>',
            default => '',
        };
        $demoHtml .= '<a class="demo reveal" href="/exemplos/'.$slug.'/">'.$shotHtml.'<div class="demo-body"><span class="tag">'.e($tag).'</span><h3>'.e($title).'</h3><p>'.e($desc).'</p><span class="go">'.e($u['demo_go']).'</span></div></a>';
    }
    $builds = implode('', array_map(fn ($b) => '<div class="build reveal"><b>'.e($b[0]).'</b><span>'.e($b[1]).'</span></div>', $u['builds']));
    $steps = implode('', array_map(fn ($st) => '<div class="step reveal"><h3>'.e($st[0]).'</h3><p>'.e($st[1]).'</p></div>', $s['steps']));
    $trust = implode('', array_map(fn ($t) => '<span>'.e($t).'</span>', $h['trust']));
    $chat = implode('', array_map(fn ($m) => '<div class="msg '.$m[0].'">'.e($m[1]).'<time>'.e($m[2]).'</time></div>', $h['chat']));
    $marquee = implode('', array_map(fn ($i) => '<span>'.e($i).'</span>', array_merge($h['marquee'], $h['marquee'])));
    $words = e(implode('|', $h['words']));
    $A = aurora();
    $dgu = $u['diag'];

    $body = <<<HTML
<header class="dark hero">
  {$A}
  <div class="wrap grid">
    <div>
      <span class="pill"><b>{$h['pill_b']}</b>{$h['pill']}</span>
      <h1>{$h['h1_pre']}<br><span class="typer"><span class="grad-text" data-typer="{$words}">{$h['words'][0]}</span><span class="caret" aria-hidden="true"></span></span><br>{$h['h1_post']}</h1>
      <p class="lede">{$h['lede']}</p>
      <div class="ctas">
        <a class="btn btn-wa" data-magnetic data-wa="{$h['cta_wa_msg']}">{$WA}{$h['cta_wa']}</a>
        <a class="btn btn-glass" href="#diagnostico">{$h['cta_diag']}</a>
      </div>
      <div class="trust">{$trust}</div>
    </div>
    <div style="position:relative">
      <div class="phone" aria-label="{$h['chat_aria']}">
        <div class="screen">
          <div class="bar"><i></i><div><b>{$h['chat_name']}</b><small>{$h['chat_online']}</small></div></div>
          <div class="chat" data-chat>{$chat}</div>
        </div>
      </div>
      <div class="float-card f1"><span class="ic">{$GLOBALS['ICON_CLOCK']}</span><div><b>{$h['float1'][0]}</b>{$h['float1'][1]}</div></div>
      <div class="float-card f2"><span class="ic">{$GLOBALS['ICON_BELL']}</span><div><b>{$h['float2'][0]}</b>{$h['float2'][1]}</div></div>
    </div>
  </div>
</header>
<div class="dark marquee" aria-label="{$h['marquee_aria']}"><div class="track">{$marquee}</div></div>

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

<section id="servicos" style="padding-top:0">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['services_eyebrow']}</span><h2>{$s['services_h2']}</h2><p>{$s['services_p']}</p></div>
    <div class="services">{$cards}</div>
  </div>
</section>

<section id="pacotes" class="dark">
  {$A}
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow" style="color:var(--lime)">{$s['packages_eyebrow']}</span><h2>{$s['packages_h2']}</h2><p>{$s['packages_p']}</p></div>
    <div class="packages">{$packs}</div>
  </div>
</section>

<section id="exemplos">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['examples_eyebrow']}</span><h2>{$s['examples_h2']}</h2><p>{$s['examples_p']}</p></div>
    <div class="demos">{$demoHtml}</div>
    <div class="section-head reveal" style="margin:88px auto 40px"><span class="eyebrow">{$s['builds_eyebrow']}</span><h2>{$s['builds_h2']}</h2></div>
    <div class="builds">{$builds}</div>
    <div class="about reveal">
      <div class="avatar"><img src="/assets/logo.svg" alt="" width="80" height="80"></div>
      <div>
        <h3 style="font-size:1.6rem;margin-bottom:10px">{$s['about_h3']}</h3>
        <p>{$s['about_p1']}</p>
        <p>{$s['about_p2']}</p>
        <p style="margin-top:14px"><a href="{$GLOBALS['aboutLinks'][$l]}" style="font-weight:600">{$s['about_link']}</a></p>
      </div>
    </div>
  </div>
</section>

<section class="dark" id="como-funciona">
  {$A}
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow" style="color:var(--lime)">{$s['how_eyebrow']}</span><h2>{$s['how_h2']}</h2><p>{$s['how_p']}</p></div>
    <div class="steps">{$steps}</div>
  </div>
</section>

<section id="faq">
  <div class="wrap">
    <div class="section-head reveal"><span class="eyebrow">{$s['faq_eyebrow']}</span><h2>{$s['faq_h2']}</h2></div>
    {$GLOBALS['FAQ'][$l]}
  </div>
</section>

<section class="dark final">
  {$A}
  <div class="wrap">
    <h2>{$s['final_h2']} <span class="grad-text">{$s['final_grad']}</span></h2>
    <p class="muted" style="font-size:1.15rem;max-width:36em">{$s['final_p']}</p>
    <div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="{$s['final_cta_msg']}">{$WA}{$s['final_cta']}</a><a class="btn btn-glass" href="#diagnostico">{$s['final_cta2']}</a></div>
  </div>
</section>
HTML;

    write($pages['home'][$l], layout($l, 'home', [
        'title' => $h['title'], 'description' => $h['description'],
        'schema' => ['@context' => 'https://schema.org', '@graph' => [business($l), ['@type' => 'WebSite', 'url' => $site['url'].$pages['home'][$l], 'name' => $site['name'], 'inLanguage' => $u['hreflang']], faqSchema($u['faq'])]],
        'extra_js' => $diagJs,
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
        $ex = $dg['services'][$slug]['example'] ?? '';
        $exLink = $ex ? '<a class="btn btn-glass" href="/exemplos/'.$ex.'/">'.e($u['demo_go']).'</a>' : '<a class="btn btn-glass" href="'.url($l, 'home').'#diagnostico">'.e($sv['cta_diag']).'</a>';
        $body = '<header class="dark page-hero">'.aurora().'<div class="wrap"><div class="crumbs"><a href="'.url($l, 'home').'">'.e($sv['home']).'</a> / <a href="'.url($l, 'home').'#servicos">'.e($sv['services']).'</a> / '.e($x['name']).'</div>'
            .'<span class="eyebrow" style="color:var(--lime)">'.e($x['name']).'</span><h1>'.e($x['h1']).'</h1><p class="lede">'.e($x['intro']).'</p><div class="price-tag">'.$priceLine.'</div>'
            .'<div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$WA.e($sv['cta_quote']).'</a>'.$exLink.'</div></div></header>'
            .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($sv['why_eyebrow']).'</span><h2>'.e($sv['why_h2']).'</h2></div><div class="benefits">'.$benefits.'</div></div></section>'
            .'<section style="padding-top:0"><div class="wrap split"><div class="reveal"><span class="eyebrow">'.e($sv['inc_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($sv['inc_h2']).'</h2><ul class="includes">'.$includes.'</ul></div>'
            .'<div class="reveal"><span class="eyebrow">'.e($sv['faq_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($sv['faq_h2']).'</h2>'.faqHtml($x['faq']).'</div></div></section>'
            .'<section class="dark final">'.aurora().'<div class="wrap"><h2>'.e($sv['final_h2']).'</h2><div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$WA.e($sv['final_cta']).'</a></div></div></section>'
            .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($sv['combo_eyebrow']).'</span><h2>'.e($sv['combo_h2']).'</h2></div><div class="services">'.$others.'</div></div></section>';
        $offer = ['@type' => 'Offer', 'priceCurrency' => $u['currency'], 'description' => $x['price_note']];
        if (priceValue($x['price'])) {
            $offer['price'] = (string) priceValue($x['price']);
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
        $body = '<header class="dark page-hero">'.aurora().'<div class="wrap"><div class="crumbs"><a href="'.url($l, 'home').'">'.e($sv['home']).'</a> / '.e($n['name']).'</div>'
            .'<span class="eyebrow" style="color:var(--lime)">'.e($nc['for'].' '.$lower).'</span><h1>'.e($n['h1']).'</h1><p class="lede">'.e($n['intro']).'</p>'
            .'<div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$WA.e($nc['cta']).'</a><a class="btn btn-glass" href="'.url($l, 'home').'#diagnostico">'.e($nc['cta2']).'</a></div></div></header>'
            .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($nc['pains_eyebrow']).'</span><h2>'.e($nc['pains_h2']).'</h2></div><div class="pains">'.$pains.'</div></div></section>'
            .$extra
            .'<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($nc['sol_eyebrow']).'</span><h2>'.e(str_replace('{name}', $lower, $nc['sol_h2'])).'</h2></div><div class="services">'.$svc.'</div></div></section>'
            .'<section class="dark final">'.aurora().'<div class="wrap"><h2>'.e($nc['final_h2']).'</h2><p class="muted" style="font-size:1.1rem">'.e($nc['final_p']).'</p><div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($msg).'">'.$WA.e($nc['final_cta']).'</a></div></div></section>';
        write($pages[$key][$l], layout($l, $key, [
            'title' => $n['title'].' | '.$site['name'], 'description' => $n['description'], 'wa' => $msg, 'og' => $slug === '__sst' && $l === 'pt' ? 'og-clinicas.png' : null,
            'schema' => ['@context' => 'https://schema.org', '@graph' => [
                ['@type' => 'Service', 'name' => $n['title'], 'description' => $n['description'], 'provider' => ['@id' => $site['url'].'/#negocio'], 'audience' => ['@type' => 'BusinessAudience', 'audienceType' => $n['name']]],
                crumbs([[$sv['home'], url($l, 'home')], [$n['name'], $pages[$key][$l]]]), business($l),
            ]],
        ], $body));
    }

    /* ---------- About page ---------- */
    $ab = $u['about'];
    $tl = implode('', array_map(fn ($t) => '<li class="reveal"><span class="when">'.e($t[0]).'</span><h3>'.e($t[1]).'</h3><p>'.e($t[2]).'</p></li>', $timelines[$l]));
    $ch = implode('', array_map(fn ($c) => '<div class="benefit reveal"><h3>'.e($c[0]).'</h3><p>'.e($c[1]).'</p></div>', $ab['challenges']));
    $wins = implode('', array_map(fn ($w) => '<li>'.e($w).'</li>', $ab['wins']));
    $body = '<header class="dark page-hero">'.aurora().'<div class="wrap"><div class="about-hero"><div class="avatar big"><img src="/assets/logo.svg" alt="" width="96" height="96"></div><div><span class="eyebrow" style="color:var(--lime)">'.e($ab['eyebrow']).'</span><h1>'.e($ab['h1']).'</h1></div></div><p class="lede">'.e($ab['lede']).'</p>'
        .'<div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($n_wa = $u['nav']['wa_msg']).'">'.$WA.e($ab['cta']).'</a><a class="btn btn-glass" href="'.$site['linkedin'].'" rel="me">'.e($ab['linkedin']).'</a></div></div></header>'
        .'<section><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($ab['timeline_eyebrow']).'</span><h2>'.e($ab['timeline_h2']).'</h2></div><ol class="timeline">'.$tl.'</ol></div></section>'
        .'<section style="padding-top:0"><div class="wrap"><div class="section-head reveal"><span class="eyebrow">'.e($ab['challenges_eyebrow']).'</span><h2>'.e($ab['challenges_h2']).'</h2></div><div class="benefits three">'.$ch.'</div></div></section>'
        .'<section class="dark">'.aurora().'<div class="wrap split"><div class="reveal"><span class="eyebrow" style="color:var(--lime)">'.e($ab['wins_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($ab['wins_h2']).'</h2><ul class="wins">'.$wins.'</ul></div><div class="reveal"><span class="eyebrow" style="color:var(--lime)">'.e($ab['skills_eyebrow']).'</span><h2 style="margin:14px 0 24px">'.e($ab['skills_h2']).'</h2><p class="skills">'.e($ab['skills']).'</p></div></div></section>'
        .'<section class="final"><div class="wrap"><h2>'.e($ab['cta_h2']).'</h2><div class="ctas"><a class="btn btn-wa" data-magnetic data-wa="'.e($u['nav']['wa_msg']).'">'.$WA.e($ab['cta']).'</a><a class="btn btn-outline" href="'.url($l, 'home').'#diagnostico">'.e($u['nav']['diag']).'</a></div></div></section>';
    write($pages['about'][$l], layout($l, 'about', [
        'title' => $ab['title'], 'description' => $ab['description'],
        'schema' => ['@context' => 'https://schema.org', '@graph' => [
            ['@type' => 'ProfilePage', 'url' => $site['url'].$pages['about'][$l], 'inLanguage' => $u['hreflang'], 'mainEntity' => ['@type' => 'Person', 'name' => $site['name'], 'jobTitle' => 'Senior Software Developer', 'address' => ['@type' => 'PostalAddress', 'addressLocality' => 'São Paulo', 'addressCountry' => 'BR'], 'sameAs' => [$site['linkedin'], $site['github']], 'knowsLanguage' => ['pt', 'en']]],
            crumbs([[$sv['home'], url($l, 'home')], [$ab['eyebrow'], $pages['about'][$l]]]),
        ]],
    ], $body));
}

/* ---------- 404, sitemap, robots ---------- */
$nf = $UI['pt']['notfound'];
$pages['404'] = ['pt' => '/404.html'];
file_put_contents("$root/404.html", layout('pt', '404', ['title' => $nf['title'], 'description' => $nf['p'], 'noindex' => true], '<header class="dark page-hero" style="min-height:70vh">'.aurora().'<div class="wrap"><h1>'.e($nf['h1']).'</h1><p class="lede">'.e($nf['p']).'</p><div class="ctas"><a class="btn btn-primary" href="/">'.e($nf['home']).'</a><a class="btn btn-glass" href="/#diagnostico">'.e($nf['diag']).'</a></div></div></header>'));

$xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'."\n";
$count = 0;
foreach ($pages as $key => $set) {
    if ($key === '404') {
        continue;
    }
    foreach ($set as $l => $p) {
        $prio = $key === 'home' ? '1.0' : (str_starts_with($key, 'svc:') ? '0.9' : '0.8');
        $xml .= "  <url><loc>{$site['url']}{$p}</loc><lastmod>{$today}</lastmod><priority>{$prio}</priority>";
        foreach ($set as $hl => $hp) {
            $xml .= '<xhtml:link rel="alternate" hreflang="'.$UI[$hl]['hreflang'].'" href="'.$site['url'].$hp.'"/>';
        }
        $xml .= "</url>\n";
        $count++;
    }
}
file_put_contents("$root/sitemap.xml", $xml."</urlset>\n");
file_put_contents("$root/robots.txt", "User-agent: *\nAllow: /\nDisallow: /_build/\n\nSitemap: {$site['url']}/sitemap.xml\n");
echo "$count páginas geradas em ".count($LANGS)." idiomas.\n";
