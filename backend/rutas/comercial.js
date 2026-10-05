const router = require("express").Router();
const { requireLogin, requireRole, ADMIN, DESARROLLADOR } = require("../middleware/auth");
const inventario = require("../servicios/inventario.service");
const ventas = require("../servicios/ventas.service");

function responder(operacion, status = 200) {
    return async (req, res) => {
        try {
            res.status(status).json(await operacion(req));
        } catch (error) {
            const conocido = [400, 404, 409].includes(error.status);
            if (!conocido) console.error("Error en inventario/ventas:", error.message);
            res.status(conocido ? error.status : 500).json({
                mensaje: conocido ? error.message : "No se pudo completar la operación."
            });
        }
    };
}

router.use(requireLogin);
router.get("/reportes", responder(() => require("../servicios/reportes.service").obtenerReporte()));
router.get("/inventario", responder(() => inventario.listarInventario()));
router.get("/inventario/:id", responder(req => inventario.obtenerProducto(Number(req.params.id))));
router.post("/inventario", requireRole(ADMIN, DESARROLLADOR), responder(req => inventario.crearProducto(req.body), 201));
router.put("/inventario/:id", requireRole(ADMIN, DESARROLLADOR), responder(req => inventario.editarProducto(Number(req.params.id), req.body)));
router.patch("/inventario/:id/existencia", requireRole(ADMIN, DESARROLLADOR), responder(req =>
    inventario.agregarExistencia(Number(req.params.id), req.body?.cantidad)
));
router.get("/pedidos", responder(req => ventas.listarPedidos(req.query.estado)));
router.patch("/pedidos/:id/completar", responder(req => ventas.completarPedido(Number(req.params.id))));
router.get("/ventas", responder(() => ventas.listarVentas()));
router.get("/ventas/:id", responder(req => ventas.obtenerVenta(Number(req.params.id))));
router.post("/ventas", responder(req => {
    const uId = req.session?.user?.userId ?? req.session?.user?.id ?? req.session?.userId ?? 1;
    return ventas.registrarVenta(uId, req.body);
}, 201));
module.exports = router;
