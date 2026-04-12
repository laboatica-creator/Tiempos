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
            
            // Limpiar texto: reemplazar saltos de línea por espacios
            const textoPlano = texto.replace(/\n/g, ' ').replace(/\s+/g, ' ');
            console.log('📄 Texto plano:', textoPlano);
            
            // === REFERENCIA (8 dígitos como 95878163) ===
            let referencia = '';
            const refMatch = textoPlano.match(/\b(\d{8})\b/);
            if (refMatch) referencia = refMatch[1];
            
            // === MONTO ===
            let monto = 0;
            const montoMatch = textoPlano.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*Colones/);
            if (montoMatch) {
                monto = parseFloat(montoMatch[1].replace(/\./g, '').replace(',', '.'));
            }
            
            // === FECHA ===
            let fecha = '';
            const fechaMatch = textoPlano.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (fechaMatch) fecha = fechaMatch[1];
            
            // === TELÉFONO EMISOR (85571922) - viene después de "Monto acreditado" ===
            let telefonoEmisor = '';
            const telEmisorMatch = texto.match(/Monto acreditado[,\s]*\n?\s*(\d+)/i);
            if (telEmisorMatch) telefonoEmisor = telEmisorMatch[1];
            
            // === TELÉFONO RECEPTOR ===
            let telefonoReceptor = '';
            // Buscar después de "Destinatario"
            const telReceptorMatch = texto.match(/Destinatario\s*\n?\s*(\d+)/i);
            if (telReceptorMatch) telefonoReceptor = telReceptorMatch[1];
            
            // === NOMBRE EMISOR (RODRIGO NAJERA SANTAMARIA) ===
            let nombreEmisor = '';
            const nombreEmisorMatch = texto.match(/Realizado por\s*\n?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\n|$)/i);
            if (nombreEmisorMatch) nombreEmisor = nombreEmisorMatch[1].trim();
            
            // === NOMBRE RECEPTOR (JORGE LUIS LESLI VEITCH) ===
            let nombreReceptor = '';
            const nombreReceptorMatch = texto.match(/Destinatario\s*\n?\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\n|$)/i);
            if (nombreReceptorMatch) nombreReceptor = nombreReceptorMatch[1].trim();
            
            // === CONCEPTO ===
            let concepto = '';
            const conceptMatch = texto.match(/Concepto:\s*(.+?)(?:\n|$)/i);
            if (conceptMatch) concepto = conceptMatch[1].trim();
            
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