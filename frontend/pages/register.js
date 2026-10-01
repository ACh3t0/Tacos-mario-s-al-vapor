import { register } from "../services/register.service.js";

const formulario = document.getElementById("registerForm");
const boton = document.querySelector('button[form="registerForm"]');
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (boton.disabled) return;
    boton.disabled = true;
    try {
        const resultado = await register(
            document.getElementById("usuario").value.trim(),
            document.getElementById("password").value,
            Number(document.getElementById("accountType").value)
        );
        alert(resultado.mensaje);
        window.location.href = "./login.html";
    } catch (error) {
        alert(error.message);
    } finally {
        boton.disabled = false;
    }
});
