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
            // Reconocer texto de la imagen/PDF
            const result = await Tesseract.recognize(file, 'spa', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                }
            });
            
            const texto = result.data.text;
            console.log('📄 Texto OCR:', texto);
            
            // Extraer referencia SINPE (número de transacción)
            const referenciaMatch = texto.match(/(?:referencia|transaccion|transacción|ID|N°|#)[\s:]*(\d{8,15})/i);
            
            // Extraer monto
            const montoMatch = texto.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:colones|₡|CRC)/i);
            let monto = 0;
            if (montoMatch) {
                monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.'));
            }
            
            // Extraer teléfono origen (SINPE Móvil)
            const telefonoMatch = texto.match(/(?:tel|telefono|phone|origen)[\s:]*(\d{4}[-]?\d{4})|(506\d{8})/i);
            let telefonoOrigen = '';
            if (telefonoMatch) {
                telefonoOrigen = telefonoMatch[1] || telefonoMatch[2] || '';
            }
            
            // Extraer nombre del titular
            const nombreMatch = texto.match(/(?:nombre|titular|cliente|emisor|ordenante)[\s:]*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,40})/i);
            let nombreOrigen = '';
            if (nombreMatch) {
                nombreOrigen = nombreMatch[1]?.trim() || '';
            }
            
            // Extraer fecha
            const fechaMatch = texto.match(/(\d{2}[/-]\d{2}[/-]\d{4})/);
            
            return {
                referencia: referenciaMatch?.[1] || '',
                monto: monto,
                fecha: fechaMatch?.[1] || '',
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