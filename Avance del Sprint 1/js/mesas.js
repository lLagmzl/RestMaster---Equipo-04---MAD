// HU4 - Plano de mesas y estados
// Incluye lo minimo para preparar datos de prueba: ocupar/liberar, reservar y poner fuera de servicio
import { datos, guardar } from './db.js';
import { CONFIG } from './config.js';
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
      re ? `tiene ${re} reserva(s) activa(s)` : ''
    ].filter(Boolean).join(' y ') + '.';
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

  // Busca si una reserva nueva choca con otra
  conflicto(d) {
    return this.activas().find(r => solapa(r, d));
  },

  // Busca la reserva que tiene una mesa en cierta fecha y hora
  enSlot(mesaId, fecha, hora) {
    return this.activas().find(r => solapa(r, { mesaId, fecha, hora }));
  },

  // Guarda una reserva nueva
  async crear(d) {
    const id = nuevoId();
    return guardar('reservas', id, { ...d, estado: 'activa' });
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
export function validar(d) {
  const e = {};

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
  else if (!e.fecha && d.fecha === hoyISO() && aMin(d.hora) <= minAhora()) e.hora = 'Esa hora de hoy ya paso.';

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
    const c = Reservas.conflicto(d);
    if (c) e.mesa = `La Mesa ${mesa.id} ya esta ${c.estado === 'ocupada' ? 'ocupada' : 'reservada'} a las ${c.hora}.`;
  }

  return e;
}
