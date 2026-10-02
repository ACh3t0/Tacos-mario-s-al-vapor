const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const session = require("express-session");
const { sql, getConnection } = require("./servicios/databaseLogin.service");
const { registerUser } = require("./servicios/register.service");
const { verifyPassword } = require("./servicios/password.service");
const { requireLogin, requireRole, ADMIN, DESARROLLADOR } = require("./middleware/auth");
const { listUsers, getUserById, updateUser, setUserActive } = require("./servicios/usuarios.service");

const app = express();

// Permite recibir el JSON enviado por fetch.
app.use(express.json());

// Sesiones: el servidor recuerda quién inició sesión.
app.use(session({
    name: "tacos.sid",
    secret: process.env.SESSION_SECRET || "cambia-esto-en-produccion",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8 // 8 horas
    }
}));

// Publica los archivos del frontend.
app.use(express.static(path.join(__dirname, "../frontend")));

app.post("/api/register", async (req, res) => {
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

app.post("/api/login", async (req, res) => {
    const { usuario, password } = req.body ?? {};

    if (
        typeof usuario !== "string" ||
        typeof password !== "string" ||
        !usuario.trim() ||
        !password
    ) {
        return res.status(400).json({ mensaje: "Escribe tu usuario y contraseña." });
    }

    try {
        const conexion = await getConnection();

        const resultado = await conexion.request()
            .input("usuario", sql.NVarChar, usuario.trim())
            .query(`
                SELECT TOP (1) [userId], [userName], [password], [accountType], [isActive]
                FROM [users]
                WHERE [userName] = @usuario
            `);

        const cuenta = resultado.recordset[0];

        // Mismo mensaje si el usuario no existe, la contraseña es mala o la cuenta está desactivada.
        if (!cuenta || !(await verifyPassword(password, cuenta.password)) || !cuenta.isActive) {
            return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos." });
        }

        // regenerate crea una sesión nueva al iniciar sesión (más seguro).
        req.session.regenerate((err) => {
            if (err) {
                console.error("Error al crear la sesión:", err.message);
                return res.status(500).json({ mensaje: "No se pudo iniciar la sesión." });
            }
            req.session.user = {
                userId: cuenta.userId,
                userName: cuenta.userName,
                accountType: cuenta.accountType
            };
            return res.json({
                mensaje: "Credenciales correctas.",
                usuario: cuenta.userName,
                tipoCuenta: cuenta.accountType
            });
        });
    } catch (error) {
        console.error("Error en login:", error.message);
        return res.status(500).json({ mensaje: "No se pudo procesar el inicio de sesión." });
    }
});

// Dice quién tiene la sesión abierta (lo usará el frontend).
app.get("/api/me", requireLogin, (req, res) => {
    res.json(req.session.user);
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("tacos.sid");
        res.json({ mensaje: "Sesión cerrada." });
    });
});

// ---------- USUARIOS (solo Admin y Desarrollador) ----------
const soloAdmins = [requireLogin, requireRole(ADMIN, DESARROLLADOR)];

function leerId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Un Admin no puede crear, editar ni desactivar cuentas de Desarrollador.
function soloDesarrollador(req) {
    return req.session.user.accountType === DESARROLLADOR;
}

function usuarioValido(usuario) {
    return typeof usuario === "string" && usuario.trim().length >= 1 && usuario.trim().length <= 50;
}

function passwordValida(password) {
    return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

function esDuplicado(error) {
    return error.status === 409 || [2601, 2627].includes(error.number);
}

// Lista de usuarios
app.get("/api/usuarios", soloAdmins, async (req, res) => {
    try {
        res.json(await listUsers());
    } catch (error) {
        console.error("Error al listar usuarios:", error.message);
        res.status(500).json({ mensaje: "No se pudo obtener la lista de usuarios." });
    }
});

// Crear usuario
app.post("/api/usuarios", soloAdmins, async (req, res) => {
    const { usuario, password, accountType } = req.body ?? {};
    if (![1, 2, 3].includes(accountType)) {
        return res.status(400).json({ mensaje: "Selecciona un tipo de cuenta válido." });
    }
    if (!usuarioValido(usuario) || !passwordValida(password)) {
        return res.status(400).json({ mensaje: "Escribe un usuario de hasta 50 caracteres y una contraseña de 8 a 128 caracteres." });
    }
    if (accountType === DESARROLLADOR && !soloDesarrollador(req)) {
        return res.status(403).json({ mensaje: "Solo un Desarrollador puede crear cuentas de Desarrollador." });
    }
    try {
        await registerUser(usuario.trim(), password, accountType);
        res.status(201).json({ mensaje: "Usuario creado." });
    } catch (error) {
        console.error("Error al crear usuario:", error.message);
        res.status(esDuplicado(error) ? 409 : 500).json({
            mensaje: esDuplicado(error) ? "Ese nombre de usuario ya está registrado." : "No se pudo crear el usuario."
        });
    }
});

// Editar usuario (nombre, tipo de cuenta y, si se manda, nueva contraseña)
app.put("/api/usuarios/:id", soloAdmins, async (req, res) => {
    const id = leerId(req.params.id);
    const { usuario, accountType, password } = req.body ?? {};
    if (!id) return res.status(400).json({ mensaje: "Usuario no válido." });
    if (![1, 2, 3].includes(accountType) || !usuarioValido(usuario)) {
        return res.status(400).json({ mensaje: "Revisa el nombre de usuario y el tipo de cuenta." });
    }
    if (password && !passwordValida(password)) {
        return res.status(400).json({ mensaje: "La contraseña debe tener de 8 a 128 caracteres." });
    }
    try {
        const actual = await getUserById(id);
        if (!actual) return res.status(404).json({ mensaje: "Usuario no encontrado." });

        const esMiCuenta = id === req.session.user.userId;
        if (esMiCuenta && accountType !== actual.accountType) {
            return res.status(400).json({ mensaje: "No puedes cambiar tu propio tipo de cuenta." });
        }
        if ((actual.accountType === DESARROLLADOR || accountType === DESARROLLADOR) && !soloDesarrollador(req)) {
            return res.status(403).json({ mensaje: "Solo un Desarrollador puede modificar cuentas de Desarrollador." });
        }

        await updateUser(id, { userName: usuario.trim(), accountType, password });
        if (esMiCuenta) req.session.user.userName = usuario.trim();
        res.json({ mensaje: "Usuario actualizado." });
    } catch (error) {
        console.error("Error al editar usuario:", error.message);
        res.status(esDuplicado(error) ? 409 : 500).json({
            mensaje: esDuplicado(error) ? "Ese nombre de usuario ya está registrado." : "No se pudo actualizar el usuario."
        });
    }
});

// Activar o desactivar usuario
app.patch("/api/usuarios/:id/estado", soloAdmins, async (req, res) => {
    const id = leerId(req.params.id);
    const { activo } = req.body ?? {};
    if (!id || typeof activo !== "boolean") {
        return res.status(400).json({ mensaje: "Datos no válidos." });
    }
    if (id === req.session.user.userId) {
        return res.status(400).json({ mensaje: "No puedes desactivar tu propia cuenta." });
    }
    try {
        const actual = await getUserById(id);
        if (!actual) return res.status(404).json({ mensaje: "Usuario no encontrado." });
        if (actual.accountType === DESARROLLADOR && !soloDesarrollador(req)) {
            return res.status(403).json({ mensaje: "Solo un Desarrollador puede modificar cuentas de Desarrollador." });
        }
        await setUserActive(id, activo);
        res.json({ mensaje: activo ? "Usuario activado." : "Usuario desactivado." });
    } catch (error) {
        console.error("Error al cambiar el estado:", error.message);
        res.status(500).json({ mensaje: "No se pudo cambiar el estado del usuario." });
    }
});

if (require.main === module) app.listen(3000, "127.0.0.1", () => {
    console.log("Abre http://localhost:3000/pages/login.html");
});
module.exports = app;