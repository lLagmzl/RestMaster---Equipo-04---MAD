// RestMaster - Sprint 2 (avance)
// Sprint 1: HU1 Iniciar sesion - HU3 Menu por rol - HU4 Plano de mesas y estados
// Sprint 2: HU6 Registrar reserva + administracion de mesas (agregar, capacidad, estado, eliminar y mover)
import { iniciarDB, onCambio, modo } from './db.js';
import { Auth } from './auth.js';
import { Mesas, Reservas, validar } from './mesas.js';
import { CONFIG, TW, TH, MW, MH } from './config.js';
import { pad, hoyISO, esc, fechaValida } from './util.js';

/* ---------- Atajos y variables generales ---------- */

// Atajo para document.querySelector
const $ = s => document.querySelector(s);

// Ruta de una imagen de assets/img (todas son .png)
const img = n => `assets/img/${n}.png`;

// Convierte una medida en pixeles a porcentaje (para que el plano sea responsivo)
const pc = (v, t) => (v / t * 100).toFixed(3) + '%';

// Nombre del estado que se muestra en pantalla
const ETQ = {
  disponible: 'Disponible',
  reservada: 'Reservada',
  ocupada: 'Ocupada',
  fuera: 'Fuera de servicio'
};

// Hora actual redondeada, entre las 07:00 y las 14:00
const horaAhora = () => pad(Math.min(14, Math.max(7, new Date().getHours()))) + ':00';

// Estado de la pantalla: fecha y hora que se ven, mesa seleccionada, filtro activo y si esta procesando algo
// dist = modo mover mesas - nueva = mesa que se esta configurando - moverListo = mesa recien creada
const estado = {
  vFecha: hoyISO(),
  vHora: horaAhora(),
  sel: null,
  filtro: 'todas',
  ocupado: false,
  dist: false,
  nueva: null,
  moverListo: null
};

// Revisa si el usuario con sesion tiene cierto permiso
const perm = k => {
  const s = Auth.actual();
  return !!(s && s[k]);
};
const puede = () => perm('puedeReservar');

// Muestra la pantalla de login o la del sistema
const mostrar = v => {
  $('#login').hidden = v !== 'login';
  $('#app').hidden = v !== 'app';
};

/* ---------- Avisos y dialogos ---------- */

// Mensaje emergente que se quita solo a los 5 segundos
function toast(msg, tipo = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = msg;
  t.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 5000);
}

// Ventana emergente (modal) y la funcion que se usa para cerrarla con Esc
let cierreModal = null;

function abrirModal(html) {
  $('#modal').innerHTML = html;
  $('#overlay').hidden = false;
  const f = $('#modal').querySelector('input:not([readonly]),select,button');
  if (f) f.focus();
}

function cerrarModal() {
  $('#overlay').hidden = true;
  $('#modal').innerHTML = '';
  cierreModal = null;
}

// Cuadro de confirmacion con botones Si / No. Regresa true si elige Si
function confirmar(titulo, msg) {
  return new Promise(res => {
    $('#confirmBox').innerHTML = `<h3>${esc(titulo)}</h3><p>${esc(msg)}</p><div class="acciones"><button class="si" id="cSi" type="button">Si</button><button class="no2" id="cNo" type="button">No</button></div>`;
    $('#overlay2').hidden = false;
    $('#cNo').focus();

    const fin = v => {
      $('#overlay2').hidden = true;
      res(v);
    };
    $('#cSi').onclick = () => fin(true);
    $('#cNo').onclick = () => fin(false);
  });
}

/* ---------- HU1 - Login ---------- */
function iniciarLogin() {
  // Iconos del ojo para mostrar / ocultar la contrasena
  const OJO_ABIERTO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>');
  const OJO_CERRADO = $('#ojo').getAttribute('src');

  // Boton del ojo: cambia el campo entre password y texto
  $('#verClave').onclick = e => {
    const i = $('#clave');
    const ver = i.type === 'password';
    i.type = ver ? 'text' : 'password';
    $('#ojo').src = ver ? OJO_ABIERTO : OJO_CERRADO;
    e.currentTarget.setAttribute('aria-pressed', ver);
    e.currentTarget.setAttribute('aria-label', ver ? 'Ocultar contrasena' : 'Mostrar contrasena');
  };

  // Al enviar el formulario se validan los campos y se intenta iniciar sesion
  $('#formLogin').onsubmit = async ev => {
    ev.preventDefault();
    if (estado.ocupado) return;

    const u = $('#usuario').value;
    const p = $('#clave').value;

    // Mensajes de campos vacios
    $('#errUsuario').textContent = u.trim() ? '' : 'Escribe tu usuario.';
    $('#errClave').textContent = p ? '' : 'Escribe tu contrasena.';
    $('#errLogin').textContent = '';
    if (!u.trim() || !p) return;

    // Se bloquea el boton mientras se valida
    estado.ocupado = true;
    $('#btnLogin').disabled = true;
    $('#btnLogin').textContent = 'VALIDANDO...';

    let s = null;
    try {
      s = await Auth.login(u, p);
    } catch (e) {
      toast(e.message, 'error');
    }

    estado.ocupado = false;
    $('#btnLogin').disabled = false;
    $('#btnLogin').textContent = 'INGRESAR';

    // Usuario o contrasena incorrectos
    if (!s) {
      $('#errLogin').textContent = 'Usuario o contrasena incorrectos.';
      toast('Usuario o contrasena incorrectos.', 'error');
      $('#clave').value = '';
      $('#clave').focus();
      return;
    }

    // Acceso correcto
    $('#formLogin').reset();
    entrarApp(s);
    toast('Acceso correcto! Bienvenido.', 'exito');
  };
}

/* ---------- HU3 - Menu por rol ---------- */

// Prepara la pantalla del sistema segun el usuario que inicio sesion
function entrarApp(s) {
  mostrar('app');

  // Avatar, nombre y rol en el encabezado
  $('#avatar').src = s.img;
  $('#rol').textContent = `${s.nombre} - ${s.rol.toUpperCase()}`;

  // Fecha de hoy
  const f = new Date();
  const dia = f.toLocaleDateString('es-MX', { weekday: 'long' });
  const mes = f.toLocaleDateString('es-MX', { month: 'long' });
  $('#fechaHoy').textContent = `Hoy es ${dia} ${f.getDate()} de ${mes} de ${f.getFullYear()}`;

  // Se reinicia el estado del plano
  Object.assign(estado, { vFecha: hoyISO(), vHora: horaAhora(), sel: null, filtro: 'todas' });
  $('#vFecha').value = estado.vFecha;
  $('#vHora').value = estado.vHora;
  setDist(false);

  // Botones del menu segun los permisos del rol
  $('#btnNavReservas').disabled = !s.puedeReservar;        // bloqueado
  $('#btnNavAsis').disabled = !s.puedeAsistencia;          // bloqueado
  $('#btnNavPers').disabled = !s.puedeAsistenciaPersonal;  // bloqueado
  $('#btnNavInv').hidden = !s.puedeInventario;             // oculto

  if (s.puedeReservar) {
    construirMapa();
    refrescar();
  }

  // Pantalla inicial: mesas, inventario o ninguna si el rol no tiene acceso
  irA(s.puedeReservar ? 'mesas' : s.puedeInventario ? 'inv' : null);
}

// Cambia de vista (solo si el usuario tiene permiso)
function irA(v) {
  const ok = {
    mesas: perm('puedeReservar'),
    asis: perm('puedeAsistencia'),
    inv: perm('puedeInventario'),
    pers: perm('puedeAsistenciaPersonal')
  };
  if (v && !ok[v]) return;
  if (estado.dist && v !== 'mesas') setDist(false);

  // Se muestra solo la vista elegida
  document.querySelector('.sala').hidden = v !== 'mesas';
  $('#vistaAsis').hidden = v !== 'asis';
  $('#vistaInv').hidden = v !== 'inv';
  $('#vistaPers').hidden = v !== 'pers';

  // Se marca el boton activo del menu
  $('#btnNavReservas').classList.toggle('act', v === 'mesas');
  $('#btnNavAsis').classList.toggle('act', v === 'asis');
  $('#btnNavInv').classList.toggle('act', v === 'inv');
  $('#btnNavPers').classList.toggle('act', v === 'pers');

  if (v === 'mesas') refrescar();
}

/* ---------- HU4 - Plano de mesas y estados ---------- */

// Dibuja el plano: paredes, cocina, caja y las mesas
function construirMapa() {
  const m = $('#mapa');
  m.innerHTML = '';

  // Paredes
  CONFIG.PAREDES.forEach(([x, y, w, h]) => {
    const d = document.createElement('div');
    d.className = 'pared';
    Object.assign(d.style, { left: pc(x, MW), top: pc(y, MH), width: pc(w, MW), height: pc(h, MH) });
    m.append(d);
  });

  // Lugares fijos (cocina y caja) con su texto
  CONFIG.LUGARES.forEach(([t, k, ix, iy, iw, , ty]) => {
    const i = document.createElement('img');
    i.src = img(k);
    i.alt = '';
    Object.assign(i.style, { left: pc(ix, MW), top: pc(iy, MH), width: pc(iw, MW) });
    m.append(i);

    const d = document.createElement('div');
    d.className = 'lug';
    d.textContent = t;
    const w = 110;
    Object.assign(d.style, { left: pc(ix + iw / 2 - w / 2, MW), top: pc(ty, MH), width: pc(w, MW) });
    m.append(d);
  });

  // Mesas (cada una es un boton)
  Mesas.todas().forEach(mesa => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mesa disponible';
    b.dataset.id = mesa.id;
    b.title = 'Clic: seleccionar - Doble clic: ocupar / liberar';
    b.style.left = pc(mesa.x, MW);
    b.style.top = pc(mesa.y, MH);
    b.innerHTML = `<img src="${img('pin')}" alt=""><span>Mesa ${mesa.id}</span><small></small>`;
    m.append(b);
  });

  pintarBorrador();
}

// Actualiza el color y el texto de cada mesa segun la fecha y hora que se estan viendo
function refrescar() {
  if ($('#app').hidden || !$('#mapa').children.length) return;

  const mesas = Mesas.todas();
  const cuenta = { disponible: 0, reservada: 0, ocupada: 0, fuera: 0 };

  // Si cambio el numero de mesas se vuelve a dibujar el plano
  if (document.querySelectorAll('.mesa[data-id]').length !== mesas.length) construirMapa();

  document.querySelectorAll('.mesa[data-id]').forEach(b => {
    const id = +b.dataset.id;
    const m = Mesas.porId(id);
    if (!m) return;

    // La posicion puede cambiar (mover mesas), tambien desde otra computadora
    if (!(arrastre && arrastre.id === id)) {
      b.style.left = pc(m.x, MW);
      b.style.top = pc(m.y, MH);
    }

    const est = Reservas.estadoMesa(id, estado.vFecha, estado.vHora);
    cuenta[est]++;

    // Clase de color, mesa seleccionada y mesas atenuadas por el filtro
    b.className = `mesa ${est}${estado.sel === id ? ' sel' : ''}${estado.filtro !== 'todas' && estado.filtro !== est ? ' atenuada' : ''}`;
    b.setAttribute('aria-pressed', estado.sel === id);
    b.setAttribute('aria-label', `Mesa ${id}, ${m.cap} personas, ${ETQ[est]}.`);
    b.querySelector('small').textContent = ETQ[est];
  });

  // Resumen de mesas en el panel
  $('#resumen').innerHTML = `<b>Mesas: ${mesas.length}</b><br>Disponibles: ${cuenta.disponible}<br>Reservadas: ${cuenta.reservada}<br>Ocupadas: ${cuenta.ocupada}<br>Fuera de servicio: ${cuenta.fuera}`;

  // Se marca el boton del filtro activo
  document.querySelectorAll('.pb[data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === estado.filtro));

  pintarPanel();
}

// Muestra en el panel la informacion de la mesa seleccionada y activa/desactiva el boton de reservar
function pintarPanel() {
  const id = estado.sel;
  const i = $('#info');
  const bR = $('#bReservar');

  bR.disabled = true;
  bR.classList.remove('listo');

  // En modo mover mesas no se muestra la informacion de la mesa
  if (estado.dist) {
    i.textContent = '';
    i.hidden = true;
    return;
  }
  i.hidden = false;

  const m = id && Mesas.porId(id);
  if (!m) {
    i.textContent = 'Selecciona una mesa. Doble clic: ocupar / liberar.';
    return;
  }

  const est = Reservas.estadoMesa(id, estado.vFecha, estado.vHora);
  const r = Reservas.enSlot(id, estado.vFecha, estado.vHora);

  let h = `<b>Mesa ${id}</b> (max. ${m.cap}) - ${ETQ[est]}`;
  if (r) h += `<br>${esc(r.nombre)}${r.personas ? ' - ' + r.personas + ' pers.' : ''} - ${esc(r.hora)}`;

  if (est === 'ocupada') h += '<br>Doble clic para liberar.';
  else if (est === 'disponible') h += '<br>Doble clic para ocupar.';
  else if (est === 'fuera') h += '<br>No se puede reservar. Ver "Administrar Mesas".';


  // Horas que ya tiene reservadas esa mesa en el dia que se esta viendo
  const otras = Reservas.activas()
    .filter(x => x.mesaId === id && x.fecha === estado.vFecha && x.estado === 'activa')
    .map(x => x.hora)
    .sort();
  if (otras.length) h += `<br>Reservas ese dia: ${otras.join(', ')}`;

  i.innerHTML = h;

  // Solo se puede reservar una mesa disponible y si el rol tiene permiso
  bR.disabled = !(est === 'disponible' && puede());
  bR.classList.toggle('listo', !bR.disabled);
}

// Doble clic en una mesa: ocupar (cliente sin reserva) o liberar
async function cambioRapido(id) {
  if (!puede() || estado.dist) return;

  estado.sel = id;
  refrescar();

  const est = Reservas.estadoMesa(id, estado.vFecha, estado.vHora);
  const r = Reservas.enSlot(id, estado.vFecha, estado.vHora);

  try {
    if (est === 'fuera') {
      toast(`La Mesa ${id} esta fuera de servicio.`, 'error');
    } else if (est === 'disponible') {
      // Ocupar: solo se permite en la fecha de hoy
      if (estado.vFecha !== hoyISO()) return toast('Solo puedes ocupar una mesa en la fecha de hoy. Usa "Ir a hoy / ahora".', 'error');
      if (!await confirmar('Ocupar mesa', `Estas seguro de ocupar la Mesa ${id}?`)) return;

      await Reservas.ocupar(id, estado.vFecha, estado.vHora);
      refrescar();
      toast(`Mesa ${id} ocupada.`, 'exito');
    } else if (est === 'ocupada') {
      // Liberar la mesa
      if (!await confirmar('Liberar mesa', `Estas seguro de cambiar la Mesa ${id} a un estado disponible?`)) return;

      await Reservas.liberar(r.id);
      refrescar();
      toast(`Mesa ${id} disponible.`, 'exito');
    } else {
      toast(`La Mesa ${id} esta reservada.`, 'info');
    }
  } catch (e) {
    toast(e.message, 'error');
    refrescar();
  }
}

/* ---------- HU6 - Registrar reserva ---------- */

// Abre el formulario de reserva de mesas
function formulario(datos) {
  if (!puede()) return;

  const v = { nombre: '', telefono: '', correo: '', personas: '', ...datos };

  // Genera una fila del formulario (etiqueta con icono + campo + mensaje de error)
  const fila = (id, et, ico, ctl) => `<div class="fila"><label class="lab" for="f_${id}">${et}<img src="${img(ico)}" alt=""></label><div class="fc">${ctl}<p class="err" id="e_${id}" role="alert"></p></div></div>`;

  // Genera un input
  const inp = (id, tipo, val, ex = '') => `<input id="f_${id}" type="${tipo}" value="${esc(val)}" ${ex}>`;

  abrirModal(`<form id="formRes" class="win" novalidate><h3>Reserva de Mesas</h3><div class="cols"><div>
    ${fila('nombre', 'Nombre', 'iNom', inp('nombre', 'text', v.nombre, 'maxlength="60"'))}
    ${fila('telefono', 'Telefono', 'iTel', inp('telefono', 'tel', v.telefono))}
    ${fila('correo', 'Correo', 'iCor', inp('correo', 'email', v.correo))}
    ${fila('fecha', 'Fecha', 'iFec', `<div class="fecha">${inp('fecha', 'date', v.fecha, `min="${hoyISO()}"`)}<button class="calb" id="bCal" type="button" aria-label="Abrir calendario"><img src="${img('iCal')}" alt=""></button></div>`)}
    ${fila('hora', 'Hora', 'iHor', `<select id="f_hora">${CONFIG.HORAS.map(h => `<option ${h === v.hora ? 'selected' : ''}>${h}</option>`).join('')}</select>`)}
    ${fila('personas', 'Personas', 'iPer', `<div class="spin"><input id="f_personas" class="spv" role="spinbutton" readonly value="1"><div class="sb"><button type="button" id="spUp" aria-label="Aumentar personas">+</button><button type="button" id="spDn" aria-label="Disminuir personas">-</button></div></div>`)}
    ${fila('mesa', 'Mesa', 'iMesa', `<div class="mesaTxt"><b>Mesa ${v.mesaId}</b>&nbsp;(max. ${Mesas.porId(v.mesaId).cap} personas)</div>`)}
    </div><div class="der"><div class="g"></div><div class="g"><button class="fb ok" id="bOk" type="submit">Confirmar Reserva<img src="${img('iOk')}" alt=""></button><button class="fb no" id="bNo" type="button">Cancelar Reserva<img src="${img('iNo')}" alt=""></button></div></div></div></form>`);

  // Boton del calendario
  $('#bCal').onclick = () => {
    const f = $('#f_fecha');
    if (f.showPicker) {
      try {
        f.showPicker();
      } catch (e) {
        f.focus();
      }
    } else {
      f.focus();
    }
  };

  // Contador de personas (entre 1 y la capacidad de la mesa)
  const cap = Mesas.porId(v.mesaId).cap;
  const setP = n => {
    const x = Math.min(cap, Math.max(1, Math.trunc(Number(n)) || 1));
    $('#f_personas').value = x;
    $('#spUp').disabled = x >= cap;
    $('#spDn').disabled = x <= 1;
  };
  $('#spUp').onclick = () => setP(+$('#f_personas').value + 1);
  $('#spDn').onclick = () => setP(+$('#f_personas').value - 1);
  setP(1);

  // Lee los datos que se capturaron en el formulario
  const leer = () => ({
    nombre: $('#f_nombre').value.trim(),
    telefono: $('#f_telefono').value.trim(),
    correo: $('#f_correo').value.trim(),
    fecha: $('#f_fecha').value,
    hora: $('#f_hora').value,
    personas: $('#f_personas').value,
    mesaId: v.mesaId
  });

  // Cancelar: si hay cambios sin guardar pregunta antes de cerrar
  const inicial = JSON.stringify(leer());
  const salir = async () => {
    if (JSON.stringify(leer()) !== inicial && !await confirmar('Descartar cambios', 'Hay cambios sin guardar. Deseas descartarlos?')) return;
    cerrarModal();
  };
  cierreModal = salir;
  $('#bNo').onclick = salir;

  // Confirmar reserva
  $('#formRes').onsubmit = async ev => {
    ev.preventDefault();
    if (estado.ocupado) return;

    // Se validan los datos y se muestran los errores debajo de cada campo
    const d = leer();
    const e = validar(d);
    ['nombre', 'telefono', 'correo', 'fecha', 'hora', 'personas', 'mesa'].forEach(k => {
      $('#e_' + k).textContent = e[k] || '';
    });

    // Si hay errores, se enfoca el primer campo con error
    const p = Object.keys(e)[0];
    if (p) {
      const el = $('#f_' + (p === 'mesa' ? 'personas' : p));
      if (el && el.focus) el.focus();
      toast('Datos incorrectos: revisa los campos marcados.', 'error');
      return;
    }

    // Se guarda la reserva
    estado.ocupado = true;
    const bo = $('#bOk');
    bo.disabled = true;
    bo.firstChild.textContent = 'Guardando...';

    try {
      d.personas = Number(d.personas);
      if (Reservas.conflicto(d)) throw new Error('La mesa ya no esta disponible en ese horario.');

      await Reservas.crear(d);
      estado.ocupado = false;
      cerrarModal();

      // El plano se mueve a la fecha y hora de la reserva
      Object.assign(estado, { vFecha: d.fecha, vHora: d.hora, sel: d.mesaId });
      $('#vFecha').value = d.fecha;
      $('#vHora').value = d.hora;
      refrescar();
      toast('Reserva confirmada. La mesa cambio a Reservada.', 'exito');
    } catch (err) {
      estado.ocupado = false;
      bo.disabled = false;
      bo.firstChild.textContent = 'Confirmar Reserva';
      toast(err.message, 'error');
    }
  };
}

/* ---------- Administrar mesas: agregar, capacidad, estado, eliminar y mover ---------- */

// Dibuja en el plano una vista previa de la mesa nueva mientras se termina de configurar
function pintarBorrador() {
  const m = $('#mapa');
  const n = estado.nueva;
  let g = m.querySelector('.mesa.borr');

  if (!n) {
    if (g) g.remove();
    return;
  }

  if (!g) {
    g = document.createElement('div');
    g.setAttribute('aria-hidden', 'true');
    g.innerHTML = `<img src="${img('pin')}" alt=""><span></span><small></small>`;
    m.append(g);
  }

  g.style.left = pc(n.x, MW);
  g.style.top = pc(n.y, MH);
  g.className = 'mesa borr ' + (n.fuera === null ? 'sinconf' : n.fuera ? 'fuera' : 'disponible');
  g.querySelector('span').textContent = 'Mesa ' + n.id;
  g.querySelector('small').textContent = n.fuera === null ? 'Nueva - sin configurar' : (n.fuera ? 'Fuera de servicio' : 'Disponible') + ' (nueva)';
}

// Activa o desactiva el modo mover mesas
function setDist(v) {
  estado.dist = v;
  $('#mapa').classList.toggle('dist', v);
  $('#bannerDist').hidden = !v;
  $('#bAdmin').disabled = v;
  if ($('#mapa').children.length) refrescar();
}

// Mesa que se esta arrastrando en este momento
let arrastre = null;

// Permite arrastrar las mesas con el mouse o el dedo (solo en modo mover)
function iniciarArrastre() {
  const mapa = $('#mapa');

  // Al presionar una mesa se guarda desde donde se agarro
  mapa.addEventListener('pointerdown', e => {
    if (!estado.dist) return;

    const b = e.target.closest('.mesa[data-id]');
    if (!b) return;
    e.preventDefault();

    const id = +b.dataset.id;
    const m = Mesas.porId(id);
    const r = mapa.getBoundingClientRect();
    const s = r.width / MW;
    arrastre = { b, id, m, s, r, ox: (e.clientX - r.left) / s - m.x, oy: (e.clientY - r.top) / s - m.y, x: m.x, y: m.y };

    b.setPointerCapture(e.pointerId);
    estado.sel = id;
    document.querySelectorAll('.mesa[data-id]').forEach(z => z.classList.toggle('sel', +z.dataset.id === id));
  });

  // Mientras se arrastra la mesa sigue al mouse; se marca en rojo si el lugar no es valido
  mapa.addEventListener('pointermove', e => {
    if (!arrastre) return;

    const a = arrastre;
    a.x = Math.round(Math.min(MW - TW, Math.max(0, (e.clientX - a.r.left) / a.s - a.ox)));
    a.y = Math.round(Math.min(MH - TH, Math.max(0, (e.clientY - a.r.top) / a.s - a.oy)));
    a.b.style.left = pc(a.x, MW);
    a.b.style.top = pc(a.y, MH);
    a.b.classList.toggle('malo', Mesas.choca(a.x, a.y, a.id));
  });

  // Al soltar se guarda la nueva posicion; si no es valida la mesa regresa a su lugar
  const fin = async () => {
    if (!arrastre) return;

    const a = arrastre;
    arrastre = null;
    a.b.classList.remove('malo');

    try {
      await Mesas.mover(a.id, a.x, a.y);
    } catch (err) {
      a.b.style.left = pc(a.m.x, MW);
      a.b.style.top = pc(a.m.y, MH);
      toast(err.message, 'error');
    }
  };
  mapa.addEventListener('pointerup', fin);
  mapa.addEventListener('pointercancel', fin);
}

// Cuando la mesa nueva ya tiene capacidad y estado, se guarda en la base de datos
async function intentarCrear() {
  const n = estado.nueva;
  if (!n || n.creando || n.cap < 1 || n.fuera === null) return;

  n.creando = true;
  try {
    const m = await Mesas.agregar(n.cap, n.fuera, n.id, [n.x, n.y]);
    estado.nueva = null;
    estado.sel = m.id;
    estado.moverListo = m.id;
    construirMapa();
    refrescar();
    pintarAdmin();
    toast(`Mesa ${m.id} lista (${m.cap} personas, ${m.fuera ? 'fuera de servicio' : 'en servicio'}). Puedes ajustar su capacidad; luego pulsa "Mover mesas" para acomodarla.`, 'exito');
  } catch (e) {
    n.creando = false;
    toast(e.message, 'error');
  }
}

// Cierra la ventana de administrar mesas (si hay una mesa sin terminar, pregunta antes)
async function salirAdmin() {
  if (estado.nueva && !await confirmar('Mesa sin terminar', `La Mesa ${estado.nueva.id} aun no tiene capacidad y estado. Si cierras se descartara. Descartar?`)) return;

  estado.nueva = null;
  estado.moverListo = null;
  pintarBorrador();
  cerrarModal();
}

// Abre la ventana de administrar mesas
function adminMesas() {
  if (!puede()) return;

  estado.nueva = null;
  estado.moverListo = null;

  abrirModal(`<div class="win" style="max-width:680px"><h3>Administrar Mesas</h3>
    <p class="hint">Cambia la capacidad de una mesa, ponla fuera de servicio si esta rota o en mal estado, agrega mesas nuevas, elimina las que ya no existan o mueve su lugar en el plano.</p>
    <div class="lm" id="listaMesas"></div><p class="hint guia" id="hintAdm" aria-live="polite"></p>
    <div class="acciones" style="margin-top:10px"><button class="si" id="bAdd" type="button">+ Agregar mesa</button><button class="azulb" id="bMover" type="button">Mover mesas</button><button class="no2" id="bAdmX" type="button">Cerrar</button></div></div>`);

  cierreModal = salirAdmin;
  pintarAdmin();
  $('#bAdmX').onclick = salirAdmin;

  // Agregar mesa: se prepara una fila nueva con el primer numero libre y un lugar libre del plano
  $('#bAdd').onclick = () => {
    if (estado.nueva) return;

    const usados = new Set(Mesas.todas().map(m => m.id));
    let id = 1;
    while (usados.has(id)) id++;

    const pos = Mesas.buscarLibre();
    if (!pos) {
      toast('No hay espacio libre en el plano para otra mesa.', 'error');
      return;
    }

    estado.nueva = { id, cap: 0, fuera: null, x: pos[0], y: pos[1], creando: false };
    estado.moverListo = null;
    pintarAdmin();
  };

  // Mover mesas: se cierra la ventana y se activa el modo de arrastrar
  $('#bMover').onclick = () => {
    if (estado.nueva) return;

    estado.moverListo = null;
    cerrarModal();
    setDist(true);
    toast('Arrastra cada mesa con el mouse a su lugar. Cuando acabes pulsa "Terminar", o "Seguir editando mesas" para volver.', 'info');
  };

  // Estado (en servicio / fuera de servicio) de la mesa nueva
  $('#listaMesas').onchange = e => {
    if (e.target.id === 'nuevaEstado' && estado.nueva) {
      estado.nueva.fuera = e.target.value === '' ? null : e.target.value === 'fuera';
      intentarCrear();
      pintarAdmin();
    }
  };

  // Botones de cada fila de la lista
  $('#listaMesas').onclick = async e => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const a = b.dataset.a;

    // Capacidad de la mesa nueva
    if (a === 'nup' || a === 'ndn') {
      const n = estado.nueva;
      if (n && !n.creando) {
        n.cap = Math.min(CONFIG.CAP_MAX, Math.max(0, n.cap + (a === 'nup' ? 1 : -1)));
        intentarCrear();
        pintarAdmin();
      }
      return;
    }

    // Descartar la mesa nueva
    if (a === 'desc') {
      estado.nueva = null;
      pintarAdmin();
      return;
    }

    // Acciones sobre una mesa que ya existe
    const id = +b.dataset.id;
    const m = Mesas.porId(id);
    if (!m) return;

    try {
      if (a === 'up' || a === 'dn') {
        await Mesas.setCap(id, m.cap + (a === 'up' ? 1 : -1));
      } else if (a === 'fuera') {
        const f = !m.fuera;
        if (!await confirmar(f ? 'Fuera de servicio' : 'Poner en servicio', f ? `Poner la Mesa ${id} fuera de servicio? No se podra reservar ni ocupar.` : `Volver a poner la Mesa ${id} en servicio?`)) return;

        await Mesas.setFuera(id, f);
        toast(f ? `Mesa ${id} fuera de servicio.` : `Mesa ${id} en servicio.`, 'exito');
      } else if (a === 'del') {
        if (!await confirmar('Eliminar mesa', `Eliminar la Mesa ${id}? Esta accion no se puede deshacer.`)) return;

        await Mesas.eliminar(id);
        if (estado.sel === id) estado.sel = null;
        if (estado.moverListo === id) estado.moverListo = null;
        construirMapa();
        toast(`Mesa ${id} eliminada.`, 'exito');
      }
    } catch (err) {
      toast(err.message, 'error');
    }

    refrescar();
    pintarAdmin();
  };
}

// Dibuja la lista de mesas dentro de la ventana de administrar mesas
function pintarAdmin() {
  const l = $('#listaMesas');
  if (!l) return;

  const n = estado.nueva;

  // Cuadrito de color del estado
  const sw = c => `<i class="sw ${c}" aria-hidden="true"></i>`;

  // Control + / - de capacidad (id vacio = mesa nueva; min = capacidad minima)
  const spin = (sube, baja, id, cap, min, etiqueta, brilla) => {
    const d = id ? ` data-id="${id}"` : '';
    return `<div class="spin ${brilla ? 'glow' : ''}" aria-label="${etiqueta}"><input class="spv" readonly role="spinbutton" aria-valuemin="1" aria-valuemax="${CONFIG.CAP_MAX}" aria-valuenow="${cap}" value="${cap < 1 ? '- pers.' : cap + ' pers.'}"><div class="sb"><button type="button" data-a="${sube}"${d} aria-label="Aumentar capacidad" ${cap >= CONFIG.CAP_MAX ? 'disabled' : ''}>+</button><button type="button" data-a="${baja}"${d} aria-label="Disminuir capacidad" ${cap <= min ? 'disabled' : ''}>-</button></div></div>`;
  };

  // Una fila por cada mesa
  let h = Mesas.todas().map(m => `<div class="rm"><b>${sw(Reservas.estadoMesa(m.id, estado.vFecha, estado.vHora))}Mesa ${m.id}</b>
    <span class="${m.fuera ? 'st-f' : ''}">${m.fuera ? 'Fuera de servicio' : 'En servicio'}</span>
    ${spin('up', 'dn', m.id, m.cap, 1, `Capacidad de la Mesa ${m.id}`, false)}
    <button class="mini" type="button" data-a="fuera" data-id="${m.id}">${m.fuera ? 'Poner en servicio' : 'Fuera de servicio'}</button>
    <button class="mini rojo" type="button" data-a="del" data-id="${m.id}">Eliminar</button></div>`).join('');

  // Fila de la mesa nueva (los campos que faltan brillan)
  if (n) {
    h += `<div class="rm nueva"><b>${sw(n.fuera === null ? 'sinconf' : n.fuera ? 'fuera' : 'disponible')}Mesa ${n.id}<br><small>nueva</small></b>
    <select id="nuevaEstado" class="${n.fuera === null ? 'glow' : ''}" aria-label="Estado de la mesa nueva"><option value="" ${n.fuera === null ? 'selected' : ''}>Elegir estado...</option><option value="servicio" ${n.fuera === false ? 'selected' : ''}>En servicio</option><option value="fuera" ${n.fuera === true ? 'selected' : ''}>Fuera de servicio</option></select>
    ${spin('nup', 'ndn', 0, n.cap, 0, 'Capacidad de la mesa nueva', n.cap < 1)}
    <span></span>
    <button class="mini rojo" type="button" data-a="desc">Descartar</button></div>`;
  }

  l.innerHTML = h || '<p style="padding:12px">No hay mesas. Usa "Agregar mesa".</p>';
  if (n) l.scrollTop = l.scrollHeight;

  // Botones de abajo y mensaje de ayuda
  const listo = !n && estado.moverListo && Mesas.porId(estado.moverListo);
  pintarBorrador();
  $('#bAdd').disabled = !!n;
  $('#bMover').disabled = !!n;
  $('#bMover').classList.toggle('listo2', !!listo);
  $('#hintAdm').textContent = n
    ? `Elige la capacidad y el estado de la Mesa ${n.id} (campos iluminados). La veras en el plano; cuando esten los dos queda creada.`
    : listo ? `Mesa ${estado.moverListo} lista. Pulsa "Mover mesas" para acomodarla en el plano.` : '';
}

/* ---------- Arranque ---------- */

// Asigna todos los eventos de la pagina
function eventos() {
  // Botones del menu lateral
  $('#btnNavReservas').onclick = () => irA('mesas');
  $('#btnNavAsis').onclick = () => irA('asis');
  $('#btnNavInv').onclick = () => irA('inv');
  $('#btnNavPers').onclick = () => irA('pers');

  // Se llenan las horas del selector del panel
  $('#vHora').innerHTML = CONFIG.HORAS.map(h => `<option>${h}</option>`).join('');

  // Plano: clic selecciona, doble clic ocupa o libera
  const mapa = $('#mapa');
  mapa.addEventListener('click', e => {
    const b = e.target.closest('.mesa');
    if (b) {
      estado.sel = +b.dataset.id;
      refrescar();
    }
  });
  mapa.addEventListener('dblclick', e => {
    const b = e.target.closest('.mesa');
    if (b) cambioRapido(+b.dataset.id);
  });
  // Con teclado: Shift + Enter hace lo mismo que el doble clic
  mapa.addEventListener('keydown', e => {
    const b = e.target.closest('.mesa');
    if (b && e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      cambioRapido(+b.dataset.id);
    }
  });

  // Fecha y hora del panel
  $('#vFecha').onchange = e => {
    if (fechaValida(e.target.value)) {
      estado.vFecha = e.target.value;
      refrescar();
    }
  };
  $('#vHora').onchange = e => {
    estado.vHora = e.target.value;
    refrescar();
  };
  $('#btnHoy').onclick = () => {
    Object.assign(estado, { vFecha: hoyISO(), vHora: horaAhora() });
    $('#vFecha').value = estado.vFecha;
    $('#vHora').value = estado.vHora;
    refrescar();
  };

  // Botones de filtro (Disponible, Ocupada, Reservada, Todas)
  document.querySelectorAll('.pb[data-f]').forEach(b => {
    b.onclick = () => {
      estado.filtro = b.dataset.f;
      refrescar();
    };
  });

  // Reservar y administrar mesas
  $('#bReservar').onclick = () => formulario({ mesaId: estado.sel, fecha: estado.vFecha, hora: estado.vHora });
  $('#bAdmin').onclick = adminMesas;

  // Modo mover mesas: terminar o volver a la ventana de administrar mesas
  $('#bFinDist').onclick = () => {
    setDist(false);
    toast('Posiciones guardadas.', 'exito');
  };
  $('#bSeguir').onclick = () => {
    setDist(false);
    adminMesas();
  };
  iniciarArrastre();

  // Cerrar sesion: vuelve a la pantalla de inicio de sesion
  $('#btnSalir').onclick = () => {
    sessionStorage.removeItem('rm.sesion');
    cerrarModal();
    estado.sel = null;
    estado.nueva = null;
    estado.moverListo = null;
    setDist(false);
    $('#formLogin').reset();
    ['#errUsuario', '#errClave', '#errLogin'].forEach(i => {
      $(i).textContent = '';
    });
    mostrar('login');
    $('#usuario').focus();
    toast('Sesion cerrada.', 'info');
  };

  // Boton X: cerrar el sistema
  $('#btnCerrarSistema').onclick = async () => {
    if (!await confirmar('Cerrar el sistema', 'Deseas cerrar el sistema?')) return;

    // El navegador solo lo permite si la pestana la abrio el propio programa
    window.close();
    document.body.insertAdjacentHTML('beforeend', '<div id="cerrado"><div><h2>Sistema cerrado</h2><p>Ya puedes cerrar esta pestana.</p><button type="button" onclick="location.reload()">Volver a abrir</button></div></div>');
  };

  // Tecla Esc: cierra primero la confirmacion y despues la ventana emergente
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#overlay2').hidden) $('#cNo').click();
    else if (!$('#overlay').hidden) (cierreModal || cerrarModal)();
  });
}

// Inicia el sistema: conecta la base de datos y decide si muestra el login o el menu
async function iniciar() {
  eventos();
  iniciarLogin();

  // El boton de login se bloquea mientras conecta con la base de datos
  $('#btnLogin').disabled = true;
  $('#btnLogin').textContent = 'CONECTANDO...';

  try {
    await iniciarDB();
  } catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML('beforeend', `<div id="errCarga"><div><b>No se pudo conectar con la base de datos (${modo}).</b><br>${esc(e.message || e)}<br><br>Revisa js/firebase-config.js y las reglas de Firestore.</div></div>`);
    return;
  }

  $('#btnLogin').disabled = false;
  $('#btnLogin').textContent = 'INGRESAR';

  // Cada vez que cambian los datos se actualiza el plano y la lista de administrar
  onCambio(() => {
    refrescar();
    pintarAdmin();
  });

  // Si ya habia una sesion abierta en la pestana, entra directo
  const s = Auth.actual();
  if (s) entrarApp(s);
  else mostrar('login');
}

iniciar();
