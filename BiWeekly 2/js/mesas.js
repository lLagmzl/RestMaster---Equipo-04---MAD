// HU4 · Plano de mesas y estados (+ lo mínimo para preparar los datos de prueba: ocupar/liberar, reservar, fuera de servicio)
import { datos, guardar } from './db.js';
import { CONFIG } from './config.js';
import { aMin, hoyISO, minAhora, fechaValida } from './util.js';

const nuevoId = () => 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const vigente = r => r.estado === 'activa' || r.estado === 'ocupada';
const solapa = (a, b) => a.mesaId === b.mesaId && a.fecha === b.fecha && Math.abs(aMin(a.hora) - aMin(b.hora)) < CONFIG.DURACION_MIN;

export const Mesas = {
  todas() { return [...datos.mesas].sort((a, b) => a.id - b.id); },
  porId(id) { return datos.mesas.find(m => m.id === id); },
  vigentes(id) { return Reservas.activas().filter(r => r.mesaId === id && r.fecha >= hoyISO()); },
  bloqueo(id, accion) {
    const v = this.vigentes(id), oc = v.filter(r => r.estado === 'ocupada').length, re = v.length - oc;
    if (!v.length) return '';
    return `No se puede ${accion}: la Mesa ${id} ` + [oc ? 'está ocupada (libérala con doble clic sobre la mesa)' : '', re ? `tiene ${re} reserva(s) activa(s)` : ''].filter(Boolean).join(' y ') + '.';
  },
  async setFuera(id, fuera) {
    const m = this.porId(id); if (!m) throw new Error('La mesa no existe.');
    if (fuera) { const e = this.bloqueo(id, 'ponerla fuera de servicio'); if (e) throw new Error(e); }
    await guardar('mesas', id, { ...m, fuera: !!fuera });
  }
};

export const Reservas = {
  activas() { return datos.reservas.filter(vigente); },
  conflicto(d) { return this.activas().find(r => solapa(r, d)); },
  enSlot(mesaId, fecha, hora) { return this.activas().find(r => solapa(r, { mesaId, fecha, hora })); },
  async crear(d) { const id = nuevoId(); return guardar('reservas', id, { ...d, estado: 'activa' }); },
  async ocupar(mesaId, fecha, hora) { // cliente sin reserva (doble clic en mesa disponible)
    const m = Mesas.porId(mesaId); if (!m || m.fuera) throw new Error('La mesa no está en servicio.');
    if (this.conflicto({ mesaId, fecha, hora })) throw new Error('La mesa ya no está disponible.');
    return guardar('reservas', nuevoId(), { nombre: 'Cliente sin reserva', telefono: '', correo: '', fecha, hora, personas: 0, mesaId, estado: 'ocupada' });
  },
  async liberar(id) {
    const r = datos.reservas.find(x => x.id === id && x.estado === 'ocupada'); if (!r) throw new Error('La mesa ya no está ocupada.');
    await guardar('reservas', id, { ...r, estado: 'finalizada' });
  },
  estadoMesa(mesaId, fecha, hora) {
    const m = Mesas.porId(mesaId); if (m && m.fuera) return 'fuera';
    const r = this.enSlot(mesaId, fecha, hora); return r ? (r.estado === 'ocupada' ? 'ocupada' : 'reservada') : 'disponible';
  }
};

export function validar(d) {
  const e = {};
  if (!d.nombre) e.nombre = 'Escribe el nombre del cliente.';
  else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{1,59}$/.test(d.nombre)) e.nombre = 'Usa solo letras (2 a 60 caracteres).';
  const tel = (d.telefono || '').replace(/[\s()-]/g, '');
  if (!tel) e.telefono = 'Escribe el teléfono.'; else if (!/^\d{10}$/.test(tel)) e.telefono = 'Debe tener exactamente 10 dígitos, solo números.';
  if (!d.correo) e.correo = 'Escribe el correo electrónico.'; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) e.correo = 'Formato inválido. Ejemplo: nombre@correo.com';
  if (!d.fecha) e.fecha = 'Elige la fecha.'; else if (!fechaValida(d.fecha)) e.fecha = 'La fecha no es válida.'; else if (d.fecha < hoyISO()) e.fecha = 'La fecha no puede ser pasada.';
  if (!d.hora) e.hora = 'Elige la hora.';
  else if (!CONFIG.HORAS.includes(d.hora)) e.hora = `Elige una hora de ${CONFIG.HORAS[0]} a ${CONFIG.HORAS[CONFIG.HORAS.length - 1]}.`;
  else if (!e.fecha && d.fecha === hoyISO() && aMin(d.hora) <= minAhora()) e.hora = 'Esa hora de hoy ya pasó.';
  const mesa = Mesas.porId(d.mesaId), n = Number(d.personas);
  if (String(d.personas).trim() === '') e.personas = 'Escribe el número de personas.';
  else if (!Number.isInteger(n) || n < 1) e.personas = 'Debe ser un número entero mayor que cero.';
  else if (mesa && n > mesa.cap) e.personas = `La Mesa ${mesa.id} admite máximo ${mesa.cap} personas.`;
  if (!mesa) e.mesa = 'La mesa no existe.';
  else if (mesa.fuera) e.mesa = `La Mesa ${mesa.id} está fuera de servicio.`;
  else if (!e.fecha && !e.hora) { const c = Reservas.conflicto(d); if (c) e.mesa = `La Mesa ${mesa.id} ya está ${c.estado === 'ocupada' ? 'ocupada' : 'reservada'} a las ${c.hora}.`; }
  return e;
}
