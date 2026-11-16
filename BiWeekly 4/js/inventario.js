// HU10 - Ver inventario - HU11 - Agregar producto (tambien editar y eliminar)
// Reglas tomadas del formulario de productos del prototipo
import { datos, guardar, borrar } from './db.js';
import { CONFIG } from './config.js';

// Letras permitidas en el nombre (con acentos y enie) y espacio
export const NO_LETRAS = /[^a-zA-Z\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC ]/g;
const SOLO_LETRAS = /^[a-zA-Z\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC ]+$/;

export const Inventario = {
  // Todos los productos ordenados por ID
  todos() {
    return [...datos.productos].sort((a, b) => a.id - b.id);
  },

  // Nivel de existencias: critico (muy pocas), bajo (pocas) u ok
  nivel(c) {
    return c <= CONFIG.STOCK_MUY_POCO ? 'critico' : c <= CONFIG.STOCK_POCO ? 'bajo' : 'ok';
  },

  // Productos con pocas existencias, de menos a mas
  bajos() {
    return this.todos().filter(p => p.cantidad <= CONFIG.STOCK_POCO).sort((a, b) => a.cantidad - b.cantidad);
  },

  // Valida nombre, precio y cantidad. Regresa un objeto con los errores (vacio si todo esta bien)
  // idIgnorar = producto que se esta editando (para que no choque con su propio nombre)
  validar(d, idIgnorar) {
    const e = {};
    const n = (d.nombre || '').trim().replace(/\s+/g, ' ');
    const p = String(d.precio ?? '').trim();
    const c = String(d.cantidad ?? '').trim();

    // Nombre: solo letras, maximo 25 y sin repetirse
    if (!n) e.nombre = 'El nombre del producto no puede estar vacio.';
    else if (!SOLO_LETRAS.test(n)) e.nombre = 'El nombre solo debe contener letras.';
    else if (n.length > 25) e.nombre = 'El nombre no puede pasar de 25 caracteres.';
    else if (this.todos().some(x => x.id !== idIgnorar && x.nombre.toLowerCase() === n.toLowerCase())) e.nombre = 'Ya existe un producto con ese nombre.';

    // Precio: numero mayor a 0 con maximo 2 decimales
    if (!p) e.precio = 'Escribe el precio.';
    else if (!/^\d+(\.\d{1,2})?$/.test(p)) e.precio = 'El precio no es valido (ejemplo: 25 o 25.50).';
    else if (Number(p) <= 0) e.precio = 'El precio debe ser mayor a 0.';

    // Cantidad: entero de 0 a 999
    if (!c) e.cantidad = 'Escribe la cantidad.';
    else if (!/^\d{1,3}$/.test(c)) e.cantidad = 'La cantidad debe ser un numero entero de 0 a 999.';

    return e;
  },

  // Deja los datos listos para guardar (nombre sin espacios de mas, precio con 2 decimales, cantidad numerica)
  normal(d) {
    return {
      nombre: d.nombre.trim().replace(/\s+/g, ' '),
      precio: Math.round(Number(d.precio) * 100) / 100,
      cantidad: Number(d.cantidad)
    };
  },

  // Producto nuevo: usa el ID libre mas bajo
  async agregar(d) {
    const usados = new Set(datos.productos.map(p => p.id));
    let id = 1;
    while (usados.has(id)) id++;

    const p = { ...this.normal(d) };
    return guardar('productos', id, p);
  },

  // Cambia los datos de un producto
  async actualizar(id, d) {
    if (!datos.productos.some(p => p.id === id)) throw new Error('El producto ya no existe.');
    return guardar('productos', id, { ...this.normal(d) });
  },

  // Elimina un producto
  async eliminar(id) {
    if (!datos.productos.some(p => p.id === id)) throw new Error('El producto ya no existe.');
    await borrar('productos', id);
  }
};
