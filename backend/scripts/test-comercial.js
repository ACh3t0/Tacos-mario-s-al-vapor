const assert = require("node:assert/strict");
const { test } = require("node:test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const validacion = require("../servicios/validacionComercial");

// Doble de SQL para verificar la lógica sin modificar la base de datos del usuario.
function preparar() {
    const estado = { stock: 5, ventas: 0, detalles: [], commits: 0, rollbacks: 0 };
    class Transaction {
        async begin() { this.anterior = structuredClone(estado); }
        on() {}
        async commit() { estado.commits++; }
        async rollback() { Object.assign(estado, this.anterior); estado.rollbacks++; }
        request() {
            const valores = {};
            return {
                input(nombre, tipo, valor) { valores[nombre] = valor; return this; },
                async query(texto) {
                    if (texto.includes("INSERT INTO dbo.ventas")) {
                        estado.ventas++;
                        estado.usuario = valores.userId;
                        return { recordset: [{ ventaId: 1 }] };
                    }
                    if (texto.includes("UPDATE dbo.inventario")) {
                        if (valores.productoId !== 1 || estado.stock < valores.cantidad) return { recordset: [] };
                        estado.stock -= valores.cantidad;
                        return { recordset: [{ precioVenta: 12.5 }] };
                    }
                    if (texto.includes("INSERT INTO dbo.detalleVenta")) {
                        estado.detalles.push({ ...valores });
                        return {};
                    }
                    return { recordsets: [[{ ventaId: 1 }], estado.detalles] };
                }
            };
        }
    }
    const contexto = {
        module: { exports: {} }, console,
        require(nombre) {
            if (nombre === "./validacionComercial") return validacion;
            if (nombre === "./databaseLogin.service") return {
                getConnection: async () => ({}),
                sql: { Transaction, Int: "int", NVarChar: () => "text", Decimal: () => "decimal" }
            };
            throw new Error(`Módulo inesperado: ${nombre}`);
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../servicios/ventas.service.js"), "utf8"), contexto);
    return { estado, ...contexto.module.exports };
}

test("valida límites, tipos y precisión de cantidades/precios", () => {
    for (const valor of [-1, NaN, Infinity, "2", null, 1.0001, 1000000000]) {
        assert.equal(validacion.decimalValido(valor, 3), false);
    }
    assert.equal(validacion.decimalValido(999999999.999, 3), true);
    assert.equal(validacion.decimalValido(12.25, 2), true);
    assert.equal(validacion.decimalValido(12.251, 2), false);
});

test("registra usando el usuario recibido del servidor y el precio de SQL", async () => {
    const servicio = preparar();
    await servicio.registrarVenta(7, { metodoPago: "Efectivo", userId: 999,
        detalles: [{ productoId: 1, cantidad: 2, precioUnitario: 0 }] });
    assert.equal(servicio.estado.stock, 3);
    assert.equal(servicio.estado.usuario, 7);
    assert.equal(servicio.estado.detalles[0].precio, 12.5);
    assert.equal(servicio.estado.commits, 1);
});

test("revierte encabezado, detalle y stock si falla el segundo producto", async () => {
    const servicio = preparar();
    await assert.rejects(servicio.registrarVenta(7, { metodoPago: "Tarjeta",
        detalles: [{ productoId: 1, cantidad: 2 }, { productoId: 2, cantidad: 1 }] }), { status: 409 });
    assert.equal(servicio.estado.stock, 5);
    assert.equal(servicio.estado.ventas, 0);
    assert.equal(servicio.estado.detalles.length, 0);
    assert.equal(servicio.estado.rollbacks, 1);
});

test("rechaza ventas vacías, duplicados y cantidades inválidas antes de guardar", async () => {
    for (const detalles of [[], [{ productoId: 1, cantidad: 0 }],
        [{ productoId: 1, cantidad: 1 }, { productoId: 1, cantidad: 2 }]]) {
        const servicio = preparar();
        await assert.rejects(servicio.registrarVenta(7, { metodoPago: "Efectivo", detalles }), { status: 400 });
        assert.equal(servicio.estado.ventas, 0);
    }
});
