import { register } from "../servicios/register.service.js";

const formulario = document.getElementById("registerForm");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value.trim();
    const password = document.getElementById("password").value;
    const accountType = document.getElementById("accountType").value;

    try {
        await register(usuario, password, accountType);
        alert("Usuario registrado");
    } catch (error) {
        alert(error.message);
    }
});