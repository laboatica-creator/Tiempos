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
            // Crear worker
            const worker = await Tesseract.createWorker('spa');
            
            const result = await worker.recognize(file);
            await worker.terminate();
            
            const texto = result.data.text;
            console.log('📄 Texto OCR completo:', texto);
            
            // Limpiar texto para análisis
            const textoLower = texto.toLowerCase();
            
            // === REFERENCIA ===
            let referencia = '';
            const refPatterns = [
                /Comprobante:\s*(\d+)/i,
                /Documento\s*(\d+)/i,
                /Referencia:\s*(\d+)/i,
                /Referencia\s*(\d+)/i,
                /\b(\d{20,})\b/,
                /\b(\d{8,15})\b/
            ];
            for (const pattern of refPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    referencia = match[1];
                    break;
                }
            }
            
            // === MONTO ===
            let monto = 0;
            const montoPatterns = [
                /Monto debitado:\s*[₡]?\s*([\d.,]+)/i,
                /Monto transferencia:\s*[₡]?\s*([\d.,]+)/i,
                /Monto acreditado:\s*[₡]?\s*([\d.,]+)/i,
                /₡\s*([\d.,]+)/,
                /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*Colones/i
            ];
            for (const pattern of montoPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    let montoStr = match[1].replace(/\./g, '').replace(',', '.');
                    monto = parseFloat(montoStr);
                    if (monto > 0 && monto < 1000000) break;
                }
            }
            
            // === FECHA ===
            let fecha = '';
            const fechaMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (fechaMatch) fecha = fechaMatch[1];
            
            // === TELÉFONO EMISOR ===
            let telefonoEmisor = '';
            const telEmisorMatch = texto.match(/Número de monedero:\s*(\d+)/i);
            if (telEmisorMatch) {
                telefonoEmisor = telEmisorMatch[1];
            }
            if (!telefonoEmisor) {
                const realizadoMatch = texto.match(/Realizado por:[\s\S]*?(\d{8})/i);
                if (realizadoMatch) telefonoEmisor = realizadoMatch[1];
            }
            
            // === TELÉFONO RECEPTOR ===
            let telefonoReceptor = '';
            const telReceptorMatch = texto.match(/Destinatario:\s*(?:\D*?)(\d{8})/i);
            if (telReceptorMatch) {
                telefonoReceptor = telReceptorMatch[1];
            }
            if (!telefonoReceptor) {
                const sinpeMatch = texto.match(/SINPE Móvil destino\s*(\d{4}[-]?\d{4})/i);
                if (sinpeMatch) telefonoReceptor = sinpeMatch[1].replace(/-/g, '');
            }
            
            // === NOMBRE EMISOR ===
            let nombreEmisor = '';
            const nombreEmisorMatch = texto.match(/Realizado por:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i);
            if (nombreEmisorMatch) {
                nombreEmisor = nombreEmisorMatch[1].trim();
            }
            
            // === NOMBRE RECEPTOR ===
            let nombreReceptor = '';
            const nombreReceptorMatch = texto.match(/Destinatario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i);
            if (nombreReceptorMatch) {
                nombreReceptor = nombreReceptorMatch[1].trim();
            }
            
            // === CONCEPTO ===
            let concepto = '';
            const conceptMatch = texto.match(/Concepto:\s*(.+?)(?:\n|$)/i);
            if (conceptMatch) {
                concepto = conceptMatch[1].trim();
            }
            
            // === BANCO DETECTADO ===
            let bancoDetectado = '';
            if (textoLower.includes('banco nacional') || textoLower.includes('bn sinpe')) {
                bancoDetectado = 'Banco Nacional';
            } else if (textoLower.includes('bcr')) {
                bancoDetectado = 'BCR';
            } else if (textoLower.includes('bac')) {
                bancoDetectado = 'BAC';
            } else if (textoLower.includes('popular')) {
                bancoDetectado = 'Banco Popular';
            }
            
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
            
            if (!referencia) {
                setError('⚠️ No se pudo leer la referencia. Por favor, ingrésela manualmente.');
            }
            
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