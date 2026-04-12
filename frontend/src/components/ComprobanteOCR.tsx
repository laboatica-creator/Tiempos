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
            console.log('📄 Texto OCR completo:', texto);
            
            // === REFERENCIA ===
            let referencia = '';
            const refMatch = texto.match(/\b(\d{8})\b/);
            if (refMatch) referencia = refMatch[1];
            
            // === MONTO ===
            let monto = 0;
            const montoMatch = texto.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*Colones/);
            if (montoMatch) {
                monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.'));
            }
            
            // === FECHA ===
            let fecha = '';
            const fechaMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (fechaMatch) fecha = fechaMatch[1];
            
            // === TELÉFONO EMISOR ===
            let telefonoEmisor = '';
            const telEmisorMatch = texto.match(/Monto acreditado[,\s]*\n?\s*(\d+)/i);
            if (telEmisorMatch) telefonoEmisor = telEmisorMatch[1];
            
            // === TELÉFONO RECEPTOR ===
            let telefonoReceptor = '';
            // Buscar después de "Destinatario" o "SINPE Móvil destino"
            const telReceptorPatterns = [
                /Destinatario\s*\n?\s*(\d+)/i,
                /SINPE Móvil destino\s*(\d{4}[-]?\d{4})/i,
                /A favor de\s*\n?\s*(\d+)/i
            ];
            for (const pattern of telReceptorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    telefonoReceptor = match[1].replace(/-/g, '');
                    break;
                }
            }
            
            // === NOMBRE EMISOR ===
            let nombreEmisor = '';
            const nombreEmisorMatch = texto.match(/Realizado por\s*\n?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\n|$)/i);
            if (nombreEmisorMatch) nombreEmisor = nombreEmisorMatch[1].trim();
            
            // === NOMBRE RECEPTOR ===
            let nombreReceptor = '';
            const nombreReceptorMatch = texto.match(/Destinatario\s*\n?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\n|$)/i);
            if (nombreReceptorMatch) nombreReceptor = nombreReceptorMatch[1].trim();
            
            // === CONCEPTO (limpiar, quitar IBAN y números de cuenta) ===
            let concepto = '';
            const conceptMatch = texto.match(/Concepto:\s*(.+?)(?:\n|$)/i);
            if (conceptMatch) {
                concepto = conceptMatch[1].trim();
                // Limpiar: eliminar IBAN y números largos
                concepto = concepto.replace(/IBAN:\s*[A-Z0-9\s]+/i, '');
                concepto = concepto.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,}\b/gi, '');
                concepto = concepto.replace(/\s+/g, ' ').trim();
                // Limitar a 50 caracteres
                if (concepto.length > 50) concepto = concepto.substring(0, 50);
            }
            
            // === BANCO ===
            let bancoDetectado = '';
            if (texto.toLowerCase().includes('banco nacional')) bancoDetectado = 'Banco Nacional';
            else if (texto.toLowerCase().includes('bcr')) bancoDetectado = 'BCR';
            else if (texto.toLowerCase().includes('bac')) bancoDetectado = 'BAC';
            
            console.log('📊 DATOS EXTRAÍDOS:');
            console.log('   Referencia:', referencia);
            console.log('   Monto:', monto);
            console.log('   Fecha:', fecha);
            console.log('   Teléfono Emisor:', telefonoEmisor);
            console.log('   Teléfono Receptor:', telefonoReceptor);
            console.log('   Nombre Emisor:', nombreEmisor);
            console.log('   Nombre Receptor:', nombreReceptor);
            console.log('   Concepto:', concepto);
            console.log('   Banco:', bancoDetectado);
            
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