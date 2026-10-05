import { protegerPagina } from "../services/sesion.js";
import { listarInventario, agregarExistencia } from "../services/inventario.service.js";

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

    for (const producto of productos) {
        const fila = document.createElement("tr");
        if (!producto.isActive) fila.classList.add("inactivo");
        fila.append(
            celda(producto.nombre),
            celda(`$${Number(producto.precioVenta).toFixed(2)}`),
            celda(`${Number(producto.existencia)} ${producto.unidad}`),
            celda(producto.isActive ? "Activo" : "Desactivado")
        );

        const acciones = document.createElement("td");
        if (puedeGestionar && producto.isActive) {
            const formulario = document.createElement("form");
            formulario.className = "acciones-stock";

            const cantidad = document.createElement("input");
            cantidad.type = "number";
            cantidad.min = "0.001";
            cantidad.step = "0.001";
            cantidad.required = true;
            cantidad.setAttribute("aria-label", `Unidades que se agregan a ${producto.nombre}`);

            const boton = document.createElement("button");
            boton.type = "submit";
            boton.textContent = "Agregar";
            formulario.append(cantidad, boton);
            formulario.addEventListener("submit", async evento => {
                evento.preventDefault();
                if (!cantidad.reportValidity()) return;

                boton.disabled = true;
                try {
                    const actualizado = await agregarExistencia(producto.productoId, Number(cantidad.value));
                    avisar(`Existencia actualizada: ${actualizado.nombre} ahora tiene ${Number(actualizado.existencia)} ${actualizado.unidad}.`);
                    await cargar();
                } catch (error) {
                    manejarError(error);
                } finally {
                    boton.disabled = false;
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
        ? "Escribe la cantidad que deseas sumar a las existencias actuales. Los productos nuevos comienzan con existencia 0."
        : "Puedes consultar las existencias. Solo Admin o Desarrollador puede agregar stock.";
    await cargar();
}

iniciar();
