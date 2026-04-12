'use client';

import { useState } from 'react';
import Tesseract from 'tesseract.js';

export interface DatosComprobante {
    referencia: string;
    monto: number;
    fecha: string;
    telefonoOrigen: string;
    nombreOrigen: string;
    textoCompleto: string;
}

export function useComprobanteOCR() {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const extraerDatos = async (file: File, telefonoUsuario: string = ''): Promise<DatosComprobante | null> => {
        setProcessing(true);
        setProgress(0);
        setError(null);
        
        try {
            // Crear worker con configuración optimizada
            const worker = await Tesseract.createWorker('spa', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                }
            });
            
            // Configurar parámetros para mejor precisión en números
            await worker.setParameters({
                tessedit_pageseg_mode: '6', // SINGLE_BLOCK - bloque uniforme de texto
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-:.()$€₡ ',
                user_defined_dpi: '300'
            });
            
            const result = await worker.recognize(file);
            await worker.terminate();
            
            const texto = result.data.text;
            console.log('📄 Texto OCR completo:', texto);
            
            // === EXTRACCIÓN MEJORADA PARA SINPE COSTA RICA ===
            
            // 1. Referencia SINPE (formato típico: 10-15 dígitos, puede tener guiones)
            // Patrones comunes: "Referencia: 1234567890", "Transacción: 1234567890", "ID: 1234567890"
            const referenciaPatterns = [
                /(?:referencia|transaccion|transacción|ID|identificador|folio)[\s:]*(\d{8,15})/i,
                /(?:REF|REFERENCIA)[\s:]*(\d{8,15})/i,
                /(\d{4}[-]?\d{4}[-]?\d{4})/,  // Formato XXXX-XXXX-XXXX
                /(\d{10,15})/  // Cualquier número de 10-15 dígitos
            ];
            
            let referencia = '';
            for (const pattern of referenciaPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    referencia = match[1].replace(/-/g, '');
                    break;
                }
            }
            
            // 2. Monto (formato típico costarricense: ₡10,000 o 10000)
            const montoPatterns = [
                /₡\s*([\d.,]+)/i,
                /(?:monto|total|valor)[\s:]*₡?\s*([\d.,]+)/i,
                /([\d.,]+)\s*(?:colones|CRC)/i,
                /([\d]{4,7})/  // Cualquier número de 4-7 dígitos como respaldo
            ];
            
            let monto = 0;
            for (const pattern of montoPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    let montoStr = match[1].replace(/\./g, '').replace(',', '.');
                    monto = parseFloat(montoStr);
                    if (monto > 0 && monto < 500000) break;
                }
            }
            
            // 3. Teléfono origen (formato SINPE: 8 dígitos o 506 + 8 dígitos)
            const telefonoPatterns = [
                /(?:tel|telefono|phone|origen|emisor)[\s:]*(\d{4}[-]?\d{4})/i,
                /(\d{4}[-]?\d{4})/,
                /(506\d{8})/i
            ];
            
            let telefonoOrigen = '';
            for (const pattern of telefonoPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    telefonoOrigen = match[1].replace(/-/g, '');
                    break;
                }
            }
            
            // 4. Nombre del titular
            const nombrePatterns = [
                /(?:nombre|titular|cliente|emisor|ordenante|pagador)[\s:]*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,40})/i,
                /(?:a favor de|para)[\s:]*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,40})/i
            ];
            
            let nombreOrigen = '';
            for (const pattern of nombrePatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreOrigen = match[1].trim();
                    break;
                }
            }
            
            // 5. Fecha
            const fechaPatterns = [
                /(\d{2}[/-]\d{2}[/-]\d{4})/,
                /(\d{4}[/-]\d{2}[/-]\d{2})/
            ];
            
            let fecha = '';
            for (const pattern of fechaPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    fecha = match[1];
                    break;
                }
            }
            
            console.log('📊 Datos extraídos:', { referencia, monto, telefonoOrigen, nombreOrigen, fecha });
            
            // Mostrar advertencia si no se encontró la referencia
            if (!referencia) {
                setError('⚠️ No se pudo leer la referencia SINPE automáticamente. Por favor, ingrésela manualmente.');
            }
            
            return {
                referencia: referencia,
                monto: monto,
                fecha: fecha,
                telefonoOrigen: telefonoOrigen,
                nombreOrigen: nombreOrigen,
                textoCompleto: texto
            };
        } catch (err) {
            console.error('❌ OCR Error:', err);
            setError('No se pudo leer el comprobante. Intente nuevamente o ingrese los datos manualmente.');
            return null;
        } finally {
            setProcessing(false);
        }
    };
    
    return { extraerDatos, processing, progress, error };
}