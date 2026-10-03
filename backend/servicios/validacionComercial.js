function exigir(condicion, mensaje, status = 400) {
    if (!condicion) throw Object.assign(new Error(mensaje), { status });
}

function idValido(id) {
    return Number.isInteger(id) && id > 0 && id <= 2147483647;
}

function decimalValido(valor, escala) {
    return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 &&
        valor < 10 ** (12 - escala) && Number(valor.toFixed(escala)) === valor;
}

module.exports = { exigir, idValido, decimalValido };
