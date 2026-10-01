import { login } from "../services/login.service.js";
const formulario = document.getElementById("loginForm");
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        const resultado = await login(
            document.getElementById("userName").value.trim(),
            document.getElementById("password").value
        );
        alert(resultado.mensaje);
        window.location.href = "./main.html";
    } catch (error) {
        alert(error.message);
    }
});
