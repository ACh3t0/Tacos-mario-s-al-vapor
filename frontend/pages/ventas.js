let inventarioDisponible = [];
let ordenActual = [];

const selectProducto = document.getElementById("select-producto");
const inputCantidad = document.getElementById("input-cantidad");
const btnAgregar = document.getElementById("btn-agregar");
const listaOrden = document.getElementById("lista-orden");
const totalVenta = document.getElementById("total-venta");
const selectPago = document.getElementById("select-pago");
const btnCobrar = document.getElementById("btn-cobrar");

// Elementos del nuevo panel de Orden Mixta
const panelOrdenMixta = document.getElementById("panel-orden-mixta");
const saboresMixta = document.getElementById("sabores-mixta");
const contadorMixta = document.getElementById("contador-mixta");
const contenedorCantidad = document.getElementById("contenedor-cantidad");

// 1. Cargar el catálogo y calcular el stock dinámico de la mixta
async function cargarInventario() {
    try {
        const respuesta = await fetch("/api/inventario");
        if (!respuesta.ok) throw new Error("No se pudo obtener el inventario");
        const productos = await respuesta.json();
        
        // Calculamos cuántos tacos en total hay en cocina
        const totalTacos = productos
            .filter(p => p.nombre.toLowerCase().includes("taco"))
            .reduce((suma, p) => suma + Number(p.existencia ?? 0), 0);
        
        // El stock de órdenes mixtas será la cantidad total de tacos dividida entre 5
        const ordenesPosibles = Math.floor(totalTacos / 5);

        inventarioDisponible = productos.map(p => {
            const esMixta = p.nombre.toLowerCase().includes("orden mixta");
            return {
                productoId: Number(p.productoId ?? p.id ?? p.id_producto),
                nombre: p.nombre,
                precioVenta: Number(p.precioVenta ?? p.precio ?? 0),
                existencia: esMixta ? ordenesPosibles : Number(p.existencia ?? 0),
                isActive: (p.isActive === true || p.isActive === 1),
                esMixta: esMixta,
                esTacoIndividual: p.nombre.toLowerCase().includes("taco") && !esMixta
            };
        }).filter(p => p.isActive);

        selectProducto.innerHTML = '<option value="">-- Selecciona un producto --</option>';
        inventarioDisponible.forEach(prod => {
            const opcion = document.createElement("option");
            opcion.value = prod.productoId;
            opcion.textContent = prod.existencia > 0
                ? `${prod.nombre} - $${prod.precioVenta.toFixed(2)} (Stock: ${prod.existencia})`
                : `${prod.nombre} - $${prod.precioVenta.toFixed(2)} (Sin existencias)`;
            opcion.disabled = prod.existencia <= 0;
            selectProducto.appendChild(opcion);
        });
        
        // Reiniciamos la vista si había algo seleccionado antes
        selectProducto.value = "";
        panelOrdenMixta.style.display = "none";
        contenedorCantidad.style.display = "block";

    } catch (error) {
        console.error("Error al cargar inventario:", error);
    }
}

// 2. Detectar cambios en el menú desplegable para mostrar/ocultar el panel
selectProducto.addEventListener("change", () => {
    const prodInfo = inventarioDisponible.find(p => p.productoId === Number(selectProducto.value));
    
    if (prodInfo && prodInfo.esMixta) {
        panelOrdenMixta.style.display = "block";
        contenedorCantidad.style.display = "none";
        dibujarPanelMixta();
    } else {
        panelOrdenMixta.style.display = "none";
        contenedorCantidad.style.display = "block";
    }
});

// 3. Dibujar las opciones de tacos disponibles dentro de la orden mixta
function dibujarPanelMixta() {
    saboresMixta.innerHTML = "";
    const tacosDisponibles = inventarioDisponible.filter(p => p.esTacoIndividual);
    
    tacosDisponibles.forEach(taco => {
        const div = document.createElement("div");
        div.className = "sabor-item";
        
        const label = document.createElement("label");
        label.textContent = `${taco.nombre} (Disponibles: ${taco.existencia})`;
        
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = taco.existencia;
        input.value = "0";
        input.dataset.id = taco.productoId;
        input.className = "input-taco-mixto";
        
        input.addEventListener("input", actualizarContadorMixta);
        
        div.appendChild(label);
        div.appendChild(input);
        saboresMixta.appendChild(div);
    });
    actualizarContadorMixta();
}

// 4. Actualizar el contador de 5 tacos
function actualizarContadorMixta() {
    const inputs = document.querySelectorAll(".input-taco-mixto");
    let totalSeleccionado = 0;
    inputs.forEach(input => {
        totalSeleccionado += Number(input.value);
    });
    
    contadorMixta.innerHTML = `Llevas: <strong>${totalSeleccionado} / 5</strong>`;
    contadorMixta.className = "contador-tacos";
    
    if (totalSeleccionado === 5) {
        contadorMixta.classList.add("limite-alcanzado");
    } else if (totalSeleccionado > 5) {
        contadorMixta.classList.add("limite-excedido");
    }
}

// 5. Lógica de agregar al carrito (Desglosando la mixta o agregando individual)
btnAgregar.addEventListener("click", () => {
    const prodInfo = inventarioDisponible.find(p => p.productoId === Number(selectProducto.value));
    if (!prodInfo) return alert("Por favor selecciona un producto válido.");

    if (prodInfo.esMixta) {
        const inputs = document.querySelectorAll(".input-taco-mixto");
        let totalSeleccionado = 0;
        const tacosASeleccionar = [];
        
        inputs.forEach(input => {
            const cant = Number(input.value);
            if (cant > 0) {
                totalSeleccionado += cant;
                tacosASeleccionar.push({ id: Number(input.dataset.id), cantidad: cant });
            }
        });

        if (totalSeleccionado !== 5) {
            return alert("Una orden mixta debe conformarse de exactamente 5 tacos.");
        }

        // Verificar que hay suficiente stock sumando lo que ya está en el carrito
        for (const item of tacosASeleccionar) {
            const tacoDB = inventarioDisponible.find(t => t.productoId === item.id);
            const enCarrito = ordenActual.find(o => o.productoId === item.id)?.cantidad || 0;
            if (enCarrito + item.cantidad > tacoDB.existencia) {
                return alert(`No hay suficiente stock de ${tacoDB.nombre} para completar esta orden.`);
            }
        }

        // Agregar los tacos individuales al carrito como si los hubieran pedido sueltos
        tacosASeleccionar.forEach(item => {
            const tacoDB = inventarioDisponible.find(t => t.productoId === item.id);
            const existente = ordenActual.find(o => o.productoId === item.id);
            if (existente) {
                existente.cantidad += item.cantidad;
            } else {
                ordenActual.push({
                    productoId: tacoDB.productoId,
                    nombre: tacoDB.nombre,
                    precioUnitario: tacoDB.precioVenta,
                    cantidad: item.cantidad
                });
            }
        });
        
        // Resetear la vista después de agregar
        selectProducto.value = "";
        panelOrdenMixta.style.display = "none";
        contenedorCantidad.style.display = "block";

    } else {
        // Lógica para bebidas o productos normales
        const cantidad = parseFloat(inputCantidad.value);
        if (isNaN(cantidad) || cantidad <= 0) return alert("La cantidad debe ser mayor a 0.");
        
        const existente = ordenActual.find(item => item.productoId === prodInfo.productoId);
        const cantActual = existente ? existente.cantidad : 0;
        
        if (cantActual + cantidad > prodInfo.existencia) {
            return alert(`Stock insuficiente. Solo quedan ${prodInfo.existencia} unidades.`);
        }

        if (existente) {
            existente.cantidad += cantidad;
        } else {
            ordenActual.push({
                productoId: prodInfo.productoId,
                nombre: prodInfo.nombre,
                precioUnitario: prodInfo.precioVenta,
                cantidad: cantidad
            });
        }
        inputCantidad.value = 1;
    }

    actualizarTabla();
});

// 6. Renderizar la tabla de la orden actual
function actualizarTabla() {
    listaOrden.innerHTML = "";
    let total = 0;

    ordenActual.forEach((item, index) => {
        const subtotal = item.cantidad * item.precioUnitario;
        total += subtotal;

        const fila = document.createElement("tr");
        for (const texto of [item.nombre, `$${item.precioUnitario.toFixed(2)}`, item.cantidad, `$${subtotal.toFixed(2)}`]) {
            const celda = document.createElement("td");
            celda.textContent = texto;
            fila.appendChild(celda);
        }
        
        const celdaAccion = document.createElement("td");
        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.textContent = "Quitar";
        botonEliminar.style.cssText = "background-color: #c0392b; padding: 4px 8px; margin: 0;";
        botonEliminar.addEventListener("click", () => {
            ordenActual.splice(index, 1);
            actualizarTabla();
        });
        celdaAccion.appendChild(botonEliminar);
        fila.appendChild(celdaAccion);
        listaOrden.appendChild(fila);
    });
    totalVenta.textContent = total.toFixed(2);
}

// 7. Enviar la orden finalizada al servidor
btnCobrar.addEventListener("click", async () => {
    if (ordenActual.length === 0) return alert("Agrega al menos un producto a la orden.");
    
    try {
        const respuesta = await fetch("/api/ventas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                metodoPago: selectPago.value, 
                detalles: ordenActual.map(item => ({ productoId: item.productoId, cantidad: item.cantidad })) 
            })
        });

        const resultado = await respuesta.json();
        if (respuesta.ok) {
            alert("¡Venta registrada con éxito!");
            ordenActual = [];
            actualizarTabla();
            await cargarInventario(); // Recargar stock actualizado
        } else {
            alert(`Error al registrar: ${resultado.mensaje || "Ocurrió un error inesperado."}`);
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("Error de conexión al procesar la venta.");
    }
});

// Arrancamos la aplicación
cargarInventario();