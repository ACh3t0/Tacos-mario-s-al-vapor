import { pedir } from "./api.service.js";
export const obtenerReporte = () => pedir("/api/reportes");
