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
            // Crear worker con configuración optimizada para números
            const worker = await Tesseract.createWorker('spa', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setProgress(Math.round(m.progress * 100));
                    }
                }
            });
            
            // Configurar para mejor reconocimiento de números
            await worker.setParameters({
                tessedit_pageseg_mode: '6', // Bloque de texto uniforme
                tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÑáéíóúñ-.:/()$€₡ ',
                preserve_interword_spaces: '1'
            });
            
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
                /\b(\d{20,})\b/,  // Número muy largo (20+ dígitos)
                /\b(\d{8,15})\b/   // 8-15 dígitos
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
            
            // === TELÉFONO EMISOR (Quien envía el dinero) ===
            let telefonoEmisor = '';
            // Buscar "Número de monedero:" que es el teléfono del emisor
            const telEmisorPatterns = [
                /Número de monedero:\s*(\d+)/i,
                /Monedero:\s*(\d+)/i,
                /Teléfono:\s*(\d+)/i
            ];
            for (const pattern of telEmisorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    telefonoEmisor = match[1];
                    break;
                }
            }
            // Si no encontró, buscar cualquier número de 8 dígitos cerca de "Realizado por"
            if (!telefonoEmisor) {
                const realizadoMatch = texto.match(/Realizado por:[\s\S]*?(\d{8})/i);
                if (realizadoMatch) telefonoEmisor = realizadoMatch[1];
            }
            
            // === TELÉFONO RECEPTOR (Quien recibe el dinero) ===
            let telefonoReceptor = '';
            const telReceptorPatterns = [
                /SINPE Móvil destino\s*(\d{4}[-]?\d{4})/i,
                /Destinatario:\s*(?:\D*?)(\d{8})/i,
                /Beneficiario:\s*(?:\D*?)(\d{8})/i
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
            const nombreEmisorPatterns = [
                /Realizado por:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i,
                /Ordenante:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i
            ];
            for (const pattern of nombreEmisorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreEmisor = match[1].trim();
                    break;
                }
            }
            
            // === NOMBRE RECEPTOR ===
            let nombreReceptor = '';
            const nombreReceptorPatterns = [
                /Destinatario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i,
                /Beneficiario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i
            ];
            for (const pattern of nombreReceptorPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreReceptor = match[1].trim();
                    break;
                }
            }
            
            // === CONCEPTO ===
            let concepto = '';
            const conceptPatterns = [
                /Concepto:\s*(.+?)(?:\n|$)/i,
                /Motivo:\s*(.+?)(?:\n|$)/i
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