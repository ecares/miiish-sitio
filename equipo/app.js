/* ¡Miiish! Equipo · interfaz (JavaScript sin dependencias) */
(function () {
  'use strict';

  var BOOT = JSON.parse(document.getElementById('boot').textContent);
  var raiz = document.getElementById('app');

  var ESTADOS = [
    ['por_hacer', 'Por hacer'], ['en_curso', 'En curso'], ['revision', 'En revisión'],
    ['detenida', 'Detenida'], ['listo', 'Listo']
  ];
  var PRIOS = [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta'], ['urgente', 'Urgente']];
  var COLORES = ['#D7FF3A', '#FF4FD8', '#8FD3FF', '#FF8A3D', '#B69CFF', '#5BE3A8', '#FFD43B', '#FF5A5F'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  var S = { yo: null, usuarios: [], proyectos: [], tareas: [], vista: 'inicio',
    f: { proyecto: '', persona: '', estado: '', q: '' }, mes: null, abierta: 0 };

  try { var vg = localStorage.getItem('miiish_vista'); if (vg) S.vista = vg; } catch (e) {}

  // ---------- utilidades ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'selected' || k === 'disabled') el[k] = !!v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) añadir(el, arguments[i]);
    return el;
  }
  function añadir(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { añadir(el, x); }); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function vaciar(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  var ICONOS = {
    inicio: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
    lista: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    tablero: 'M3 4h5v16H3zM10 4h5v10h-5zM17 4h4v13h-4z',
    calendario: 'M3 6h18v15H3zM3 10h18M8 3v4M16 3v4',
    equipo: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a7 7 0 0114 0v1M17 11a3 3 0 100-6M22 21v-1a5 5 0 00-4-5',
    proyectos: 'M3 7h7l2 2h9v11H3z',
    salir: 'M15 3h5v18h-5M10 17l5-5-5-5M15 12H3',
    menu: 'M4 7h16M4 12h16M4 17h16',
    cerrar: 'M6 6l12 12M18 6L6 18',
    llave: 'M15 7a4 4 0 11-3.9 4.8L3 20v-3l2-2v-2h2l1.2-1.2A4 4 0 0115 7z'
  };
  function ico(n) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    var p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONOS[n]); s.appendChild(p);
    return s;
  }

  function api(accion, datos) {
    var cuerpo = Object.assign({ accion: accion }, datos || {});
    return fetch('api.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF': BOOT.csrf },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'Respuesta inválida del servidor.' }; })
        .then(function (j) {
          if (r.status === 401 && S.yo) { location.reload(); }
          if (r.status === 419) { aviso('La sesión expiró. Recargando…', true); setTimeout(function () { location.reload(); }, 1200); }
          if (!j.ok) throw new Error(j.error || 'Algo falló.');
          return j;
        });
    });
  }

  var tAviso = null;
  function aviso(msg, err) {
    var prev = document.querySelector('.toast'); if (prev) prev.remove();
    var t = h('div', { class: 'toast' + (err ? ' err' : ''), role: 'status' }, msg);
    document.body.appendChild(t);
    clearTimeout(tAviso); tAviso = setTimeout(function () { t.remove(); }, 3200);
  }

  function hoyISO() { var d = new Date(); return iso(d); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function desdeISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dias(s) { return Math.round((desdeISO(s) - desdeISO(hoyISO())) / 86400000); }
  function fechaCorta(s) { if (!s) return ''; var d = desdeISO(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); }
  function fechaHora(ts) { var d = new Date(ts * 1000); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function num(n) { n = +n || 0; return (Math.round(n * 100) / 100).toString().replace('.', ','); }
  function iniciales(n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase(); }
  function etiqueta(lista, v) { for (var i = 0; i < lista.length; i++) if (lista[i][0] === v) return lista[i][1]; return v; }

  function usuario(id) { id = +id; for (var i = 0; i < S.usuarios.length; i++) if (+S.usuarios[i].id === id) return S.usuarios[i]; return null; }
  function proyecto(id) { id = +id; for (var i = 0; i < S.proyectos.length; i++) if (+S.proyectos[i].id === id) return S.proyectos[i]; return null; }
  function esCoord() { return S.yo && S.yo.rol === 'coordinador'; }
  function puedeTrabajar(t) { return esCoord() || +t.responsable_id === +S.yo.id; }
  function colorTarea(t) { var p = proyecto(t.proyecto_id); return p ? p.color : '#DADAD3'; }

  function avatar(u, grande) {
    if (!u) return h('span', { class: 'av' + (grande ? ' av-g' : ''), style: '--c:#E9E9E3', title: 'Sin asignar' }, '–');
    return h('span', { class: 'av' + (grande ? ' av-g' : ''), style: '--c:' + u.color, title: u.nombre }, iniciales(u.nombre));
  }
  function persona(u) { return h('span', { class: 'persona' }, avatar(u), h('span', null, u ? u.nombre : 'Sin asignar')); }
  function estadoPill(e) { return h('span', { class: 'estado', 'data-e': e, style: '--e:var(--e-' + e + ')' }, etiqueta(ESTADOS, e)); }
  function prioPill(p) { return h('span', { class: 'prio', style: '--p:var(--p-' + p + ')' }, etiqueta(PRIOS, p)); }
  function vencePill(t) {
    if (!t.fecha_entrega) return h('span', { class: 'vence', style: 'color:var(--gris2)' }, 'Sin fecha');
    var d = dias(t.fecha_entrega), cls = 'vence';
    if (t.estado !== 'listo' && d < 0) cls += ' atrasada';
    else if (t.estado !== 'listo' && d === 0) cls += ' hoy';
    return h('span', { class: cls, title: t.fecha_entrega }, d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : fechaCorta(t.fecha_entrega));
  }

  function select(opciones, valor, attrs) {
    var s = h('select', Object.assign({ class: 'inp' }, attrs || {}));
    opciones.forEach(function (o) { s.appendChild(h('option', { value: o[0], selected: String(o[0]) === String(valor) }, o[1])); });
    return s;
  }
  function campo(lbl, control) { return h('label', { class: 'campo' }, h('span', null, lbl), control); }

  function logo(tag) {
    return h('span', { class: 'logo' }, h('span', { class: 'lj' }, '¡mii'), h('span', { class: 'ls' }, 'ish!'), tag ? h('span', { class: 'tag' }, tag) : null);
  }

  // ---------- pantallas de acceso ----------
  function pantallaAcceso(titulo, sub, campos, boton, enviar, extra) {
    var err = h('p', { class: 'aviso', hidden: true });
    var btn = h('button', { class: 'btn btn-pri', type: 'submit' }, boton);
    var form = h('form', { class: 'auth-card', novalidate: true, onsubmit: function (ev) {
      ev.preventDefault(); err.hidden = true; btn.disabled = true;
      enviar(form).then(function () { location.href = location.pathname; })
        .catch(function (e) { err.textContent = e.message; err.hidden = false; btn.disabled = false; });
    } }, h('h2', null, titulo), h('p', { class: 'sub' }, sub), campos, err, btn, extra || null);
    vaciar(raiz);
    raiz.appendChild(h('main', { class: 'auth' },
      h('section', { class: 'auth-arte' },
        logo('equipo'),
        h('div', null,
          h('h1', null, 'Tareas, tiempos ', h('em', null, 'y entregas'), ' en orden'),
          h('p', null, 'El espacio interno del equipo ¡Miiish!: quién hace qué, para cuándo y cómo va.')),
        h('div', { class: 'auth-blob', 'aria-hidden': 'true' })),
      h('section', { class: 'auth-panel' }, form)));
    var primero = form.querySelector('input'); if (primero) primero.focus();
  }
  function inp(nombre, tipo, auto, extra) {
    return h('input', Object.assign({ class: 'inp', name: nombre, type: tipo, autocomplete: auto, required: true }, extra || {}));
  }
  function val(form, n) { return form.elements[n].value; }

  function vistaLogin() {
    pantallaAcceso('Entrar', 'Usa el correo y la contraseña de tu cuenta.', [
      campo('Correo', inp('email', 'email', 'username', { inputmode: 'email' })),
      campo('Contraseña', inp('clave', 'password', 'current-password'))
    ], 'Entrar', function (f) {
      return api('login', { email: val(f, 'email'), clave: val(f, 'clave') });
    }, h('p', { class: 'sub', style: 'font-size:13px;margin:4px 0 0' }, '¿Olvidaste tu contraseña? Pídele a coordinación un enlace nuevo.'));
  }
  function vistaSetup() {
    pantallaAcceso('Crea la cuenta de coordinación', 'Es la primera vez que se abre el sistema. Esta cuenta podrá gestionar todo.', [
      campo('Tu nombre', inp('nombre', 'text', 'name')),
      campo('Correo', inp('email', 'email', 'username')),
      campo('Contraseña (mínimo 8 caracteres)', inp('clave', 'password', 'new-password', { minlength: 8 }))
    ], 'Crear y entrar', function (f) {
      return api('setup', { nombre: val(f, 'nombre'), email: val(f, 'email'), clave: val(f, 'clave') });
    });
  }
  function vistaInvitacion() {
    pantallaAcceso('Activa tu cuenta', 'Elige tu contraseña para entrar al espacio del equipo.', [
      campo('Contraseña (mínimo 8 caracteres)', inp('clave', 'password', 'new-password', { minlength: 8 })),
      campo('Repite la contraseña', inp('clave2', 'password', 'new-password', { minlength: 8 }))
    ], 'Activar cuenta', function (f) {
      if (val(f, 'clave') !== val(f, 'clave2')) return Promise.reject(new Error('Las contraseñas no coinciden.'));
      return api('invitacion', { token: BOOT.token, clave: val(f, 'clave') });
    });
  }

  // ---------- app ----------
  function cargar() {
    return api('datos').then(function (d) {
      S.yo = d.yo; S.usuarios = d.usuarios; S.proyectos = d.proyectos;
      S.tareas = d.tareas.map(function (t) {
        t.id = +t.id; t.horas_registradas = +t.horas_registradas; t.n_comentarios = +t.n_comentarios; return t;
      });
    });
  }

  var VISTAS = [
    ['inicio', 'Mis tareas', 'inicio'], ['lista', 'Lista', 'lista'], ['tablero', 'Tablero', 'tablero'],
    ['calendario', 'Calendario', 'calendario']
  ];
  var VISTAS_COORD = [['equipo', 'Equipo', 'equipo'], ['proyectos', 'Proyectos', 'proyectos']];

  function ir(v) {
    S.vista = v; try { localStorage.setItem('miiish_vista', v); } catch (e) {}
    pintar(); window.scrollTo(0, 0);
  }

  function pintar() {
    if (!esCoord() && (S.vista === 'equipo' || S.vista === 'proyectos')) S.vista = 'inicio';
    var navItems = VISTAS.concat(esCoord() ? VISTAS_COORD : []);
    function botonNav(v) {
      return h('button', { type: 'button', 'aria-current': S.vista === v[0] ? 'page' : null, onclick: function () { ir(v[0]); } }, ico(v[2]), h('span', null, v[1]));
    }
    var lateral = h('aside', { class: 'lateral' },
      logo('equipo'),
      h('nav', { class: 'nav', 'aria-label': 'Secciones' },
        VISTAS.map(botonNav),
        esCoord() ? [h('div', { class: 'nav-sep' }, 'Coordinación'), VISTAS_COORD.map(botonNav)] : null),
      h('div', { class: 'lateral-pie' }, avatar(S.yo),
        h('div', { class: 'quien' }, h('b', null, S.yo.nombre), h('small', null, esCoord() ? 'Coordinación' : (S.yo.cargo || 'Profesional'))),
        h('button', { type: 'button', title: 'Cambiar contraseña', 'aria-label': 'Cambiar contraseña', onclick: modalClave }, ico('llave')),
        h('button', { type: 'button', title: 'Salir', 'aria-label': 'Salir', onclick: salir }, ico('salir'))));
    var movilTop = h('header', { class: 'movil-top' }, logo(),
      h('button', { type: 'button', 'aria-label': 'Menú', onclick: menuMovil }, ico('menu')));
    var movilNav = h('nav', { class: 'movil-nav', 'aria-label': 'Secciones' }, VISTAS.map(botonNav));
    var principal = h('main', { class: 'principal', id: 'principal' });
    vaciar(raiz);
    raiz.appendChild(h('div', { class: 'app' }, lateral, h('div', null, movilTop, principal), movilNav));
    ({ inicio: vInicio, lista: vLista, tablero: vTablero, calendario: vCalendario, equipo: vEquipo, proyectos: vProyectos }[S.vista] || vInicio)(principal);
  }

  function salir() { api('salir').finally(function () { location.href = location.pathname; }); }

  function menuMovil() {
    var items = [];
    if (esCoord()) items = VISTAS_COORD.map(function (v) { return h('button', { class: 'btn', type: 'button', onclick: function () { cerrar(); ir(v[0]); } }, ico(v[2]), v[1]); });
    var m = modal('Hola, ' + S.yo.nombre.split(' ')[0], h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, items,
      h('button', { class: 'btn', type: 'button', onclick: function () { cerrar(); modalClave(); } }, ico('llave'), 'Cambiar contraseña'),
      h('button', { class: 'btn btn-pri', type: 'button', onclick: salir }, ico('salir'), 'Salir')));
    function cerrar() { m.remove(); }
  }

  function cabeza(pill, titulo, em, acciones) {
    return h('div', { class: 'cabeza' },
      h('div', null, h('span', { class: 'pill' }, pill), h('h1', null, titulo, em ? [' ', h('em', null, em)] : null)),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, acciones || null));
  }
  function botonNueva(pre) {
    return esCoord() ? h('button', { class: 'btn btn-pri', type: 'button', onclick: function () { abrirTarea(0, pre); } }, '+ Nueva tarea') : null;
  }

  function filtros(cont, render, conEstado) {
    var activos = S.proyectos.filter(function (p) { return !+p.archivado; });
    var fp = select([['', 'Todos los proyectos'], ['0', 'Sin proyecto']].concat(activos.map(function (p) { return [String(p.id), p.nombre]; })), S.f.proyecto, { 'aria-label': 'Proyecto' });
    var fu = select([['', 'Todo el equipo']].concat(S.usuarios.filter(function (u) { return +u.activo; }).map(function (u) { return [String(u.id), u.nombre]; })), S.f.persona, { 'aria-label': 'Persona' });
    var fe = conEstado ? select([['', 'Todos los estados'], ['abiertas', 'Sin terminar']].concat(ESTADOS), S.f.estado, { 'aria-label': 'Estado' }) : null;
    var fq = h('input', { class: 'inp', type: 'search', placeholder: 'Buscar tarea…', value: S.f.q, 'aria-label': 'Buscar' });
    fp.onchange = function () { S.f.proyecto = fp.value; render(); };
    fu.onchange = function () { S.f.persona = fu.value; render(); };
    if (fe) fe.onchange = function () { S.f.estado = fe.value; render(); };
    fq.oninput = function () { S.f.q = fq.value; render(); };
    cont.appendChild(h('div', { class: 'filtros' }, fq, fp, fu, fe));
  }
  function filtrar(lista, conEstado) {
    var q = S.f.q.trim().toLowerCase();
    return lista.filter(function (t) {
      if (S.f.proyecto !== '' && String(t.proyecto_id || 0) !== S.f.proyecto) return false;
      if (S.f.persona && String(t.responsable_id) !== S.f.persona) return false;
      if (conEstado && S.f.estado === 'abiertas' && t.estado === 'listo') return false;
      if (conEstado && S.f.estado && S.f.estado !== 'abiertas' && t.estado !== S.f.estado) return false;
      if (q && (t.titulo + ' ' + t.descripcion).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  // ----- Vista: inicio / mis tareas -----
  function vInicio(cont) {
    var primer = S.yo.nombre.split(' ')[0];
    cont.appendChild(cabeza(esCoord() ? 'Coordinación' : (S.yo.cargo || 'Mi espacio'), 'Hola, ' + primer, '¿qué toca hoy?', [botonNueva()]));
    var abiertas = S.tareas.filter(function (t) { return t.estado !== 'listo'; });

    if (esCoord()) {
      var atr = abiertas.filter(function (t) { return t.fecha_entrega && dias(t.fecha_entrega) < 0; }).length;
      var semana = abiertas.filter(function (t) { return t.fecha_entrega && dias(t.fecha_entrega) >= 0 && dias(t.fecha_entrega) <= 7; }).length;
      var sin = abiertas.filter(function (t) { return !t.responsable_id; }).length;
      var hrs = S.tareas.reduce(function (a, t) { return a + t.horas_registradas; }, 0);
      cont.appendChild(h('div', { class: 'resumen' },
        kpi(abiertas.length, 'tareas abiertas'), kpi(atr, 'atrasadas', atr > 0),
        kpi(semana, 'se entregan en 7 días'), kpi(sin, 'sin responsable', sin > 0), kpi(num(hrs), 'horas registradas')));
      cont.appendChild(h('div', { class: 'seccion-t' }, 'Carga del equipo'));
      var carga = h('div', { class: 'carga' });
      S.usuarios.filter(function (u) { return +u.activo; }).forEach(function (u) {
        var suyas = S.tareas.filter(function (t) { return +t.responsable_id === +u.id; });
        var ab = suyas.filter(function (t) { return t.estado !== 'listo'; });
        var at = ab.filter(function (t) { return t.fecha_entrega && dias(t.fecha_entrega) < 0; }).length;
        var barra = h('div', { class: 'barra', 'aria-hidden': 'true' });
        ESTADOS.forEach(function (e) {
          var n = suyas.filter(function (t) { return t.estado === e[0]; }).length;
          if (n) barra.appendChild(h('i', { style: 'width:' + (100 * n / suyas.length) + '%;--e:var(--e-' + e[0] + ')', title: e[1] + ': ' + n }));
        });
        carga.appendChild(h('button', { class: 'carga-p', type: 'button', style: 'text-align:left', onclick: function () { S.f = { proyecto: '', persona: String(u.id), estado: 'abiertas', q: '' }; ir('lista'); } },
          h('span', { class: 'persona' }, avatar(u, true), h('span', null, h('b', null, u.nombre), h('small', null, u.cargo || (u.rol === 'coordinador' ? 'Coordinación' : 'Profesional')))),
          barra,
          h('span', { class: 'carga-n' }, h('span', null, h('b', null, ab.length), ' abiertas'), h('span', null, h('b', { style: at ? 'color:#C9302C' : null }, at), ' atrasadas'), h('span', null, h('b', null, suyas.length - ab.length), ' listas'))));
      });
      cont.appendChild(carga);
    }

    var mias = S.tareas.filter(function (t) { return +t.responsable_id === +S.yo.id; });
    var grupos = [
      ['Atrasadas', mias.filter(function (t) { return t.estado !== 'listo' && t.fecha_entrega && dias(t.fecha_entrega) < 0; })],
      ['Próximos 7 días', mias.filter(function (t) { return t.estado !== 'listo' && t.fecha_entrega && dias(t.fecha_entrega) >= 0 && dias(t.fecha_entrega) <= 7; })],
      ['Más adelante', mias.filter(function (t) { return t.estado !== 'listo' && t.fecha_entrega && dias(t.fecha_entrega) > 7; })],
      ['Sin fecha', mias.filter(function (t) { return t.estado !== 'listo' && !t.fecha_entrega; })],
      ['Terminadas', mias.filter(function (t) { return t.estado === 'listo'; }).slice(-6).reverse()]
    ];
    if (!mias.length) {
      cont.appendChild(h('div', { class: 'seccion-t' }, 'Mis tareas'));
      cont.appendChild(h('div', { class: 'vacio' }, esCoord() ? 'No tienes tareas asignadas a ti. Revisa la Lista o el Tablero para ver las del equipo.' : 'Todavía no tienes tareas asignadas. Mientras, puedes mirar en qué está el equipo en la Lista o el Tablero.'));
      return;
    }
    grupos.forEach(function (g) {
      if (!g[1].length) return;
      cont.appendChild(h('div', { class: 'seccion-t' }, g[0], h('b', null, g[1].length)));
      cont.appendChild(h('div', { class: 'grupo' }, tabla(g[1], false)));
    });
  }
  function kpi(n, txt, alerta) { return h('div', { class: 'kpi' + (alerta ? ' alerta' : '') }, h('b', null, n), h('span', null, txt)); }

  // Tabla de tareas estilo Monday
  function tabla(lista, conNueva, pre) {
    var t = h('div', { class: 'tabla', role: 'table' },
      h('div', { class: 'tf cab', role: 'row' }, ['Tarea', 'Responsable', 'Estado', 'Prioridad', 'Entrega', 'Horas'].map(function (x) { return h('div', { role: 'columnheader' }, x); })));
    lista.forEach(function (x) {
      var p = proyecto(x.proyecto_id);
      t.appendChild(h('div', { class: 'tf fila-t', role: 'row', tabindex: '0', style: '--c:' + colorTarea(x),
        onclick: function () { abrirTarea(x.id); },
        onkeydown: function (ev) { if (ev.key === 'Enter') abrirTarea(x.id); } },
        h('div', { class: 'c-tit t-tit', role: 'cell' }, h('span', null, x.titulo), x.n_comentarios ? h('span', { class: 'mini', title: 'Comentarios' }, '💬 ' + x.n_comentarios) : null,
          !S.f.proyecto && p && !conNueva ? h('span', { class: 'mini' }, '· ' + p.nombre) : null),
        h('div', { class: 'c-resp', role: 'cell' }, persona(usuario(x.responsable_id))),
        h('div', { class: 'c-est', role: 'cell' }, estadoPill(x.estado)),
        h('div', { class: 'c-prio', role: 'cell' }, prioPill(x.prioridad)),
        h('div', { class: 'c-fecha', role: 'cell' }, vencePill(x)),
        h('div', { class: 'c-hrs horas', role: 'cell' }, num(x.horas_registradas) + (x.horas_estimadas ? ' / ' + num(x.horas_estimadas) : '') + ' h')));
    });
    if (conNueva && esCoord()) t.appendChild(h('button', { class: 'nueva-fila', type: 'button', onclick: function () { abrirTarea(0, pre); } }, '+ Agregar tarea'));
    return t;
  }

  // ----- Vista: lista agrupada por proyecto -----
  function vLista(cont) {
    cont.appendChild(cabeza('Todo el equipo', 'Lista', 'por proyecto', [botonNueva()]));
    var zona = h('div');
    filtros(cont, pintarZona, true);
    cont.appendChild(zona);
    function pintarZona() {
      vaciar(zona);
      var lista = filtrar(S.tareas, true);
      var grupos = S.proyectos.filter(function (p) { return !+p.archivado; }).map(function (p) { return [p, lista.filter(function (t) { return +t.proyecto_id === +p.id; })]; });
      grupos.push([null, lista.filter(function (t) { var p = proyecto(t.proyecto_id); return !p || +p.archivado; })]);
      var algo = false;
      grupos.forEach(function (g) {
        if (!g[1].length && (S.f.q || S.f.persona || S.f.estado || !g[0] || (S.f.proyecto && S.f.proyecto !== String(g[0].id)))) return;
        algo = true;
        var p = g[0];
        zona.appendChild(h('section', { class: 'grupo' },
          h('h2', { class: 'grupo-cab', style: '--c:' + (p ? p.color : '#DADAD3') }, h('i'), p ? p.nombre : 'Sin proyecto', p && p.cliente ? h('small', null, p.cliente) : null, h('small', null, '· ' + g[1].length)),
          tabla(g[1], true, { proyecto_id: p ? p.id : '' })));
      });
      if (!algo) zona.appendChild(h('div', { class: 'vacio' }, S.tareas.length ? 'No hay tareas con estos filtros.' : (esCoord() ? 'Aún no hay tareas. Crea un proyecto y agrega la primera.' : 'Aún no hay tareas.')));
    }
    pintarZona();
  }

  // ----- Vista: tablero kanban -----
  function vTablero(cont) {
    cont.appendChild(cabeza('Por estado', 'Tablero', 'del equipo', [botonNueva()]));
    var zona = h('div');
    filtros(cont, pintarZona, false);
    cont.appendChild(zona);
    function pintarZona() {
      vaciar(zona);
      var lista = filtrar(S.tareas, false);
      var k = h('div', { class: 'kanban' });
      ESTADOS.forEach(function (e) {
        var suyas = lista.filter(function (t) { return t.estado === e[0]; });
        if (e[0] === 'listo') suyas = suyas.slice(-25);
        var col = h('section', { class: 'col', 'aria-label': e[1] },
          h('div', { class: 'col-cab' }, estadoPill(e[0]), h('b', null, suyas.length)));
        col.addEventListener('dragover', function (ev) { ev.preventDefault(); col.classList.add('sobre'); });
        col.addEventListener('dragleave', function () { col.classList.remove('sobre'); });
        col.addEventListener('drop', function (ev) {
          ev.preventDefault(); col.classList.remove('sobre');
          var id = +ev.dataTransfer.getData('text/plain'); var t = S.tareas.filter(function (x) { return x.id === id; })[0];
          if (t && t.estado !== e[0]) cambiarEstado(t, e[0], pintarZona);
        });
        suyas.forEach(function (t) {
          var p = proyecto(t.proyecto_id), mover = puedeTrabajar(t);
          var card = h('article', { class: 'tarj', tabindex: '0', draggable: mover ? 'true' : null, style: '--c:' + colorTarea(t),
            onclick: function () { abrirTarea(t.id); }, onkeydown: function (ev) { if (ev.key === 'Enter') abrirTarea(t.id); } },
            p ? h('span', { class: 'tarj-p' }, p.nombre) : null,
            h('span', { class: 'tarj-t' }, t.titulo),
            h('div', { class: 'tarj-pie' }, persona(usuario(t.responsable_id)),
              h('span', { class: 'tarj-meta' }, t.n_comentarios ? '💬 ' + t.n_comentarios : null, vencePill(t))));
          if (mover) card.addEventListener('dragstart', function (ev) { ev.dataTransfer.setData('text/plain', String(t.id)); });
          col.appendChild(card);
        });
        k.appendChild(col);
      });
      zona.appendChild(k);
    }
    pintarZona();
  }

  function cambiarEstado(t, estado, despues) {
    var antes = t.estado; t.estado = estado; if (despues) despues();
    return api('tarea_estado', { id: t.id, estado: estado }).then(function () { aviso('Estado: ' + etiqueta(ESTADOS, estado)); })
      .catch(function (e) { t.estado = antes; if (despues) despues(); aviso(e.message, true); });
  }

  // ----- Vista: calendario de entregas -----
  function vCalendario(cont) {
    if (!S.mes) { var d = new Date(); S.mes = new Date(d.getFullYear(), d.getMonth(), 1); }
    var tit = h('b');
    cont.appendChild(cabeza('Entregas', 'Calendario', 'de entregas', [
      h('div', { class: 'cal-nav' },
        h('button', { class: 'btn btn-chico', type: 'button', 'aria-label': 'Mes anterior', onclick: function () { S.mes = new Date(S.mes.getFullYear(), S.mes.getMonth() - 1, 1); pintarZona(); } }, '←'),
        tit,
        h('button', { class: 'btn btn-chico', type: 'button', 'aria-label': 'Mes siguiente', onclick: function () { S.mes = new Date(S.mes.getFullYear(), S.mes.getMonth() + 1, 1); pintarZona(); } }, '→'),
        h('button', { class: 'btn btn-chico', type: 'button', onclick: function () { var d = new Date(); S.mes = new Date(d.getFullYear(), d.getMonth(), 1); pintarZona(); } }, 'Hoy'))]));
    var zona = h('div');
    filtros(cont, pintarZona, true);
    cont.appendChild(zona);
    function pintarZona() {
      vaciar(zona);
      tit.textContent = MESES[S.mes.getMonth()] + ' ' + S.mes.getFullYear();
      var lista = filtrar(S.tareas, true).filter(function (t) { return t.fecha_entrega; });
      var porDia = {};
      lista.forEach(function (t) { (porDia[t.fecha_entrega] = porDia[t.fecha_entrega] || []).push(t); });
      var cal = h('div', { class: 'cal' });
      DIAS.forEach(function (d) { cal.appendChild(h('div', { class: 'cal-dn' }, d)); });
      var inicio = new Date(S.mes); var desfase = (inicio.getDay() + 6) % 7; inicio.setDate(1 - desfase);
      var hoy = hoyISO();
      for (var i = 0; i < 42; i++) {
        var d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
        if (i >= 35 && d.getMonth() !== S.mes.getMonth()) break;
        var k = iso(d);
        var celda = h('div', { class: 'cal-d' + (d.getMonth() !== S.mes.getMonth() ? ' fuera' : '') + (k === hoy ? ' hoy' : '') },
          h('span', { class: 'cal-n' }, d.getDate()));
        (porDia[k] || []).forEach(function (t) {
          var u = usuario(t.responsable_id);
          celda.appendChild(h('button', { class: 'cal-t' + (t.estado === 'listo' ? ' listo' : ''), type: 'button', style: '--c:' + colorTarea(t),
            title: t.titulo + (u ? ' · ' + u.nombre : ''), onclick: (function (id) { return function () { abrirTarea(id); }; })(t.id) },
            (u ? iniciales(u.nombre) + ' · ' : '') + t.titulo));
        });
        cal.appendChild(celda);
      }
      zona.appendChild(cal);
    }
    pintarZona();
  }

  // ----- Detalle de tarea (cajón lateral) -----
  function abrirTarea(id, pre) {
    S.abierta = id;
    var velo = h('div', { class: 'velo', onclick: cerrar });
    var cuerpo = h('div', { class: 'cajon-cuerpo' }, h('p', { style: 'color:var(--gris)' }, 'Cargando…'));
    var cajon = h('aside', { class: 'cajon', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Detalle de la tarea' },
      h('div', { class: 'cajon-cab' }, h('span', { class: 'solo-mirar', id: 'cajon-etq' }, id ? 'Tarea #' + id : 'Nueva tarea'),
        h('button', { class: 'btn btn-chico', type: 'button', onclick: cerrar, 'aria-label': 'Cerrar' }, ico('cerrar'))),
      cuerpo);
    function tecla(ev) { if (ev.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', tecla);
    document.body.appendChild(velo); document.body.appendChild(cajon);
    document.body.style.overflow = 'hidden';
    function cerrar() {
      velo.remove(); cajon.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', tecla); S.abierta = 0;
    }
    function refrescar() { return cargar().then(function () { pintar(); }); }

    if (!id) { formularioTarea(cuerpo, Object.assign({ titulo: '', descripcion: '', estado: 'por_hacer', prioridad: 'media' }, pre || {}), cerrar, refrescar); return; }

    api('tarea_detalle', { id: id }).then(function (d) {
      var t = d.tarea; vaciar(cuerpo);
      if (esCoord()) { formularioTarea(cuerpo, t, cerrar, refrescar); }
      else { fichaTarea(cuerpo, t, refrescar); }
      cuerpo.appendChild(bloqueComentarios(t, d.comentarios, function () { recargarDetalle(); }));
      cuerpo.appendChild(bloqueHoras(t, d.horas, function () { recargarDetalle(); }));
    }).catch(function (e) { vaciar(cuerpo); cuerpo.appendChild(h('p', { class: 'aviso' }, e.message)); });

    function recargarDetalle() { cerrar(); refrescar().then(function () { abrirTarea(id); }); }
  }

  function fichaTarea(cuerpo, t, refrescar) {
    var mia = puedeTrabajar(t), p = proyecto(t.proyecto_id);
    document.getElementById('cajon-etq').textContent = mia ? 'Tarea asignada a ti' : '👁 Solo lectura';
    var est = mia ? select(ESTADOS, t.estado, { 'aria-label': 'Estado', style: 'max-width:220px' }) : estadoPill(t.estado);
    if (mia) est.onchange = function () { var x = S.tareas.filter(function (y) { return y.id === t.id; })[0] || t; cambiarEstado(x, est.value, function () {}).then(refrescar); };
    cuerpo.appendChild(h('h2', null, t.titulo));
    cuerpo.appendChild(h('dl', { class: 'datos' },
      h('dt', null, 'Proyecto'), h('dd', null, p ? p.nombre : 'Sin proyecto'),
      h('dt', null, 'Responsable'), h('dd', null, persona(usuario(t.responsable_id))),
      h('dt', null, 'Estado'), h('dd', null, est),
      h('dt', null, 'Prioridad'), h('dd', null, prioPill(t.prioridad)),
      h('dt', null, 'Inicio'), h('dd', null, t.fecha_inicio ? fechaCorta(t.fecha_inicio) : '—'),
      h('dt', null, 'Entrega'), h('dd', null, vencePill(t)),
      h('dt', null, 'Horas est.'), h('dd', null, t.horas_estimadas ? num(t.horas_estimadas) + ' h' : '—')));
    if (t.descripcion) cuerpo.appendChild(h('div', { class: 'desc' }, t.descripcion));
  }

  function formularioTarea(cuerpo, t, cerrar, refrescar) {
    vaciar(cuerpo);
    var proys = [['', 'Sin proyecto']].concat(S.proyectos.filter(function (p) { return !+p.archivado || +p.id === +t.proyecto_id; }).map(function (p) { return [String(p.id), p.nombre]; }));
    var pers = [['', 'Sin asignar']].concat(S.usuarios.filter(function (u) { return +u.activo || +u.id === +t.responsable_id; }).map(function (u) { return [String(u.id), u.nombre]; }));
    var f = h('form', { style: 'display:flex;flex-direction:column;gap:14px', onsubmit: function (ev) {
      ev.preventDefault(); btn.disabled = true;
      var datos = {};
      ['titulo', 'descripcion', 'proyecto_id', 'responsable_id', 'estado', 'prioridad', 'fecha_inicio', 'fecha_entrega', 'horas_estimadas'].forEach(function (k) { datos[k] = f.elements[k].value; });
      if (t.id) datos.id = t.id;
      api('tarea_guardar', datos).then(function (r) {
        aviso(t.id ? 'Cambios guardados' : 'Tarea creada');
        cerrar(); refrescar().then(function () { if (!t.id) abrirTarea(r.id); });
      }).catch(function (e) { aviso(e.message, true); btn.disabled = false; });
    } },
      campo('Título', h('input', { class: 'inp', name: 'titulo', required: true, maxlength: 160, value: t.titulo, style: 'font-weight:600;font-size:17px' })),
      h('div', { class: 'fila' },
        campo('Proyecto', select(proys, t.proyecto_id || '', { name: 'proyecto_id' })),
        campo('Responsable', select(pers, t.responsable_id || '', { name: 'responsable_id' }))),
      h('div', { class: 'fila' },
        campo('Estado', select(ESTADOS, t.estado, { name: 'estado' })),
        campo('Prioridad', select(PRIOS, t.prioridad, { name: 'prioridad' }))),
      h('div', { class: 'fila' },
        campo('Inicio', h('input', { class: 'inp', type: 'date', name: 'fecha_inicio', value: t.fecha_inicio || '' })),
        campo('Entrega', h('input', { class: 'inp', type: 'date', name: 'fecha_entrega', value: t.fecha_entrega || '' })),
        campo('Horas estimadas', h('input', { class: 'inp', type: 'number', name: 'horas_estimadas', min: '0', step: '0.25', value: t.horas_estimadas || '' }))),
      campo('Descripción', h('textarea', { class: 'inp', name: 'descripcion', maxlength: 5000, placeholder: 'Qué hay que hacer, links, referencias…' }, t.descripcion || '')));
    var btn = h('button', { class: 'btn btn-pri', type: 'submit' }, t.id ? 'Guardar cambios' : 'Crear tarea');
    var pie = h('div', { class: 'modal-pie' },
      t.id ? h('button', { class: 'btn btn-peligro izq', type: 'button', onclick: function () {
        if (borrarConfirm.hidden) { borrarConfirm.hidden = false; return; }
      } }, 'Eliminar') : null, btn);
    var borrarConfirm = h('div', { class: 'aviso', hidden: true, style: 'display:flex;gap:10px;align-items:center;justify-content:space-between' },
      '¿Eliminar esta tarea con sus comentarios y horas?',
      h('button', { class: 'btn btn-chico btn-peligro', type: 'button', onclick: function () {
        api('tarea_eliminar', { id: t.id }).then(function () { aviso('Tarea eliminada'); cerrar(); refrescar(); }).catch(function (e) { aviso(e.message, true); });
      } }, 'Sí, eliminar'));
    f.appendChild(pie); f.appendChild(borrarConfirm);
    cuerpo.appendChild(f);
    if (!t.id) f.elements.titulo.focus();
  }

  function bloqueComentarios(t, lista, recargar) {
    var mia = puedeTrabajar(t);
    var b = h('section', { class: 'bloque' }, h('h3', null, 'Comentarios', h('span', null, lista.length)));
    if (!lista.length) b.appendChild(h('p', { style: 'color:var(--gris);margin:0 0 12px' }, 'Sin comentarios todavía.'));
    lista.forEach(function (c) {
      var u = usuario(c.usuario_id);
      var borrar = (esCoord() || +c.usuario_id === +S.yo.id) ? h('button', { class: 'btn-txt', type: 'button', onclick: function () {
        api('comentario_eliminar', { id: c.id }).then(recargar).catch(function (e) { aviso(e.message, true); });
      } }, 'Borrar') : null;
      b.appendChild(h('div', { class: 'coment' }, avatar(u),
        h('div', { class: 'coment-c' }, h('header', null, h('b', null, u ? u.nombre : 'Alguien'), h('span', null, fechaHora(+c.creado), ' ', borrar)), h('p', null, c.texto))));
    });
    if (mia) {
      var ta = h('textarea', { class: 'inp', placeholder: 'Escribe un comentario o una actualización…', maxlength: 3000, style: 'min-height:70px', 'aria-label': 'Nuevo comentario' });
      var btn = h('button', { class: 'btn btn-pri', type: 'submit' }, 'Enviar');
      b.appendChild(h('form', { class: 'form-linea', onsubmit: function (ev) {
        ev.preventDefault(); if (!ta.value.trim()) return; btn.disabled = true;
        api('comentario_agregar', { tarea_id: t.id, texto: ta.value }).then(recargar).catch(function (e) { aviso(e.message, true); btn.disabled = false; });
      } }, ta, btn));
    }
    return b;
  }

  function bloqueHoras(t, lista, recargar) {
    var mia = puedeTrabajar(t);
    var total = lista.reduce(function (a, x) { return a + (+x.horas); }, 0);
    var b = h('section', { class: 'bloque' }, h('h3', null, 'Tiempo registrado', h('span', null, num(total) + (t.horas_estimadas ? ' de ' + num(t.horas_estimadas) : '') + ' h')));
    if (lista.length) {
      var tb = h('table', { class: 'hrs' });
      lista.forEach(function (x) {
        var u = usuario(x.usuario_id);
        var borrar = (esCoord() || +x.usuario_id === +S.yo.id) ? h('button', { class: 'btn-txt', type: 'button', 'aria-label': 'Borrar registro', onclick: function () {
          api('horas_eliminar', { id: x.id }).then(recargar).catch(function (e) { aviso(e.message, true); });
        } }, '×') : null;
        tb.appendChild(h('tr', null, h('td', { class: 'n' }, fechaCorta(x.fecha)), h('td', null, u ? u.nombre.split(' ')[0] : ''), h('td', null, x.nota), h('td', { class: 'n' }, num(x.horas) + ' h'), h('td', null, borrar)));
      });
      b.appendChild(tb);
    } else b.appendChild(h('p', { style: 'color:var(--gris);margin:0' }, 'Nadie ha registrado horas aún.'));
    if (mia) {
      var f = h('form', { class: 'hrs-form', onsubmit: function (ev) {
        ev.preventDefault();
        api('horas_agregar', { tarea_id: t.id, fecha: f.elements.fecha.value, horas: f.elements.horas.value, nota: f.elements.nota.value })
          .then(function () { aviso('Horas registradas'); recargar(); }).catch(function (e) { aviso(e.message, true); });
      } },
        h('input', { class: 'inp', type: 'date', name: 'fecha', value: hoyISO(), 'aria-label': 'Fecha' }),
        h('input', { class: 'inp', type: 'number', name: 'horas', min: '0.25', max: '24', step: '0.25', placeholder: 'Horas', required: true, 'aria-label': 'Horas' }),
        h('input', { class: 'inp', type: 'text', name: 'nota', maxlength: 200, placeholder: 'Qué hiciste (opcional)', 'aria-label': 'Nota' }),
        h('button', { class: 'btn', type: 'submit' }, 'Registrar'));
      b.appendChild(f);
    }
    return b;
  }

  // ----- Modales -----
  function modal(titulo, contenido, pie) {
    var m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, onclick: function (ev) { if (ev.target === m) m.remove(); } },
      h('div', { class: 'modal-c' }, h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px' }, h('h2', null, titulo),
        h('button', { class: 'btn btn-chico', type: 'button', 'aria-label': 'Cerrar', onclick: function () { m.remove(); } }, ico('cerrar'))), contenido, pie || null));
    m.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') m.remove(); });
    document.body.appendChild(m);
    var i = m.querySelector('input,textarea'); if (i) i.focus();
    return m;
  }

  function modalClave() {
    var err = h('p', { class: 'aviso', hidden: true });
    var f = h('form', { style: 'display:flex;flex-direction:column;gap:12px', onsubmit: function (ev) {
      ev.preventDefault();
      if (f.elements.nueva.value !== f.elements.nueva2.value) { err.textContent = 'Las contraseñas nuevas no coinciden.'; err.hidden = false; return; }
      api('clave_cambiar', { actual: f.elements.actual.value, nueva: f.elements.nueva.value })
        .then(function () { m.remove(); aviso('Contraseña actualizada'); })
        .catch(function (e) { err.textContent = e.message; err.hidden = false; });
    } },
      campo('Contraseña actual', inp('actual', 'password', 'current-password')),
      campo('Nueva contraseña (mínimo 8)', inp('nueva', 'password', 'new-password', { minlength: 8 })),
      campo('Repite la nueva', inp('nueva2', 'password', 'new-password', { minlength: 8 })), err,
      h('div', { class: 'modal-pie' }, h('button', { class: 'btn btn-pri', type: 'submit' }, 'Cambiar contraseña')));
    var m = modal('Cambiar contraseña', f);
  }

  function selectorColor(nombre, actual) {
    return h('div', { class: 'colores', role: 'radiogroup', 'aria-label': 'Color' }, COLORES.map(function (c) {
      return h('label', null, h('input', { type: 'radio', name: nombre, value: c, checked: c === actual, 'aria-label': c }), h('i', { style: '--c:' + c }));
    }));
  }

  function mostrarEnlace(u, enlace) {
    var copiar = h('button', { class: 'btn btn-chico', type: 'button', onclick: function () {
      if (navigator.clipboard) navigator.clipboard.writeText(enlace).then(function () { aviso('Enlace copiado'); });
    } }, 'Copiar');
    var msj = 'Hola ' + u.nombre.split(' ')[0] + ', te creé tu cuenta en el sistema de tareas de ¡Miiish!. Entra a este enlace y elige tu contraseña (vence en 7 días): ' + enlace;
    modal('Enlace para ' + u.nombre, h('div', { style: 'display:flex;flex-direction:column;gap:12px' },
      h('p', { style: 'margin:0' }, 'Envíale este enlace. Con él elige su contraseña y entra. Vence en 7 días y sirve una sola vez.'),
      h('div', { class: 'enlace' }, h('span', { style: 'flex:1' }, enlace), copiar),
      h('a', { class: 'btn btn-lima', href: 'https://wa.me/?text=' + encodeURIComponent(msj), target: '_blank', rel: 'noopener' }, 'Enviar por WhatsApp')));
  }

  // ----- Vista: equipo (coordinación) -----
  function vEquipo(cont) {
    cont.appendChild(cabeza('Coordinación', 'Equipo', 'y accesos', [
      h('button', { class: 'btn btn-pri', type: 'button', onclick: function () { modalUsuario({}); } }, '+ Agregar persona')]));
    var g = h('div', { class: 'tarjetas' });
    S.usuarios.forEach(function (u) {
      var abiertas = S.tareas.filter(function (t) { return +t.responsable_id === +u.id && t.estado !== 'listo'; }).length;
      g.appendChild(h('article', { class: 'ficha' + (+u.activo ? '' : ' off') },
        h('header', null, avatar(u, true), h('div', null, h('b', null, u.nombre), h('small', null, u.cargo || '—'))),
        h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
          h('span', { class: 'etq' + (u.rol === 'coordinador' ? ' coord' : '') }, u.rol === 'coordinador' ? 'Coordinación' : 'Profesional'),
          !+u.con_clave ? h('span', { class: 'etq pend' }, 'Invitación pendiente') : null,
          !+u.activo ? h('span', { class: 'etq' }, 'Desactivada') : null),
        h('div', { class: 'meta' }, h('span', null, u.email), h('span', null, abiertas + (abiertas === 1 ? ' tarea abierta' : ' tareas abiertas')),
          h('span', null, u.ultimo_acceso ? 'Último acceso: ' + fechaHora(+u.ultimo_acceso) : 'Aún no entra')),
        h('div', { class: 'acc' },
          h('button', { class: 'btn btn-chico', type: 'button', onclick: function () { modalUsuario(u); } }, 'Editar'),
          h('button', { class: 'btn btn-chico', type: 'button', onclick: function () {
            api('usuario_enlace', { id: u.id }).then(function (r) { mostrarEnlace(u, r.enlace); }).catch(function (e) { aviso(e.message, true); });
          } }, +u.con_clave ? 'Enlace para nueva clave' : 'Nuevo enlace'),
          +u.id !== +S.yo.id ? h('button', { class: 'btn btn-chico' + (+u.activo ? ' btn-peligro' : ''), type: 'button', onclick: function () {
            api('usuario_activo', { id: u.id, activo: +u.activo ? 0 : 1 }).then(function () { return cargar(); }).then(pintar).catch(function (e) { aviso(e.message, true); });
          } }, +u.activo ? 'Desactivar' : 'Reactivar') : null)));
    });
    cont.appendChild(g);
  }

  function modalUsuario(u) {
    var err = h('p', { class: 'aviso', hidden: true });
    var f = h('form', { style: 'display:flex;flex-direction:column;gap:12px', onsubmit: function (ev) {
      ev.preventDefault();
      var d = { nombre: f.elements.nombre.value, email: f.elements.email.value, cargo: f.elements.cargo.value, rol: f.elements.rol.value, color: (f.querySelector('input[name=color]:checked') || {}).value };
      if (u.id) d.id = u.id;
      api('usuario_guardar', d).then(function (r) {
        m.remove(); return cargar().then(function () { pintar(); if (r.enlace) mostrarEnlace(d, r.enlace); else aviso('Datos guardados'); });
      }).catch(function (e) { err.textContent = e.message; err.hidden = false; });
    } },
      h('div', { class: 'fila' },
        campo('Nombre', h('input', { class: 'inp', name: 'nombre', required: true, value: u.nombre || '', autocomplete: 'off' })),
        campo('Correo', h('input', { class: 'inp', name: 'email', type: 'email', required: true, value: u.email || '', autocomplete: 'off' }))),
      h('div', { class: 'fila' },
        campo('Cargo', h('input', { class: 'inp', name: 'cargo', value: u.cargo || '', placeholder: 'Ej: Diseñadora, Editor de video' })),
        campo('Acceso', select([['profesional', 'Profesional (ve todo, trabaja lo suyo)'], ['coordinador', 'Coordinación (gestiona todo)']], u.rol || 'profesional', { name: 'rol' }))),
      campo('Color', selectorColor('color', u.color || COLORES[S.usuarios.length % COLORES.length])),
      err,
      h('div', { class: 'modal-pie' }, h('button', { class: 'btn btn-pri', type: 'submit' }, u.id ? 'Guardar' : 'Crear y generar enlace')));
    var m = modal(u.id ? 'Editar persona' : 'Agregar persona', f);
  }

  // ----- Vista: proyectos (coordinación) -----
  function vProyectos(cont) {
    cont.appendChild(cabeza('Coordinación', 'Proyectos', 'y clientes', [
      h('button', { class: 'btn btn-pri', type: 'button', onclick: function () { modalProyecto({}); } }, '+ Nuevo proyecto')]));
    if (!S.proyectos.length) { cont.appendChild(h('div', { class: 'vacio' }, 'Crea tu primer proyecto para ordenar las tareas por cliente.')); return; }
    var g = h('div', { class: 'tarjetas' });
    S.proyectos.forEach(function (p) {
      var ts = S.tareas.filter(function (t) { return +t.proyecto_id === +p.id; });
      var listas = ts.filter(function (t) { return t.estado === 'listo'; }).length;
      var hrs = ts.reduce(function (a, t) { return a + t.horas_registradas; }, 0);
      g.appendChild(h('article', { class: 'ficha' + (+p.archivado ? ' off' : ''), style: 'border-left:6px solid ' + p.color },
        h('header', null, h('div', null, h('b', null, p.nombre), h('small', null, p.cliente || 'Sin cliente'))),
        +p.archivado ? h('span', { class: 'etq' }, 'Archivado') : null,
        h('div', { class: 'barra', 'aria-hidden': 'true' }, h('i', { style: 'width:' + (ts.length ? 100 * listas / ts.length : 0) + '%;--e:var(--negro)' })),
        h('div', { class: 'meta' }, h('span', null, listas + ' de ' + ts.length + ' tareas listas'), h('span', null, num(hrs) + ' horas registradas')),
        h('div', { class: 'acc' },
          h('button', { class: 'btn btn-chico', type: 'button', onclick: function () { S.f = { proyecto: String(p.id), persona: '', estado: '', q: '' }; ir('lista'); } }, 'Ver tareas'),
          h('button', { class: 'btn btn-chico', type: 'button', onclick: function () { modalProyecto(p); } }, 'Editar'))));
    });
    cont.appendChild(g);
  }

  function modalProyecto(p) {
    var err = h('p', { class: 'aviso', hidden: true });
    var f = h('form', { style: 'display:flex;flex-direction:column;gap:12px', onsubmit: function (ev) {
      ev.preventDefault();
      var d = { nombre: f.elements.nombre.value, cliente: f.elements.cliente.value, color: (f.querySelector('input[name=pcolor]:checked') || {}).value, archivado: f.elements.archivado && f.elements.archivado.checked ? 1 : 0 };
      if (p.id) d.id = p.id;
      api('proyecto_guardar', d).then(function () { m.remove(); aviso('Proyecto guardado'); return cargar(); }).then(pintar)
        .catch(function (e) { err.textContent = e.message; err.hidden = false; });
    } },
      h('div', { class: 'fila' },
        campo('Nombre del proyecto', h('input', { class: 'inp', name: 'nombre', required: true, value: p.nombre || '', placeholder: 'Ej: Lanzamiento tienda online' })),
        campo('Cliente', h('input', { class: 'inp', name: 'cliente', value: p.cliente || '' }))),
      campo('Color', selectorColor('pcolor', p.color || COLORES[S.proyectos.length % COLORES.length])),
      p.id ? h('label', { style: 'display:flex;gap:8px;align-items:center' }, h('input', { type: 'checkbox', name: 'archivado', checked: !!+p.archivado }), 'Archivar (se oculta de la lista y los filtros)') : null,
      err,
      h('div', { class: 'modal-pie' }, h('button', { class: 'btn btn-pri', type: 'submit' }, 'Guardar')));
    var m = modal(p.id ? 'Editar proyecto' : 'Nuevo proyecto', f);
  }

  // ---------- arranque ----------
  if (BOOT.pantalla === 'setup') vistaSetup();
  else if (BOOT.pantalla === 'invitacion') vistaInvitacion();
  else if (BOOT.pantalla === 'app') {
    raiz.appendChild(h('p', { style: 'padding:40px;font-family:var(--t-mono)' }, 'Cargando…'));
    cargar().then(pintar).catch(function (e) { vaciar(raiz); raiz.appendChild(h('p', { class: 'aviso', style: 'margin:40px' }, e.message)); });
  } else vistaLogin();
})();
