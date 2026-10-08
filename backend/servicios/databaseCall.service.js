const sql = require('mssql/msnodesqlv8');

// Usa la cuenta de Windows que ejecuta Node.js, sin guardar contraseñas.
const dbConfig = {
    connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database={Tacos Marios};Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes;',
    connectionTimeout: 15000,
    requestTimeout: 15000,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const pool = new sql.ConnectionPool(dbConfig);
pool.on('error', (err) => {
    console.error('Error del pool de SQL Server:', err.message);
});

// Reutiliza el pool entre las solicitudes del backend.
async function getConnection() {
    return pool.connect();
}

async function closeConnection() {
    await pool.close();
}

async function testConnection() {
    try {
        const connection = await getConnection();
        const result = await connection.request().query(
            'SELECT DB_NAME() AS databaseName, SUSER_SNAME() AS loginName'
        );
        console.log('Conexión exitosa a SQL Server:', result.recordset[0]);
    } finally {
        await closeConnection();
    }
}

// Importar este servicio no ejecuta la prueba ni cierra la conexión.
module.exports = { sql, getConnection, closeConnection };

if (require.main === module) {
    testConnection().catch((err) => {
        console.error('Error al conectar a SQL Server:', err.message);
        process.exitCode = 1;
    });
}
