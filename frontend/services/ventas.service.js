import { pedir } from "./api.service.js";

export const listarVentas = () => pedir("/api/ventas");
export const obtenerVenta = id => pedir(`/api/ventas/${encodeURIComponent(id)}`);
export const listarPedidos = estado => pedir(`/api/pedidos?estado=${encodeURIComponent(estado)}`);
export const completarPedido = id => pedir(`/api/pedidos/${encodeURIComponent(id)}/completar`, {
    method: "PATCH"
});
// detalles: [{ productoId: 1, cantidad: 2 }]. El servidor obtiene usuario y precios.
export const registrarVenta = (metodoPago, detalles) => pedir("/api/ventas", {
    method: "POST", body: JSON.stringify({ metodoPago, detalles })
});
