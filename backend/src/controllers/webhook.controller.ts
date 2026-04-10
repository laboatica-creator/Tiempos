import { Request, Response } from 'express';
import { pool } from '../database/db';
import { OCRService } from '../services/ocr.service';

export const processSinpeWebhook = async (req: Request, res: Response) => {
    try {
        const { image_url, phone } = req.body;

        if (!image_url) {
            return res.status(400).json({ error: 'Se requiere la URL de la imagen del comprobante.' });
        }

        // 1. Procesar con OCR
        console.log(`🔍 [WEBHOOK] Procesando comprobante de ${phone || 'Desconocido'}...`);
        const ocrData = await OCRService.processReceipt(image_url);

        // 2. Buscar usuario por teléfono (si se proporciona)
        let userId = null;
        if (phone) {
            // Asumimos formato 506XXXXXXXX o similar
            const cleanPhone = phone.replace(/\D/g, '').slice(-8); 
            const userRes = await pool.query(`SELECT id FROM users WHERE phone_number LIKE $1`, [`%${cleanPhone}`]);
            if (userRes.rows.length > 0) userId = userRes.rows[0].id;
        }

        // 3. Verificar si el comprobante ya existe (fraude)
        const hashCheck = await pool.query(`SELECT id FROM sinpe_deposits WHERE receipt_hash = $1`, [ocrData.hash]);
        if (hashCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Este comprobante ya fue procesado anteriormente.' });
        }

        // 4. Registrar el depósito como PENDIENTE
        const result = await pool.query(
            `INSERT INTO sinpe_deposits (
                user_id, amount, reference_number, receipt_hash, sender_name, status, method_type
             ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 'OCR_WEBHOOK') RETURNING id`,
            [
                userId, 
                ocrData.amount || 0, 
                ocrData.referenceNumber || `OCR-${Date.now()}`, 
                ocrData.hash, 
                ocrData.senderName || phone || 'WEBHOOK'
            ]
        );

        console.log(`✅ [WEBHOOK] Depósito registrado id: ${result.rows[0].id}. Monto: ${ocrData.amount}`);
        
        res.json({
            success: true,
            deposit_id: result.rows[0].id,
            extracted_data: {
                amount: ocrData.amount,
                reference: ocrData.referenceNumber,
                sender: ocrData.senderName
            },
            identified_user: !!userId
        });
    } catch (error: any) {
        console.error('❌ [WEBHOOK] Error procesando OCR:', error.message);
        res.status(500).json({ error: 'Error interno procesando comprobante.' });
    }
};
