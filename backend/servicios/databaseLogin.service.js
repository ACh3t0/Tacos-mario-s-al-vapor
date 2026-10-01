// backend/servicios/database.service.js
const sql = require("mssql/msnodesqlv8");

const pool = new sql.ConnectionPool({
    connectionString:
        "Driver={ODBC Driver 18 for SQL Server};" +
        "Server=localhost;" +
        "Database={Tacos Mario´s};" +
        "Trusted_Connection=yes;" +
        "Encrypt=yes;" +
        "TrustServerCertificate=yes;",
    connectionTimeout: 15000
});

pool.on("error", (error) => {
    console.error("Error de SQL Server:", error.message);
});

async function getConnection() {
    return pool.connect();
}

async function closeConnection() {
    await pool.close();
}

module.exports = { sql, getConnection, closeConnection };