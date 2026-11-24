export const pad = n => String(n).padStart(2, '0');
export const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoyISO = () => isoDe(new Date());
export const aMin = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
export const minAhora = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fechaValida = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const [y, m, d] = s.split('-').map(Number), t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d;
};
export async function sha256(texto) {
  if (!globalThis.crypto || !crypto.subtle) throw new Error('Abre el sistema con Live Server (http://127.0.0.1:5500) para poder validar contraseñas.');
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
