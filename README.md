# RestMaster - Sprint 1 (Equipo 04)

Historias incluidas: **HU1 Iniciar sesion - HU3 Menu por rol - HU4 Plano de mesas y estados**.
Mismo diseno del prototipo de alta fidelidad. HTML + CSS + JavaScript (modulos) + Firebase Firestore.

## 1. Abrirlo en Visual Studio Code
1. VS Code -> **Archivo -> Abrir carpeta** -> elige `restmaster-sprint1`.
2. Extensiones (Ctrl+Shift+X) -> instala **Live Server** (Ritwick Dey).
3. Clic derecho en `index.html` -> **Open with Live Server**. Se abre `http://127.0.0.1:5500`.
   > No lo abras con doble clic (`file://`): los modulos de JavaScript y el cifrado de contrasenas necesitan `http://`.

Sin configurar Firebase funciona en **modo local** (datos en el navegador), util para probar.

## 2. Conectar Firebase (base de datos)
1. Entra a https://console.firebase.google.com -> **Crear un proyecto** -> nombre `restmaster` -> (puedes desactivar Analytics) -> **Crear**.
2. En **Descripcion general del proyecto** pulsa el icono **`</>` (Web)** -> apodo `restmaster-web` -> **Registrar app**. Copia el objeto `firebaseConfig`.
3. Abre `js/firebase-config.js` y reemplaza los valores de ejemplo por los tuyos.
4. Menu izquierdo **Compilacion -> Firestore Database -> Crear base de datos** -> ubicacion cercana -> **Comenzar en modo de prueba** -> Crear.
   (Opcional: pestana **Reglas** -> pega el contenido de `firestore.rules` -> Publicar.)
5. Recarga la pagina. La primera vez el sistema crea solo las colecciones:
   - `usuarios` (3 documentos: dueno, gerente, recepcionista; la contrasena se guarda cifrada con SHA-256)
   - `mesas` (13 documentos)
   - `reservas` (se llena al reservar u ocupar mesas)

   Compruebalo en Firestore Database -> pestana **Datos**.

| SQL Server (tu .bak) | Firestore |
|---|---|
| tblLogin | `usuarios` |
| TblReservarMesas | `reservas` |
| (mesas estaban fijas en el codigo) | `mesas` |

## 3. Usuarios de prueba
| Usuario | Contrasena | Rol | Pantalla inicial |
|---|---|---|---|
| Horacio | 789 | Dueno | Reservar Mesas |
| Glenda | 456 | Gerente | Inventario |
| Dulce | 123 | Recepcionista | Reservar Mesas |

Cerrar sesion es HU2 (Sprint 3), por eso no hay boton: para cambiar de usuario abre una **pestana nueva** (CP-18) o una ventana privada.

## 4. Preparar datos para los casos de HU4
- **Ocupada (CP-28):** doble clic en una mesa verde -> Si.
- **Fuera de servicio (CP-29):** Administrar Mesas -> "Fuera de servicio" en la mesa -> Si.
- **Reservada (CP-27):** selecciona la Mesa 3 -> *Reservar esta Mesa* -> llena el formulario con fecha de manana y 10:00 -> luego en el panel elige esa fecha y hora.

## 5. Estructura
```
index.html          pantallas (login, menu, plano)
css/style.css       estilos del prototipo
js/app.js           interfaz y eventos
js/auth.js          HU1/HU3: login y permisos por rol
js/mesas.js         HU4: estados de mesa, ocupar/liberar, reservas
js/db.js            Firestore (o modo local) + datos iniciales
js/config.js        mesas, plano, usuarios iniciales
js/firebase-config.js  <- tus datos de Firebase
assets/img/         imagenes del prototipo
firestore.rules     reglas de demostracion
```
