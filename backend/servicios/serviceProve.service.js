// backend/probarConexion.js
const {
    getConnection,
    closeConnection
} = require("./databaseLogin.service");

async function probarConexion() {
    try {
        const conexion = await getConnection();

        const resultado = await conexion.request().query(
            "SELECT DB_NAME() AS baseDeDatos"
        );

        console.log("Conexión exitosa:", resultado.recordset[0]);
    } catch (error) {
        console.error("No se pudo conectar:", error.message);
    } finally {
        await closeConnection();
    }
}

probarConexion();