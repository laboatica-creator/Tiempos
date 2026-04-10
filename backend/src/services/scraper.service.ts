import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
    // Fuentes oficiales para resultados de loterías
    private static readonly SOURCES = {
        TICA: [
            'https://www.jps.go.cr/loteria_nacional/resultados',
            'https://www.nacion.com/gnfactory/resultados-loteria/',
            'https://resultados.loterias.or.cr/api/latest',
            'https://www.teletica.com/resultados-loteria'
        ],
        NICA: [
            'https://www.loterianacional.com.ni/resultados',
            'https://www.elnuevodiario.com.ni/loteria/',
            'https://resultados.loterias.ni/api/latest',
            'https://www.vostv.com.ni/loteria'
        ]
    };

    // Tiempos de espera después del sorteo (2 minutos)
    private static readonly WAIT_AFTER_DRAW_MS = 2 * 60 * 1000; // 2 minutos

    static async getSuggestedResults(drawTime?: string, drawDate?: string): Promise<any> {
        try {
            // Si se proporciona hora del sorteo, calcular si ya pasó el tiempo de espera
            if (drawTime && drawDate) {
                const drawDateTime = new Date(`${drawDate}T${drawTime}`);
                const now = new Date();
                const timeSinceDraw = now.getTime() - drawDateTime.getTime();
                
                if (timeSinceDraw < this.WAIT_AFTER_DRAW_MS) {
                    const waitSeconds = Math.ceil((this.WAIT_AFTER_DRAW_MS - timeSinceDraw) / 1000);
                    console.log(`[SCRAPER] El sorteo fue hace ${Math.floor(timeSinceDraw/1000)}s. Esperando ${waitSeconds}s para buscar resultados...`);
                    return {
                        tica: null,
                        nica: null,
                        waiting: true,
                        waitSeconds,
                        message: `Resultados disponibles en ${waitSeconds} segundos`
                    };
                }
            }
            
            console.log('[SCRAPER] Buscando resultados oficiales...');
            
            // Buscar resultado TICA y NICA en paralelo con reintentos
            const [ticaNumber, nicaNumber] = await Promise.all([
                this.scrapeWithRetry('TICA', 3),
                this.scrapeWithRetry('NICA', 3)
            ]);
            
            // Determinar veracidad
            const ticaConfidence = ticaNumber ? await this.verifyResult('TICA', ticaNumber) : 0;
            const nicaConfidence = nicaNumber ? await this.verifyResult('NICA', nicaNumber) : 0;
            
            const ticaValid = ticaConfidence >= 2; // Al menos 2 fuentes coinciden
            const nicaValid = nicaConfidence >= 2;
            
            if (!ticaNumber && !nicaNumber) {
                return {
                    tica: null,
                    nica: null,
                    waiting: false,
                    message: 'No se encontraron resultados en ninguna fuente. Verifique manualmente.'
                };
            }
            
            return {
                tica: ticaNumber,
                nica: nicaNumber,
                ticaConfidence: ticaConfidence,
                nicaConfidence: nicaConfidence,
                ticaValid,
                nicaValid,
                waiting: false,
                message: ticaValid && nicaValid 
                    ? '✅ Resultados verificados con alta confianza' 
                    : '⚠️ Resultados con baja confianza. Verifique manualmente.',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[SCRAPER] Error general:', error);
            return {
                tica: null,
                nica: null,
                waiting: false,
                message: 'Error en el sistema de scraping',
                source: 'error'
            };
        }
    }

    private static async scrapeWithRetry(type: 'TICA' | 'NICA', maxRetries: number = 3): Promise<string | null> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`[SCRAPER] Buscando ${type} - Intento ${attempt}/${maxRetries}`);
            
            for (const url of this.SOURCES[type]) {
                try {
                    const result = await this.scrapeUrl(url, type);
                    if (result) {
                        console.log(`[SCRAPER] ${type} encontrado: ${result} en ${url}`);
                        return result;
                    }
                } catch (error) {
                    console.error(`[SCRAPER] Error en ${url}:`, error);
                }
            }
            
            if (attempt < maxRetries) {
                // Esperar 5 segundos antes de reintentar
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        return null;
    }

    private static async scrapeUrl(url: string, type: 'TICA' | 'NICA'): Promise<string | null> {
        const response = await axios.get(url, { 
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        const $ = cheerio.load(response.data);
        const pageText = response.data;
        
        // Array de patrones de búsqueda para números ganadores
        const patterns = [
            /ganador[:\s]*(\d{2})/i,
            /n[uú]mero\s*ganador[:\s]*(\d{2})/i,
            /resultado[:\s]*(\d{2})/i,
            /premio\s*mayor[:\s]*(\d{2})/i,
            /"numero":\s*"(\d{2})"/i,
            /'numero':\s*'(\d{2})'/i,
            /winning\s*number[:\s]*(\d{2})/i,
            /lottery\s*result[:\s]*(\d{2})/i,
            /sorteo\s*(\d{2})/i
        ];
        
        // Buscar por patrones
        for (const pattern of patterns) {
            const match = pageText.match(pattern);
            if (match && match[1] && /^\d{2}$/.test(match[1])) {
                return match[1];
            }
        }
        
        // Buscar por selectores CSS comunes
        const selectors = [
            '.numero-ganador', '.resultado', '.winning-number', 
            '.premio-mayor', '.lottery-number', '.result-number',
            '[data-winning-number]', '.ganador', '.draw-result'
        ];
        
        for (const selector of selectors) {
            const element = $(selector).first();
            let text = element.text().trim();
            if (text && /^\d{2}$/.test(text)) {
                return text;
            }
            const attrValue = element.attr('data-number') || element.attr('data-value');
            if (attrValue && /^\d{2}$/.test(attrValue)) {
                return attrValue;
            }
        }
        
        // Buscar números en contexto de lotería específico
        const lotteryContext = pageText.match(new RegExp(`(${type}|loter[ií]a|sorteo|draw)[\\s\\S]{0,200}(\\d{2})`, 'i'));
        if (lotteryContext && lotteryContext[2] && /^\d{2}$/.test(lotteryContext[2])) {
            return lotteryContext[2];
        }
        
        return null;
    }

    private static async verifyResult(type: 'TICA' | 'NICA', number: string): Promise<number> {
        let confidence = 0;
        
        for (const url of this.SOURCES[type]) {
            try {
                const result = await this.scrapeUrl(url, type);
                if (result === number) {
                    confidence++;
                }
            } catch (error) {
                console.error(`[SCRAPER] Error verificando en ${url}:`, error);
            }
        }
        
        console.log(`[SCRAPER] ${type} - Número ${number} tiene confianza ${confidence}/${this.SOURCES[type].length}`);
        return confidence;
    }

    static async getResultFromUrl(url: string): Promise<string | null> {
        try {
            return await this.scrapeUrl(url, 'TICA');
        } catch (error) {
            console.error('Error scraping URL:', error);
            return null;
        }
    }
}