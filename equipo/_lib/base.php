<?php
// ¡Miiish! Equipo · núcleo: base de datos, sesión, permisos y utilidades.
// Compatible con PHP 7.4+ y SQLite (PDO). Los datos viven FUERA de public_html.

declare(strict_types=1);

const ESTADOS = ['por_hacer', 'en_curso', 'revision', 'detenida', 'listo'];
const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];
const ROLES = ['coordinador', 'profesional'];
const COLORES = ['#D7FF3A', '#FF4FD8', '#8FD3FF', '#FF8A3D', '#B69CFF', '#5BE3A8', '#FFD43B', '#FF5A5F'];

function carpeta_datos(): string
{
    $env = getenv('MIIISH_DATOS');
    if ($env) {
        return rtrim($env, '/');
    }
    // _lib → equipo → public_html → carpeta de la cuenta
    return dirname(__DIR__, 3) . '/miiish-equipo-datos';
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $dir = carpeta_datos();
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        throw new RuntimeException('No se puede escribir en la carpeta de datos.');
    }
    $pdo = new PDO('sqlite:' . $dir . '/equipo-v2.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
    esquema($pdo);
    return $pdo;
}

function esquema(PDO $pdo): void
{
    $pdo->exec("
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      cargo TEXT NOT NULL DEFAULT '',
      rol TEXT NOT NULL DEFAULT 'profesional',
      color TEXT NOT NULL DEFAULT '#D7FF3A',
      hash TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      invitacion_hash TEXT,
      invitacion_expira INTEGER,
      ultimo_acceso INTEGER,
      creado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cliente TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#D7FF3A',
      archivado INTEGER NOT NULL DEFAULT 0,
      creado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE SET NULL,
      titulo TEXT NOT NULL,
      descripcion TEXT NOT NULL DEFAULT '',
      responsable_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      estado TEXT NOT NULL DEFAULT 'por_hacer',
      prioridad TEXT NOT NULL DEFAULT 'media',
      fecha_inicio TEXT,
      fecha_entrega TEXT,
      horas_estimadas REAL,
      creado_por INTEGER,
      creado INTEGER NOT NULL,
      actualizado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comentarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarea_id INTEGER NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      texto TEXT NOT NULL,
      creado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS horas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tarea_id INTEGER NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      fecha TEXT NOT NULL,
      horas REAL NOT NULL,
      nota TEXT NOT NULL DEFAULT '',
      creado INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS intentos (
      clave TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_tareas_resp ON tareas(responsable_id);
    CREATE INDEX IF NOT EXISTS ix_coment_tarea ON comentarios(tarea_id);
    CREATE INDEX IF NOT EXISTS ix_horas_tarea ON horas(tarea_id);
    ");
}

// ---------- Sesión ----------

function iniciar_sesion(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('miiish_equipo');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/equipo/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', '43200');
    session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    // Cierra sesiones inactivas por más de 12 horas
    if (!empty($_SESSION['uid']) && (time() - (int)($_SESSION['visto'] ?? 0)) > 43200) {
        $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
    }
    $_SESSION['visto'] = time();
}

function usuario_actual(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }
    $st = db()->prepare('SELECT id, nombre, email, cargo, rol, color, activo FROM usuarios WHERE id = ?');
    $st->execute([(int)$_SESSION['uid']]);
    $u = $st->fetch();
    if (!$u || !(int)$u['activo']) {
        $_SESSION = ['csrf' => bin2hex(random_bytes(32))];
        return null;
    }
    $u['id'] = (int)$u['id'];
    return $u;
}

function hay_usuarios(): bool
{
    return (int)db()->query('SELECT COUNT(*) FROM usuarios')->fetchColumn() > 0;
}

function es_coordinador(array $u): bool
{
    return $u['rol'] === 'coordinador';
}

// ---------- Límite de intentos ----------

function demasiados_intentos(string $clave): bool
{
    $pdo = db();
    $pdo->prepare('DELETE FROM intentos WHERE ts < ?')->execute([time() - 900]);
    $st = $pdo->prepare('SELECT COUNT(*) FROM intentos WHERE clave = ?');
    $st->execute([$clave]);
    return (int)$st->fetchColumn() >= 6;
}

function registrar_intento(string $clave): void
{
    db()->prepare('INSERT INTO intentos (clave, ts) VALUES (?, ?)')->execute([$clave, time()]);
}

// ---------- Utilidades ----------

function ip_cliente(): string
{
    return (string)($_SERVER['REMOTE_ADDR'] ?? '0');
}

function texto($v, int $max = 2000): string
{
    $s = trim((string)$v);
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max);
    }
    return substr($s, 0, $max);
}

function fecha_valida($v): ?string
{
    $v = trim((string)$v);
    if ($v === '') {
        return null;
    }
    $d = DateTime::createFromFormat('Y-m-d', $v);
    return ($d && $d->format('Y-m-d') === $v) ? $v : null;
}

function numero_o_null($v): ?float
{
    if ($v === null || $v === '') {
        return null;
    }
    if (!is_numeric($v)) {
        return null;
    }
    $n = round((float)$v, 2);
    return ($n >= 0 && $n <= 10000) ? $n : null;
}

function clave_valida(string $c): bool
{
    return strlen($c) >= 8 && strlen($c) <= 200;
}

function crear_token(): array
{
    $t = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
    return [$t, hash('sha256', $t)];
}

function url_base(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $host = $_SERVER['HTTP_HOST'] ?? 'miiish.com';
    if (!preg_match('/^[a-z0-9.\-:]+$/i', $host)) {
        $host = 'miiish.com';
    }
    return ($https ? 'https://' : 'http://') . $host . '/equipo/';
}

function cabeceras_seguridad(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
}
