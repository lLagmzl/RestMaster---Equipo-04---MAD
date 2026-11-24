// Configuración del restaurante (Sprint 1) – tomada del prototipo de alta fidelidad
export const CONFIG = {
  DURACION_MIN: 120,               // cada reserva/ocupación bloquea la mesa 120 min
  APERTURA: '07:00', CIERRE: '15:00',
  HORAS: Array.from({ length: 8 }, (_, i) => String(i + 7).padStart(2, '0') + ':00'), // 07:00 a 14:00
  CAP_MAX: 20,
  // [id, capacidad, x, y]  (coordenadas sobre un plano de 862 × 653)
  MESAS_BASE: [[1, 2, 144, 21], [2, 2, 324, 21], [3, 4, 144, 171], [4, 4, 324, 169], [5, 4, 144, 334], [6, 4, 324, 334], [7, 6, 427, 241],
    [8, 6, 539, 21], [9, 4, 539, 169], [10, 4, 527, 334], [11, 6, 718, 21], [12, 8, 718, 165], [13, 8, 718, 334]]
    .map(([id, cap, x, y]) => ({ id, cap, x, y, fuera: false })),
  PAREDES: [[99, 0, 18, 237], [0, 218, 117, 19], [468, 0, 18, 132], [820, 0, 17, 230], [0, 455, 117, 18], [99, 455, 18, 198], [816, 451, 17, 202]],
  LUGARES: [['Cocina', 'cocina', 17, 72, 64, 25, 145], ['Caja', 'caja', 12, 513, 64, 30, 583]],
  // Usuarios iniciales (equivalente a tu tabla tblLogin). La contraseña se guarda como hash SHA-256.
  USUARIOS_INICIALES: [
    { id: 'dueno', rol: 'Dueño', nombre: 'Horacio', clave: '789', puedeReservar: true, puedeAsistencia: true, puedeInventario: true, puedeAsistenciaPersonal: true },
    { id: 'gerente', rol: 'Gerente', nombre: 'Glenda', clave: '456', puedeReservar: false, puedeAsistencia: false, puedeInventario: true, puedeAsistenciaPersonal: true },
    { id: 'recepcionista', rol: 'Recepcionista', nombre: 'Dulce', clave: '123', puedeReservar: true, puedeAsistencia: true, puedeInventario: false, puedeAsistenciaPersonal: false }
  ]
};
export const AVATARES = { dueno: 'assets/img/avatar-dueno.png', gerente: 'assets/img/avatar-gerente.png', recepcionista: 'assets/img/avatar-recepcionista.png' };
export const TW = 86, TH = 66, MW = 862, MH = 653; // tamaño de mesa y del plano
