import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
    /**
     * Intenta obtener los resultados más recientes de las loterías oficiales.
     * Es un sistema híbrido: los resultados son SUGERENCIAS para el admin.
     */
    static async getSuggestedResults() {
        try {
            const results = {
                tica: await this.scrapeJPS(),
                nica: await this.scrapeLotoNica()
            };
            return results;
        } catch (error) {
            console.error('Error in ScraperService:', error);
            return { tica: null, nica: null };
        }
    }

    /**
     * Scrapea la Junta de Protección Social (Costa Rica)
     * Nota: Las URLs pueden cambiar. Este es un ejemplo de implementación.
     */
    private static async scrapeJPS() {
        try {
            // Ejemplo de endpoint de resultados (esto varía según el sitio oficial)
            // Muchas veces se usan feeds JSON o páginas de resultados
            const response = await axios.get('https://www.jps.go.cr/resultados', { timeout: 5000 });
            const $ = cheerio.load(response.data);
            
            // Lógica ficticia de selección según estructura típica
            const lottoNum = $('.ultimo-resultado .numero').first().text().trim();
            
            if (lottoNum && lottoNum.length === 2) return lottoNum;
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Scrapea Loto Nicaragua
     */
    private static async scrapeLotoNica() {
        try {
            const response = await axios.get('https://loto.ni/resultados/', { timeout: 5000 });
            const $ = cheerio.load(response.data);
            
            // Buscar el último resultado de "Diaria"
            const num = $('.diaria-card .number').first().text().trim();
            
            if (num && num.length === 2) return num;
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Endpoint simulado para demostración si el scraping falla o es bloqueado
     */
    static async getMockResults() {
        // En producción se usaría el scrape real
        // Aquí devolvemos null para que el admin siempre tenga la última palabra
        return {
            tica: null,
            nica: null
        };
    }
}
