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
exports.sendWinnerNotificationEmail = exports.sendTicketPurchaseEmail = exports.sendPasswordRecoveryEmail = exports.sendWelcomeEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configura tu servicio de correo en el archivo .env
// Ejemplo para Gmail o Namecheap privado
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true' || true, // true para port 465, false para otros
    auth: {
        user: process.env.SMTP_USER || 'tucorreo@gmail.com',
        pass: process.env.SMTP_PASSWORD || 'tu_contraseña_de_aplicacion',
    },
});
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield transporter.sendMail({
            from: `"Tiempos Betting" <${process.env.SMTP_USER || 'tucorreo@gmail.com'}>`,
            to,
            subject,
            html,
        });
        console.log(`Email enviado a ${to} con asunto: ${subject}`);
    }
    catch (error) {
        console.error(`Error enviando email a ${to}:`, error);
    }
});
exports.sendEmail = sendEmail;
const sendWelcomeEmail = (to, name) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Bienvenido a Tiempos Betting 🎉';
    const html = `
        <h1>Hola ${name},</h1>
        <p>Tu cuenta ha sido registrada de forma exitosa. ¡Es hora de empezar a jugar y ganar con Tiempos Betting!</p>
        <br/>
        <p>Gracias por elegirnos.</p>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendPasswordRecoveryEmail = (to, resetLink) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Recuperación de Contraseña - Tiempos Betting';
    const html = `
        <h1>Recuperación de Contraseña</h1>
        <p>Alguien ha solicitado restablecer tu contraseña. Si no fuiste tú, ignora este correo.</p>
        <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
        <a href="${resetLink}" style="padding: 10px 15px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
        <br/><br/>
        <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
        <p>${resetLink}</p>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendPasswordRecoveryEmail = sendPasswordRecoveryEmail;
const sendTicketPurchaseEmail = (to, drawInfo, numbers, totalAmount) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Confirmación de Compra de Tiempos';
    let numbersList = numbers.map(n => `<li>Número: <b>${n.number}</b> - Monto: ₡${n.amount}</li>`).join('');
    const html = `
        <h1>Confirmación de tu compra</h1>
        <p>Tu compra de tickets para el sorteo <b>${drawInfo}</b> ha sido registrada exitosamente.</p>
        <h3>Detalles:</h3>
        <ul>
            ${numbersList}
        </ul>
        <br/>
        <h3>Total Invertido: ₡${totalAmount}</h3>
        <p>¡Mucha suerte!</p>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendTicketPurchaseEmail = sendTicketPurchaseEmail;
const sendWinnerNotificationEmail = (to, drawInfo, numberStr, prize) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = '¡Felicidades, ganaste! 🎉 - Tiempos Betting';
    const html = `
        <h1>¡Felicidades, eres un ganador!</h1>
        <p>Tu número <b>${numberStr}</b> fue el ganador en el sorteo de <b>${drawInfo}</b>.</p>
        <h2 style="color: #16a34a;">Premio Ganado: ₡${prize}</h2>
        <p>El premio ha sido acreditado en tu billetera digital. ¡Sigue participando y ganando!</p>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendWinnerNotificationEmail = sendWinnerNotificationEmail;
