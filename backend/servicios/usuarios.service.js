const { sql, getConnection } = require("./databaseLogin.service");
const { hashPassword } = require("./password.service");

// Lista todos los usuarios (nunca incluye la contraseña).
async function listUsers() {
    const pool = await getConnection();
    const resultado = await pool.request().query(`
        SELECT userId, userName, accountType, isActive
        FROM dbo.users
        ORDER BY userName
    `);
    return resultado.recordset;
}

async function getUserById(userId) {
    const pool = await getConnection();
    const resultado = await pool.request()
        .input("userId", sql.Int, userId)
        .query(`
            SELECT userId, userName, accountType, isActive
            FROM dbo.users
            WHERE userId = @userId
        `);
    return resultado.recordset[0] ?? null;
}

// La contraseña es opcional: si no se manda, se queda la que ya tenía.
async function updateUser(userId, { userName, accountType, password }) {
    const pool = await getConnection();
    const peticion = pool.request()
        .input("userId", sql.Int, userId)
        .input("userName", sql.VarChar(50), userName)
        .input("accountType", sql.TinyInt, accountType);

    let cambioPassword = "";
    if (password) {
        peticion.input("password", sql.VarChar(255), await hashPassword(password));
        cambioPassword = ", [password] = @password";
    }

    await peticion.query(`
        UPDATE dbo.users
        SET userName = @userName, accountType = @accountType${cambioPassword}
        WHERE userId = @userId
    `);
}

async function setUserActive(userId, isActive) {
    const pool = await getConnection();
    await pool.request()
        .input("userId", sql.Int, userId)
        .input("isActive", sql.Bit, isActive)
        .query("UPDATE dbo.users SET isActive = @isActive WHERE userId = @userId");
}

module.exports = { listUsers, getUserById, updateUser, setUserActive };