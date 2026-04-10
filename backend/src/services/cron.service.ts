import cron from 'node-cron';
import { pool } from '../database/db';

const TICA_TIMES = ['13:00:00', '16:00:00', '19:30:00'];
const NICA_TIMES = ['12:00:00', '15:00:00', '18:00:00', '21:00:00']; // 🔥 CORREGIDO

const CTZ = 'America/Costa_Rica';

/**
 * Genera sorteos para los próximos X días de forma determinista.
 * Se ejecuta cada hora para asegurar que no haya huecos en el calendario.
 */
export const generateDrawsForNextDays = async (days: number = 7) => {
  console.log(`⏰ [CRON] Sincronizando sorteos para los próximos ${days} días...`);
  
  try {
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        // Formato YYYY-MM-DD en la zona horaria local
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(date);

        // Generar TICA
        for (const time of TICA_TIMES) {
            await createIfNotExists('TICA', dateStr, time);
        }

        // Generar NICA
        for (const time of NICA_TIMES) {
            await createIfNotExists('NICA', dateStr, time);
        }
    }
    console.log('✅ [CRON] Sorteos sincronizados correctamente.');
  } catch (error) {
    console.error('❌ [CRON] Error al generar sorteos:', error);
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
                `INSERT INTO draws (lottery_type, draw_date, draw_time, status) 
                 VALUES ($1, $2, $3, 'OPEN')`,
                [lottery, date, time]
            );
            // console.log(`➕ [CRON] Sorteo creado: ${lottery} ${date} ${time}`);
        }
    } catch (err: any) {
        console.error(`Error creando sorteo ${lottery} ${date} ${time}:`, err.message);
    }
};

/**
 * Configura las tareas programadas
 */
export const setupCronJobs = () => {
    // 1. Generar sorteos cada hora
    cron.schedule('0 * * * *', () => {
        generateDrawsForNextDays(7);
    }, { timezone: CTZ });

    // 2. Cerrar sorteos automáticamente cuando llega su hora
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(now);
        // Formato HH:MM:SS en 24h
        const currentTime = new Intl.DateTimeFormat('en-GB', { 
            timeZone: CTZ, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        }).format(now);

        try {
            // Sorteos que ya pasaron de su hora y siguen abiertos
            const toClose = await pool.query(
                `UPDATE draws 
                 SET status = 'CLOSED', updated_at = NOW() 
                 WHERE status = 'OPEN' 
                 AND (draw_date < $1 OR (draw_date = $1 AND draw_time <= $2))
                 RETURNING id, lottery_type, draw_time`,
                [today, currentTime]
            );

            if (toClose.rows.length > 0) {
                console.log(`🔒 [CRON] Se cerraron ${toClose.rows.length} sorteos automáticamente.`);
            }
        } catch (err) {
            console.error('Error cerrando sorteos:', err);
        }
    }, { timezone: CTZ });

    // Ejecución inicial
    generateDrawsForNextDays(7);
};