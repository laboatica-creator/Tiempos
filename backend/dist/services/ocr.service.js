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
exports.OCRService = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = __importDefault(require("crypto"));
class OCRService {
    /**
     * Extracts text from a receipt image (Buffer or URL)
     * and returns structured data for verification.
     */
    static processReceipt(imageSource) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Generate Image Hash for fraud detection (duplicate image check)
                const hash = yield this.generateImageHash(imageSource);
                // Perform OCR
                const { data: { text } } = yield tesseract_js_1.default.recognize(imageSource, 'spa', {
                    logger: m => console.log(m)
                });
                // Extract Fields (SINPE Specific)
                const extractedData = this.parseSinpeText(text);
                return Object.assign({ text,
                    hash }, extractedData);
            }
            catch (error) {
                console.error('OCR Processing error:', error);
                throw new Error('Failed to process receipt image.');
            }
        });
    }
    /**
     * Generates a perceptual hash or simple MD5 for duplicate image detection.
     * For high scalability/fraud detection, a real perceptual hash (dHash) is better.
     * For now, we'll use a resized grayscale buffer + MD5 as a simple implementation.
     */
    static generateImageHash(imageSource) {
        return __awaiter(this, void 0, void 0, function* () {
            const buffer = Buffer.isBuffer(imageSource)
                ? imageSource
                : yield (yield fetch(imageSource)).arrayBuffer();
            // Resize and grayscale to normalize
            const normalizedBuffer = yield (0, sharp_1.default)(buffer)
                .resize(32, 32, { fit: 'fill' })
                .grayscale()
                .toBuffer();
            return crypto_1.default.createHash('md5').update(normalizedBuffer).digest('hex');
        });
    }
    static parseSinpeText(text) {
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
exports.OCRService = OCRService;
