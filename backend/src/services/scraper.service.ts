import axios from 'axios';
import * as cheerio from 'cheerio';

export class ScraperService {
    static async getSuggestedResults() {
        try {
            // 🔥 SIMULACIÓN: Números aleatorios para demostrar que el sistema funciona
            // En producción, reemplazar con scraping real a sitios oficiales
            
            // Generar números aleatorios de 2 dígitos (00-99)
            const ticaNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const nicaNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            
            // Simular un pequeño retraso para parecer real
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return { 
                tica: ticaNumber, 
                nica: nicaNumber,
                message: 'Sugerencias generadas automáticamente (modo demo)'
            };
        } catch (error) {
            console.error('Scraper error:', error);
            return { tica: null, nica: null, error: 'Error obteniendo resultados' };
        }
    }

    static async getResultFromUrl(url: string): Promise<string | null> {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(response.data);
            // Buscar número ganador en la estructura de la página (personalizar según sitio)
            const winningNumber = $('.numero-ganador, .resultado').first().text().trim();
            return winningNumber || null;
        } catch (error) {
            console.error('Error scraping URL:', error);
            return null;
        }
    }
}