module.exports = {
    generateRandomNumber(digit) {
        let number = 0;
        for (let i = 0; i < digit; i++) {
            number += parseInt(Math.random() * 10) * 10**i;
        }
        return number;
    },
    generateRandomCode(digit) {
        let code = "";
        for (let i = 0; i < digit; i++) {
            code += parseInt(Math.random() * 10);
        }
        return code;
    }
}