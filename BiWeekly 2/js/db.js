// Capa de datos: Firestore (Firebase) si hay configuración; si no, modo local (localStorage).
// El resto del sistema solo usa esta interfaz, así el código no cambia entre modos.
import { firebaseConfig } from './firebase-config.js';
import { CONFIG } from './config.js';
import { sha256 } from './util.js';

const SDK = '10.14.1';
export const usaFirebase = !!(firebaseConfig && firebaseConfig.apiKey && !/^PEGA/i.test(firebaseConfig.apiKey));
export const modo = usaFirebase ? 'firebase' : 'local';

const COLS = ['usuarios', 'mesas', 'reservas'];
export const datos = { usuarios: [], mesas: [], reservas: [] };
const oyentes = new Set();
export const onCambio = f => oyentes.add(f);
const avisar = () => oyentes.forEach(f => { try { f(); } catch (e) { console.error(e); } });

let fb = null;
const lsLeer = c => { try { return JSON.parse(localStorage.getItem('rm.' + c)) || []; } catch (e) { return []; } };
const lsGuardar = c => localStorage.setItem('rm.' + c, JSON.stringify(datos[c]));

async function conectar() {
  const base = `https://www.gstatic.com/firebasejs/${SDK}/`;
  const { initializeApp } = await import(base + 'firebase-app.js');
  const F = await import(base + 'firebase-firestore.js');
  fb = { db: F.getFirestore(initializeApp(firebaseConfig)), ...F };
  await Promise.all(COLS.map(c => new Promise((ok, fallo) => {
    let primera = true;
    fb.onSnapshot(fb.collection(fb.db, c), snap => {
      datos[c] = snap.docs.map(d => ({ ...d.data(), id: d.data().id ?? d.id }));
      avisar(); if (primera) { primera = false; ok(); }
    }, fallo);
  })));
}

export async function guardar(col, id, data) {
  const doc = { ...data, id };
  if (usaFirebase) await fb.setDoc(fb.doc(fb.db, col, String(id)), doc);
  else { datos[col] = [...datos[col].filter(x => String(x.id) !== String(id)), doc]; lsGuardar(col); avisar(); }
  return doc;
}
export async function borrar(col, id) {
  if (usaFirebase) await fb.deleteDoc(fb.doc(fb.db, col, String(id)));
  else { datos[col] = datos[col].filter(x => String(x.id) !== String(id)); lsGuardar(col); avisar(); }
}

// Carga inicial: crea solo los usuarios y mesas que falten.
async function sembrar() {
  for (const { clave, ...u } of CONFIG.USUARIOS_INICIALES) {
    if (!datos.usuarios.some(x => x.id === u.id)) await guardar('usuarios', u.id, { ...u, claveHash: await sha256(clave) });
  }
  await Promise.all(CONFIG.MESAS_BASE.filter(m => !datos.mesas.some(x => x.id === m.id)).map(m => guardar('mesas', m.id, m)));
}

export async function iniciarDB() {
  if (usaFirebase) await conectar();
  else {
    COLS.forEach(c => { datos[c] = lsLeer(c); });
    window.addEventListener('storage', e => { if (e.key && e.key.startsWith('rm.')) { COLS.forEach(c => { datos[c] = lsLeer(c); }); avisar(); } });
  }
  await sembrar();
}
