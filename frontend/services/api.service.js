export async function pedir(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...opciones.headers }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(datos.mensaje || "No se pudo completar la operación.");
        error.status = respuesta.status;
        throw error;
    }
    return datos;
}
