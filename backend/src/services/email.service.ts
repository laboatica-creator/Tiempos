import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

// Forzar IPv4 para evitar errores ENETUNREACH en Render
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

// Configura tu servicio de correo en el archivo .env
// Usando smtp-mail.outlook.com para mejor compatibilidad
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // false para port 587
    auth: {
        user: process.env.SMTP_USER || 'laboatica@hotmail.com',
        pass: process.env.SMTP_PASSWORD || 'Les1419055@',
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    debug: false // Cambiar a true para ver detalles en logs
});

// Verificar conexión al iniciar
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ [SMTP] Connection error:', error.message);
    } else {
        console.log('✅ [SMTP] Server is ready to send emails');
    }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'laboatica@hotmail.com';
        const result = await transporter.sendMail({
            from: `"Tiempos Tica y Nica" <${fromEmail}>`,
            to,
            subject,
            html,
        });
        console.log(`✅ [Email]: Enviado a ${to} con asunto: ${subject} (ID: ${result.messageId})`);
        return result;
    } catch (error: any) {
        console.error(`❌ [Email Error]: Fallo al enviar a ${to}:`, error.message);
        if (error.code === 'ESOCKET') {
            console.error('   💡 Sugerencia: Verifica que el servidor SMTP esté accesible desde Render');
        }
        throw error;
    }
};

export const sendWelcomeEmail = async (to: string, name: string) => {
    const subject = 'Bienvenido a Tiempos Pro 🎉';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎲 Tiempos Pro</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1e3c72;">¡Hola ${name}! 👋</h2>
                <p>Tu cuenta ha sido registrada de forma exitosa. ¡Es hora de empezar a jugar y ganar con Tiempos Pro!</p>
                <p style="margin: 20px 0;">Accede a tu cuenta y comienza a apostar:</p>
                <a href="${process.env.FRONTEND_URL || 'https://tiempos-tau.vercel.app'}" 
                   style="display: inline-block; padding: 12px 24px; background: #2a5298; color: white; text-decoration: none; border-radius: 5px;">
                    Ir a la plataforma
                </a>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">¡Mucha suerte y que la fortuna te acompañe! 🍀</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

export const sendPasswordRecoveryEmail = async (to: string, resetLink: string) => {
    const subject = 'Recuperación de Contraseña - Tiempos Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🔐 Recuperar Contraseña</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Alguien ha solicitado restablecer tu contraseña. Si no fuiste tú, ignora este correo.</p>
                <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #2a5298; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
                    Restablecer Contraseña
                </a>
                <br/>
                <p style="color: #666; font-size: 12px;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                <p style="word-break: break-all;">${resetLink}</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

export const sendTicketPurchaseEmail = async (to: string, drawInfo: string, numbers: any[], totalAmount: number) => {
    const subject = 'Confirmación de Apuesta - Tiempos Pro';
    
    let numbersList = numbers.map(n => `<li style="margin: 5px 0;">🎯 Número: <b>${n.number}</b> - ₡${n.amount}</li>`).join('');
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎫 Confirmación de Apuesta</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Tu compra de tickets para el sorteo <strong style="color: #2a5298;">${drawInfo}</strong> ha sido registrada exitosamente.</p>
                <h3 style="color: #1e3c72;">📋 Detalles:</h3>
                <ul style="list-style: none; padding: 0;">
                    ${numbersList}
                </ul>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="margin: 0; color: #1e3c72;">💰 Total Invertido: ₡${totalAmount}</h3>
                </div>
                <p style="color: #2a5298;">🍀 ¡Mucha suerte! El sorteo se realizará en la fecha indicada.</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Consulta tus resultados en la plataforma.</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

export const sendWinnerNotificationEmail = async (to: string, drawInfo: string, numberStr: string, prize: number) => {
    const subject = '¡Felicidades, ganaste! 🎉 - Tiempos Pro';
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🏆 ¡FELICIDADES! 🏆</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #d97706;">¡Eres un ganador!</h2>
                <p>Tu número <strong style="font-size: 24px; color: #f59e0b;">${numberStr}</strong> fue el ganador en el sorteo de <strong>${drawInfo}</strong>.</p>
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
                    <h2 style="color: white; margin: 0;">💰 ₡${prize} 💰</h2>
                </div>
                <p>El premio ha sido acreditado en tu billetera digital. ¡Sigue participando y ganando!</p>
                <hr style="margin: 20px 0;">
                <p style="color: #666;">¡Gracias por confiar en Tiempos Pro!</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

export const sendDepositConfirmationEmail = async (to: string, amount: number, reference: string) => {
    const subject = 'Depósito Confirmado - Tiempos Pro';
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: #2a5298; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">💰 Depósito Confirmado</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Se ha confirmado tu depósito de <strong>₡${amount}</strong>.</p>
                <p><strong>Referencia:</strong> ${reference}</p>
                <p>Ya puedes realizar tus apuestas. ¡Mucha suerte!</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};

export const sendWithdrawalStatusEmail = async (to: string, amount: number, status: string, message?: string) => {
    const subject = `Solicitud de Retiro ${status === 'APPROVED' ? 'Aprobada' : 'Rechazada'} - Tiempos Pro`;
    const statusColor = status === 'APPROVED' ? '#16a34a' : '#dc2626';
    const statusText = status === 'APPROVED' ? 'Aprobada' : 'Rechazada';
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: ${statusColor}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">Solicitud de Retiro ${statusText}</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <p>Tu solicitud de retiro por <strong>₡${amount}</strong> ha sido <strong style="color: ${statusColor};">${statusText}</strong>.</p>
                ${message ? `<p><strong>Mensaje:</strong> ${message}</p>` : ''}
                <p>Si tienes preguntas, contáctanos.</p>
            </div>
        </div>
    `;
    await sendEmail(to, subject, html);
};