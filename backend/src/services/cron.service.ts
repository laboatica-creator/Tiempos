import cron from 'node-cron';
import { pool } from '../database/db';

const TICA_TIMES = ['13:00:00', '16:00:00', '19:30:00'];
const NICA_TIMES = ['12:00:00', '15:00:00', '18:00:00', '21:00:00'];
const CTZ = 'America/Costa_Rica';

export const generateDrawsForNextDays = async (days: number = 7) => {
  console.log(`[CRON] Generando sorteos para los próximos ${days} días...`);
  try {
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(date);
        
        console.log(`[CRON] Procesando fecha: ${dateStr}`);
        
        for (const time of TICA_TIMES) {
            await createIfNotExists('TICA', dateStr, time);
        }
        for (const time of NICA_TIMES) {
            await createIfNotExists('NICA', dateStr, time);
        }
    }
    console.log('[CRON] Generación de sorteos completada');
  } catch (error) { 
    console.error('[CRON] Error generando sorteos:', error); 
  }
};

const createIfNotExists = async (lottery: string, date: string, time: string) => {
    try {
        const exists = await pool.query(
            'SELECT id FROM draws WHERE lottery_type = $1 AND draw_date = $2 AND draw_time = $3', 
            [lottery, date, time]
        );
        if (exists.rows.length === 0) {
            await pool.query(
                `INSERT INTO draws (lottery_type, draw_date, draw_time, status, min_bet, max_bet, max_exposure_limit) 
                 VALUES ($1, $2, $3, 'OPEN', 100, 20000, 50000)`, 
                [lottery, date, time]
            );
            console.log(`[CRON] Sorteo creado: ${lottery} ${date} ${time}`);
        }
    } catch (error) {
        console.error(`[CRON] Error creando sorteo ${lottery} ${date} ${time}:`, error);
    }
};

const closeExpiredDraws = async () => {
    try {
        const now = new Date();
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(now);
        const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: CTZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
        
        const result = await pool.query(
            `UPDATE draws SET status = 'CLOSED' 
             WHERE status = 'OPEN' 
               AND (draw_date < $1 OR (draw_date = $1 AND draw_time < $2))
             RETURNING id, lottery_type, draw_date, draw_time`,
            [today, currentTime]
        );
        
        if (result.rows.length > 0) {
            console.log(`[CRON] Cerrados ${result.rows.length} sorteos vencidos`);
        }
    } catch (error) {
        console.error('[CRON] Error cerrando sorteos:', error);
    }
};

export const setupCronJobs = () => {
    // Ejecutar cada hora para generar sorteos
    cron.schedule('0 * * * *', () => {
        console.log('[CRON] Ejecutando generación programada de sorteos...');
        generateDrawsForNextDays(7);
    }, { timezone: CTZ });
    
    // Ejecutar cada minuto para cerrar sorteos vencidos
    cron.schedule('* * * * *', () => {
        closeExpiredDraws();
    }, { timezone: CTZ });
    
    // Generar sorteos inmediatamente al iniciar
    generateDrawsForNextDays(14);
    
    console.log('✅ [CRON] Cron jobs inicializados');
};