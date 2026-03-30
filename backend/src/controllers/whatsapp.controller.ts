import { Request, Response } from 'express';
import { pool } from '../index';
import { OCRService } from '../services/ocr.service';

export const handleWhatsAppWebhook = async (req: Request, res: Response): Promise<any> => {
    // Use basic auth checks for protection via WHATSAPP_API_TOKEN
    const authHeader = req.headers.authorization;
    const token = process.env.WHATSAPP_API_TOKEN;
    if (token && authHeader !== `Bearer ${token}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { From, Body, MediaUrl0 } = req.body;

    if (!MediaUrl0) {
        // Fallback or just text message
        return res.json({ message: 'Received text message, but expected image for SINPE receipt.' });
    }

    // Acknowledge the webhook reception immediately to respect < 10s rule
    res.status(200).json({ status: 'Processing' });

    // Process asynchronously
    (async () => {
        // Clean Phone Number: remove whatsapp prefix and plus sign
        const phoneNumber = From ? From.replace('whatsapp:', '').replace('+', '').trim() : '';
        let user: any = null;

        try {
            // 1. Identify User by checking ending of string to avoid country code mismatches
            const userRes = await pool.query(`SELECT id, full_name, phone_number FROM users WHERE phone_number LIKE $1`, [`%${phoneNumber}%`]);
            if (userRes.rows.length === 0) {
                console.log(`Webhook: Phone number ${phoneNumber} not registered.`);
                return;
            }
            user = userRes.rows[0];

            // 2. Process Image with OCR
            const ocrData = await OCRService.processReceipt(MediaUrl0);
            
            // Log to ocr_logs
            let ocrLogId: number | null = null;
            try {
                const logRes = await pool.query(
                    `INSERT INTO ocr_logs (user_id, image_url, extracted_text, amount, reference_number, sender_name, date_extracted, status) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                    [user.id, MediaUrl0, ocrData.text, ocrData.amount, ocrData.referenceNumber, ocrData.senderName, ocrData.date, 'PENDING']
                );
                ocrLogId = logRes.rows[0].id;
            } catch (err) {
                console.error('Failed to insert into ocr_logs', err);
            }

            if (!ocrData.referenceNumber || !ocrData.amount) {
                console.log('Webhook: OCR failed to extract essential SINPE data.', ocrData);
                if (ocrLogId) await pool.query(`UPDATE ocr_logs SET status = 'FAILED' WHERE id = $1`, [ocrLogId]);
                await sendWhatsAppNotification(phoneNumber, `¡Hola ${user.full_name}! Hemos recibido tu comprobante, pero no pudimos extraer el monto o la referencia de forma automática. Un administrador lo revisará en breve.`);
                return;
            }

            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // 3. Fraud Detection
                const duplicateCheck = await client.query(
                    `SELECT id FROM sinpe_deposits WHERE reference_number = $1 OR receipt_hash = $2`, 
                    [ocrData.referenceNumber, ocrData.hash]
                );

                if (duplicateCheck.rows.length > 0) {
                    await client.query('ROLLBACK');
                    console.log('Webhook: Duplicate receipt rejected.');
                    if (ocrLogId) await pool.query(`UPDATE ocr_logs SET status = 'REJECTED' WHERE id = $1`, [ocrLogId]);
                    await sendWhatsAppNotification(phoneNumber, `¡Hola ${user.full_name}! El comprobante enviado parece ser duplicado o la referencia (#${ocrData.referenceNumber}) ya fue utilizada.`);
                    return;
                }

                // 4. Create Deposit Record
                const depositRes = await client.query(
                    `INSERT INTO sinpe_deposits (user_id, amount, reference_number, receipt_hash, sender_name, status) 
                     VALUES ($1, $2, $3, $4, $5, 'APPROVED') 
                     RETURNING id, amount`,
                    [user.id, ocrData.amount, ocrData.referenceNumber, ocrData.hash, ocrData.senderName]
                );

                const depositId = depositRes.rows[0].id;

                // 5. Credit Wallet
                const walletRes = await client.query(
                    `UPDATE wallets SET balance = balance + $1, total_deposits = total_deposits + $1, updated_at = NOW() 
                     WHERE user_id = $2 RETURNING id`,
                    [ocrData.amount, user.id]
                );

                await client.query(
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
                     VALUES ($1, 'SINPE_DEPOSIT', $2, 'Automated WhatsApp SINPE Approval', $3)`,
                    [walletRes.rows[0].id, ocrData.amount, depositId]
                );

                if (ocrLogId) {
                    await client.query(`UPDATE ocr_logs SET status = 'SUCCESS', transaction_id = $1 WHERE id = $2`, [depositId, ocrLogId]);
                }

                await client.query('COMMIT');
                console.log(`Webhook: SINPE applied for ${user.full_name}. Ref: ${ocrData.referenceNumber}`);
                await sendWhatsAppNotification(phoneNumber, `¡Hola ${user.full_name}! Tu recarga SINPE de ₡${ocrData.amount.toLocaleString()} ha sido aplicada exitosamente a tu billetera. Referencia: ${ocrData.referenceNumber}`);

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('WhatsApp Processing error:', error);
            await sendWhatsAppNotification(phoneNumber, `Ocurrió un error inesperado al procesar tu comprobante. Por favor contacta a soporte.`);
        }
    })();
};

async function sendWhatsAppNotification(phoneNumber: string, message: string) {
    // In a production environment this would call Twilio or WhatsApp Business Messaging API
    console.log(`[WHATSAPP MESSAGE to ${phoneNumber}]: ${message}`);
}

