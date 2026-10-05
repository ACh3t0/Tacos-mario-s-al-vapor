# Tacos-mario-s-al-vapor

## Cómo correr el proyecto

1. Instalar Node.js y SQL Server (Express) con SQL Server Management Studio.
2. En SSMS, ejecutar el script `crear-base-de-datos.sql`.
3. En la carpeta `backend`, copiar `.env.example` como `.env` y poner el nombre de tu servidor en `DB_SERVER`.
4. En `backend`: `npm install` y luego `npm start`.
5. Abrir http://localhost:3000/pages/register.html y crear la primera cuenta, de tipo Admin
   (el registro público solo funciona mientras no haya usuarios).
6. Iniciar sesión en http://localhost:3000/pages/login.html. Desde la pantalla Usuarios
   el Admin crea las demás cuentas.

Al registrar una venta en Ventas, también se crea un pedido activo. Desde Inicio se pueden
marcar pedidos como completados y consultar ambas listas; se actualizan automáticamente
cada 15 segundos. Al actualizar la base con `crear-base-de-datos.sql`, las ventas antiguas
se conservan y se muestran como completadas.

El script también agrega al inventario el catálogo inicial de tacos y bebidas con existencia 0.
Si la base ya estaba instalada, vuelve a ejecutar `crear-base-de-datos.sql`; los productos que ya
existan no se modifican. Desde Inventario, un Admin o Desarrollador puede sumar existencias.