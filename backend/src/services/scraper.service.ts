import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
    // Fuentes específicas para TIEMPOS TICA y TIEMPOS NICA
    private static readonly SOURCES = {
        TICA: [
            'https://www.jps.go.cr/loteria_nacional/resultados',  // JPS - Lotería Nacional
            'https://resultados.tiempos-tica.com',  // Específico Tiempos TICA
            'https://www.nacion.com/gnfactory/resultados-loteria/',
            'https://www.teletica.com/resultados-loteria',
            'https://resultados.loterias.or.cr/api/latest'
        ],
        NICA: [
            'https://www.loterianacional.com.ni/resultados',  // Lotería Nacional Nicaragua
            'https://resultados.tiempos-nica.com',  // Específico Tiempos NICA
            'https://www.elnuevodiario.com.ni/loteria/',
            'https://www.vostv.com.ni/loteria',
            'https://resultados.loterias.ni/api/latest'
        ]
    };

    // Palabras clave para identificar resultados de Tiempos
    private static readonly TIEMPOS_KEYWORDS = {
        TICA: ['tiempos tica', 'tica tiempos', 'resultados tica', 'sorteo tica', 'tica loteria'],
        NICA: ['tiempos nica', 'nica tiempos', 'resultados nica', 'sorteo nica', 'nica loteria']
    };

    private static readonly WAIT_AFTER_DRAW_MS = 2 * 60 * 1000; // 2 minutos

    static async getSuggestedResults(drawTime?: string, drawDate?: string): Promise<any> {
        try {
            // Verificar si es momento de buscar (2 minutos después del sorteo)
            if (drawTime && drawDate) {
                const drawDateTime = new Date(`${drawDate}T${drawTime}`);
                const now = new Date();
                const timeSinceDraw = now.getTime() - drawDateTime.getTime();
                
                if (timeSinceDraw < this.WAIT_AFTER_DRAW_MS) {
                    const waitSeconds = Math.ceil((this.WAIT_AFTER_DRAW_MS - timeSinceDraw) / 1000);
                    console.log(`[SCRAPER] Sorteo hace ${Math.floor(timeSinceDraw/1000)}s. Esperando ${waitSeconds}s...`);
                    return {
                        tica: null,
                        nica: null,
                        waiting: true,
                        waitSeconds,
                        message: `Resultados disponibles en ${waitSeconds} segundos`
                    };
                }
            }
            
            console.log('[SCRAPER] Buscando resultados oficiales de TIEMPOS TICA y TIEMPOS NICA...');
            
            // Buscar resultados específicos de Tiempos
            const [ticaNumber, nicaNumber] = await Promise.all([
                this.scrapeTiemposTica(),
                this.scrapeTiemposNica()
            ]);
            
            // Verificar confianza
            const ticaConfidence = ticaNumber ? await this.verifyTiemposResult('TICA', ticaNumber) : 0;
            const nicaConfidence = nicaNumber ? await this.verifyTiemposResult('NICA', nicaNumber) : 0;
            
            const ticaValid = ticaConfidence >= 1;
            const nicaValid = nicaConfidence >= 1;
            
            if (!ticaNumber && !nicaNumber) {
                return {
                    tica: null,
                    nica: null,
                    waiting: false,
                    message: 'No se encontraron resultados. Verifique manualmente en la página oficial.'
                };
            }
            
            return {
                tica: ticaNumber,
                nica: nicaNumber,
                ticaConfidence,
                nicaConfidence,
                ticaValid,
                nicaValid,
                waiting: false,
                message: this.getConfidenceMessage(ticaValid, nicaValid),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[SCRAPER] Error:', error);
            return {
                tica: null,
                nica: null,
                waiting: false,
                message: 'Error en el sistema de búsqueda de resultados'
            };
        }
    }

    private static async scrapeTiemposTica(): Promise<string | null> {
        for (const url of this.SOURCES.TICA) {
            try {
                console.log(`[SCRAPER] Buscando TIEMPOS TICA en: ${url}`);
                const response = await axios.get(url, { 
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const pageText = response.data.toLowerCase();
                const $ = cheerio.load(response.data);
                
                // Verificar si la página contiene resultados de Tiempos TICA
                const hasTiemposContent = this.TIEMPOS_KEYWORDS.TICA.some(keyword => 
                    pageText.includes(keyword.toLowerCase())
                );
                
                if (!hasTiemposContent && !url.includes('jps')) {
                    console.log(`[SCRAPER] ${url} no contiene resultados de Tiempos TICA`);
                    continue;
                }
                
                // Patrones específicos para números ganadores (2 dígitos)
                const patterns = [
                    /(?:resultado|ganador|numero|número|premio)\s*(?:mayor|principal)?\s*[:\s]*(\d{2})/i,
                    /"numero":\s*"(\d{2})"/i,
                    /'numero':\s*'(\d{2})'/i,
                    /<span[^>]*class="[^"]*winning[^"]*"[^>]*>(\d{2})<\/span>/i,
                    /<div[^>]*class="[^"]*result[^"]*"[^>]*>(\d{2})<\/div>/i,
                    /(\d{2})\s*(?:es\s*el\s*ganador|resultado\s*del\s*sorteo)/i
                ];
                
                for (const pattern of patterns) {
                    const match = response.data.match(pattern);
                    if (match && match[1] && /^\d{2}$/.test(match[1])) {
                        console.log(`[SCRAPER] TIEMPOS TICA encontrado: ${match[1]} en ${url}`);
                        return match[1];
                    }
                }
                
                // Buscar números destacados en la página
                const numberElements = $('.numero, .number, .ganador, .winner, .resultado, .premio').first();
                let text = numberElements.text().trim();
                if (text && /^\d{2}$/.test(text)) {
                    console.log(`[SCRAPER] TIEMPOS TICA por selector: ${text}`);
                    return text;
                }
                
            } catch (error) {
                console.error(`[SCRAPER] Error en ${url}:`, error);
            }
        }
        return null;
    }

    private static async scrapeTiemposNica(): Promise<string | null> {
        for (const url of this.SOURCES.NICA) {
            try {
                console.log(`[SCRAPER] Buscando TIEMPOS NICA en: ${url}`);
                const response = await axios.get(url, { 
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const pageText = response.data.toLowerCase();
                const $ = cheerio.load(response.data);
                
                // Verificar si la página contiene resultados de Tiempos NICA
                const hasTiemposContent = this.TIEMPOS_KEYWORDS.NICA.some(keyword => 
                    pageText.includes(keyword.toLowerCase())
                );
                
                if (!hasTiemposContent && !url.includes('loterianacional')) {
                    console.log(`[SCRAPER] ${url} no contiene resultados de Tiempos NICA`);
                    continue;
                }
                
                // Patrones específicos para números ganadores
                const patterns = [
                    /(?:resultado|ganador|numero|número|premio)\s*(?:mayor|principal)?\s*[:\s]*(\d{2})/i,
                    /"numero":\s*"(\d{2})"/i,
                    /'numero':\s*'(\d{2})'/i,
                    /<span[^>]*class="[^"]*winning[^"]*"[^>]*>(\d{2})<\/span>/i,
                    /<div[^>]*class="[^"]*result[^"]*"[^>]*>(\d{2})<\/div>/i,
                    /(\d{2})\s*(?:es\s*el\s*ganador|resultado\s*del\s*sorteo)/i
                ];
                
                for (const pattern of patterns) {
                    const match = response.data.match(pattern);
                    if (match && match[1] && /^\d{2}$/.test(match[1])) {
                        console.log(`[SCRAPER] TIEMPOS NICA encontrado: ${match[1]} en ${url}`);
                        return match[1];
                    }
                }
                
                // Buscar números destacados
                const numberElements = $('.numero, .number, .ganador, .winner, .resultado, .premio').first();
                let text = numberElements.text().trim();
                if (text && /^\d{2}$/.test(text)) {
                    console.log(`[SCRAPER] TIEMPOS NICA por selector: ${text}`);
                    return text;
                }
                
            } catch (error) {
                console.error(`[SCRAPER] Error en ${url}:`, error);
            }
        }
        return null;
    }

    private static async verifyTiemposResult(type: 'TICA' | 'NICA', number: string): Promise<number> {
        let confidence = 0;
        const sources = this.SOURCES[type];
        
        for (const url of sources) {
            try {
                const response = await axios.get(url, { timeout: 10000 });
                const match = response.data.match(new RegExp(`(?:resultado|ganador|numero|número).{0,50}${number}`, 'i'));
                if (match) {
                    confidence++;
                }
            } catch (error) {
                console.error(`[SCRAPER] Error verificando en ${url}:`, error);
            }
        }
        
        console.log(`[SCRAPER] TIEMPOS ${type} - Número ${number} encontrado en ${confidence}/${sources.length} fuentes`);
        return confidence;
    }

    private static getConfidenceMessage(ticaValid: boolean, nicaValid: boolean): string {
        if (ticaValid && nicaValid) {
            return '✅ Resultados de TIEMPOS TICA y TIEMPOS NICA verificados';
        } else if (ticaValid) {
            return '⚠️ Solo se encontró resultado de TIEMPOS TICA. Verifique NICA manualmente.';
        } else if (nicaValid) {
            return '⚠️ Solo se encontró resultado de TIEMPOS NICA. Verifique TICA manualmente.';
        }
        return '⚠️ No se encontraron resultados oficiales. Verifique manualmente.';
    }

    static async getResultFromUrl(url: string): Promise<string | null> {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const match = response.data.match(/(?:resultado|ganador|numero|número).{0,50}(\d{2})/i);
            return match && match[1] && /^\d{2}$/.test(match[1]) ? match[1] : null;
        } catch (error) {
            console.error('Error scraping URL:', error);
            return null;
        }
    }
}