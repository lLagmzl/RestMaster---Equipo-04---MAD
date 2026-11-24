// HU1 - Iniciar sesion
// HU3 - Permisos del menu por rol
import { datos } from './db.js';
import { sha256 } from './util.js';
import { AVATARES } from './config.js';

export const Auth = {
  // Valida el usuario y la contrasena.
  // El usuario no distingue mayusculas/minusculas y se ignoran los espacios al inicio y al final.
  // La contrasena si tiene que ser exacta.
  async login(usuario, clave) {
    const nombre = usuario.trim().toLowerCase();
    const u = datos.usuarios.find(x => x.nombre.toLowerCase() === nombre);

    if (!u || u.claveHash !== await sha256(clave)) return null;

    // La sesion se guarda por pestana
    sessionStorage.setItem('rm.sesion', JSON.stringify({ id: u.id }));
    return this.conAvatar(u);
  },

  // Regresa el usuario que tiene la sesion abierta (o null si no hay)
  actual() {
    try {
      const s = JSON.parse(sessionStorage.getItem('rm.sesion'));
      const u = datos.usuarios.find(x => x.id === s.id);
      return u ? this.conAvatar(u) : null;
    } catch (e) {
      return null;
    }
  },

  // Le agrega al usuario la imagen de su avatar
  conAvatar(u) {
    return { ...u, img: AVATARES[u.id] || AVATARES.recepcionista };
  }
};
