import { Request, Response } from 'express';
import { pool } from '../database/db';
import { OCRService } from '../services/ocr.service';

export const processSinpeWebhook = async (req: Request, res: Response) => {
    try {
        const { image_url, phone } = req.body;
        
        if (!image_url) {
            return res.status(400).json({ error: 'Se requiere image_url' });
        }

        let ocrData = null;
        try {
            ocrData = await OCRService.processReceipt(image_url);
        } catch (e) {
            console.warn('OCR Failed, continuing without OCR data');
            ocrData = { amount: null, referenceNumber: null, hash: null };
        }
        
        let userId = null;
        if (phone) {
            const userRes = await pool.query(
                `SELECT id FROM users WHERE phone_number LIKE $1`, 
                [`%${phone.slice(-8)}`]
            );
            if (userRes.rows.length > 0) userId = userRes.rows[0].id;
        }
        
        await pool.query(
            `INSERT INTO sinpe_deposits (user_id, amount, reference_number, receipt_hash, status, method_type, bank_name) 
             VALUES ($1, $2, $3, $4, 'PENDING', 'WEBHOOK', $5)`,
            [userId, ocrData?.amount || null, ocrData?.referenceNumber || null, ocrData?.hash || null, 'SINPE MOVIL']
        );
        
        res.json({ success: true, amount: ocrData?.amount });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Error procesando webhook' });
    }
};