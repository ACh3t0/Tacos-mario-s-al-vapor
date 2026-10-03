const { getConnection } = require("./databaseLogin.service");

async function obtenerReporte() {
    const pool = await getConnection();
    // Una sola consulta conserva ventas sin detalles y evita una petición por venta.
    const resultado = await pool.request().query(`
        SELECT v.ventaId, CONVERT(varchar(19), v.fecha, 126) AS fecha,
            u.userName, v.metodoPago, d.productoId, i.nombre, i.unidad,
            d.cantidad, d.precioUnitario, d.subtotal
        FROM dbo.ventas v
        LEFT JOIN dbo.users u ON u.userId = v.userId
        LEFT JOIN dbo.detalleVenta d ON d.ventaId = v.ventaId
        LEFT JOIN dbo.inventario i ON i.productoId = d.productoId
        ORDER BY v.fecha DESC, v.ventaId DESC, d.detalleVentaId
    `);
    const ventas = new Map();
    for (const fila of resultado.recordset) {
        if (!ventas.has(fila.ventaId)) ventas.set(fila.ventaId, {
            ventaId: fila.ventaId, fecha: fila.fecha, userName: fila.userName,
            metodoPago: fila.metodoPago, detalles: []
        });
        if (fila.productoId != null) ventas.get(fila.ventaId).detalles.push({
            productoId: fila.productoId, nombre: fila.nombre || "Producto " + fila.productoId,
            unidad: fila.unidad, cantidad: fila.cantidad,
            precioUnitario: fila.precioUnitario, subtotal: fila.subtotal
        });
    }
    return [...ventas.values()];
}
module.exports = { obtenerReporte };
