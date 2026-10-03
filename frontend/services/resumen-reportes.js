// Las fechas conservan el día registrado en SQL, sin conversiones de zona horaria.
export function resumirVentas(ventas, desde = "", hasta = "") {
    const seleccion = ventas.filter(v => (!desde || v.fecha.slice(0, 10) >= desde) &&
        (!hasta || v.fecha.slice(0, 10) <= hasta));
    const productos = new Map();
    const dias = new Map();
    let centavos = 0;
    const historial = seleccion.map(venta => {
        const importe = venta.detalles.reduce((s, d) => s + Math.round(Number(d.subtotal) * 100), 0);
        centavos += importe;
        const dia = venta.fecha.slice(0, 10);
        dias.set(dia, (dias.get(dia) || 0) + importe);
        for (const d of venta.detalles) {
            const producto = productos.get(d.productoId) || {
                productoId: d.productoId, nombre: d.nombre, unidad: d.unidad, cantidad: 0
            };
            producto.cantidad += Number(d.cantidad);
            productos.set(d.productoId, producto);
        }
        return { ...venta, total: importe / 100 };
    });
    return {
        total: centavos / 100, historial,
        dias: [...dias].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, valor]) => ({ fecha, total: valor / 100 })),
        productos: [...productos.values()].sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre))
    };
}
