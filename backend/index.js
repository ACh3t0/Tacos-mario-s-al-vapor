const express = require("express");
const path = require("path");
const { sql, getConnection } =
    require("./servicios/databaseLogin.service");

const app = express();
const { registerUser } = require("./servicios/register.service");
const { verifyPassword } = require("./servicios/password.service");

app.post("/api/register", express.json(), async (req, res) => {
    const { usuario, password, accountType } = req.body ?? {};
    if (![1, 2, 3].includes(accountType)) {
        return res.status(400).json({ mensaje: "Selecciona un tipo de cuenta válido: Empleado, Admin o Desarrollador." });
    }
    if (typeof usuario !== "string" || !usuario.trim() || usuario.trim().length > 50 ||
        typeof password !== "string" || password.length < 8 || password.length > 128) {
        return res.status(400).json({ mensaje: "Escribe un usuario de hasta 50 caracteres y una contraseña de 8 a 128 caracteres." });
    }
    try {
        await registerUser(usuario.trim(), password, accountType);
        return res.status(201).json({ mensaje: "Usuario registrado. Ya puedes iniciar sesión." });
    } catch (error) {
        console.error("Error en registro:", error.message);
        const duplicate = error.status === 409 || [2601, 2627].includes(error.number);
        return res.status(duplicate ? 409 : 500).json({
            mensaje: duplicate ? "Ese nombre de usuario ya está registrado." : "No se pudo registrar el usuario."
        });
    }
});

// Permite recibir el JSON enviado por fetch.
app.use(express.json());

// Publica los archivos del frontend.
app.use(express.static(path.join(__dirname, "../frontend")));

app.post("/api/login", async (req, res) => {
    const { usuario, password } = req.body ?? {};

    if (
        typeof usuario !== "string" ||
        typeof password !== "string" ||
        !usuario.trim() ||
        !password
    ) {
        return res.status(400).json({
            mensaje: "Escribe tu usuario y contraseña."
        });
    }

    try {
        const conexion = await getConnection();

        // El parámetro evita insertar directamente el texto en el SQL.
        const resultado = await conexion.request()
            .input("usuario", sql.NVarChar, usuario.trim())
            .query(`
                SELECT TOP (1) [userName], [password], [accountType]
                FROM [users]
                WHERE [userName] = @usuario
            `);

        const cuenta = resultado.recordset[0];

        // Verifica hashes nuevos y mantiene compatibilidad con las cuentas anteriores.
        if (!cuenta || !(await verifyPassword(password, cuenta.password))) {
            return res.status(401).json({
                mensaje: "Usuario o contraseña incorrectos."
            });
        }

        // Nunca devolver la contraseña al navegador.
        return res.json({
            mensaje: "Credenciales correctas.",
            usuario: cuenta.userName,
            tipoCuenta: cuenta.accountType
        });
    } catch (error) {
        console.error("Error en login:", error.message);

        return res.status(500).json({
            mensaje: "No se pudo procesar el inicio de sesión."
        });
    }
});

if (require.main === module) app.listen(3000, "127.0.0.1", () => {
    console.log("Abre http://localhost:3000/pages/login.html");
});
module.exports = app;

