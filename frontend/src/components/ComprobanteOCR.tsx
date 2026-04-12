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
            
            const textoLower = texto.toLowerCase();
            
            // === REFERENCIA (Comprobante / Documento) ===
            let referencia = '';
            const refPatterns = [
                /Comprobante:\s*(\d+)/i,
                /Documento\s*(\d+)/i,
                /Referencia:\s*(\d+)/i,
                /Referencia\s*(\d+)/i,
                /N°\s*Documento:\s*(\d+)/i,
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
                /Monto:\s*[₡]?\s*([\d.,]+)/i,
                /Total:\s*[₡]?\s*([\d.,]+)/i,
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
            const fechaPatterns = [
                /(\d{2}\/\d{2}\/\d{4})/,
                /(\d{2}-\d{2}-\d{4})/,
                /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i
            ];
            for (const pattern of fechaPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    fecha = match[1];
                    break;
                }
            }
            
            // === TELÉFONO EMISOR (quien envía - Número de monedero) ===
            let telefonoEmisor = '';
            const telEmisorPatterns = [
                /Número de monedero:\s*(\d+)/i,
                /Monedero:\s*(\d+)/i,
                /Teléfono emisor:\s*(\d+)/i,
                /Teléfono:\s*(\d+)/i,
                /Realizado por:[\s\S]*?(\d{8})/i
            ];
            for (const pattern of telEmisorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    telefonoEmisor = match[1];
                    break;
                }
            }
            
            // === TELÉFONO RECEPTOR (quien recibe) ===
            let telefonoReceptor = '';
            const telReceptorPatterns = [
                /SINPE Móvil destino\s*(\d{4}[-]?\d{4})/i,
                /Destinatario:[\s\S]*?(\d{8})/i,
                /Beneficiario:[\s\S]*?(\d{8})/i,
                /Teléfono destino:\s*(\d+)/i,
                /A favor de:[\s\S]*?(\d{8})/i
            ];
            for (const pattern of telReceptorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    telefonoReceptor = match[1].replace(/-/g, '');
                    break;
                }
            }
            
            // === NOMBRE EMISOR (Realizado por / Ordenante) ===
            let nombreEmisor = '';
            const nombreEmisorPatterns = [
                /Realizado por:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i,
                /Ordenante:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i,
                /Emisor:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i,
                /De:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i
            ];
            for (const pattern of nombreEmisorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreEmisor = match[1].trim();
                    break;
                }
            }
            
            // === NOMBRE RECEPTOR (Destinatario / Beneficiario) ===
            let nombreReceptor = '';
            const nombreReceptorPatterns = [
                /Destinatario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i,
                /Beneficiario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i,
                /Receptor:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i,
                /Para:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{3,50})/i
            ];
            for (const pattern of nombreReceptorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreReceptor = match[1].trim();
                    break;
                }
            }
            
            // === CONCEPTO / MOTIVO ===
            let concepto = '';
            const conceptPatterns = [
                /Concepto:\s*(.+?)(?:\n|$)/i,
                /Motivo:\s*(.+?)(?:\n|$)/i,
                /Descripción:\s*(.+?)(?:\n|$)/i,
                /Detalle:\s*(.+?)(?:\n|$)/i
            ];
            for (const pattern of conceptPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    concepto = match[1].trim();
                    break;
                }
            }
            
            // === BANCO DETECTADO ===
            let bancoDetectado = '';
            const bancosMap = [
                { keywords: ['banco nacional', 'bn sinpe', 'bnc'], nombre: 'Banco Nacional' },
                { keywords: ['bcr'], nombre: 'BCR' },
                { keywords: ['bac', 'bac credomatic'], nombre: 'BAC' },
                { keywords: ['popular', 'banco popular'], nombre: 'Banco Popular' },
                { keywords: ['davivienda'], nombre: 'Davivienda' },
                { keywords: ['scotiabank'], nombre: 'Scotiabank' },
                { keywords: ['promerica'], nombre: 'Promerica' },
                { keywords: ['lafise'], nombre: 'Lafise' }
            ];
            for (const banco of bancosMap) {
                for (const keyword of banco.keywords) {
                    if (textoLower.includes(keyword)) {
                        bancoDetectado = banco.nombre;
                        break;
                    }
                }
                if (bancoDetectado) break;
            }
            
            console.log('📊 DATOS EXTRAÍDOS:');
            console.log('   Referencia:', referencia || '❌ NO ENCONTRADA');
            console.log('   Monto:', monto || '❌ NO ENCONTRADO');
            console.log('   Fecha:', fecha || '❌ NO ENCONTRADA');
            console.log('   Teléfono Emisor:', telefonoEmisor || '❌ NO ENCONTRADO');
            console.log('   Teléfono Receptor:', telefonoReceptor || '❌ NO ENCONTRADO');
            console.log('   Nombre Emisor:', nombreEmisor || '❌ NO ENCONTRADO');
            console.log('   Nombre Receptor:', nombreReceptor || '❌ NO ENCONTRADO');
            console.log('   Concepto:', concepto || '❌ NO ENCONTRADO');
            console.log('   Banco:', bancoDetectado || '❌ NO ENCONTRADO');
            
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