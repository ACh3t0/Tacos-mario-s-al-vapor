const { sql, getConnection } = require("./databaseLogin.service");
const { exigir, idValido, decimalValido } = require("./validacionComercial");

async function listarInventario() {
    const pool = await getConnection();
    return (await pool.request().query("SELECT * FROM dbo.inventario ORDER BY nombre, productoId")).recordset;
}

async function obtenerProducto(productoId) {
    exigir(idValido(productoId), "Producto no válido.");
    const pool = await getConnection();
    const resultado = await pool.request().input("productoId", sql.Int, productoId)
        .query("SELECT * FROM dbo.inventario WHERE productoId = @productoId");
    exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    return resultado.recordset[0];
}

// Crear admite existencias iniciales; editar actualiza todos los campos del producto.
async function guardarProducto(datos, productoId = null) {
    exigir(datos && typeof datos === "object", "Envía los datos del producto.");
    const { nombre, descripcion = null, unidad = "pieza", existencia = 0,
        stockMinimo = 0, precioVenta, isActive = true } = datos;
    exigir(typeof nombre === "string" && nombre.trim().length > 0 && nombre.trim().length <= 100,
        "El nombre debe tener entre 1 y 100 caracteres.");
    exigir(descripcion === null || (typeof descripcion === "string" && descripcion.length <= 255),
        "La descripción debe tener hasta 255 caracteres.");
    exigir(typeof unidad === "string" && unidad.trim().length > 0 && unidad.trim().length <= 20,
        "La unidad debe tener entre 1 y 20 caracteres.");
    exigir(decimalValido(existencia, 3) && decimalValido(stockMinimo, 3) && decimalValido(precioVenta, 2),
        "Revisa existencias, stock mínimo y precio: deben ser números no negativos, con hasta 3 decimales para cantidades y 2 para precios.");
    exigir(typeof isActive === "boolean", "El estado debe ser verdadero o falso.");
    exigir(productoId === null || idValido(productoId), "Producto no válido.");
    const pool = await getConnection();
    const peticion = pool.request()
        .input("nombre", sql.NVarChar(100), nombre.trim())
        .input("descripcion", sql.NVarChar(255), descripcion)
        .input("unidad", sql.NVarChar(20), unidad.trim())
        .input("existencia", sql.Decimal(12, 3), existencia)
        .input("stockMinimo", sql.Decimal(12, 3), stockMinimo)
        .input("precioVenta", sql.Decimal(12, 2), precioVenta)
        .input("isActive", sql.Bit, isActive);
    let resultado;
    if (productoId === null) {
        resultado = await peticion.query(`
            INSERT INTO dbo.inventario (nombre, descripcion, unidad, existencia, stockMinimo, precioVenta, isActive)
            OUTPUT INSERTED.*
            VALUES (@nombre, @descripcion, @unidad, @existencia, @stockMinimo, @precioVenta, @isActive)
        `);
    } else {
        resultado = await peticion.input("productoId", sql.Int, productoId).query(`
            UPDATE dbo.inventario
            SET nombre=@nombre, descripcion=@descripcion, unidad=@unidad,
                existencia=@existencia, stockMinimo=@stockMinimo, precioVenta=@precioVenta, isActive=@isActive
            OUTPUT INSERTED.* WHERE productoId=@productoId
        `);
        exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    }
    return resultado.recordset[0];
}

async function agregarExistencia(productoId, cantidad) {
    exigir(idValido(productoId), "Producto no válido.");
    exigir(decimalValido(cantidad, 3) && cantidad > 0,
        "La cantidad a agregar debe ser un número positivo de hasta 3 decimales.");
    const pool = await getConnection();
    const resultado = await pool.request()
        .input("productoId", sql.Int, productoId)
        .input("cantidad", sql.Decimal(12, 3), cantidad)
        .query(`
            UPDATE dbo.inventario
            SET existencia = existencia + @cantidad
            OUTPUT INSERTED.*
            WHERE productoId = @productoId
        `);
    exigir(resultado.recordset.length, "Producto no encontrado.", 404);
    return resultado.recordset[0];
}

module.exports = {
    listarInventario, obtenerProducto,
    crearProducto: datos => guardarProducto(datos),
    editarProducto: (id, datos) => guardarProducto(datos, id),
    agregarExistencia
};
