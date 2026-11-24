// Funciones de apoyo que se usan en varios archivos

// Agrega un cero a la izquierda: 7 -> "07"
export const pad = n => String(n).padStart(2, '0');

// Convierte una fecha a formato AAAA-MM-DD
export const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Fecha de hoy en formato AAAA-MM-DD
export const hoyISO = () => isoDe(new Date());

// Convierte una hora "HH:MM" a minutos para poder compararlas
export const aMin = h => {
  const [a, b] = h.split(':').map(Number);
  return a * 60 + b;
};

// Minutos que han pasado en el dia hasta este momento
export const minAhora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// Cambia los caracteres especiales de HTML para que no rompan la pagina
export const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

// Revisa que la fecha tenga formato AAAA-MM-DD y que exista en el calendario
export const fechaValida = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
};

// Cifra un texto con SHA-256 (se usa para no guardar las contrasenas tal cual)
export async function sha256(texto) {
  if (!globalThis.crypto || !crypto.subtle) {
    throw new Error('Abre el sistema con Live Server (http://127.0.0.1:5500) para poder validar contrasenas.');
  }
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
