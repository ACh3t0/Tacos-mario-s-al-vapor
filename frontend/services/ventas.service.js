import { pedir } from "./api.service.js";

export const listarVentas = () => pedir("/api/ventas");
export const obtenerVenta = id => pedir(`/api/ventas/${encodeURIComponent(id)}`);
export const listarPedidos = estado => pedir(`/api/pedidos?estado=${encodeURIComponent(estado)}`);
export const completarPedido = id => pedir(`/api/pedidos/${encodeURIComponent(id)}/completar`, {
    method: "PATCH"
});
// detalles: [{ productoId: 1, cantidad: 2 }]. notas es opcional (hasta 255 caracteres).
// El servidor obtiene usuario y precios.
export const registrarVenta = (metodoPago, detalles, notas = "") => pedir("/api/ventas", {
    method: "POST", body: JSON.stringify({ metodoPago, detalles, notas })
});
