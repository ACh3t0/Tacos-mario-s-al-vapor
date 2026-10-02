// backend/servicios/databaseLogin.service.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const sql = require("mssql/msnodesqlv8");

const pool = new sql.ConnectionPool({
    connectionString:
        "Driver={ODBC Driver 18 for SQL Server};" +
        `Server=${process.env.DB_SERVER || "localhost"};` +
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