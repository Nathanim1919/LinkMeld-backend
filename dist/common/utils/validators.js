"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = exports.validateEmail = exports.validateApiKey = void 0;
exports.validateApiKey = {
    gemini: (key) => {
        return /^AIza[0-9A-Za-z-_]{35}$/.test(key);
    },
    openai: (key) => {
        return /^sk-[0-9a-zA-Z]{32,}$/.test(key);
    },
};
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    const re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return re.test(password);
};
exports.validatePassword = validatePassword;
//# sourceMappingURL=validators.js.map