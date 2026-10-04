let inventarioDisponible = [];
let ordenActual = [];

const selectProducto = document.getElementById("select-producto");
const inputCantidad = document.getElementById("input-cantidad");
const btnAgregar = document.getElementById("btn-agregar");
const listaOrden = document.getElementById("lista-orden");
const totalVenta = document.getElementById("total-venta");
const selectPago = document.getElementById("select-pago");
const btnCobrar = document.getElementById("btn-cobrar");

// Cargar catálogo de productos disponibles
async function cargarInventario() {
    try {
        const respuesta = await fetch("/api/inventario");
        if (!respuesta.ok) throw new Error("No se pudo obtener el inventario");
        const productos = await respuesta.json();
        
        console.log("Productos recibidos de la API:", productos);

        // Guardamos los productos convirtiendo tipos para evitar problemas
        inventarioDisponible = productos.map(p => ({
            productoId: Number(p.productoId ?? p.id ?? p.id_producto),
            nombre: p.nombre,
            precioVenta: Number(p.precioVenta ?? p.precio ?? 0),
            existencia: Number(p.existencia ?? 0),
            isActive: (p.isActive === true || p.isActive === 1 || p.isActive === '1')
        })).filter(p => p.existencia > 0);

        selectProducto.innerHTML = '<option value="">-- Selecciona un producto --</option>';
        inventarioDisponible.forEach(prod => {
            const opcion = document.createElement("option");
            opcion.value = prod.productoId;
            opcion.textContent = `${prod.nombre} - $${prod.precioVenta.toFixed(2)} (Stock: ${prod.existencia})`;
            selectProducto.appendChild(opcion);
        });
    } catch (error) {
        console.error("Error al cargar inventario:", error);
        selectProducto.innerHTML = '<option value="">Error al cargar productos</option>';
    }
}

// Agregar item a la orden
btnAgregar.addEventListener("click", () => {
    const valorSeleccionado = selectProducto.value;
    const cantidad = parseFloat(inputCantidad.value);

    if (!valorSeleccionado) {
        alert("Por favor selecciona un producto válido.");
        return;
    }
    if (isNaN(cantidad) || cantidad <= 0) {
        alert("La cantidad debe ser mayor a 0.");
        return;
    }

    const productoId = Number(valorSeleccionado);
    const prodInfo = inventarioDisponible.find(p => p.productoId === productoId);
    
    if (!prodInfo) {
        alert("Producto no encontrado en inventario.");
        return;
    }

    if (cantidad > prodInfo.existencia) {
        alert(`Stock insuficiente. Solo quedan ${prodInfo.existencia} unidades.`);
        return;
    }

    const itemExistente = ordenActual.find(item => item.productoId === productoId);
    if (itemExistente) {
        if (itemExistente.cantidad + cantidad > prodInfo.existencia) {
            alert(`No puedes agregar más unidades de las disponibles (${prodInfo.existencia}).`);
            return;
        }
        itemExistente.cantidad += cantidad;
    } else {
        ordenActual.push({
            productoId: prodInfo.productoId,
            nombre: prodInfo.nombre,
            precioUnitario: prodInfo.precioVenta,
            cantidad: cantidad
        });
    }

    actualizarTabla();
    inputCantidad.value = 1;
});

// Renderizar tabla y subtotal
function actualizarTabla() {
    listaOrden.innerHTML = "";
    let total = 0;

    ordenActual.forEach((item, index) => {
        const subtotal = item.cantidad * item.precioUnitario;
        total += subtotal;

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${item.nombre}</td>
            <td>$${item.precioUnitario.toFixed(2)}</td>
            <td>${item.cantidad}</td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button type="button" class="btn-eliminar" data-index="${index}" style="background-color: #c0392b; padding: 4px 8px;">Quitar</button></td>
        `;
        listaOrden.appendChild(fila);
    });

    totalVenta.textContent = total.toFixed(2);

    document.querySelectorAll(".btn-eliminar").forEach(boton => {
        boton.addEventListener("click", (e) => {
            const idx = parseInt(e.target.dataset.index);
            ordenActual.splice(idx, 1);
            actualizarTabla();
        });
    });
}

// Enviar venta al backend
btnCobrar.addEventListener("click", async () => {
    if (ordenActual.length === 0) {
        alert("Agrega al menos un producto a la orden.");
        return;
    }

    const metodoPago = selectPago.value;
    const detalles = ordenActual.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad
    }));

    try {
        const respuesta = await fetch("/api/ventas", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metodoPago, detalles })
        
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert("¡Venta registrada con éxito!");
            ordenActual = [];
            actualizarTabla();
            await cargarInventario();
        } else {
            alert(`Error al registrar la venta: ${resultado.mensaje || resultado.error || "Ocurrió un error inesperado."}`);
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("Error de conexión al procesar la venta.");
    }
});

cargarInventario();
