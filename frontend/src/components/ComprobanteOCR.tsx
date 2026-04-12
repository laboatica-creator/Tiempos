'use client';

import { useState } from 'react';
import Tesseract from 'tesseract.js';

export interface DatosComprobante {
    referencia: string;
    monto: number;
    fecha: string;
    telefonoEmisor: string;
    telefonoReceptor: string;
    nombreEmisor: string;
    nombreReceptor: string;
    concepto: string;
    bancoDetectado: string;
    textoCompleto: string;
}

export function useComprobanteOCR() {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const extraerDatos = async (file: File): Promise<DatosComprobante | null> => {
        setProcessing(true);
        setProgress(0);
        setError(null);
        
        try {
            const worker = await Tesseract.createWorker('spa');
            const result = await worker.recognize(file);
            await worker.terminate();
            
            const texto = result.data.text;
            console.log('📄 Texto OCR:', texto);
            
            // === REFERENCIA ===
            let referencia = '';
            const refMatch = texto.match(/(?:Comprobante|Documento|Referencia):\s*(\d+)/i);
            if (refMatch) referencia = refMatch[1];
            if (!referencia) {
                const numMatch = texto.match(/\b(\d{8,15})\b/);
                if (numMatch) referencia = numMatch[1];
            }
            
            // === MONTO ===
            let monto = 0;
            const montoMatch = texto.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:Colones|₡)/i);
            if (montoMatch) {
                monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.'));
            }
            
            // === FECHA ===
            let fecha = '';
            const fechaMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (fechaMatch) fecha = fechaMatch[1];
            
            // === TELÉFONO EMISOR ===
            let telefonoEmisor = '';
            const telEmisorMatch = texto.match(/Número de monedero:\s*(\d+)/i);
            if (telEmisorMatch) telefonoEmisor = telEmisorMatch[1];
            
            // === TELÉFONO RECEPTOR ===
            let telefonoReceptor = '';
            const telReceptorMatch = texto.match(/(?:Destinatario|Beneficiario).*?(\d{8})/i);
            if (!telReceptorMatch) {
                const sinpeMatch = texto.match(/SINPE Móvil destino\s*(\d{4}[-]?\d{4})/i);
                if (sinpeMatch) telefonoReceptor = sinpeMatch[1].replace(/-/g, '');
            } else {
                telefonoReceptor = telReceptorMatch[1];
            }
            
            // === NOMBRE EMISOR ===
            let nombreEmisor = '';
            const nombreEmisorMatch = texto.match(/Realizado por:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i);
            if (nombreEmisorMatch) nombreEmisor = nombreEmisorMatch[1].trim();
            
            // === NOMBRE RECEPTOR ===
            let nombreReceptor = '';
            const nombreReceptorMatch = texto.match(/Destinatario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i);
            if (nombreReceptorMatch) nombreReceptor = nombreReceptorMatch[1].trim();
            
            // === CONCEPTO ===
            let concepto = '';
            const conceptMatch = texto.match(/Concepto:\s*(.+?)(?:\n|$)/i);
            if (conceptMatch) concepto = conceptMatch[1].trim();
            
            // === BANCO DETECTADO ===
            let bancoDetectado = '';
            const textoLower = texto.toLowerCase();
            if (textoLower.includes('banco nacional') || textoLower.includes('bn sinpe')) bancoDetectado = 'Banco Nacional';
            else if (textoLower.includes('bcr')) bancoDetectado = 'BCR';
            else if (textoLower.includes('bac')) bancoDetectado = 'BAC';
            else if (textoLower.includes('popular')) bancoDetectado = 'Banco Popular';
            
            console.log('📊 DATOS EXTRAÍDOS:', {
                referencia, monto, fecha,
                telefonoEmisor, telefonoReceptor,
                nombreEmisor, nombreReceptor,
                concepto, bancoDetectado
            });
            
            return {
                referencia,
                monto,
                fecha,
                telefonoEmisor,
                telefonoReceptor,
                nombreEmisor,
                nombreReceptor,
                concepto,
                bancoDetectado,
                textoCompleto: texto
            };
        } catch (err) {
            console.error('❌ OCR Error:', err);
            setError('No se pudo leer el comprobante. Intente nuevamente.');
            return null;
        } finally {
            setProcessing(false);
        }
    };
    
    return { extraerDatos, processing, progress, error };
}