// Configuracion del restaurante (Sprint 1)
// Los datos salen del prototipo de alta fidelidad.

export const CONFIG = {
  // Cada reserva u ocupacion bloquea la mesa 120 minutos
  DURACION_MIN: 120,

  // Horario del restaurante
  APERTURA: '07:00',
  CIERRE: '15:00',

  // Horas disponibles para reservar: de 07:00 a 14:00
  HORAS: Array.from({ length: 8 }, (_, i) => String(i + 7).padStart(2, '0') + ':00'),

  // Maximo de personas permitido
  CAP_MAX: 20,

  // Mesas iniciales: [id, capacidad, x, y]
  // Las coordenadas son sobre un plano de 862 x 653
  MESAS_BASE: [
    [1, 2, 144, 21],
    [2, 2, 324, 21],
    [3, 4, 144, 171],
    [4, 4, 324, 169],
    [5, 4, 144, 334],
    [6, 4, 324, 334],
    [7, 6, 427, 241],
    [8, 6, 539, 21],
    [9, 4, 539, 169],
    [10, 4, 527, 334],
    [11, 6, 718, 21],
    [12, 8, 718, 165],
    [13, 8, 718, 334]
  ].map(([id, cap, x, y]) => ({ id, cap, x, y, fuera: false })),

  // Paredes del plano: [x, y, ancho, alto]
  PAREDES: [
    [99, 0, 18, 237],
    [0, 218, 117, 19],
    [468, 0, 18, 132],
    [820, 0, 17, 230],
    [0, 455, 117, 18],
    [99, 455, 18, 198],
    [816, 451, 17, 202]
  ],

  // Zonas donde no se pueden colocar mesas (Cocina y Caja): [x, y, ancho, alto]
  ZONAS_FIJAS: [
    [0, 0, 117, 237],
    [0, 455, 117, 198]
  ],

  // Lugares fijos (cocina y caja): [texto, imagen, x, y, ancho, (sin usar), y del texto]
  LUGARES: [
    ['Cocina', 'cocina', 17, 72, 64, 25, 145],
    ['Caja', 'caja', 12, 513, 64, 30, 583]
  ],

  // Usuarios iniciales (equivalen a la tabla tblLogin).
  // La contrasena se guarda como hash SHA-256 en la base de datos.
  USUARIOS_INICIALES: [
    {
      id: 'dueno',
      rol: 'Dueño',
      nombre: 'Horacio',
      clave: '789',
      puedeReservar: true,
      puedeAsistencia: true,
      puedeInventario: true,
      puedeAsistenciaPersonal: true
    },
    {
      id: 'gerente',
      rol: 'Gerente',
      nombre: 'Glenda',
      clave: '456',
      puedeReservar: false,
      puedeAsistencia: false,
      puedeInventario: true,
      puedeAsistenciaPersonal: true
    },
    {
      id: 'recepcionista',
      rol: 'Recepcionista',
      nombre: 'Dulce',
      clave: '123',
      puedeReservar: true,
      puedeAsistencia: true,
      puedeInventario: false,
      puedeAsistenciaPersonal: false
    }
  ]
};

// Foto de perfil que se muestra en el encabezado segun el usuario
export const AVATARES = {
  dueno: 'assets/img/avatar-dueno.png',
  gerente: 'assets/img/avatar-gerente.png',
  recepcionista: 'assets/img/avatar-recepcionista.png'
};

// Tamano de cada mesa (TW, TH) y del plano completo (MW, MH)
export const TW = 86;
export const TH = 66;
export const MW = 862;
export const MH = 653;
