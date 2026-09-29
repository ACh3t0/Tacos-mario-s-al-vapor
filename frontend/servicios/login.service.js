export async function login(usuario, password) {
    const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ usuario, password })
    });

    if (!respuesta.ok) {
        throw new Error("No se pudo iniciar sesión");
    }

    return respuesta.json();
}