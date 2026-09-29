import { login } from "../servicios/login.service.js";

const formulario = document.getElementById("loginForm");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;

    try {
        const resultado = await login(usuario, password);
        console.log(resultado);
    } catch (error) {
        alert(error.message);
    }
});