'use client';

import { useState } from 'react';
import Tesseract from 'tesseract.js';

export interface DatosComprobante {
    referencia: string;
    monto: number;
    fecha: string;
    telefonoOrigen: string;
    nombreOrigen: string;
    nombreDestino: string;
    concepto: string;
    bancoOrigen: string;
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
            
            // === 1. REFERENCIA / COMPROBANTE ===
            // Patrones para BNC: "Comprobante:" seguido de número, o número largo de 20+ dígitos
            let referencia = '';
            const refPatterns = [
                /Comprobante:\s*(\d+)/i,
                /Documento\s*(\d+)/i,
                /Referencia\s*(\d+)/i,
                /\b(2026\d{20,})\b/,  // Año + muchos dígitos
                /\b(\d{20,})\b/,       // 20+ dígitos
                /\b(\d{8,10})\b/       // 8-10 dígitos
            ];
            
            for (const pattern of refPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    referencia = match[1];
                    console.log('🔢 Referencia encontrada:', referencia);
                    break;
                }
            }
            
            // === 2. MONTO ===
            let monto = 0;
            const montoPatterns = [
                /Monto debitado:\s*[₡]?\s*([\d.,]+)/i,
                /Monto acreditado:\s*[₡]?\s*([\d.,]+)/i,
                /Monto transferido:\s*[₡]?\s*([\d.,]+)/i,
                /₡\s*([\d.,]+)/,
                /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*Colones/i
            ];
            
            for (const pattern of montoPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    let montoStr = match[1].replace(/\./g, '').replace(',', '.');
                    monto = parseFloat(montoStr);
                    if (monto > 0 && monto < 1000000) {
                        console.log('💰 Monto encontrado:', monto);
                        break;
                    }
                }
            }
            
            // === 3. TELÉFONO (Número de monedero SINPE) ===
            let telefono = '';
            const telefonoPatterns = [
                /Número de monedero:\s*(\d+)/i,
                /SINPE Móvil destino\s*(\d{4}[-]?\d{4})/i,
                /\b(\d{4}[-]?\d{4})\b/,
                /\b(\d{8})\b/
            ];
            
            for (const pattern of telefonoPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    telefono = match[1].replace(/-/g, '');
                    console.log('📞 Teléfono encontrado:', telefono);
                    break;
                }
            }
            
            // === 4. NOMBRE DEL QUE ENVÍA (Realizado por) ===
            let nombreOrigen = '';
            const origenPatterns = [
                /Realizado por:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i,
                /Cuenta origen[\s\S]*?([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})$/im,
                /Ordenante:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i
            ];
            
            for (const pattern of origenPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreOrigen = match[1].trim();
                    console.log('👤 Nombre origen (envía):', nombreOrigen);
                    break;
                }
            }
            
            // === 5. NOMBRE DEL DESTINATARIO ===
            let nombreDestino = '';
            const destinoPatterns = [
                /Destinatario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i,
                /Beneficiario:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]{5,50})/i
            ];
            
            for (const pattern of destinoPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    nombreDestino = match[1].trim();
                    console.log('👤 Nombre destino (recibe):', nombreDestino);
                    break;
                }
            }
            
            // === 6. FECHA ===
            let fecha = '';
            const fechaPatterns = [
                /(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
                /(\d{2}\/\d{2}\/\d{4})/,
                /(\d{1,2}\s+\w+\s+\d{4})/i
            ];
            
            for (const pattern of fechaPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    fecha = match[1];
                    console.log('📅 Fecha encontrada:', fecha);
                    break;
                }
            }
            
            // Si no encontró fecha, buscar formato "14/03/2026"
            if (!fecha) {
                const fechaMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})/);
                if (fechaMatch) {
                    fecha = fechaMatch[1];
                    console.log('📅 Fecha encontrada (formato alternativo):', fecha);
                }
            }
            
            // === 7. CONCEPTO ===
            let concepto = '';
            const conceptPatterns = [
                /Concepto:\s*(.+?)(?:\n|$)/i,
                /Motivo:\s*(.+?)(?:\n|$)/i
            ];
            
            for (const pattern of conceptPatterns) {
                const match = texto.match(pattern);
                if (match && match[1]) {
                    concepto = match[1].trim();
                    console.log('📝 Concepto encontrado:', concepto);
                    break;
                }
            }
            
            // === 8. BANCO ===
            let banco = '';
            if (texto.toLowerCase().includes('banco nacional') || texto.toLowerCase().includes('bn sinpe')) {
                banco = 'BNC';
            } else if (texto.toLowerCase().includes('bcr')) {
                banco = 'BCR';
            } else if (texto.toLowerCase().includes('bac')) {
                banco = 'BAC';
            }
            console.log('🏦 Banco encontrado:', banco || 'No identificado');
            
            // === RESUMEN ===
            console.log('📊 RESUMEN OCR:');
            console.log('   Referencia:', referencia || '❌ NO ENCONTRADA');
            console.log('   Monto:', monto || '❌ NO ENCONTRADO');
            console.log('   Teléfono:', telefono || '❌ NO ENCONTRADO');
            console.log('   Nombre origen:', nombreOrigen || '❌ NO ENCONTRADO');
            console.log('   Nombre destino:', nombreDestino || '❌ NO ENCONTRADO');
            console.log('   Fecha:', fecha || '❌ NO ENCONTRADO');
            console.log('   Concepto:', concepto || '❌ NO ENCONTRADO');
            console.log('   Banco:', banco || '❌ NO ENCONTRADO');
            
            if (!referencia) {
                setError('⚠️ No se pudo leer la referencia. Por favor, ingrésela manualmente.');
            }
            
            return {
                referencia: referencia,
                monto: monto,
                fecha: fecha,
                telefonoOrigen: telefono,
                nombreOrigen: nombreOrigen,
                nombreDestino: nombreDestino,
                concepto: concepto,
                bancoOrigen: banco,
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