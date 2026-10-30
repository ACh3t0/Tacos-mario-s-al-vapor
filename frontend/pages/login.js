import { login } from "../services/login.service.js";
const formulario = document.getElementById("loginForm");
const mensaje = document.getElementById("mensajeLogin");

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    mensaje.hidden = true;
    try {
        await login(
            document.getElementById("userName").value.trim(),
            document.getElementById("password").value,
            Number(document.getElementById("accountType").value)
        );
        window.location.href = "./main.html";
    } catch (error) {
        mensaje.textContent = error.message;
        mensaje.hidden = false;
    }
});