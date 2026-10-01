const { randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const key = await derive(password, salt, 32);
    return `scrypt$${salt}$${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
    if (typeof stored !== "string") return false;
    if (!stored.startsWith("scrypt$")) {
        // Compatibilidad temporal con las cuentas anteriores.
        const a = Buffer.from(password);
        const b = Buffer.from(stored);
        return a.length === b.length && timingSafeEqual(a, b);
    }
    const parts = stored.split("$");
    if (parts.length !== 3 || !/^[a-f0-9]{32}$/.test(parts[1]) ||
        !/^[a-f0-9]{64}$/.test(parts[2])) return false;
    const key = await derive(password, parts[1], 32);
    return timingSafeEqual(key, Buffer.from(parts[2], "hex"));
}
module.exports = { hashPassword, verifyPassword };
