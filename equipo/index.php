<?php
// ¡Miiish! Equipo · página única. El estado inicial decide qué pantalla muestra app.js.
declare(strict_types=1);
require __DIR__ . '/_lib/base.php';

cabeceras_seguridad();
header("Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

$boot = ['csrf' => '', 'pantalla' => 'login'];
$fallo = '';
try {
    iniciar_sesion();
    $boot['csrf'] = $_SESSION['csrf'];
    if (!empty($_GET['invitacion']) && is_string($_GET['invitacion'])) {
        $boot['pantalla'] = 'invitacion';
        $boot['token'] = preg_replace('/[^A-Za-z0-9_\-]/', '', $_GET['invitacion']);
    } elseif (!hay_usuarios()) {
        $boot['pantalla'] = 'setup';
    } elseif (usuario_actual()) {
        $boot['pantalla'] = 'app';
    }
} catch (Throwable $e) {
    error_log('[miiish-equipo] ' . $e->getMessage());
    $fallo = 'No se pudo abrir la base de datos del sistema. Revisa que PHP tenga SQLite y que la cuenta pueda escribir en su carpeta principal.';
}
$v = '1';
?><!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0A0A0A">
<title>Equipo · ¡Miiish!</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Jost:wght@900&family=Unbounded:wght@500;700;800&display=swap">
<link rel="stylesheet" href="app.css?v=<?= $v ?>">
</head>
<body>
<?php if ($fallo): ?>
<main class="auth"><div class="auth-card"><p class="aviso"><?= htmlspecialchars($fallo, ENT_QUOTES) ?></p></div></main>
<?php else: ?>
<div id="app" aria-live="polite"></div>
<script id="boot" type="application/json"><?= json_encode($boot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
<script src="app.js?v=<?= $v ?>"></script>
<?php endif; ?>
</body>
</html>
