const db = require('../servicios/databaseLogin.service');

async function corregir() {
    try {
        const pool = await db.getConnection();
        const resultado = await pool.request().query(`
            UPDATE dbo.inventario SET unidad = N'pieza'
            OUTPUT INSERTED.productoId, INSERTED.nombre, INSERTED.unidad
            WHERE LOWER(LTRIM(RTRIM(unidad))) = N'pendiente';
            SELECT COUNT(*) AS pendientes FROM dbo.inventario
            WHERE LOWER(LTRIM(RTRIM(unidad))) = N'pendiente';
        `);
        console.log(JSON.stringify(resultado.recordsets));
    } finally {
        await db.closeConnection();
    }
}

corregir().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
