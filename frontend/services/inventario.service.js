import { pedir } from "./api.service.js";

export const listarInventario = () => pedir("/api/inventario");
export const obtenerProducto = id => pedir(`/api/inventario/${encodeURIComponent(id)}`);
export const crearProducto = producto => pedir("/api/inventario", {
    method: "POST", body: JSON.stringify(producto)
});
// Envía el producto completo, incluidas sus existencias actuales.
export const editarProducto = (id, producto) => pedir(`/api/inventario/${encodeURIComponent(id)}`, {
    method: "PUT", body: JSON.stringify(producto)
});
