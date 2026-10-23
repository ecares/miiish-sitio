<?php
// ¡Miiish! Equipo · API JSON. Todas las llamadas son POST con cabecera X-CSRF.
declare(strict_types=1);
require __DIR__ . '/_lib/base.php';

cabeceras_seguridad();
header('Content-Type: application/json; charset=utf-8');

function responder($datos, int $codigo = 200): void
{
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function error_api(string $msg, int $codigo = 400): void
{
    responder(['ok' => false, 'error' => $msg], $codigo);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    error_api('Método no permitido', 405);
}

try {
    iniciar_sesion();
    $csrf = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($csrf) || !hash_equals($_SESSION['csrf'], $csrf)) {
        error_api('La sesión expiró. Recarga la página.', 419);
    }
    $in = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($in)) {
        error_api('Solicitud inválida');
    }
    $accion = (string)($in['accion'] ?? '');
    $pdo = db();

    // ---------- Acciones sin sesión ----------
    if ($accion === 'setup') {
        if (hay_usuarios()) {
            error_api('El sistema ya fue configurado.', 403);
        }
        $nombre = texto($in['nombre'] ?? '', 80);
        $email = strtolower(texto($in['email'] ?? '', 120));
        $clave = (string)($in['clave'] ?? '');
        if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error_api('Revisa tu nombre y correo.');
        }
        if (!clave_valida($clave)) {
            error_api('La contraseña debe tener al menos 8 caracteres.');
        }
        $pdo->prepare('INSERT INTO usuarios (nombre, email, cargo, rol, color, hash, creado) VALUES (?,?,?,?,?,?,?)')
            ->execute([$nombre, $email, 'Coordinación', 'coordinador', COLORES[0], password_hash($clave, PASSWORD_DEFAULT), time()]);
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$pdo->lastInsertId();
        responder(['ok' => true]);
    }

    if ($accion === 'login') {
        $email = strtolower(texto($in['email'] ?? '', 120));
        $clave = (string)($in['clave'] ?? '');
        $llave = 'login:' . $email . '|' . ip_cliente();
        if (demasiados_intentos($llave)) {
            error_api('Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.', 429);
        }
        $st = $pdo->prepare('SELECT id, hash, activo FROM usuarios WHERE email = ?');
        $st->execute([$email]);
        $u = $st->fetch();
        if (!$u || !$u['hash'] || !password_verify($clave, $u['hash'])) {
            registrar_intento($llave);
            error_api('Correo o contraseña incorrectos.', 401);
        }
        if (!(int)$u['activo']) {
            error_api('Tu cuenta está desactivada. Habla con coordinación.', 403);
        }
        if (password_needs_rehash($u['hash'], PASSWORD_DEFAULT)) {
            $pdo->prepare('UPDATE usuarios SET hash = ? WHERE id = ?')->execute([password_hash($clave, PASSWORD_DEFAULT), $u['id']]);
        }
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$u['id'];
        $pdo->prepare('UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?')->execute([time(), $u['id']]);
        responder(['ok' => true]);
    }

    if ($accion === 'invitacion') {
        $token = (string)($in['token'] ?? '');
        $clave = (string)($in['clave'] ?? '');
        $llave = 'inv:' . ip_cliente();
        if (demasiados_intentos($llave)) {
            error_api('Demasiados intentos. Espera 15 minutos.', 429);
        }
        $st = $pdo->prepare('SELECT id, activo, invitacion_expira FROM usuarios WHERE invitacion_hash = ?');
        $st->execute([hash('sha256', $token)]);
        $u = $st->fetch();
        if (!$u || (int)$u['invitacion_expira'] < time() || !(int)$u['activo']) {
            registrar_intento($llave);
            error_api('El enlace no es válido o ya venció. Pide uno nuevo a coordinación.', 400);
        }
        if (!clave_valida($clave)) {
            error_api('La contraseña debe tener al menos 8 caracteres.');
        }
        $pdo->prepare('UPDATE usuarios SET hash = ?, invitacion_hash = NULL, invitacion_expira = NULL, ultimo_acceso = ? WHERE id = ?')
            ->execute([password_hash($clave, PASSWORD_DEFAULT), time(), $u['id']]);
        session_regenerate_id(true);
        $_SESSION['uid'] = (int)$u['id'];
        responder(['ok' => true]);
    }

    // ---------- A partir de aquí, sesión obligatoria ----------
    $yo = usuario_actual();
    if (!$yo) {
        error_api('Tu sesión terminó. Vuelve a entrar.', 401);
    }
    $coord = es_coordinador($yo);

    $exigir_coord = function () use ($coord) {
        if (!$coord) {
            error_api('Solo coordinación puede hacer esto.', 403);
        }
    };

    $tarea = function (int $id) use ($pdo): array {
        $st = $pdo->prepare('SELECT * FROM tareas WHERE id = ?');
        $st->execute([$id]);
        $t = $st->fetch();
        if (!$t) {
            error_api('La tarea no existe.', 404);
        }
        return $t;
    };

    // Puede trabajar en la tarea: coordinación o quien es responsable.
    $puede_trabajar = function (array $t) use ($coord, $yo): bool {
        return $coord || (int)$t['responsable_id'] === $yo['id'];
    };

    switch ($accion) {
        case 'salir':
            $_SESSION = [];
            session_regenerate_id(true);
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            responder(['ok' => true]);

        case 'datos':
            $usuarios = $pdo->query('SELECT id, nombre, email, cargo, rol, color, activo, ultimo_acceso,
                CASE WHEN hash IS NULL THEN 0 ELSE 1 END AS con_clave FROM usuarios ORDER BY nombre')->fetchAll();
            if (!$coord) {
                foreach ($usuarios as &$u) {
                    unset($u['email'], $u['ultimo_acceso'], $u['con_clave']);
                }
                unset($u);
            }
            $proyectos = $pdo->query('SELECT * FROM proyectos ORDER BY archivado, nombre')->fetchAll();
            $tareas = $pdo->query('SELECT t.*,
                    COALESCE((SELECT SUM(h.horas) FROM horas h WHERE h.tarea_id = t.id), 0) AS horas_registradas,
                    (SELECT COUNT(*) FROM comentarios c WHERE c.tarea_id = t.id) AS n_comentarios
                FROM tareas t ORDER BY (t.fecha_entrega IS NULL), t.fecha_entrega, t.id')->fetchAll();
            responder(['ok' => true, 'yo' => $yo, 'usuarios' => $usuarios, 'proyectos' => $proyectos, 'tareas' => $tareas]);

        case 'tarea_detalle':
            $t = $tarea((int)($in['id'] ?? 0));
            $c = $pdo->prepare('SELECT c.id, c.texto, c.creado, c.usuario_id FROM comentarios c WHERE c.tarea_id = ? ORDER BY c.creado');
            $c->execute([$t['id']]);
            $h = $pdo->prepare('SELECT id, fecha, horas, nota, usuario_id, creado FROM horas WHERE tarea_id = ? ORDER BY fecha DESC, id DESC');
            $h->execute([$t['id']]);
            responder(['ok' => true, 'tarea' => $t, 'comentarios' => $c->fetchAll(), 'horas' => $h->fetchAll()]);

        case 'tarea_guardar':
            $exigir_coord();
            $id = (int)($in['id'] ?? 0);
            $titulo = texto($in['titulo'] ?? '', 160);
            if ($titulo === '') {
                error_api('La tarea necesita un título.');
            }
            $estado = in_array($in['estado'] ?? '', ESTADOS, true) ? $in['estado'] : 'por_hacer';
            $prioridad = in_array($in['prioridad'] ?? '', PRIORIDADES, true) ? $in['prioridad'] : 'media';
            $proyecto = (int)($in['proyecto_id'] ?? 0) ?: null;
            $resp = (int)($in['responsable_id'] ?? 0) ?: null;
            $campos = [
                $proyecto, $titulo, texto($in['descripcion'] ?? '', 5000), $resp, $estado, $prioridad,
                fecha_valida($in['fecha_inicio'] ?? ''), fecha_valida($in['fecha_entrega'] ?? ''),
                numero_o_null($in['horas_estimadas'] ?? null), time(),
            ];
            if ($id) {
                $tarea($id);
                $campos[] = $id;
                $pdo->prepare('UPDATE tareas SET proyecto_id=?, titulo=?, descripcion=?, responsable_id=?, estado=?, prioridad=?,
                    fecha_inicio=?, fecha_entrega=?, horas_estimadas=?, actualizado=? WHERE id=?')->execute($campos);
            } else {
                $campos[] = $yo['id'];
                $campos[] = time();
                $pdo->prepare('INSERT INTO tareas (proyecto_id, titulo, descripcion, responsable_id, estado, prioridad,
                    fecha_inicio, fecha_entrega, horas_estimadas, actualizado, creado_por, creado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute($campos);
                $id = (int)$pdo->lastInsertId();
            }
            responder(['ok' => true, 'id' => $id]);

        case 'tarea_estado':
            $t = $tarea((int)($in['id'] ?? 0));
            if (!$puede_trabajar($t)) {
                error_api('Solo puedes mirar esta tarea.', 403);
            }
            $estado = (string)($in['estado'] ?? '');
            if (!in_array($estado, ESTADOS, true)) {
                error_api('Estado inválido.');
            }
            $pdo->prepare('UPDATE tareas SET estado = ?, actualizado = ? WHERE id = ?')->execute([$estado, time(), $t['id']]);
            responder(['ok' => true]);

        case 'tarea_eliminar':
            $exigir_coord();
            $t = $tarea((int)($in['id'] ?? 0));
            $pdo->prepare('DELETE FROM tareas WHERE id = ?')->execute([$t['id']]);
            responder(['ok' => true]);

        case 'comentario_agregar':
            $t = $tarea((int)($in['tarea_id'] ?? 0));
            if (!$puede_trabajar($t)) {
                error_api('Solo puedes mirar esta tarea.', 403);
            }
            $txt = texto($in['texto'] ?? '', 3000);
            if ($txt === '') {
                error_api('Escribe un comentario.');
            }
            $pdo->prepare('INSERT INTO comentarios (tarea_id, usuario_id, texto, creado) VALUES (?,?,?,?)')
                ->execute([$t['id'], $yo['id'], $txt, time()]);
            $pdo->prepare('UPDATE tareas SET actualizado = ? WHERE id = ?')->execute([time(), $t['id']]);
            responder(['ok' => true]);

        case 'comentario_eliminar':
            $st = $pdo->prepare('SELECT * FROM comentarios WHERE id = ?');
            $st->execute([(int)($in['id'] ?? 0)]);
            $c = $st->fetch();
            if (!$c) {
                error_api('El comentario no existe.', 404);
            }
            if (!$coord && (int)$c['usuario_id'] !== $yo['id']) {
                error_api('No puedes borrar este comentario.', 403);
            }
            $pdo->prepare('DELETE FROM comentarios WHERE id = ?')->execute([$c['id']]);
            responder(['ok' => true]);

        case 'horas_agregar':
            $t = $tarea((int)($in['tarea_id'] ?? 0));
            if (!$puede_trabajar($t)) {
                error_api('Solo puedes mirar esta tarea.', 403);
            }
            $horas = numero_o_null($in['horas'] ?? null);
            if (!$horas || $horas > 24) {
                error_api('Ingresa entre 0,25 y 24 horas.');
            }
            $fecha = fecha_valida($in['fecha'] ?? '') ?: date('Y-m-d');
            $pdo->prepare('INSERT INTO horas (tarea_id, usuario_id, fecha, horas, nota, creado) VALUES (?,?,?,?,?,?)')
                ->execute([$t['id'], $yo['id'], $fecha, $horas, texto($in['nota'] ?? '', 200), time()]);
            responder(['ok' => true]);

        case 'horas_eliminar':
            $st = $pdo->prepare('SELECT * FROM horas WHERE id = ?');
            $st->execute([(int)($in['id'] ?? 0)]);
            $h = $st->fetch();
            if (!$h) {
                error_api('El registro no existe.', 404);
            }
            if (!$coord && (int)$h['usuario_id'] !== $yo['id']) {
                error_api('No puedes borrar este registro.', 403);
            }
            $pdo->prepare('DELETE FROM horas WHERE id = ?')->execute([$h['id']]);
            responder(['ok' => true]);

        case 'proyecto_guardar':
            $exigir_coord();
            $id = (int)($in['id'] ?? 0);
            $nombre = texto($in['nombre'] ?? '', 100);
            if ($nombre === '') {
                error_api('El proyecto necesita un nombre.');
            }
            $color = in_array($in['color'] ?? '', COLORES, true) ? $in['color'] : COLORES[0];
            $cliente = texto($in['cliente'] ?? '', 100);
            $arch = !empty($in['archivado']) ? 1 : 0;
            if ($id) {
                $pdo->prepare('UPDATE proyectos SET nombre=?, cliente=?, color=?, archivado=? WHERE id=?')->execute([$nombre, $cliente, $color, $arch, $id]);
            } else {
                $pdo->prepare('INSERT INTO proyectos (nombre, cliente, color, creado) VALUES (?,?,?,?)')->execute([$nombre, $cliente, $color, time()]);
                $id = (int)$pdo->lastInsertId();
            }
            responder(['ok' => true, 'id' => $id]);

        case 'proyecto_eliminar':
            $exigir_coord();
            $pdo->prepare('DELETE FROM proyectos WHERE id = ?')->execute([(int)($in['id'] ?? 0)]);
            responder(['ok' => true]);

        case 'usuario_guardar':
            $exigir_coord();
            $id = (int)($in['id'] ?? 0);
            $nombre = texto($in['nombre'] ?? '', 80);
            $email = strtolower(texto($in['email'] ?? '', 120));
            $cargo = texto($in['cargo'] ?? '', 80);
            $rol = in_array($in['rol'] ?? '', ROLES, true) ? $in['rol'] : 'profesional';
            $color = in_array($in['color'] ?? '', COLORES, true) ? $in['color'] : COLORES[array_rand(COLORES)];
            if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                error_api('Revisa el nombre y el correo.');
            }
            $dup = $pdo->prepare('SELECT id FROM usuarios WHERE email = ? AND id <> ?');
            $dup->execute([$email, $id]);
            if ($dup->fetch()) {
                error_api('Ya existe una cuenta con ese correo.');
            }
            if ($id) {
                if ($id === $yo['id'] && $rol !== 'coordinador') {
                    error_api('No puedes quitarte el rol de coordinación a ti mismo.');
                }
                $pdo->prepare('UPDATE usuarios SET nombre=?, email=?, cargo=?, rol=?, color=? WHERE id=?')->execute([$nombre, $email, $cargo, $rol, $color, $id]);
                responder(['ok' => true, 'id' => $id]);
            }
            [$tok, $h] = crear_token();
            $pdo->prepare('INSERT INTO usuarios (nombre, email, cargo, rol, color, invitacion_hash, invitacion_expira, creado) VALUES (?,?,?,?,?,?,?,?)')
                ->execute([$nombre, $email, $cargo, $rol, $color, $h, time() + 7 * 86400, time()]);
            responder(['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'enlace' => url_base() . '?invitacion=' . $tok]);

        case 'usuario_enlace':
            $exigir_coord();
            $id = (int)($in['id'] ?? 0);
            [$tok, $h] = crear_token();
            $st = $pdo->prepare('UPDATE usuarios SET invitacion_hash = ?, invitacion_expira = ? WHERE id = ?');
            $st->execute([$h, time() + 7 * 86400, $id]);
            if (!$st->rowCount()) {
                error_api('La persona no existe.', 404);
            }
            responder(['ok' => true, 'enlace' => url_base() . '?invitacion=' . $tok]);

        case 'usuario_activo':
            $exigir_coord();
            $id = (int)($in['id'] ?? 0);
            if ($id === $yo['id']) {
                error_api('No puedes desactivar tu propia cuenta.');
            }
            $pdo->prepare('UPDATE usuarios SET activo = ? WHERE id = ?')->execute([!empty($in['activo']) ? 1 : 0, $id]);
            responder(['ok' => true]);

        case 'clave_cambiar':
            $st = $pdo->prepare('SELECT hash FROM usuarios WHERE id = ?');
            $st->execute([$yo['id']]);
            $hash = (string)$st->fetchColumn();
            if (!password_verify((string)($in['actual'] ?? ''), $hash)) {
                error_api('La contraseña actual no es correcta.');
            }
            $nueva = (string)($in['nueva'] ?? '');
            if (!clave_valida($nueva)) {
                error_api('La nueva contraseña debe tener al menos 8 caracteres.');
            }
            $pdo->prepare('UPDATE usuarios SET hash = ? WHERE id = ?')->execute([password_hash($nueva, PASSWORD_DEFAULT), $yo['id']]);
            responder(['ok' => true]);

        default:
            error_api('Acción desconocida.', 404);
    }
} catch (Throwable $e) {
    error_log('[miiish-equipo] ' . $e->getMessage());
    error_api('Algo falló en el servidor. Inténtalo de nuevo.', 500);
}
