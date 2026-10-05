const { sql, getConnection } = require("./databaseLogin.service");
const { exigir, idValido, decimalValido } = require("./validacionComercial");

const resumen = `SELECT v.ventaId, v.fecha, v.userId, u.userName, v.metodoPago, v.estadoPedido,
    COALESCE((SELECT SUM(d.subtotal) FROM dbo.detalleVenta d WHERE d.ventaId=v.ventaId), 0) AS total
    FROM dbo.ventas v INNER JOIN dbo.users u ON u.userId=v.userId`;

async function listarVentas() {
    const pool = await getConnection();
    return (await pool.request().query(`${resumen} ORDER BY v.fecha DESC, v.ventaId DESC`)).recordset;
}

async function listarPedidos(estadoPedido) {
    exigir(["Activo", "Completado"].includes(estadoPedido), "Estado de pedido no válido.");
    const pool = await getConnection();
    const resultado = await pool.request()
        .input("estadoPedido", sql.NVarChar(12), estadoPedido)
        .query(`
            SELECT v.ventaId, CONVERT(varchar(19), v.fecha, 126) AS fecha,
                v.userId, u.userName, v.metodoPago, v.estadoPedido,
                COALESCE((SELECT SUM(dv.subtotal) FROM dbo.detalleVenta dv
                    WHERE dv.ventaId=v.ventaId), 0) AS total,
                d.detalleVentaId, d.productoId, i.nombre, d.cantidad,
                d.precioUnitario, d.subtotal
            FROM dbo.ventas v
            INNER JOIN dbo.users u ON u.userId=v.userId
            LEFT JOIN dbo.detalleVenta d ON d.ventaId=v.ventaId
            LEFT JOIN dbo.inventario i ON i.productoId=d.productoId
            WHERE v.estadoPedido=@estadoPedido
            ORDER BY v.fecha DESC, v.ventaId DESC, d.detalleVentaId
        `);

    const pedidos = new Map();
    for (const fila of resultado.recordset) {
        if (!pedidos.has(fila.ventaId)) {
            pedidos.set(fila.ventaId, {
                ventaId: fila.ventaId,
                fecha: fila.fecha,
                userId: fila.userId,
                userName: fila.userName,
                metodoPago: fila.metodoPago,
                estadoPedido: fila.estadoPedido,
                total: fila.total,
                detalles: []
            });
        }
        if (fila.detalleVentaId !== null) {
            pedidos.get(fila.ventaId).detalles.push({
                productoId: fila.productoId,
                nombre: fila.nombre,
                cantidad: fila.cantidad,
                precioUnitario: fila.precioUnitario,
                subtotal: fila.subtotal
            });
        }
    }
    return [...pedidos.values()];
}

async function completarPedido(ventaId) {
    exigir(idValido(ventaId), "Pedido no válido.");
    const pool = await getConnection();
    const resultado = await pool.request()
        .input("ventaId", sql.Int, ventaId)
        .query(`
            UPDATE dbo.ventas
            SET estadoPedido=N'Completado'
            OUTPUT INSERTED.ventaId, INSERTED.estadoPedido
            WHERE ventaId=@ventaId AND estadoPedido=N'Activo'
        `);
    exigir(resultado.recordset.length, "El pedido ya se completó o no está activo.", 409);
    return resultado.recordset[0];
}

async function leerVenta(conexion, ventaId) {
    const resultado = await conexion.request().input("ventaId", sql.Int, ventaId).query(`
        ${resumen} WHERE v.ventaId=@ventaId;
        SELECT d.detalleVentaId, d.productoId, i.nombre, d.cantidad, d.precioUnitario, d.subtotal
        FROM dbo.detalleVenta d INNER JOIN dbo.inventario i ON i.productoId=d.productoId
        WHERE d.ventaId=@ventaId ORDER BY d.detalleVentaId;
    `);
    exigir(resultado.recordsets[0].length, "Venta no encontrada.", 404);
    return { ...resultado.recordsets[0][0], detalles: resultado.recordsets[1] };
}

async function obtenerVenta(ventaId) {
    exigir(idValido(ventaId), "Venta no válida.");
    return leerVenta(await getConnection(), ventaId);
}

async function registrarVenta(userId, datos) {
    userId = Number(userId) || 1;
    const { metodoPago, detalles } = datos ?? {};
    exigir(["Efectivo", "Tarjeta", "Transferencia"].includes(metodoPago), "Método de pago no válido.");
    exigir(Array.isArray(detalles) && detalles.length > 0 && detalles.length <= 100,
        "La venta debe contener entre 1 y 100 productos.");
    const ids = new Set();
    for (const detalle of detalles) {
        exigir(detalle && idValido(detalle.productoId) && decimalValido(detalle.cantidad, 3) && detalle.cantidad > 0,
            "Cada detalle debe incluir productoId y una cantidad positiva de hasta 3 decimales.");
        exigir(!ids.has(detalle.productoId), "Agrupa las cantidades de cada producto en un solo detalle.");
        ids.add(detalle.productoId);
    }
    const pool = await getConnection();
    const transaccion = new sql.Transaction(pool);
    await transaccion.begin();
    let finalizada = false;
    transaccion.on("rollback", () => { finalizada = true; });
    try {
        const cabecera = await transaccion.request()
            .input("userId", sql.Int, userId).input("metodoPago", sql.NVarChar(20), metodoPago)
            .query(`INSERT INTO dbo.ventas (userId, metodoPago, estadoPedido)
                OUTPUT INSERTED.ventaId VALUES (@userId, @metodoPago, N'Activo')`);
        const ventaId = cabecera.recordset[0].ventaId;
        // Orden estable de bloqueos para ventas simultáneas con varios productos.
        for (const { productoId, cantidad } of [...detalles].sort((a, b) => a.productoId - b.productoId)) {
            const producto = await transaccion.request()
                .input("productoId", sql.Int, productoId).input("cantidad", sql.Decimal(12, 3), cantidad)
                .query(`UPDATE dbo.inventario SET existencia=existencia-@cantidad
                    OUTPUT INSERTED.precioVenta
                    WHERE productoId=@productoId AND isActive=1 AND existencia>=@cantidad`);
            exigir(producto.recordset.length, `El producto ${productoId} no está disponible o no tiene stock suficiente.`, 409);
            // El precio procede de SQL; el cliente no puede cambiarlo.
            await transaccion.request().input("ventaId", sql.Int, ventaId)
                .input("productoId", sql.Int, productoId).input("cantidad", sql.Decimal(12, 3), cantidad)
                .input("precio", sql.Decimal(12, 2), producto.recordset[0].precioVenta)
                .query(`INSERT INTO dbo.detalleVenta (ventaId, productoId, cantidad, precioUnitario)
                    VALUES (@ventaId, @productoId, @cantidad, @precio)`);
        }
        const venta = await leerVenta(transaccion, ventaId);
        await transaccion.commit();
        finalizada = true;
        return venta;
    } catch (error) {
        if (!finalizada) await transaccion.rollback().catch(err => console.error("Error al revertir venta:", err.message));
        throw error;
    }
}

module.exports = { listarVentas, listarPedidos, completarPedido, obtenerVenta, registrarVenta };
