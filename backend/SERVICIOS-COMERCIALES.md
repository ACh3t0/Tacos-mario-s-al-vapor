# Inventario y ventas

Ejecuta `crear-base-de-datos.sql` en SQL Server antes de usar estos servicios.
Inicia el backend con `npm start` y abre las páginas desde http://localhost:3000.
Todas las rutas requieren iniciar sesión.

| Método | Ruta | Operación |
| --- | --- | --- |
| GET | /api/inventario | Listar productos, incluidos los inactivos |
| GET | /api/inventario/:id | Consultar un producto |
| POST | /api/inventario | Crear producto (Admin o Desarrollador) |
| PUT | /api/inventario/:id | Reemplazar datos del producto (Admin o Desarrollador) |
| GET | /api/ventas | Listar ventas con total |
| GET | /api/ventas/:id | Consultar venta con detalles |
| POST | /api/ventas | Registrar venta y descontar existencias |

Ejemplo desde un script del frontend con `type="module"`:

```js
import { crearProducto, listarInventario } from "../services/inventario.service.js";
import { registrarVenta, obtenerVenta } from "../services/ventas.service.js";

try {
    const producto = await crearProducto({
        nombre: "Taco de papa", descripcion: "Taco al vapor", unidad: "pieza",
        existencia: 50, stockMinimo: 10, precioVenta: 12.50, isActive: true
    });
    const venta = await registrarVenta("Efectivo", [
        { productoId: producto.productoId, cantidad: 3 }
    ]);
    console.log(await obtenerVenta(venta.ventaId));
    console.log(await listarInventario());
} catch (error) {
    console.error(error.status, error.message);
}
```

`editarProducto(id, producto)` recibe el producto completo; `existencia` representa
el saldo absoluto que se quiere guardar, no una entrada adicional. Evita enviar
existencias de una pantalla desactualizada mientras se registran ventas.
Para desactivar, conserva los demás campos y envía `isActive: false`.

Los métodos de pago son `Efectivo`, `Tarjeta` y `Transferencia`.
Cada producto debe aparecer una sola vez por venta. El servidor utiliza el usuario
de la sesión y los precios del inventario; calcula los subtotales en SQL.
Si falta stock o un producto está inactivo, revierte toda la venta y devuelve 409.
No se incluyen eliminación o edición de ventas para conservar su historial.

Pruebas de lógica sin conexión SQL: `node --test scripts/test-comercial.js`.
Las páginas todavía deben llamar a estos servicios para mostrar los datos.

## Reportes

`GET /api/reportes` requiere sesión y devuelve ventas con sus detalles, usando
los subtotales históricos guardados. No necesita una tabla adicional.
La página `frontend/pages/reportes.html` filtra por fechas inclusivas (el día
registrado en SQL), muestra ingresos en MXN, promedio, historial y gráficos.
El pastel compara cantidades dentro de una misma unidad de medida; agrupa como
«Otros productos» los productos posteriores a los seis primeros.
Los ingresos no representan utilidad: todavía no se descuentan costos.
El botón PDF queda deshabilitado hasta implementar la descarga.
Reinicia el backend después de incorporar la nueva ruta.

Pruebas: `node --test scripts/test-reportes.js scripts/test-comercial.js`.
