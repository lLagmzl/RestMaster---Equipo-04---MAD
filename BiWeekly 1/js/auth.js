// HU1 · Iniciar sesión   y   HU3 · permisos del menú por rol
import { datos } from './db.js';
import { sha256 } from './util.js';
import { AVATARES } from './config.js';

export const Auth = {
  // El usuario no distingue mayúsculas/minúsculas y se ignoran espacios al inicio y al final. La contraseña sí es exacta.
  async login(usuario, clave) {
    const nombre = usuario.trim().toLowerCase();
    const u = datos.usuarios.find(x => x.nombre.toLowerCase() === nombre);
    if (!u || u.claveHash !== await sha256(clave)) return null;
    sessionStorage.setItem('rm.sesion', JSON.stringify({ id: u.id })); // por pestaña
    return this.conAvatar(u);
  },
  actual() {
    try { const s = JSON.parse(sessionStorage.getItem('rm.sesion')); const u = datos.usuarios.find(x => x.id === s.id); return u ? this.conAvatar(u) : null; }
    catch (e) { return null; }
  },
  conAvatar(u) { return { ...u, img: AVATARES[u.id] || AVATARES.recepcionista }; }
};
