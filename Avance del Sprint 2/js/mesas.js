// HU4 - Plano de mesas y estados
// HU6 - Registrar reserva (reglas de disponibilidad) y administracion de mesas
// Editar y cancelar reserva
// Incluye lo minimo para preparar datos de prueba: ocupar/liberar, reservar y poner fuera de servicio
import { datos, guardar, borrar } from './db.js';
import { CONFIG, TW, TH, MW, MH } from './config.js';
import { aMin, hoyISO, minAhora, fechaValida } from './util.js';

// Genera un id unico para cada reserva
const nuevoId = () => 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Una reserva esta vigente si esta activa u ocupada
const vigente = r => r.estado === 'activa' || r.estado === 'ocupada';

// Dos reservas se empalman si son de la misma mesa, el mismo dia y con menos de 120 min de diferencia
const solapa = (a, b) =>
  a.mesaId === b.mesaId &&
  a.fecha === b.fecha &&
  Math.abs(aMin(a.hora) - aMin(b.hora)) < CONFIG.DURACION_MIN;

// Revisa si dos rectangulos [x, y, ancho, alto] se tocan (g = separacion minima entre ellos)
const inter = (a, b, g = 0) =>
  a[0] < b[0] + b[2] + g && a[0] + a[2] + g > b[0] &&
  a[1] < b[1] + b[3] + g && a[1] + a[3] + g > b[1];

/* ---------- Mesas ---------- */
export const Mesas = {
  // Todas las mesas ordenadas por numero
  todas() {
    return [...datos.mesas].sort((a, b) => a.id - b.id);
  },

  // Busca una mesa por su id
  porId(id) {
    return datos.mesas.find(m => m.id === id);
  },

  // Reservas vigentes de una mesa de hoy en adelante
  vigentes(id) {
    return Reservas.activas().filter(r => r.mesaId === id && r.fecha >= hoyISO());
  },

  // Si la mesa tiene reservas u ocupacion, regresa el mensaje de por que no se puede hacer la accion
  bloqueo(id, accion) {
    const v = this.vigentes(id);
    const oc = v.filter(r => r.estado === 'ocupada').length;
    const re = v.length - oc;

    if (!v.length) return '';

    return `No se puede ${accion}: la Mesa ${id} ` + [
      oc ? 'esta ocupada (liberala con doble clic sobre la mesa)' : '',
      re ? `tiene ${re} reserva(s) activa(s) (cambialas de mesa con "Editar Reserva" o cancelalas)` : ''
    ].filter(Boolean).join(' y ') + '.';
  },

  // Revisa si una mesa puesta en (x, y) se saldria del plano o chocaria con paredes, cocina, caja u otra mesa
  choca(x, y, id) {
    if (x < 0 || y < 0 || x + TW > MW || y + TH > MH) return true;

    const r = [x, y, TW, TH];
    if (CONFIG.PAREDES.some(p => inter(r, p, 4)) || CONFIG.ZONAS_FIJAS.some(z => inter(r, z, 4))) return true;

    return datos.mesas.some(m => m.id !== id && inter(r, [m.x, m.y, TW, TH], 6));
  },

  // Busca un lugar libre del plano para una mesa nueva (primero la parte de abajo)
  buscarLibre() {
    for (let y = 480; y <= 580; y += 20) {
      for (let x = 140; x <= 730; x += 20) if (!this.choca(x, y, 0)) return [x, y];
    }
    for (let y = 0; y <= MH - TH; y += 20) {
      for (let x = 0; x <= MW - TW; x += 20) if (!this.choca(x, y, 0)) return [x, y];
    }
    return null;
  },

  // Deja la capacidad entre 1 y el maximo permitido
  cap(n) {
    n = Math.trunc(Number(n));
    if (!(n >= 1)) return 1;
    return Math.min(CONFIG.CAP_MAX, n);
  },

  // Agrega una mesa nueva con el numero libre mas bajo (si borras la 14, la siguiente vuelve a ser la 14)
  async agregar(cap, fuera = false, prefId = 0, posIni = null) {
    const pos = (posIni && !this.choca(posIni[0], posIni[1], 0)) ? posIni : this.buscarLibre();
    if (!pos) throw new Error('No hay espacio libre en el plano para otra mesa.');

    const usados = new Set(datos.mesas.map(m => m.id));
    let sig = (prefId > 0 && !usados.has(prefId)) ? prefId : 1;
    while (usados.has(sig)) sig++;

    const mesa = { id: sig, cap: this.cap(cap), x: pos[0], y: pos[1], fuera: !!fuera };
    return guardar('mesas', sig, mesa);
  },

  // Cambia la capacidad de una mesa (no puede bajar de las personas de una reserva activa)
  async setCap(id, cap) {
    const m = this.porId(id);
    if (!m) throw new Error('La mesa no existe.');

    cap = this.cap(cap);
    const max = Math.max(0, ...this.vigentes(id).map(r => Number(r.personas) || 0));
    if (cap < max) throw new Error(`La Mesa ${id} tiene una reserva de ${max} personas; no puede bajar de esa capacidad.`);

    await guardar('mesas', id, { ...m, cap });
  },

  // Cambia la posicion de una mesa en el plano
  async mover(id, x, y) {
    const m = this.porId(id);
    if (!m) throw new Error('La mesa no existe.');

    x = Math.round(x);
    y = Math.round(y);
    if (this.choca(x, y, id)) throw new Error('No se puede colocar ahi: choca con otra mesa, una pared, la Cocina o la Caja.');

    await guardar('mesas', id, { ...m, x, y });
  },

  // Elimina una mesa (no se puede si esta ocupada o tiene reservas) y borra su historial
  async eliminar(id) {
    const e = this.bloqueo(id, 'eliminarla');
    if (e) throw new Error(e);

    await borrar('mesas', id);
    for (const r of datos.reservas.filter(x => x.mesaId === id)) await borrar('reservas', r.id);
  },

  // Pone una mesa fuera de servicio o la regresa a servicio
  async setFuera(id, fuera) {
    const m = this.porId(id);
    if (!m) throw new Error('La mesa no existe.');

    if (fuera) {
      const e = this.bloqueo(id, 'ponerla fuera de servicio');
      if (e) throw new Error(e);
    }

    await guardar('mesas', id, { ...m, fuera: !!fuera });
  }
};

/* ---------- Reservas ---------- */
export const Reservas = {
  // Reservas que siguen vigentes
  activas() {
    return datos.reservas.filter(vigente);
  },

  // Busca si una reserva choca con otra (ignorarId = la reserva que se esta editando, para que no choque consigo misma)
  conflicto(d, ignorarId) {
    return this.activas().find(r => r.id !== ignorarId && solapa(r, d));
  },

  // Busca la reserva que tiene una mesa en cierta fecha y hora (si hay dos cerca, la mas cercana a esa hora)
  enSlot(mesaId, fecha, hora) {
    const q = { mesaId, fecha, hora };
    return this.activas()
      .filter(r => solapa(r, q))
      .sort((a, b) => Math.abs(aMin(a.hora) - aMin(hora)) - Math.abs(aMin(b.hora) - aMin(hora)))[0];
  },

  // Guarda una reserva nueva
  async crear(d) {
    const id = nuevoId();
    return guardar('reservas', id, { ...d, estado: 'activa' });
  },

  // Cambia los datos de una reserva activa (nombre, contacto, fecha, hora, personas o mesa)
  async actualizar(id, d) {
    const r = datos.reservas.find(x => x.id === id);
    if (!r || r.estado !== 'activa') throw new Error('La reserva ya no existe o no se puede modificar.');
    if (this.conflicto(d, id)) throw new Error('La mesa ya no esta disponible en ese horario.');

    return guardar('reservas', id, { ...r, ...d, id, estado: 'activa' });
  },

  // Cancela una reserva activa. No se borra: queda en la base de datos con estado "cancelada"
  async cancelar(id) {
    const r = datos.reservas.find(x => x.id === id);
    if (!r || r.estado !== 'activa') throw new Error('La reserva ya no existe o no se puede cancelar.');

    await guardar('reservas', id, { ...r, estado: 'cancelada', canceladaEn: new Date().toISOString() });
  },

  // Ocupa una mesa para un cliente sin reserva (doble clic en una mesa disponible)
  async ocupar(mesaId, fecha, hora) {
    const m = Mesas.porId(mesaId);
    if (!m || m.fuera) throw new Error('La mesa no esta en servicio.');
    if (this.conflicto({ mesaId, fecha, hora })) throw new Error('La mesa ya no esta disponible.');

    return guardar('reservas', nuevoId(), {
      nombre: 'Cliente sin reserva',
      telefono: '',
      correo: '',
      fecha,
      hora,
      personas: 0,
      mesaId,
      estado: 'ocupada'
    });
  },

  // Libera una mesa ocupada (la reserva pasa a finalizada)
  async liberar(id) {
    const r = datos.reservas.find(x => x.id === id && x.estado === 'ocupada');
    if (!r) throw new Error('La mesa ya no esta ocupada.');

    await guardar('reservas', id, { ...r, estado: 'finalizada' });
  },

  // Estado de una mesa en cierta fecha y hora: fuera, ocupada, reservada o disponible
  estadoMesa(mesaId, fecha, hora) {
    const m = Mesas.porId(mesaId);
    if (m && m.fuera) return 'fuera';

    const r = this.enSlot(mesaId, fecha, hora);
    return r ? (r.estado === 'ocupada' ? 'ocupada' : 'reservada') : 'disponible';
  }
};

/* ---------- Validacion del formulario de reserva ---------- */
// Regresa un objeto con los mensajes de error (vacio si todo esta bien)
// ignorarId = reserva que se esta editando
export function validar(d, ignorarId) {
  const e = {};

  // Al editar, si la fecha y la hora no cambiaron no se vuelve a revisar si "ya paso"
  const orig = ignorarId ? datos.reservas.find(x => x.id === ignorarId) : null;
  const mismaHora = !!orig && orig.fecha === d.fecha && orig.hora === d.hora;

  // Nombre
  if (!d.nombre) e.nombre = 'Escribe el nombre del cliente.';
  else if (!/^[A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00DC\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1][A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00DC\u00D1\u00E1\u00E9\u00ED\u00F3\u00FA\u00FC\u00F1' .-]{1,59}$/.test(d.nombre)) e.nombre = 'Usa solo letras (2 a 60 caracteres).';

  // Telefono (10 digitos)
  const tel = (d.telefono || '').replace(/[\s()-]/g, '');
  if (!tel) e.telefono = 'Escribe el telefono.';
  else if (!/^\d{10}$/.test(tel)) e.telefono = 'Debe tener exactamente 10 digitos, solo numeros.';

  // Correo
  if (!d.correo) e.correo = 'Escribe el correo electronico.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) e.correo = 'Formato invalido. Ejemplo: nombre@correo.com';

  // Fecha
  if (!d.fecha) e.fecha = 'Elige la fecha.';
  else if (!fechaValida(d.fecha)) e.fecha = 'La fecha no es valida.';
  else if (d.fecha < hoyISO()) e.fecha = 'La fecha no puede ser pasada.';

  // Hora
  if (!d.hora) e.hora = 'Elige la hora.';
  else if (!CONFIG.HORAS.includes(d.hora)) e.hora = `Elige una hora de ${CONFIG.HORAS[0]} a ${CONFIG.HORAS[CONFIG.HORAS.length - 1]}.`;
  else if (!e.fecha && !mismaHora && d.fecha === hoyISO() && aMin(d.hora) <= minAhora()) e.hora = 'Esa hora de hoy ya paso.';

  // Personas (no puede pasar de la capacidad de la mesa)
  const mesa = Mesas.porId(d.mesaId);
  const n = Number(d.personas);
  if (String(d.personas).trim() === '') e.personas = 'Escribe el numero de personas.';
  else if (!Number.isInteger(n) || n < 1) e.personas = 'Debe ser un numero entero mayor que cero.';
  else if (mesa && n > mesa.cap) e.personas = `La Mesa ${mesa.id} admite maximo ${mesa.cap} personas.`;

  // Mesa (que exista, este en servicio y no este empalmada con otra reserva)
  if (!mesa) e.mesa = 'La mesa no existe.';
  else if (mesa.fuera) e.mesa = `La Mesa ${mesa.id} esta fuera de servicio.`;
  else if (!e.fecha && !e.hora) {
    const c = Reservas.conflicto(d, ignorarId);
    if (c) e.mesa = `La Mesa ${mesa.id} ya esta ${c.estado === 'ocupada' ? 'ocupada' : 'reservada'} a las ${c.hora}.`;
  }

  return e;
}
