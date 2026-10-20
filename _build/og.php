<?php
// Generates the 1200x630 share images (WhatsApp, LinkedIn, Facebook previews). Run: php _build/og.php
// Needs the GD extension and the Segoe UI fonts that ship with Windows.

$out = dirname(__DIR__).'/assets';
$bold = 'C:/Windows/Fonts/segoeuib.ttf';
$reg = 'C:/Windows/Fonts/segoeui.ttf';

$cards = [
    'og.png' => ['SITES · LOJAS · AGENDA ONLINE · WHATSAPP', "Mais clientes para\no seu negócio.\nMenos trabalho para você.", 'Diagnóstico grátis em calebhphp.github.io'],
    'og-clinicas.png' => ['PARA CLÍNICAS DE SAÚDE OCUPACIONAL', "Menos faltas.\nMenos telefone.\nNenhum prazo perdido.", 'Agendamento no WhatsApp · Periódicos · eSocial'],
    'og-es.png' => ['WEBS · TIENDAS · RESERVAS · CHATBOTS', "Más clientes para
tu negocio.
Menos trabajo para ti.", 'calebhphp.github.io/es'],
    'og-en.png' => ['WEBSITES · AUTOMATIONS · AI ASSISTANTS', "Websites and AI\nassistants that bring\nyou customers.", 'calebhphp.github.io/en'],
];

foreach ($cards as $file => [$eyebrow, $title, $foot]) {
    $im = imagecreatetruecolor(1200, 630);
    imagealphablending($im, true);
    imagefill($im, 0, 0, imagecolorallocate($im, 10, 12, 24));

    // Soft aurora glows
    foreach ([[180, 120, [109, 92, 255]], [1050, 160, [34, 211, 238]], [1150, 640, [182, 243, 107]]] as [$cx, $cy, $c]) {
        for ($r = 420; $r > 0; $r -= 14) {
            $alpha = (int) max(0, min(127, 127 - (420 - $r) * 0.07));
            imagefilledellipse($im, $cx, $cy, $r * 2, $r * 2, imagecolorallocatealpha($im, $c[0], $c[1], $c[2], max($alpha, 123)));
        }
    }

    $white = imagecolorallocate($im, 244, 245, 255);
    $muted = imagecolorallocate($im, 165, 171, 200);
    $lime = imagecolorallocate($im, 182, 243, 107);

    imagettftext($im, 20, 0, 80, 110, $lime, $bold, $eyebrow);
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
