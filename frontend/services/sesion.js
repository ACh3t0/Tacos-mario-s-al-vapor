import { obtenerSesion, cerrarSesion } from "./usuarios.service.js";

const ADMIN = 2;
const DESARROLLADOR = 3;
const TIPOS = { 1: "Empleado", 2: "Admin", 3: "Desarrollador" };

const estilos = `
.sidebar .sesion-info {
    margin: 24px 0 8px;
    font-size: 14px;
    text-align: center;
    color: #29220f;
    overflow-wrap: anywhere;
}
.sidebar .btn-salir {
    display: block;
    width: 100%;
    padding: 12px;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    background-color: #fff;
    color: #29220f;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}
.sidebar .btn-salir:hover {
    background-color: #ffe5a3;
}
`;

function prepararMenu(sesion) {
    const menu = document.querySelector(".sidebar");
    if (!menu) return;

    const estilo = document.createElement("style");
    estilo.textContent = estilos;
    document.head.append(estilo);

    // Solo Admin y Desarrollador ven el enlace a Usuarios.
    if (![ADMIN, DESARROLLADOR].includes(sesion.accountType)) {
        menu.querySelector('a[href$="usuarios.html"]')?.closest("li")?.remove();
    }

    const info = document.createElement("p");
    info.className = "sesion-info";
    info.textContent = `${sesion.userName} (${TIPOS[sesion.accountType] ?? "Usuario"})`;

    const salir = document.createElement("button");
    salir.type = "button";
    salir.className = "btn-salir";
    salir.textContent = "Cerrar sesión";
    salir.addEventListener("click", async () => {
        try { await cerrarSesion(); } finally { location.href = "./login.html"; }
    });

    menu.append(info, salir);
}

// Revisa que haya sesión; si no, manda al login. Devuelve los datos del usuario.
export async function protegerPagina() {
    let sesion;
    try {
        sesion = await obtenerSesion();
    } catch {
        location.href = "./login.html";
        return null;
    }
    prepararMenu(sesion);
    return sesion;
}