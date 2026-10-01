const { sql, getConnection } = require("./databaseLogin.service");
const { hashPassword } = require("./password.service");

async function registerUser(usuario, password, accountType) {
    const hashed = await hashPassword(password);
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
        const existing = await new sql.Request(transaction)
            .input("usuario", sql.VarChar(50), usuario)
            .query("SELECT userId FROM dbo.users WITH (UPDLOCK, HOLDLOCK) WHERE userName = @usuario");
        if (existing.recordset.length) {
            const error = new Error("Ese nombre de usuario ya está registrado.");
            error.status = 409;
            throw error;
        }
        await new sql.Request(transaction)
            .input("usuario", sql.VarChar(50), usuario)
            .input("password", sql.VarChar(255), hashed)
            .input("accountType", sql.TinyInt, accountType)
            .query("INSERT INTO dbo.users (userName, [password], accountType) VALUES (@usuario, @password, @accountType)");
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
module.exports = { registerUser };
