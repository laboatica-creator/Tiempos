import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
    private static readonly SOURCES = {
        TICA: [
            'https://www.loteriascostarica.com',
            'https://tiemposhoy.com/resultados/tica',
            'https://www.jps.go.cr/resultados/nuevos-tiempos-reventados'
        ],
        NICA: [
            'https://loteriasdenicaragua.com',
            'https://tiemposhoy.com/resultados/nica',
            'https://www.loterianacional.com.ni/resultados'
        ]
    };

    private static readonly WAIT_AFTER_DRAW_MS = 2 * 60 * 1000;

    static async getSuggestedResults(drawTime?: string, drawDate?: string, lotteryType?: string): Promise<any> {
        try {
            if (!drawTime || !drawDate || !lotteryType) {
                return {
                    number: null,
                    waiting: false,
                    message: 'Faltan datos del sorteo (hora, fecha o tipo)'
                };
            }

            // Verificar tiempo de espera post-sorteo
            const drawDateTime = new Date(`${drawDate}T${drawTime}`);
            const now = new Date();
            const timeSinceDraw = now.getTime() - drawDateTime.getTime();
            
            if (timeSinceDraw < this.WAIT_AFTER_DRAW_MS) {
                const waitSeconds = Math.ceil((this.WAIT_AFTER_DRAW_MS - timeSinceDraw) / 1000);
                return {
                    number: null,
                    waiting: true,
                    waitSeconds,
                    message: `Resultados disponibles en ${waitSeconds} segundos`
                };
            }
            
            console.log(`[SCRAPER] Buscando resultado para ${lotteryType} a las ${drawTime} del ${drawDate}...`);
            
            // Buscar específicamente por horario
            const sources = lotteryType === 'TICA' ? this.SOURCES.TICA : this.SOURCES.NICA;
            const result = await this.scrapeByTime(sources, lotteryType, drawTime, drawDate);
            
            return {
                number: result,
                waiting: false,
                message: result ? `✅ Número encontrado: ${result}` : `⚠️ No se encontró resultado para ${lotteryType} a las ${drawTime}`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[SCRAPER] Error:', error);
            return {
                number: null,
                waiting: false,
                message: 'Error en la búsqueda de resultados'
            };
        }
    }

    private static async scrapeByTime(urls: string[], type: string, drawTime: string, drawDate: string): Promise<string | null> {
        // Extraer hora en formato 12h para búsqueda
        const [hour24, minute] = drawTime.split(':');
        let hour12 = parseInt(hour24);
        const ampm = hour12 >= 12 ? 'PM' : 'AM';
        if (hour12 > 12) hour12 -= 12;
        if (hour12 === 0) hour12 = 12;
        const timeStr12h = `${hour12}:${minute} ${ampm}`;
        const timeStr24h = `${hour24}:${minute}`;
        
        for (const url of urls) {
            try {
                console.log(`[SCRAPER] Buscando en ${url} para horario ${timeStr12h} / ${timeStr24h}`);
                const response = await axios.get(url, { 
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });
                
                const pageText = response.data;
                const $ = cheerio.load(response.data);
                
                // Buscar sección que contiene el horario del sorteo
                let targetSection = '';
                
                // Buscar por horario exacto en el texto
                const timePatterns = [
                    new RegExp(`(?:${type}|sorteo|resultado)[\\s\\S]{0,100}${timeStr12h}[\\s\\S]{0,200}(\\d{2})`, 'i'),
                    new RegExp(`(?:${type}|sorteo|resultado)[\\s\\S]{0,100}${timeStr24h}[\\s\\S]{0,200}(\\d{2})`, 'i'),
                    new RegExp(`${timeStr12h}[\\s\\S]{0,100}(?:ganador|resultado|premio)[\\s\\S]{0,50}(\\d{2})`, 'i'),
                    new RegExp(`${timeStr24h}[\\s\\S]{0,100}(?:ganador|resultado|premio)[\\s\\S]{0,50}(\\d{2})`, 'i')
                ];
                
                for (const pattern of timePatterns) {
                    const match = pageText.match(pattern);
                    if (match && match[1] && /^\d{2}$/.test(match[1])) {
                        console.log(`[SCRAPER] ${type} ${drawTime} encontrado: ${match[1]} en ${url}`);
                        return match[1];
                    }
                }
                
                // Buscar por estructura de tabla que contenga horario y número
                const rows = $('tr, .row, .sorteo-item, .result-item');
                for (let i = 0; i < rows.length; i++) {
                    const rowText = $(rows[i]).text().toLowerCase();
                    if (rowText.includes(timeStr12h.toLowerCase()) || rowText.includes(timeStr24h)) {
                        const numbers = $(rows[i]).find('.numero, .number, .ganador, .premio, .resultado').text().trim();
                        if (numbers && /^\d{2}$/.test(numbers)) {
                            console.log(`[SCRAPER] ${type} ${drawTime} encontrado en fila: ${numbers}`);
                            return numbers;
                        }
                        // Buscar cualquier número de 2 dígitos en la fila
                        const numberMatch = rowText.match(/(\d{2})/);
                        if (numberMatch && numberMatch[1]) {
                            console.log(`[SCRAPER] ${type} ${drawTime} encontrado en fila: ${numberMatch[1]}`);
                            return numberMatch[1];
                        }
                    }
                }
                
                // Buscar elementos con atributos de tiempo
                const timeElements = $(`[data-time*="${timeStr24h}"], [data-hora*="${timeStr24h}"], [time*="${timeStr24h}"]`);
                for (let i = 0; i < timeElements.length; i++) {
                    const parent = $(timeElements[i]).parent();
                    const number = parent.find('.numero, .number, .ganador').text().trim();
                    if (number && /^\d{2}$/.test(number)) {
                        console.log(`[SCRAPER] ${type} ${drawTime} encontrado por atributo: ${number}`);
                        return number;
                    }
                }
                
            } catch (error: any) {
                if (error.response?.status === 403) {
                    console.warn(`[SCRAPER] Acceso denegado (403) a ${url}`);
                } else {
                    console.error(`[SCRAPER] Error en ${url}:`, error.message);
                }
            }
        }
        return null;
    }

    // Mantener método para compatibilidad con código existente
    static async getSuggestedResultsLegacy(drawTime?: string, drawDate?: string): Promise<any> {
        return this.getSuggestedResults(drawTime, drawDate, 'TICA');
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