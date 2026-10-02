async function pedir(url, opciones = {}) {
    const respuesta = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opciones
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(datos.mensaje || "Ocurrió un error.");
        error.status = respuesta.status;
        throw error;
    }
    return datos;
}

export const obtenerSesion = () => pedir("/api/me");
export const listarUsuarios = () => pedir("/api/usuarios");

export const crearUsuario = (usuario, password, accountType) =>
    pedir("/api/usuarios", {
        method: "POST",
        body: JSON.stringify({ usuario, password, accountType })
    });

// Si password viene vacía, no se manda y se conserva la actual.
export const editarUsuario = (id, usuario, accountType, password) =>
    pedir(`/api/usuarios/${id}`, {
        method: "PUT",
        body: JSON.stringify({ usuario, accountType, password: password || undefined })
    });

export const cambiarEstado = (id, activo) =>
    pedir(`/api/usuarios/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ activo })
    });

export const cerrarSesion = () => pedir("/api/logout", { method: "POST" });