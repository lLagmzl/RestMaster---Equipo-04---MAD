// Capa de datos: usa Firestore (Firebase) si hay configuracion; si no, trabaja en modo local (localStorage).
// El resto del sistema solo usa estas funciones, asi el codigo no cambia entre un modo y otro.
import { firebaseConfig } from './firebase-config.js';
import { CONFIG } from './config.js';
import { sha256 } from './util.js';

// Version del SDK de Firebase que se descarga
const SDK = '10.14.1';

// Revisa si ya se pegaron los datos reales de Firebase
export const usaFirebase = !!(firebaseConfig && firebaseConfig.apiKey && !/^PEGA/i.test(firebaseConfig.apiKey));
export const modo = usaFirebase ? 'firebase' : 'local';

// Colecciones (tablas) del sistema
const COLS = ['usuarios', 'mesas', 'reservas'];

// Copia de los datos en memoria
export const datos = { usuarios: [], mesas: [], reservas: [] };

// Lista de funciones que se avisan cuando cambian los datos
const oyentes = new Set();
export const onCambio = f => oyentes.add(f);
const avisar = () => oyentes.forEach(f => {
  try {
    f();
  } catch (e) {
    console.error(e);
  }
});

// Conexion a Firebase (se llena en conectar())
let fb = null;

// Leer y guardar una coleccion en localStorage (modo local)
const lsLeer = c => {
  try {
    return JSON.parse(localStorage.getItem('rm.' + c)) || [];
  } catch (e) {
    return [];
  }
};
const lsGuardar = c => localStorage.setItem('rm.' + c, JSON.stringify(datos[c]));

// Conecta con Firebase y se queda escuchando los cambios de cada coleccion
async function conectar() {
  const base = `https://www.gstatic.com/firebasejs/${SDK}/`;
  const { initializeApp } = await import(base + 'firebase-app.js');
  const F = await import(base + 'firebase-firestore.js');
  fb = { db: F.getFirestore(initializeApp(firebaseConfig)), ...F };

  await Promise.all(COLS.map(c => new Promise((ok, fallo) => {
    let primera = true;
    fb.onSnapshot(fb.collection(fb.db, c), snap => {
      datos[c] = snap.docs.map(d => ({ ...d.data(), id: d.data().id ?? d.id }));
      avisar();
      if (primera) {
        primera = false;
        ok();
      }
    }, fallo);
  })));
}

// Guarda (o actualiza) un documento en la coleccion
export async function guardar(col, id, data) {
  const doc = { ...data, id };
  if (usaFirebase) {
    await fb.setDoc(fb.doc(fb.db, col, String(id)), doc);
  } else {
    datos[col] = [...datos[col].filter(x => String(x.id) !== String(id)), doc];
    lsGuardar(col);
    avisar();
  }
  return doc;
}

// Guarda varios documentos de una sola vez (en Firebase es todo o nada, asi no quedan datos a medias)
export async function guardarVarios(col, lista) {
  if (usaFirebase) {
    const lote = fb.writeBatch(fb.db);
    lista.forEach(x => lote.set(fb.doc(fb.db, col, String(x.id)), x));
    await lote.commit();
  } else {
    const ids = new Set(lista.map(x => String(x.id)));
    datos[col] = [...datos[col].filter(x => !ids.has(String(x.id))), ...lista];
    lsGuardar(col);
    avisar();
  }
}

// Elimina un documento de la coleccion
export async function borrar(col, id) {
  if (usaFirebase) {
    await fb.deleteDoc(fb.doc(fb.db, col, String(id)));
  } else {
    datos[col] = datos[col].filter(x => String(x.id) !== String(id));
    lsGuardar(col);
    avisar();
  }
}

// Carga inicial: crea los usuarios que falten y las mesas solo si no hay ninguna
// (asi una mesa eliminada desde Administrar Mesas no vuelve a aparecer)
async function sembrar() {
  for (const { clave, ...u } of CONFIG.USUARIOS_INICIALES) {
    if (!datos.usuarios.some(x => x.id === u.id)) {
      await guardar('usuarios', u.id, { ...u, claveHash: await sha256(clave) });
    }
  }

  if (!datos.mesas.length) await guardarVarios('mesas', CONFIG.MESAS_BASE);
}

// Arranca la base de datos (se llama una vez al abrir el sistema)
export async function iniciarDB() {
  if (usaFirebase) {
    await conectar();
  } else {
    COLS.forEach(c => {
      datos[c] = lsLeer(c);
    });

    // Si cambia el localStorage desde otra pestana, se vuelven a leer los datos
    window.addEventListener('storage', e => {
      if (e.key && e.key.startsWith('rm.')) {
        COLS.forEach(c => {
          datos[c] = lsLeer(c);
        });
        avisar();
      }
    });
  }
  await sembrar();
}
