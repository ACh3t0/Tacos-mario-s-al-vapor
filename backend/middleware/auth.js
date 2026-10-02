const EMPLEADO = 1;
const ADMIN = 2;
const DESARROLLADOR = 3;

// Deja pasar solo a quien ya inició sesión.
function requireLogin(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ mensaje: "Inicia sesión para continuar." });
    }
    next();
}

// Deja pasar solo a ciertos tipos de cuenta. Ejemplo: requireRole(ADMIN, DESARROLLADOR)
function requireRole(...tiposPermitidos) {
    return (req, res, next) => {
        const user = req.session?.user;
        if (!user) {
            return res.status(401).json({ mensaje: "Inicia sesión para continuar." });
        }
        if (!tiposPermitidos.includes(user.accountType)) {
            return res.status(403).json({ mensaje: "No tienes permiso para esta acción." });
        }
        next();
    };
}

module.exports = { requireLogin, requireRole, EMPLEADO, ADMIN, DESARROLLADOR };