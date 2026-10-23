<?php
// ¡Miiish! · formulario de contacto del sitio. Envía cada mensaje a hola@miiish.com
// y guarda una copia fuera de public_html por si el correo falla.
declare(strict_types=1);

const DESTINO = 'hola@miiish.com';
const REMITENTE = 'web@miiish.com';

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
$cuerpo = "Nuevo mensaje desde el formulario de miiish.com\n"
    . "==============================================\n\n"
    . "Nombre:       $nombre\n"
    . "Correo:       $email\n"
    . "Empresa:      " . ($empresa ?: '—') . "\n"
    . "Teléfono:     " . ($telefono ?: '—') . "\n"
    . "Servicios:    " . ($servicios ? implode(', ', $servicios) : '—') . "\n"
    . "Presupuesto:  " . ($presupuesto ?: '—') . "\n"
    . "Idioma:       " . strtoupper($idioma) . "\n"
    . "Fecha:        $fecha (hora de Chile)\n\n"
    . "Mensaje:\n--------\n$mensaje\n\n"
    . "--\nEnviado desde: " . ($origen ?: 'miiish.com') . "\nResponde este correo para contestarle directamente a $nombre.\n";

// Copia de respaldo (JSON por línea)
@file_put_contents($datos . '/mensajes.jsonl', json_encode([
    'fecha' => $fecha, 'nombre' => $nombre, 'email' => $email, 'empresa' => $empresa, 'telefono' => $telefono,
    'servicios' => $servicios, 'presupuesto' => $presupuesto, 'idioma' => $idioma, 'mensaje' => $mensaje,
], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

$etiqueta = $servicios ? ' · ' . implode(', ', array_slice($servicios, 0, 3)) : '';
$asunto = '=?UTF-8?B?' . base64_encode("Nuevo contacto web: $nombre$etiqueta") . '?=';
$nombreLimpio = preg_replace('/[^\p{L}\p{N} .\'-]/u', '', $nombre) ?: 'Contacto web';
$cabeceras = implode("\r\n", [
    'From: =?UTF-8?B?' . base64_encode('¡Miiish! Web') . '?= <' . REMITENTE . '>',
    'Reply-To: =?UTF-8?B?' . base64_encode($nombreLimpio) . "?= <$email>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: miiish-web',
]);

$enviado = @mail(DESTINO, $asunto, $cuerpo, $cabeceras, '-f' . REMITENTE);
if (!$enviado) {
    $enviado = @mail(DESTINO, $asunto, $cuerpo, $cabeceras);
}
if (!$enviado) {
    error_log('[miiish-contacto] mail() falló para ' . $email);
    // El mensaje quedó guardado en el respaldo: no perdemos el contacto.
}
salir(true, $T['ok'], $json);
