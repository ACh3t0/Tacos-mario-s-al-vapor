import { protegerPagina } from "../services/sesion.js";
import { listarInventario, agregarExistencia, obtenerProducto, editarProducto } from "../services/inventario.service.js";

const $ = id => document.getElementById(id);
const ADMIN = 2;
const DESARROLLADOR = 3;
let puedeGestionar = false;

function avisar(texto, esError = false) {
    const mensaje = $("mensaje");
    mensaje.textContent = texto;
    mensaje.className = esError ? "error" : "ok";
    mensaje.hidden = false;
}

function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
}

function manejarError(error) {
    if (error.status === 401) {
        location.href = "./login.html";
        return;
    }
    avisar(error.message, true);
}

function dibujarTabla(productos) {
    const cuerpo = $("tabla-inventario");
    cuerpo.replaceChildren();

    if (productos.length === 0) {
        const fila = document.createElement("tr");
        const celdaVacia = celda("No hay productos registrados.");
        celdaVacia.colSpan = 5;
        fila.appendChild(celdaVacia);
        cuerpo.appendChild(fila);
        return;
    }

    // Calcular cuántas órdenes mixtas se pueden armar
    const totalTacos = productos
        .filter(p => p.nombre.toLowerCase().includes("taco") && !p.nombre.toLowerCase().includes("orden mixta"))
        .reduce((suma, p) => suma + Number(p.existencia), 0);
    const ordenesPosibles = Math.floor(totalTacos / 5);

    for (const producto of productos) {
        const esOrdenMixta = producto.nombre.toLowerCase().includes("orden mixta");
        const existenciaMostrar = esOrdenMixta ? ordenesPosibles : Number(producto.existencia);

        const fila = document.createElement("tr");
        if (!producto.isActive) fila.classList.add("inactivo");
        fila.append(
            celda(producto.nombre),
            celda(`$${Number(producto.precioVenta).toFixed(2)}`),
            celda(`${existenciaMostrar} ${producto.unidad}`),
            celda(producto.isActive ? "Activo" : "Desactivado")
        );

        const acciones = document.createElement("td");
        
        if (esOrdenMixta) {
            acciones.textContent = "Cálculo automático";
            acciones.style.color = "#888"; 
            acciones.style.fontStyle = "italic";
        } else if (puedeGestionar && producto.isActive) {
            const formulario = document.createElement("form");
            formulario.className = "acciones-stock";

            const cantidad = document.createElement("input");
            cantidad.type = "number";
            cantidad.min = "0.001";
            cantidad.step = "0.001";
            cantidad.required = true;
            cantidad.placeholder = "Cant.";
            cantidad.setAttribute("aria-label", `Unidades a modificar de ${producto.nombre}`);

            const btnAgregar = document.createElement("button");
            btnAgregar.type = "submit";
            btnAgregar.textContent = "Agregar";

            const btnRestar = document.createElement("button");
            btnRestar.type = "button";
            btnRestar.textContent = "Retirar";
            btnRestar.className = "btn-restar";

            formulario.append(cantidad, btnAgregar, btnRestar);

            // ACCIÓN: AGREGAR STOCK
            formulario.addEventListener("submit", async evento => {
                evento.preventDefault();
                if (!cantidad.reportValidity()) return;

                btnAgregar.disabled = true;
                btnRestar.disabled = true;
                try {
                    const actualizado = await agregarExistencia(producto.productoId, Number(cantidad.value));
                    avisar(`Existencia sumada: ${actualizado.nombre} ahora tiene ${Number(actualizado.existencia)} ${actualizado.unidad}.`);
                    await cargar();
                } catch (error) {
                    manejarError(error);
                } finally {
                    btnAgregar.disabled = false;
                    btnRestar.disabled = false;
                }
            });

            // ACCIÓN: RETIRAR STOCK (MERMA)
            btnRestar.addEventListener("click", async () => {
                if (!cantidad.reportValidity()) return;
                const cant = Number(cantidad.value);
                
                if (cant > producto.existencia) {
                    avisar(`No puedes retirar ${cant}. Solo hay ${producto.existencia} disponibles en pantalla.`, true);
                    return;
                }

                if (!confirm(`¿Seguro que deseas retirar ${cant} ${producto.unidad} de ${producto.nombre} del inventario?`)) return;

                btnAgregar.disabled = true;
                btnRestar.disabled = true;
                try {
                    // 1. Pedimos el producto fresco a la base de datos para evitar desajustes si alguien más vendió
                    const p = await obtenerProducto(producto.productoId);
                    if (cant > p.existencia) {
                        throw new Error(`Stock real insuficiente. Solo quedan ${p.existencia}.`);
                    }

                    // 2. Armamos el producto actualizado restando la cantidad y lo guardamos
                    const productoActualizado = { ...p, existencia: p.existencia - cant };
                    const actualizado = await editarProducto(producto.productoId, productoActualizado);

                    avisar(`Se retiraron ${cant}. ${actualizado.nombre} ahora tiene ${Number(actualizado.existencia)} ${actualizado.unidad}.`);
                    await cargar();
                } catch (error) {
                    manejarError(error);
                } finally {
                    btnAgregar.disabled = false;
                    btnRestar.disabled = false;
                }
            });

            acciones.appendChild(formulario);
        } else {
            acciones.textContent = puedeGestionar ? "No disponible" : "Solo lectura";
        }
        fila.appendChild(acciones);
        cuerpo.appendChild(fila);
    }
}

async function cargar() {
    try {
        dibujarTabla(await listarInventario());
    } catch (error) {
        manejarError(error);
    }
}

async function iniciar() {
    const sesion = await protegerPagina();
    if (!sesion) return;

    puedeGestionar = [ADMIN, DESARROLLADOR].includes(sesion.accountType);
    $("ayuda-inventario").textContent = puedeGestionar
        ? "Escribe la cantidad y usa 'Agregar' para compras o 'Retirar' para mermas."
        : "Puedes consultar las existencias. Solo Admin o Desarrollador puede modificar el stock.";
    await cargar();
}

iniciar();