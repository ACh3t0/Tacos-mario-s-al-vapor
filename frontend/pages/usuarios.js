import {
    obtenerSesion, listarUsuarios, crearUsuario,
    editarUsuario, cambiarEstado, cerrarSesion
} from "../services/usuarios.service.js";

const TIPOS = { 1: "Empleado", 2: "Admin", 3: "Desarrollador" };
const ADMIN = 2;
const DESARROLLADOR = 3;

const $ = (id) => document.getElementById(id);

let yo = null;          // quién tiene la sesión abierta
let usuarios = [];
let editandoId = null;  // null = creando, número = editando

function irALogin() {
    location.href = "./login.html";
}

function avisar(texto, esError = false) {
    const mensaje = $("mensaje");
    mensaje.textContent = texto;
    mensaje.className = esError ? "error" : "ok";
    mensaje.hidden = false;
}

function manejarError(error, destino) {
    if (error.status === 401) return irALogin();
    if (destino.id === "mensaje") return avisar(error.message, true);
    destino.textContent = error.message;
}

function celda(texto) {
    const td = document.createElement("td");
    td.textContent = texto; // textContent evita que un nombre con código se ejecute
    return td;
}

function boton(texto, alHacerClic) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.className = "secundario";
    b.addEventListener("click", alHacerClic);
    return b;
}

function dibujarTabla() {
    const cuerpo = $("tabla-usuarios");
    cuerpo.replaceChildren();

    for (const u of usuarios) {
        const fila = document.createElement("tr");
        if (!u.isActive) fila.classList.add("inactivo");

        const nombre = u.userName + (u.userId === yo.userId ? " (tú)" : "");
        fila.append(
            celda(nombre),
            celda(TIPOS[u.accountType] ?? "Desconocido"),
            celda(u.isActive ? "Activo" : "Desactivado")
        );

        const acciones = document.createElement("td");
        // Un Admin no puede tocar cuentas de Desarrollador.
        const puedeTocar = u.accountType !== DESARROLLADOR || yo.accountType === DESARROLLADOR;
        if (puedeTocar) {
            acciones.append(boton("Editar", () => abrirEditar(u)));
            if (u.userId !== yo.userId) {
                acciones.append(boton(u.isActive ? "Desactivar" : "Activar", () => alternar(u)));
            }
        }
        fila.append(acciones);
        cuerpo.append(fila);
    }
}

async function cargar() {
    try {
        usuarios = await listarUsuarios();
        dibujarTabla();
    } catch (error) {
        manejarError(error, $("mensaje"));
    }
}

function prepararFormulario() {
    $("formulario").reset();
    $("error-form").textContent = "";
    // Solo un Desarrollador puede asignar el tipo Desarrollador.
    const sinPermiso = yo.accountType !== DESARROLLADOR;
    $("opcion-dev").hidden = sinPermiso;
    $("opcion-dev").disabled = sinPermiso;
}

function abrirNuevo() {
    editandoId = null;
    prepararFormulario();
    $("titulo-dialogo").textContent = "Nuevo usuario";
    $("password").required = true;
    $("ayuda-password").textContent = "De 8 a 128 caracteres.";
    $("tipo").disabled = false;
    $("dialogo").showModal();
}

function abrirEditar(u) {
    editandoId = u.userId;
    prepararFormulario();
    $("titulo-dialogo").textContent = "Editar usuario";
    $("usuario").value = u.userName;
    $("tipo").value = String(u.accountType);
    $("password").required = false;
    $("ayuda-password").textContent = "Déjala vacía para conservar la contraseña actual.";
    // Nadie puede cambiar su propio tipo de cuenta.
    $("tipo").disabled = u.userId === yo.userId;
    $("dialogo").showModal();
}

async function alternar(u) {
    const accion = u.isActive ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${accion} a ${u.userName}?`)) return;
    try {
        await cambiarEstado(u.userId, !u.isActive);
        avisar(u.isActive ? "Usuario desactivado." : "Usuario activado.");
        await cargar();
    } catch (error) {
        manejarError(error, $("mensaje"));
    }
}

$("formulario").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const usuario = $("usuario").value.trim();
    const tipo = Number($("tipo").value);
    const password = $("password").value;
    const esNuevo = editandoId === null;

    try {
        if (esNuevo) {
            await crearUsuario(usuario, password, tipo);
        } else {
            await editarUsuario(editandoId, usuario, tipo, password);
        }
        $("dialogo").close();
        avisar(esNuevo ? "Usuario creado." : "Usuario actualizado.");
        await cargar();
    } catch (error) {
        manejarError(error, $("error-form"));
    }
});

$("btn-nuevo").addEventListener("click", abrirNuevo);
$("btn-cancelar").addEventListener("click", () => $("dialogo").close());
$("btn-salir").addEventListener("click", async () => {
    try { await cerrarSesion(); } finally { irALogin(); }
});

async function iniciar() {
    try {
        yo = await obtenerSesion();
    } catch {
        return irALogin();
    }

    if (![ADMIN, DESARROLLADOR].includes(yo.accountType)) {
        document.querySelector("main").innerHTML =
            "<h1>Usuarios</h1><p>No tienes permiso para ver esta página.</p>";
        return;
    }

    $("sesion").textContent = `${yo.userName} (${TIPOS[yo.accountType]})`;
    await cargar();
}

iniciar();