const { getConnection, closeConnection } = require("../servicios/databaseLogin.service");
async function main() {
    try {
        const pool = await getConnection();
        console.log((await pool.request().query(`
            SELECT COLUMNPROPERTY(OBJECT_ID('dbo.users'), 'userId', 'IsIdentity') AS isIdentity;
            SELECT name, definition FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('dbo.users');
        `)).recordsets);
        await pool.request().query("ALTER TABLE dbo.users ALTER COLUMN [password] varchar(255) NOT NULL");
        console.log("Columna password preparada para hashes.");
    } finally { await closeConnection(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
