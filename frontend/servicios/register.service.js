export async function register(usuario, password) {
    const respuesta = await fetch("/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ usuario, password })
    });

    if (!respuesta.ok) {
        throw new Error("No se pudo registrar el usuario");
    }

    return respuesta.json();
}