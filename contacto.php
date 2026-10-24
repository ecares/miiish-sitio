<?php
// ¡Miiish! · formulario de contacto del sitio. Envía cada mensaje a hola@miiish.com
// y guarda una copia fuera de public_html por si el correo falla.
declare(strict_types=1);

const DESTINO = 'hola@miiish.com';
const REMITENTE = 'hola@miiish.com';

header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

$json = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
$idioma = in_array($_POST['idioma'] ?? '', ['es', 'en', 'pt'], true) ? $_POST['idioma'] : 'es';
$T = [
    'es' => ['req' => 'Completa tu nombre, tu correo y cuéntanos tu proyecto.', 'mail' => 'Revisa tu correo, parece que tiene un error.',
             'lim' => 'Recibimos varios mensajes seguidos. Espera unos minutos o escríbenos a hola@miiish.com.', 'err' => 'No pudimos enviar tu mensaje. Escríbenos a hola@miiish.com.',
             'ok' => '¡Miiish! Recibimos tu mensaje. Te respondemos en menos de un día hábil.', 'volver' => 'Volver al sitio'],
    'en' => ['req' => 'Please add your name, email and a few words about your project.', 'mail' => 'Please check your email address.',
             'lim' => 'We received several messages in a row. Please wait a few minutes or write to hola@miiish.com.', 'err' => 'We could not send your message. Please write to hola@miiish.com.',
             'ok' => '¡Miiish! We got your message and will reply within one business day.', 'volver' => 'Back to the site'],
    'pt' => ['req' => 'Preencha seu nome, e-mail e conte sobre o seu projeto.', 'mail' => 'Confira o seu e-mail, parece ter um erro.',
             'lim' => 'Recebemos várias mensagens seguidas. Espere alguns minutos ou escreva para hola@miiish.com.', 'err' => 'Não conseguimos enviar sua mensagem. Escreva para hola@miiish.com.',
             'ok' => '¡Miiish! Recebemos sua mensagem e respondemos em até um dia útil.', 'volver' => 'Voltar ao site'],
][$idioma];

function salir(bool $ok, string $msg, bool $json, int $codigo = 200): void
{
    global $T;
    http_response_code($codigo);
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<body style="font-family:system-ui,sans-serif;background:#0A0A0A;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center">'
            . '<div><p style="font-size:22px;max-width:30ch">' . htmlspecialchars($msg, ENT_QUOTES) . '</p>'
            . '<a href="/" style="color:#D7FF3A">' . htmlspecialchars($T['volver'], ENT_QUOTES) . '</a></div>';
    }
    exit;
}

function campo(string $k, int $max): string
{
    $v = $_POST[$k] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = trim(str_replace(["\r\n", "\r"], "\n", $v));
    $v = preg_replace('/[^\P{C}\n\t]/u', '', $v) ?? '';
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /#contacto', true, 303);
    exit;
}

// Trampas para bots: campo oculto relleno o formulario enviado en menos de 3 segundos.
$t = (int)($_POST['t'] ?? 0);
if (!empty($_POST['web']) || ($t > 0 && (microtime(true) * 1000 - $t) < 3000)) {
    salir(true, $T['ok'], $json);
}

$nombre = campo('nombre', 80);
$email = campo('email', 120);
$empresa = campo('empresa', 100);
$telefono = campo('telefono', 30);
$mensaje = campo('mensaje', 3000);
$presupuesto = campo('presupuesto', 60);
$servicios = [];
foreach ((array)($_POST['servicios'] ?? []) as $s) {
    if (is_string($s) && $s !== '') {
        $servicios[] = mb_substr(trim($s), 0, 40);
    }
}
$servicios = array_slice(array_unique($servicios), 0, 10);
$origen = campo('origen', 200);

if ($nombre === '' || $email === '' || $mensaje === '') {
    salir(false, $T['req'], $json, 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
    salir(false, $T['mail'], $json, 422);
}

// Límite: 5 mensajes por hora por IP.
$datos = dirname(__DIR__) . '/miiish-contacto-datos';
if (!is_dir($datos)) {
    @mkdir($datos, 0700, true);
}
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0');
$limite = $datos . '/limite-' . hash('sha256', $ip) . '.txt';
$marcas = is_file($limite) ? array_filter(array_map('intval', explode(',', (string)file_get_contents($limite))), function ($x) {
    return $x > time() - 3600;
}) : [];
if (count($marcas) >= 5) {
    salir(false, $T['lim'], $json, 429);
}
$marcas[] = time();
@file_put_contents($limite, implode(',', $marcas), LOCK_EX);

$fecha = (new DateTime('now', new DateTimeZone('America/Santiago')))->format('d-m-Y H:i');

// Copia de respaldo (JSON por línea)
@file_put_contents($datos . '/mensajes.jsonl', json_encode([
    'fecha' => $fecha, 'nombre' => $nombre, 'email' => $email, 'empresa' => $empresa, 'telefono' => $telefono,
    'servicios' => $servicios, 'idioma' => $idioma, 'mensaje' => $mensaje,
], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

// ---------- Plantillas de correo (HTML con estilos en línea + texto plano) ----------
const LOGO = 'https://miiish.com/img/email-logo.png';
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function cabecera_mime(string $nombre): string { return '=?UTF-8?B?' . base64_encode($nombre) . '?='; }

function marco(string $preheader, string $contenido, string $pie): string
{
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>¡Miiish!</title></head>'
        . '<body style="margin:0;padding:0;background:#F3F3EF;-webkit-text-size-adjust:100%">'
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F3F3EF">' . e($preheader) . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F3EF"><tr><td align="center" style="padding:28px 12px">'
        . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:28px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#0A0A0A">'
        . '<tr><td style="background:#0A0A0A;padding:26px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
        . '<td><a href="https://miiish.com/" style="text-decoration:none"><img src="' . LOGO . '" width="110" height="88" alt="¡Miiish!" style="display:block;border:0;width:110px;height:88px"></a></td>'
        . '<td align="right" style="font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D7FF3A">Agencia creativa<br><span style="color:#8A8A85">Santiago · Chile</span></td>'
        . '</tr></table></td></tr>'
        . '<tr><td style="height:8px;background:#D7FF3A;line-height:8px;font-size:0">&nbsp;</td></tr>'
        . $contenido
        . '<tr><td style="background:#0A0A0A;padding:24px 32px;color:#BDBDBD;font-size:13px;line-height:1.6">' . $pie . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}

function fila(string $k, string $v): string
{
    return '<tr><td style="padding:10px 0;border-bottom:1px solid #EEEEE8;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6B66;width:130px;vertical-align:top">' . e($k)
        . '</td><td style="padding:10px 0;border-bottom:1px solid #EEEEE8;font-size:15px;color:#0A0A0A;vertical-align:top">' . $v . '</td></tr>';
}

function chips(array $lista, string $bg = '#D7FF3A'): string
{
    if (!$lista) return '—';
    $o = '';
    foreach ($lista as $x) {
        $o .= '<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;background:' . $bg . ';color:#0A0A0A;font-size:13px;font-weight:bold">' . e($x) . '</span>';
    }
    return $o;
}

function multipart(string $texto, string $html, string &$tipo): string
{
    $b = 'miiish_' . bin2hex(random_bytes(8));
    $tipo = 'multipart/alternative; boundary="' . $b . '"';
    return "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($texto))
        . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
        . "--$b--\r\n";
}

function enviar(string $para, string $asunto, string $texto, string $html, array $extra): bool
{
    $tipo = '';
    $cuerpo = multipart($texto, $html, $tipo);
    $cab = implode("\r\n", array_merge($extra, ['MIME-Version: 1.0', 'Content-Type: ' . $tipo, 'X-Mailer: miiish-web']));
    $s = cabecera_mime($asunto);
    $ok = @mail($para, $s, $cuerpo, $cab, '-f' . REMITENTE);
    return $ok ?: @mail($para, $s, $cuerpo, $cab);
}

// ---------- 1) Aviso interno a hola@miiish.com ----------
$nombreLimpio = preg_replace('/[^\p{L}\p{N} .\'-]/u', '', $nombre) ?: 'Contacto web';
$primer = explode(' ', trim($nombreLimpio))[0];
$responder = 'mailto:' . rawurlencode($email) . '?subject=' . rawurlencode('Re: tu proyecto con ¡Miiish!');
$interno = '<tr><td style="padding:34px 32px 8px">'
    . '<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:#0A0A0A;color:#D7FF3A;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase">Nuevo contacto web · ' . e(strtoupper($idioma)) . '</span>'
    . '<h1 style="margin:18px 0 6px;font-family:\'Arial Black\',Helvetica,Arial,sans-serif;font-size:30px;line-height:1.05;letter-spacing:-1px;text-transform:uppercase">' . e($nombre) . '</h1>'
    . '<p style="margin:0;font-size:15px;color:#6B6B66">' . e($empresa ?: 'Sin empresa indicada') . ' · ' . e($fecha) . '</p></td></tr>'
    . '<tr><td style="padding:16px 32px 0"><p style="margin:0 0 10px;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6B66">Necesita</p>' . chips($servicios) . '</td></tr>'
    . '<tr><td style="padding:16px 32px 0"><div style="background:#F3F3EF;border-left:5px solid #FF4FD8;border-radius:16px;padding:18px 20px;font-size:16px;line-height:1.6;white-space:pre-wrap">' . nl2br(e($mensaje)) . '</div></td></tr>'
    . '<tr><td style="padding:18px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
    . fila('Correo', '<a href="mailto:' . e($email) . '" style="color:#0A0A0A">' . e($email) . '</a>')
    . fila('Teléfono', $telefono ? '<a href="tel:' . e(preg_replace('/[^0-9+]/', '', $telefono)) . '" style="color:#0A0A0A">' . e($telefono) . '</a>' : '—')
    . fila('Empresa', e($empresa ?: '—'))
    . fila('Idioma', e(['es' => 'Español', 'en' => 'Inglés', 'pt' => 'Portugués'][$idioma]))
    . '</table></td></tr>'
    . '<tr><td style="padding:26px 32px 34px"><a href="' . e($responder) . '" style="display:inline-block;padding:16px 26px;border-radius:999px;background:#0A0A0A;color:#D7FF3A;font-weight:bold;font-size:16px;text-decoration:none">Responder a ' . e($primer) . ' →</a>'
    . '<p style="margin:12px 0 0;font-size:13px;color:#6B6B66">También puedes responder directamente este correo: le llega a ' . e($email) . '.</p></td></tr>';
$htmlInterno = marco("$nombre · " . ($servicios ? implode(', ', $servicios) : 'contacto web'), $interno,
    'Mensaje enviado desde el formulario de <a href="' . e($origen ?: 'https://miiish.com/') . '" style="color:#D7FF3A">miiish.com</a>. Copia de respaldo guardada en el servidor.');
$textoInterno = "Nuevo contacto web (" . strtoupper($idioma) . ")\n\nNombre: $nombre\nCorreo: $email\nEmpresa: " . ($empresa ?: '—') . "\nTeléfono: " . ($telefono ?: '—')
    . "\nNecesita: " . ($servicios ? implode(', ', $servicios) : '—') . "\nFecha: $fecha (hora de Chile)\n\nMensaje:\n$mensaje\n\nResponde este correo para contestarle a $nombre.\n";
$etiqueta = $servicios ? ' · ' . implode(', ', array_slice($servicios, 0, 3)) : '';
$enviado = enviar(DESTINO, "Nuevo contacto web: $nombre$etiqueta", $textoInterno, $htmlInterno, [
    'From: ' . cabecera_mime('¡Miiish! Web') . ' <' . REMITENTE . '>',
    'Reply-To: ' . cabecera_mime($nombreLimpio) . " <$email>",
]);
if (!$enviado) {
    error_log('[miiish-contacto] no se pudo enviar el aviso interno para ' . $email);
}

// ---------- 2) Confirmación al cliente, en su idioma ----------
// Por seguridad no repetimos el texto libre del mensaje (evita que el formulario se use para enviar spam a terceros).
$SV = [
    'en' => ['Branding' => 'Branding', 'Redes sociales' => 'Social media', 'Web y e-commerce' => 'Web & e-commerce', 'Paid media' => 'Meta & Google campaigns', 'Video' => 'Video', 'Animación' => 'Animation & characters', '3D' => '3D modeling & rendering', 'Sistemas a medida' => 'Custom systems'],
    'pt' => ['Branding' => 'Branding', 'Redes sociales' => 'Redes sociais', 'Web y e-commerce' => 'Sites e e-commerce', 'Paid media' => 'Campanhas no Meta e Google', 'Video' => 'Vídeo', 'Animación' => 'Animação e personagens', '3D' => 'Modelagem e render 3D', 'Sistemas a medida' => 'Sistemas sob medida'],
    'es' => ['Branding' => 'Branding', 'Redes sociales' => 'Redes sociales', 'Web y e-commerce' => 'Web y e-commerce', 'Paid media' => 'Campañas en Meta y Google', 'Video' => 'Video', 'Animación' => 'Animación y personajes', '3D' => 'Modelado y render 3D', 'Sistemas a medida' => 'Sistemas a medida'],
][$idioma];
$serviciosCliente = [];
foreach ($servicios as $x) {
    if (isset($SV[$x])) $serviciosCliente[] = $SV[$x];
}
$C = [
    'es' => ['asunto' => '¡Miiish! Recibimos tu mensaje', 'pre' => 'Te respondemos en menos de un día hábil.', 'hola' => 'Hola, %s', 'tit' => 'Recibimos tu mensaje', 'emo' => '¡miiish!',
             'p1' => 'Gracias por escribirnos. Tu solicitud ya está en manos de nuestro equipo y te responderemos a este correo en menos de un día hábil.',
             'nec' => 'Lo que nos contaste que necesitas', 'pasos' => 'Lo que viene', 'p_1' => 'Revisamos tu mensaje y te escribimos.', 'p_2' => 'Agendamos un diagnóstico de 30 minutos.', 'p_3' => 'Te enviamos una propuesta y cotización a medida.',
             'mas' => 'Si quieres agregar algo, solo responde este correo.', 'cta' => 'Visita miiish.com', 'firma' => 'El equipo de ¡Miiish!', 'pie' => 'Recibiste este correo porque completaste el formulario de contacto en miiish.com. Si no fuiste tú, puedes ignorarlo.', 'ruta' => '/'],
    'en' => ['asunto' => '¡Miiish! We got your message', 'pre' => 'We will reply within one business day.', 'hola' => 'Hi %s', 'tit' => 'We got your message', 'emo' => '¡miiish!',
             'p1' => 'Thanks for reaching out. Your request is already with our team and we will reply to this email within one business day.',
             'nec' => 'What you told us you need', 'pasos' => 'What happens next', 'p_1' => 'We review your message and get back to you.', 'p_2' => 'We book a 30-minute discovery call.', 'p_3' => 'We send you a tailored proposal and quote.',
             'mas' => 'Want to add something? Just reply to this email.', 'cta' => 'Visit miiish.com', 'firma' => 'The ¡Miiish! team', 'pie' => 'You received this email because you filled in the contact form on miiish.com. If it was not you, you can ignore it.', 'ruta' => '/en/'],
    'pt' => ['asunto' => '¡Miiish! Recebemos sua mensagem', 'pre' => 'Respondemos em até um dia útil.', 'hola' => 'Olá, %s', 'tit' => 'Recebemos sua mensagem', 'emo' => '¡miiish!',
             'p1' => 'Obrigado por escrever. Sua solicitação já está com a nossa equipe e vamos responder este e-mail em até um dia útil.',
             'nec' => 'O que você nos contou que precisa', 'pasos' => 'Próximos passos', 'p_1' => 'Revisamos sua mensagem e respondemos.', 'p_2' => 'Agendamos um diagnóstico de 30 minutos.', 'p_3' => 'Enviamos uma proposta e um orçamento sob medida.',
             'mas' => 'Quer acrescentar algo? É só responder este e-mail.', 'cta' => 'Visite miiish.com', 'firma' => 'Equipe ¡Miiish!', 'pie' => 'Você recebeu este e-mail porque preencheu o formulário de contato em miiish.com. Se não foi você, pode ignorar.', 'ruta' => '/pt/'],
][$idioma];
$saludo = sprintf($C['hola'], mb_substr($primer, 0, 30));
$paso = function (string $n, string $t, string $bg, string $fg): string {
    return '<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . $bg . ';border-radius:18px"><tr>'
        . '<td style="padding:16px 0 16px 18px;width:44px;font-family:\'Arial Black\',Helvetica,Arial,sans-serif;font-size:22px;color:' . $fg . '">' . $n . '</td>'
        . '<td style="padding:16px 18px 16px 0;font-size:15px;line-height:1.45;color:' . ($bg === '#0A0A0A' ? '#FFFFFF' : '#0A0A0A') . '">' . e($t) . '</td></tr></table></td></tr>';
};
$cliente = '<tr><td style="padding:36px 32px 6px">'
    . '<p style="margin:0 0 6px;font-size:16px;color:#6B6B66">' . e($saludo) . '</p>'
    . '<h1 style="margin:0;font-family:\'Arial Black\',Helvetica,Arial,sans-serif;font-size:34px;line-height:1.02;letter-spacing:-1px;text-transform:uppercase">' . e($C['tit']) . ' <span style="background:#D7FF3A;padding:0 6px;border-radius:6px;text-transform:none;font-family:Georgia,serif;font-style:italic;font-weight:normal">' . e($C['emo']) . '</span></h1>'
    . '<p style="margin:18px 0 0;font-size:17px;line-height:1.6">' . e($C['p1']) . '</p></td></tr>'
    . ($serviciosCliente ? '<tr><td style="padding:20px 32px 0"><p style="margin:0 0 10px;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6B66">' . e($C['nec']) . '</p>' . chips($serviciosCliente) . '</td></tr>' : '')
    . '<tr><td style="padding:24px 32px 0"><p style="margin:0 0 12px;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6B6B66">' . e($C['pasos']) . '</p>'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $paso('01', $C['p_1'], '#F3F3EF', '#0A0A0A') . $paso('02', $C['p_2'], '#D7FF3A', '#0A0A0A') . $paso('03', $C['p_3'], '#0A0A0A', '#D7FF3A') . '</table></td></tr>'
    . '<tr><td style="padding:18px 32px 34px"><p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3A3A37">' . e($C['mas']) . '<br><strong>' . e($C['firma']) . '</strong></p>'
    . '<a href="https://miiish.com' . $C['ruta'] . '" style="display:inline-block;padding:15px 24px;border-radius:999px;background:#0A0A0A;color:#D7FF3A;font-weight:bold;font-size:15px;text-decoration:none">' . e($C['cta']) . ' →</a></td></tr>';
$htmlCliente = marco($C['pre'], $cliente, e($C['pie']) . '<br><a href="https://miiish.com' . $C['ruta'] . '" style="color:#D7FF3A">miiish.com</a> · <a href="mailto:hola@miiish.com" style="color:#D7FF3A">hola@miiish.com</a>');
$textoCliente = $saludo . "\n\n" . $C['tit'] . ' ' . $C['emo'] . "\n\n" . $C['p1'] . "\n\n"
    . ($serviciosCliente ? $C['nec'] . ': ' . implode(', ', $serviciosCliente) . "\n\n" : '')
    . $C['pasos'] . ":\n1. " . $C['p_1'] . "\n2. " . $C['p_2'] . "\n3. " . $C['p_3'] . "\n\n" . $C['mas'] . "\n" . $C['firma'] . "\nhttps://miiish.com" . $C['ruta'] . "\n";
enviar($email, $C['asunto'], $textoCliente, $htmlCliente, [
    'From: ' . cabecera_mime('¡Miiish!') . ' <' . REMITENTE . '>',
    'Reply-To: ' . cabecera_mime('¡Miiish!') . ' <' . DESTINO . '>',
    'Auto-Submitted: auto-replied',
]);

salir(true, $T['ok'], $json);
