"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWithdrawalStatusEmail = exports.sendDepositConfirmationEmail = exports.sendWinnerNotificationEmail = exports.sendTicketPurchaseEmail = exports.sendPasswordRecoveryEmail = exports.sendWelcomeEmail = exports.sendEmail = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log('📧 [SMTP] Servicio de correo temporalmente deshabilitado');
// Funciones vacías que no envían correos
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Se habría enviado a ${to} - ${subject}`);
    return null;
});
exports.sendEmail = sendEmail;
const sendWelcomeEmail = (to, name) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Bienvenida a ${name} (${to})`);
});
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendPasswordRecoveryEmail = (to, resetLink) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Recuperación de contraseña para ${to}`);
});
exports.sendPasswordRecoveryEmail = sendPasswordRecoveryEmail;
const sendTicketPurchaseEmail = (to, drawInfo, numbers, totalAmount) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Confirmación de apuesta para ${to} - Total: ₡${totalAmount}`);
});
exports.sendTicketPurchaseEmail = sendTicketPurchaseEmail;
const sendWinnerNotificationEmail = (to, drawInfo, numberStr, prize) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Notificación de premio para ${to} - ₡${prize}`);
});
exports.sendWinnerNotificationEmail = sendWinnerNotificationEmail;
const sendDepositConfirmationEmail = (to, amount, reference) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Depósito confirmado para ${to} - ₡${amount}`);
});
exports.sendDepositConfirmationEmail = sendDepositConfirmationEmail;
const sendWithdrawalStatusEmail = (to, amount, status, message) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`⚠️ [Email Deshabilitado]: Retiro ${status} para ${to} - ₡${amount}`);
});
exports.sendWithdrawalStatusEmail = sendWithdrawalStatusEmail;
