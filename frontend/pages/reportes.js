import { protegerPagina } from "../services/sesion.js";
import { obtenerReporte } from "../services/reportes.service.js";
import { resumirVentas } from "../services/resumen-reportes.js";

const $ = id => document.getElementById(id);
const moneda = valor => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(valor);
const numero = valor => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(valor);
const colores = ["#ad7415", "#277e78", "#ca6752", "#7866aa", "#508bb1", "#859344", "#b84f80"];
let ventas = [];
function nodo(tag, texto, clase) {
    const elemento = document.createElement(tag);
    if (texto !== undefined) elemento.textContent = texto;
    if (clase) elemento.className = clase;
    return elemento;
}
function mostrar() {
    const desde = $("desde").value, hasta = $("hasta").value;
    $("hasta").setCustomValidity(desde && hasta && desde > hasta ? "La fecha final debe ser igual o posterior a la inicial." : "");
    if (!$("filtros").reportValidity()) return;
    const resumen = resumirVentas(ventas, desde, hasta);
    $("ingresos").textContent = moneda(resumen.total);
    $("cantidad-ventas").textContent = numero(resumen.historial.length);
    $("promedio").textContent = moneda(resumen.historial.length ? resumen.total / resumen.historial.length : 0);
    $("estado").textContent = resumen.historial.length ? "Datos de las ventas registradas. Importes en MXN." : "No hay ventas registradas para este período.";
    $("barras").replaceChildren();
    const maximo = resumen.dias.reduce((max, dia) => Math.max(max, dia.total), 1);
    for (const dia of resumen.dias) {
        const columna = nodo("div", undefined, "columna");
        const barra = nodo("div", undefined, "barra");
        barra.style.height = Math.max(2, dia.total / maximo * 150) + "px";
        barra.title = dia.fecha + ": " + moneda(dia.total);
        columna.append(nodo("span", moneda(dia.total), "importe-dia"), barra, nodo("span", dia.fecha.slice(5)));
        $("barras").append(columna);
    }
    if (!resumen.dias.length) $("barras").append(nodo("p", "Sin ventas para graficar.", "vacio"));
    const unidades = [...new Set(resumen.productos.map(p => p.unidad))];
    const anterior = $("unidad").value;
    $("unidad").replaceChildren(...unidades.map(unidad => {
        const opcion = nodo("option", unidad || "Sin unidad");
        opcion.value = unidad || "";
        return opcion;
    }));
    if (unidades.includes(anterior)) $("unidad").value = anterior;
    $("unidad").disabled = !unidades.length;
    function pastel() {
        const productos = resumen.productos.filter(p => (p.unidad || "") === $("unidad").value);
        const cantidad = productos.reduce((s, p) => s + p.cantidad, 0);
        // Agrupa el resto para que cada color del pastel tenga una leyenda inequívoca.
        const porciones = productos.slice(0, 6);
        if (productos.length > 6) porciones.push({ nombre: "Otros productos", cantidad: productos.slice(6).reduce((s, p) => s + p.cantidad, 0) });
        let avance = 0;
        const segmentos = [];
        $("leyenda").replaceChildren();
        porciones.forEach((producto, i) => {
            const porcentaje = cantidad ? producto.cantidad / cantidad * 100 : 0;
            segmentos.push(colores[i] + " " + avance + "% " + (avance + porcentaje) + "%");
            avance += porcentaje;
            const fila = nodo("li");
            const punto = nodo("span", undefined, "punto");
            punto.style.background = colores[i];
            fila.append(punto, nodo("span", producto.nombre), nodo("strong", numero(producto.cantidad) + " · " + porcentaje.toFixed(1) + "%"));
            $("leyenda").append(fila);
        });
        $("pastel").style.background = cantidad ? "conic-gradient(" + segmentos.join(",") + ")" : "#e7e3da";
        $("pastel").setAttribute("aria-label", cantidad ? "Distribución por cantidad vendida. Detalles en la lista siguiente." : "Sin productos vendidos.");
        const lideres = productos.filter(p => p.cantidad === productos[0]?.cantidad);
        $("lider").textContent = cantidad ? (lideres.length > 1 ? "Empate: " : "Más vendido: ") + lideres.map(p => p.nombre).join(", ") : "Sin productos vendidos.";
    }
    $("unidad").onchange = pastel;
    pastel();
    $("historial").replaceChildren();
    for (const venta of resumen.historial) {
        const fila = nodo("tr");
        fila.append(nodo("td", "#" + venta.ventaId), nodo("td", venta.fecha.replace("T", " ")), nodo("td", venta.userName || "—"), nodo("td", venta.metodoPago));
        const celda = nodo("td");
        const detalle = nodo("details");
        detalle.append(nodo("summary", venta.detalles.length + " productos"));
        const lista = nodo("ul");
        for (const d of venta.detalles) lista.append(nodo("li", numero(d.cantidad) + " " + (d.unidad || "") + " × " + d.nombre + " · " + moneda(d.precioUnitario) + " = " + moneda(d.subtotal)));
        detalle.append(lista);
        celda.append(detalle);
        fila.append(celda, nodo("td", moneda(venta.total)));
        $("historial").append(fila);
    }
    if (!resumen.historial.length) {
        const fila = nodo("tr"), celda = nodo("td", "No hay ventas en este período.", "vacio");
        celda.colSpan = 6;
        fila.append(celda);
        $("historial").append(fila);
    }
}
async function cargar() {
    $("actualizar").disabled = true;
    $("aplicar").disabled = true;
    $("estado").textContent = "Cargando ventas…";
    $("estado").classList.remove("error");
    $("resultados").hidden = true;
    let cargado = false;
    try {
        ventas = await obtenerReporte();
        cargado = true;
        mostrar();
        $("resultados").hidden = false;
    } catch (error) {
        if (error.status === 401) { location.href = "./login.html"; return; }
        $("estado").textContent = "No se pudieron cargar los reportes. " + error.message + " Puedes volver a intentar con Actualizar.";
        $("estado").classList.add("error");
    } finally {
        $("actualizar").disabled = false;
        $("aplicar").disabled = !cargado;
    }
}
$("filtros").addEventListener("submit", event => { event.preventDefault(); mostrar(); });
$("hasta").addEventListener("input", () => $("hasta").setCustomValidity(""));
$("desde").addEventListener("input", () => $("hasta").setCustomValidity(""));
$("actualizar").addEventListener("click", cargar);
if (await protegerPagina()) await cargar();
