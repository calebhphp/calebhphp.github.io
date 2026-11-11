<?php
// Generates the 1200x630 share images (WhatsApp, LinkedIn, Facebook previews). Run: php _build/og.php
// Needs the GD extension and the Segoe UI fonts that ship with Windows (or FONT_DIR pointing to a copy of them).
// Same palette as the site: graphite background, sand text, one brass accent. No glow.

$out = dirname(__DIR__).'/assets';
$fontDir = getenv('FONT_DIR') ?: 'C:/Windows/Fonts';
$bold = "$fontDir/segoeuib.ttf";
$reg = "$fontDir/segoeui.ttf";

$cards = [
    'og.png' => ['SITES · LOJAS · AGENDA ONLINE · WHATSAPP', "Mais clientes para\no seu negócio.\nMenos trabalho para você.", 'Diagnóstico grátis em matheusvillanova.com'],
    'og-clinicas.png' => ['PARA CLÍNICAS DE SAÚDE OCUPACIONAL', "Menos faltas.\nMenos telefone.\nNenhum prazo perdido.", 'Agendamento no WhatsApp · Periódicos · eSocial'],
    'og-es.png' => ['WEBS · TIENDAS · RESERVAS · CHATBOTS', "Más clientes para
tu negocio.
Menos trabajo para ti.", 'matheusvillanova.com/es'],
    'og-en.png' => ['WEBSITES · AUTOMATIONS · AI ASSISTANTS', "Websites and AI\nassistants that bring\nyou customers.", 'matheusvillanova.com/en'],
];

foreach ($cards as $file => [$eyebrow, $title, $foot]) {
    $im = imagecreatetruecolor(1200, 630);
    imagealphablending($im, true);
    imagefill($im, 0, 0, imagecolorallocate($im, 15, 19, 17));

    $white = imagecolorallocate($im, 237, 230, 211);
    $muted = imagecolorallocate($im, 179, 174, 156);
    $brass = imagecolorallocate($im, 224, 178, 90);

    imagefilledrectangle($im, 80, 96, 104, 99, $brass);
    imagettftext($im, 20, 0, 118, 106, $brass, $bold, $eyebrow);
    $y = 210;
    foreach (explode("\n", $title) as $line) {
        imagettftext($im, 60, 0, 76, $y, $white, $bold, $line);
        $y += 86;
    }
    imagettftext($im, 22, 0, 80, 560, $muted, $reg, $foot);
    imagettftext($im, 24, 0, 80, 598, $white, $bold, 'Matheus Villanova');

    imagepng($im, "$out/$file", 9);
    imagedestroy($im);
    echo "$file\n";
}
