const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { once } = require("node:events");
const app = require("../index");
const { sql, getConnection, closeConnection } = require("../servicios/databaseLogin.service");

async function main() {
    const usuario = "test_" + randomUUID().replaceAll("-", "");
    const password = randomUUID();
    const testUsers = [usuario, usuario + "_1", usuario + "_2"];
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = "http://127.0.0.1:" + server.address().port;
    async function post(route, body) {
        const response = await fetch(base + route, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return { status: response.status, body: await response.json() };
    }
    try {
        assert.equal((await fetch(base + "/pages/register.html")).status, 200);
        assert.equal((await fetch(base + "/services/register.service.js")).status, 200);
        assert.equal((await post("/api/register", { usuario, password: "short", accountType: 1 })).status, 400);
        for (const accountType of [undefined, null, 0, 4, "2", 1.5]) {
            assert.equal((await post("/api/register", { usuario, password, accountType })).status, 400);
        }
        const attempts = await Promise.all([
            post("/api/register", { usuario, password, accountType: 3 }),
            post("/api/register", { usuario, password, accountType: 3 })
        ]);
        assert.deepEqual(attempts.map(result => result.status).sort(), [201, 409]);
        const pool = await getConnection();
        const stored = (await pool.request().input("usuario", sql.VarChar(50), usuario)
            .query("SELECT [password], accountType FROM dbo.users WHERE userName = @usuario")).recordset[0];
        assert.ok(stored.password.startsWith("scrypt$"));
        assert.notEqual(stored.password, password);
        assert.equal(stored.accountType, 3);
        const login = await post("/api/login", { usuario, password });
        assert.equal(login.status, 200);
        assert.equal(login.body.usuario, usuario);
        assert.equal(login.body.password, undefined);
        assert.equal(login.body.tipoCuenta, 3);
        for (const accountType of [1, 2]) {
            const name = usuario + "_" + accountType;
            assert.equal((await post("/api/register", { usuario: name, password, accountType })).status, 201);
            const saved = (await pool.request().input("usuario", sql.VarChar(50), name)
                .query("SELECT accountType FROM dbo.users WHERE userName = @usuario")).recordset[0];
            assert.equal(saved.accountType, accountType);
            const result = await post("/api/login", { usuario: name, password });
            assert.equal(result.status, 200);
            assert.equal(result.body.tipoCuenta, accountType);
        }
        assert.equal((await post("/api/login", { usuario, password: "incorrecta" })).status, 401);
        assert.equal((await post("/api/login", { usuario: "' OR 1=1 --", password })).status, 401);
        console.log("OK: los tres tipos se guardan en SQL y se devuelven en login; valores inválidos, duplicados y contraseñas incorrectas se rechazan.");
    } finally {
        try {
            const pool = await getConnection();
            for (const name of testUsers) {
                await pool.request().input("usuario", sql.VarChar(50), name)
                    .query("DELETE FROM dbo.users WHERE userName = @usuario");
            }
            console.log("Cuentas temporales eliminadas.");
        } finally {
            await new Promise(resolve => server.close(resolve));
            await closeConnection();
        }
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
