// Asistencia a Reserva (Recepcionista y Dueno)
// Por ahora solo la busqueda de la reserva por telefono; marcar la asistencia queda para otro sprint
import { datos } from './db.js';
import { hoyISO } from './util.js';

// Deja solo los numeros del telefono (quita espacios, parentesis y guiones)
const tel10 = s => (s || '').replace(/[\s()-]/g, '');

export const Asistencia = {
  // Busca la reserva de HOY que sigue pendiente (activa) con ese telefono; si hay varias, la mas temprana
  buscar(tel) {
    const hoy = hoyISO();
    return datos.reservas
      .filter(r => r.estado === 'activa' && r.fecha === hoy && tel10(r.telefono) === tel)
      .sort((a, b) => a.hora.localeCompare(b.hora))[0] || null;
  }
};
