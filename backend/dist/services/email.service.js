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
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
const dns_1 = __importDefault(require("dns"));
// ============================================
// FORZAR IPv4 - SOLUCIÓN PARA RENDER
// ============================================
// 1. Forzar resolución DNS a IPv4
dns_1.default.setDefaultResultOrder('ipv4first');
dotenv_1.default.config();
console.log('📧 [SMTP] Configurando servicio de correo con IPv4 forzado...');
// Configuración del transporter con IPv4 forzado
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'laboatica@hotmail.com',
        pass: process.env.SMTP_PASSWORD || 'Les1419055@',
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    // Forzar conexión IPv4
    localAddress: '0.0.0.0'
});
// Resolver el hostname para depuración
const host = process.env.SMTP_HOST || 'smtp-mail.outlook.com';
console.log(`🔍 [SMTP] Resolviendo host: ${host}`);
dns_1.default.lookup(host, { family: 4 }, (err, address, family) => {
    if (err) {
        console.error(`❌ [SMTP] Error resolviendo ${host}:`, err.message);
        console.error(`   💡 Si el error persiste, considera usar SendGrid como alternativa.`);
    }
    else {
        console.log(`✅ [SMTP] ${host} resuelto a: ${address} (IPv${family})`);
    }
});
// Verificar conexión SMTP
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ [SMTP] Error de conexión:', error.message);
        if (error.message.includes('ENETUNREACH')) {
            console.error('   💡 El servidor SMTP no es accesible desde Render.');
            console.error('   🔄 Alternativa recomendada: Usar SendGrid (más confiable en Render)');
        }
    }
    else {
        console.log('✅ [SMTP] Servidor listo para enviar correos');
    }
});
// ============================================
// FUNCIONES DE ENVÍO DE CORREOS
// ============================================
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'laboatica@hotmail.com';
        const result = yield transporter.sendMail({
            from: `"Tiempos Tica y Nica" <${fromEmail}>`,
            to,
            subject,
            html,
        });
        console.log(`✅ [Email]: Enviado a ${to} - ${subject} (ID: ${result.messageId})`);
        return result;
    }
    catch (error) {
        console.error(`❌ [Email Error]: Fallo al enviar a ${to}:`, error.message);
        if (error.code === 'ESOCKET' || error.message.includes('ENETUNREACH')) {
            console.error('   💡 El servidor SMTP no está accesible desde Render.');
            console.error('   🔄 Considera cambiar a SendGrid para mayor confiabilidad.');
        }
        throw error;
    }
});
exports.sendEmail = sendEmail;
const sendWelcomeEmail = (to, name) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Bienvenido a Tiempos Pro 🎉';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎲 Tiempos Pro</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1e3c72;">¡Hola ${name}! 👋</h2>
                <p>Tu cuenta ha sido registrada exitosamente. ¡Es hora de empezar a jugar y ganar con Tiempos Pro!</p>
                <a href="${process.env.FRONTEND_URL || 'https://tiempos-tau.vercel.app'}" 
                   style="display: inline-block; padding: 12px 24px; background: #2a5298; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                    Ir a la plataforma
                </a>
                <p style="color: #666;">¡Mucha suerte! 🍀</p>
            </div>
        </div>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendPasswordRecoveryEmail = (to, resetLink) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Recuperación de Contraseña - Tiempos Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🔐 Recuperación de Contraseña</h2>
            <p>Haz clic en el enlace para restablecer tu contraseña:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background: #2a5298; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                Restablecer Contraseña
            </a>
            <p>Si no solicitaste esto, ignora este correo.</p>
        </div>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendPasswordRecoveryEmail = sendPasswordRecoveryEmail;
const sendTicketPurchaseEmail = (to, drawInfo, numbers, totalAmount) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Confirmación de Apuesta - Tiempos Pro';
    let numbersList = numbers.map(n => `<li>🎯 Número: <b>${n.number}</b> - ₡${n.amount}</li>`).join('');
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>✅ Apuesta Confirmada</h2>
            <p><strong>Sorteo:</strong> ${drawInfo}</p>
            <h3>Detalles:</h3>
            <ul>${numbersList}</ul>
            <h3>Total: ₡${totalAmount}</h3>
            <p>🍀 ¡Mucha suerte!</p>
        </div>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendTicketPurchaseEmail = sendTicketPurchaseEmail;
const sendWinnerNotificationEmail = (to, drawInfo, numberStr, prize) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = '¡Felicidades, ganaste! 🎉 - Tiempos Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center; border-radius: 10px;">
                <h1 style="color: white; margin: 0;">🏆 ¡FELICIDADES! 🏆</h1>
            </div>
            <div style="padding: 20px;">
                <p>Tu número <strong style="font-size: 24px; color: #f59e0b;">${numberStr}</strong> fue el ganador en el sorteo de <strong>${drawInfo}</strong>.</p>
                <div style="background: #f0f0f0; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #d97706; margin: 0;">💰 ₡${prize} 💰</h2>
                </div>
                <p>El premio ha sido acreditado en tu billetera digital.</p>
                <p>¡Gracias por confiar en Tiempos Pro!</p>
            </div>
        </div>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendWinnerNotificationEmail = sendWinnerNotificationEmail;
const sendDepositConfirmationEmail = (to, amount, reference) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = 'Depósito Confirmado - Tiempos Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>💰 Depósito Confirmado</h2>
            <p>Se ha confirmado tu depósito de <strong>₡${amount}</strong>.</p>
            <p><strong>Referencia:</strong> ${reference}</p>
            <p>Ya puedes realizar tus apuestas. ¡Mucha suerte!</p>
        </div>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendDepositConfirmationEmail = sendDepositConfirmationEmail;
const sendWithdrawalStatusEmail = (to, amount, status, message) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = `Solicitud de Retiro ${status === 'APPROVED' ? 'Aprobada' : 'Rechazada'} - Tiempos Pro`;
    const statusColor = status === 'APPROVED' ? '#16a34a' : '#dc2626';
    const statusText = status === 'APPROVED' ? 'Aprobada' : 'Rechazada';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${statusColor}; padding: 20px; text-align: center; border-radius: 10px;">
                <h1 style="color: white; margin: 0;">Solicitud de Retiro ${statusText}</h1>
            </div>
            <div style="padding: 20px;">
                <p>Tu solicitud de retiro por <strong>₡${amount}</strong> ha sido <strong style="color: ${statusColor};">${statusText}</strong>.</p>
                ${message ? `<p><strong>Mensaje:</strong> ${message}</p>` : ''}
                <p>Si tienes preguntas, contáctanos.</p>
            </div>
        </div>
    `;
    yield (0, exports.sendEmail)(to, subject, html);
});
exports.sendWithdrawalStatusEmail = sendWithdrawalStatusEmail;
