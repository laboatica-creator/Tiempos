import dotenv from 'dotenv';

dotenv.config();

console.log('📧 [SMTP] Servicio de correo temporalmente deshabilitado');

// Funciones vacías que no envían correos
export const sendEmail = async (to: string, subject: string, html: string) => {
    console.log(`⚠️ [Email Deshabilitado]: Se habría enviado a ${to} - ${subject}`);
    return null;
};

export const sendWelcomeEmail = async (to: string, name: string) => {
    console.log(`⚠️ [Email Deshabilitado]: Bienvenida a ${name} (${to})`);
};

export const sendPasswordRecoveryEmail = async (to: string, resetLink: string) => {
    console.log(`⚠️ [Email Deshabilitado]: Recuperación de contraseña para ${to}`);
};

export const sendTicketPurchaseEmail = async (to: string, drawInfo: string, numbers: any[], totalAmount: number) => {
    console.log(`⚠️ [Email Deshabilitado]: Confirmación de apuesta para ${to} - Total: ₡${totalAmount}`);
};

export const sendWinnerNotificationEmail = async (to: string, drawInfo: string, numberStr: string, prize: number) => {
    console.log(`⚠️ [Email Deshabilitado]: Notificación de premio para ${to} - ₡${prize}`);
};

export const sendDepositConfirmationEmail = async (to: string, amount: number, reference: string) => {
    console.log(`⚠️ [Email Deshabilitado]: Depósito confirmado para ${to} - ₡${amount}`);
};

export const sendWithdrawalStatusEmail = async (to: string, amount: number, status: string, message?: string) => {
    console.log(`⚠️ [Email Deshabilitado]: Retiro ${status} para ${to} - ₡${amount}`);
};