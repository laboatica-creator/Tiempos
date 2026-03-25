import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Configura tu servicio de correo en el archivo .env
// Ejemplo para Gmail o Namecheap privado
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // false para port 587
    auth: {
        user: process.env.SMTP_USER || 'laboatica@hotmail.com',
        pass: process.env.SMTP_PASSWORD || 'Les1419055@',
    },
    tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
    }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const fromEmail = process.env.SMTP_USER || 'laboatica@hotmail.com';
        await transporter.sendMail({
            from: `"Tiempos Tica y Nica" <${fromEmail}>`,
            to,
            subject,
            html,
        });
        console.log(`[Email]: Enviado a ${to} con asunto: ${subject}`);
    } catch (error) {
        console.error(`[Email Error]: Fallo al enviar a ${to}:`, error);
    }
};

export const sendWelcomeEmail = async (to: string, name: string) => {
    const subject = 'Bienvenido a Tiempos Betting 🎉';
    const html = `
        <h1>Hola ${name},</h1>
        <p>Tu cuenta ha sido registrada de forma exitosa. ¡Es hora de empezar a jugar y ganar con Tiempos Betting!</p>
        <br/>
        <p>Gracias por elegirnos.</p>
    `;
    await sendEmail(to, subject, html);
};

export const sendPasswordRecoveryEmail = async (to: string, resetLink: string) => {
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
    await sendEmail(to, subject, html);
};

export const sendTicketPurchaseEmail = async (to: string, drawInfo: string, numbers: any[], totalAmount: number) => {
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
    await sendEmail(to, subject, html);
};

export const sendWinnerNotificationEmail = async (to: string, drawInfo: string, numberStr: string, prize: number) => {
    const subject = '¡Felicidades, ganaste! 🎉 - Tiempos Betting';
    
    const html = `
        <h1>¡Felicidades, eres un ganador!</h1>
        <p>Tu número <b>${numberStr}</b> fue el ganador en el sorteo de <b>${drawInfo}</b>.</p>
        <h2 style="color: #16a34a;">Premio Ganado: ₡${prize}</h2>
        <p>El premio ha sido acreditado en tu billetera digital. ¡Sigue participando y ganando!</p>
    `;
    await sendEmail(to, subject, html);
};
