const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function resumen() {
    const archivo = path.join(__dirname, '../../frontend/services/resumen-reportes.js');
    return import('data:text/javascript;base64,' + fs.readFileSync(archivo).toString('base64'));
}
const ventas = [
    { ventaId: 2, fecha: '2026-10-03T23:59:59', detalles: [
        { productoId: 1, nombre: 'Papa', unidad: 'pieza', cantidad: 2, subtotal: 25 },
        { productoId: 2, nombre: 'Frijol', unidad: 'pieza', cantidad: 1, subtotal: 10 }
    ] },
    { ventaId: 1, fecha: '2026-10-02T00:00:00', detalles: [
        { productoId: 2, nombre: 'Frijol', unidad: 'pieza', cantidad: 3, subtotal: 30 }
    ] }
];
test('suma importes históricos y ordena productos por cantidad', async () => {
    const { resumirVentas } = await resumen();
    const resultado = resumirVentas(ventas);
    assert.equal(resultado.total, 65);
    assert.equal(resultado.historial[0].total, 35);
    assert.equal(resultado.productos[0].nombre, 'Frijol');
    assert.equal(resultado.productos[0].cantidad, 4);
    assert.deepEqual(resultado.dias.map(d => d.total), [30, 35]);
});
test('incluye ambos extremos de fecha sin cambiar el día de SQL', async () => {
    const { resumirVentas } = await resumen();
    assert.equal(resumirVentas(ventas, '2026-10-03', '2026-10-03').total, 35);
    assert.equal(resumirVentas(ventas, '', '2026-10-02').total, 30);
    assert.equal(resumirVentas(ventas, '2026-10-04').historial.length, 0);
    assert.equal(resumirVentas([]).total, 0);
});
test('evita errores de suma decimal en los importes', async () => {
    const { resumirVentas } = await resumen();
    assert.equal(resumirVentas([{ fecha: '2026-10-03', detalles: [
        { productoId: 1, nombre: 'Papa', cantidad: 1, subtotal: 0.1 },
        { productoId: 1, nombre: 'Papa', cantidad: 1, subtotal: 0.2 }
    ] }]).total, 0.3);
});
test('agrupa las filas SQL sin duplicar ventas y conserva ventas sin detalles', async () => {
    const filas = [
        { ventaId: 1, fecha: '2026-10-03T12:00:00', productoId: 1, cantidad: 2, subtotal: 25 },
        { ventaId: 1, fecha: '2026-10-03T12:00:00', productoId: 2, cantidad: 1, subtotal: 10 },
        { ventaId: 2, fecha: '2026-10-02T12:00:00', productoId: null }
    ];
    const contexto = { module: { exports: {} }, require: () => ({
        getConnection: async () => ({ request: () => ({ query: async () => ({ recordset: filas }) }) })
    }) };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../servicios/reportes.service.js'), 'utf8'), contexto);
    const resultado = await contexto.module.exports.obtenerReporte();
    assert.equal(resultado.length, 2);
    assert.equal(resultado[0].detalles.length, 2);
    assert.equal(resultado[1].detalles.length, 0);
});
