import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
    // Fuentes actualizadas con las URLs proporcionadas
    private static readonly SOURCES = {
        TICA: [
            'https://www.loteriascostarica.com',
            'https://tiemposhoy.com/resultados/tica',
            'https://tiemposhoy.com/tica/resultados',
            'https://www.jps.go.cr/resultados/nuevos-tiempos-reventados'
        ],
        NICA: [
            'https://loteriasdenicaragua.com',
            'https://tiemposhoy.com/resultados/nica',
            'https://tiemposnicas.com/resultados',
            'https://www.loterianacional.com.ni/resultados'
        ],
        GENERAL: [
            'https://tiemposhoy.com/',
            'https://www.loteriascostarica.com',
            'https://loteriasdenicaragua.com'
        ]
    };

    private static readonly WAIT_AFTER_DRAW_MS = 2 * 60 * 1000;

    static async getSuggestedResults(drawTime?: string, drawDate?: string): Promise<any> {
        try {
            // Verificar tiempo de espera post-sorteo
            if (drawTime && drawDate) {
                const drawDateTime = new Date(`${drawDate}T${drawTime}`);
                const now = new Date();
                const timeSinceDraw = now.getTime() - drawDateTime.getTime();
                
                if (timeSinceDraw < this.WAIT_AFTER_DRAW_MS) {
                    const waitSeconds = Math.ceil((this.WAIT_AFTER_DRAW_MS - timeSinceDraw) / 1000);
                    return {
                        tica: null,
                        nica: null,
                        waiting: true,
                        waitSeconds,
                        message: `Resultados disponibles en ${waitSeconds} segundos`
                    };
                }
            }
            
            console.log('[SCRAPER] Buscando resultados en todas las fuentes...');
            
            // Buscar en todas las fuentes en paralelo
            const [ticaFromAll, nicaFromAll] = await Promise.all([
                this.scrapeAllTicaSources(),
                this.scrapeAllNicaSources()
            ]);
            
            // Determinar el número más confiable (el que aparece en más fuentes)
            const ticaNumber = this.getMostFrequent(ticaFromAll);
            const nicaNumber = this.getMostFrequent(nicaFromAll);
            
            return {
                tica: ticaNumber,
                nica: nicaNumber,
                ticaSources: ticaFromAll.filter(n => n !== null).length,
                nicaSources: nicaFromAll.filter(n => n !== null).length,
                ticaValid: ticaNumber !== null,
                nicaValid: nicaNumber !== null,
                waiting: false,
                message: this.getMessage(ticaNumber, nicaNumber),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[SCRAPER] Error:', error);
            return {
                tica: null,
                nica: null,
                waiting: false,
                message: 'Error en la búsqueda de resultados'
            };
        }
    }

    private static async scrapeAllTicaSources(): Promise<(string | null)[]> {
        const results = await Promise.all(
            this.SOURCES.TICA.map(url => this.scrapeSingleSource(url, 'TICA'))
        );
        return results;
    }

    private static async scrapeAllNicaSources(): Promise<(string | null)[]> {
        const results = await Promise.all(
            this.SOURCES.NICA.map(url => this.scrapeSingleSource(url, 'NICA'))
        );
        return results;
    }

    private static async scrapeSingleSource(url: string, type: string): Promise<string | null> {
        try {
            console.log(`[SCRAPER] Buscando ${type} en: ${url}`);
            const response = await axios.get(url, { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9'
                }
            });
            
            const pageText = response.data;
            const $ = cheerio.load(response.data);
            
            // Patrones específicos para cada tipo
            let patterns: RegExp[] = [];
            
            if (type === 'TICA') {
                patterns = [
                    /TICA[\s\S]{0,50}(\d{2})/i,
                    /reventados[\s\S]{0,50}(\d{2})/i,
                    /nuevos\s*tiempos[\s\S]{0,50}(\d{2})/i,
                    /ganador[\s\S]{0,50}(\d{2})/i,
                    /premio\s*mayor[\s\S]{0,50}(\d{2})/i
                ];
            } else {
                patterns = [
                    /NICA[\s\S]{0,50}(\d{2})/i,
                    /Premia2[\s\S]{0,50}(\d{2})/i,
                    /Loto[\s\S]{0,50}(\d{2})/i,
                    /ganador[\s\S]{0,50}(\d{2})/i,
                    /resultado[\s\S]{0,50}(\d{2})/i
                ];
            }
            
            for (const pattern of patterns) {
                const match = pageText.match(pattern);
                if (match && match[1] && /^\d{2}$/.test(match[1])) {
                    console.log(`[SCRAPER] ${type} encontrado: ${match[1]} en ${url}`);
                    return match[1];
                }
            }
            
            // Buscar por selectores CSS comunes
            const selectors = [
                '.numero-ganador', '.resultado', '.winning-number', 
                '.premio-mayor', '.lottery-number', '.ganador',
                '.number', '.premio', '.sorteo'
            ];
            
            for (const selector of selectors) {
                const elements = $(selector);
                for (let i = 0; i < elements.length; i++) {
                    const text = $(elements[i]).text().trim();
                    if (text && /^\d{2}$/.test(text)) {
                        const parentText = $(elements[i]).parent().text().toLowerCase();
                        if ((type === 'TICA' && (parentText.includes('tica') || parentText.includes('reventados'))) ||
                            (type === 'NICA' && (parentText.includes('nica') || parentText.includes('premia2')))) {
                            console.log(`[SCRAPER] ${type} por selector ${selector}: ${text}`);
                            return text;
                        }
                    }
                }
            }
            
        } catch (error: any) {
            if (error.response?.status === 403) {
                console.warn(`[SCRAPER] Acceso denegado (403) a ${url}`);
            } else {
                console.error(`[SCRAPER] Error en ${url}:`, error.message);
            }
        }
        return null;
    }

    private static getMostFrequent(numbers: (string | null)[]): string | null {
        const counts: Record<string, number> = {};
        for (const num of numbers) {
            if (num) {
                counts[num] = (counts[num] || 0) + 1;
            }
        }
        
        let maxCount = 0;
        let mostFrequent = null;
        for (const [num, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = num;
            }
        }
        
        return mostFrequent;
    }

    private static getMessage(tica: string | null, nica: string | null): string {
        if (tica && nica) {
            return `✅ TICA: ${tica} | NICA: ${nica}`;
        } else if (tica) {
            return `⚠️ Solo TICA: ${tica}. Verifique NICA en https://loteriasdenicaragua.com/`;
        } else if (nica) {
            return `⚠️ Solo NICA: ${nica}. Verifique TICA en https://www.loteriascostarica.com/`;
        }
        return '⚠️ No se encontraron resultados. Verifique en: https://tiemposhoy.com/';
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