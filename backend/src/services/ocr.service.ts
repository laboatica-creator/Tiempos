import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import crypto from 'crypto';

export class OCRService {
    /**
     * Extracts text from a receipt image (Buffer or URL) 
     * and returns structured data for verification.
     */
    static async processReceipt(imageSource: string | Buffer) {
        try {
            // Generate Image Hash for fraud detection (duplicate image check)
            const hash = await this.generateImageHash(imageSource);
            
            // Perform OCR
            const { data: { text } } = await Tesseract.recognize(imageSource, 'spa', {
                logger: m => console.log(m)
            });

            // Extract Fields (SINPE Specific)
            const extractedData = this.parseSinpeText(text);

            return {
                text,
                hash,
                ...extractedData
            };
        } catch (error) {
            console.error('OCR Processing error:', error);
            throw new Error('Failed to process receipt image.');
        }
    }

    /**
     * Generates a perceptual hash or simple MD5 for duplicate image detection.
     * For high scalability/fraud detection, a real perceptual hash (dHash) is better.
     * For now, we'll use a resized grayscale buffer + MD5 as a simple implementation.
     */
    private static async generateImageHash(imageSource: string | Buffer) {
        const buffer = Buffer.isBuffer(imageSource) 
            ? imageSource 
            : await (await fetch(imageSource)).arrayBuffer();
        
        // Resize and grayscale to normalize
        const normalizedBuffer = await sharp(buffer)
            .resize(32, 32, { fit: 'fill' })
            .grayscale()
            .toBuffer();

        return crypto.createHash('md5').update(normalizedBuffer).digest('hex');
    }

    private static parseSinpeText(text: string) {
        // Sample Regex patterns for common CR bank receipts
        // Monto: often shows "CRC 1.000,00" or similar
        const montoRegex = /(?:Monto|Importe|CRC|Total)[:\s]*([\d,.]+)/i;
        const refRegex = /(?:Referencia|Referencial|Comprobante|Ref)[:\s]*([\dABCDE-]+)/i;
        const nameRegex = /(?:Nombre|Enviado por|Emisor)[:\s]*([A-Z\s]+)/i;
        const dateRegex = /(?:Fecha|Realizado)[:\s]*([\d/:-]+)/i;

        const montoMatch = text.match(montoRegex);
        const refMatch = text.match(refRegex);
        const nameMatch = text.match(nameRegex);
        const dateMatch = text.match(dateRegex);

        let amount = 0;
        if (montoMatch) {
            // Cleanup amount (remove commas/periods depending on format)
            const cleanedMonto = montoMatch[1].replace(/[^\d]/g, ''); // Extract all digits
            // CRC amounts usually end in two decimal digits? No, usually in CR they don't use decimals often or it's ,00
            // We'll trust the user's intended amount too (cross-verify).
            amount = parseInt(cleanedMonto);
        }

        return {
            amount,
            referenceNumber: refMatch ? refMatch[1].trim() : null,
            senderName: nameMatch ? nameMatch[1].trim() : null,
            date: dateMatch ? dateMatch[1].trim() : null
        };
    }
}
