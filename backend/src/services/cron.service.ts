import cron from 'node-cron';
import { pool } from '../index';
import { getCRDateString, getCRTimeString } from '../utils/date';

// Schedules for draws
// TICA: 13:00, 16:00, 19:30
// NICA: 12:00, 15:00, 21:00
// NICA Weekend: 18:00

const TICA_DRAW_TIMES = ['13:00:00', '16:00:00', '19:30:00'];
const NICA_DRAW_TIMES = ['12:00:00', '15:00:00', '18:00:00', '21:00:00'];

const createDrawIfNotExists = async (type: string, date: string, time: string) => {
    await pool.query(
        `INSERT INTO draws (lottery_type, draw_date, draw_time, status)
         SELECT $1, $2, $3, 'OPEN'
         WHERE NOT EXISTS (
             SELECT 1 FROM draws WHERE lottery_type = $1 AND draw_date = $2 AND draw_time = $3
         )`,
        [type, date, time]
    );
};

export const generateDrawsForNextDays = async (days: number = 7) => {
  console.log('[CRON] Iniciando generación de sorteos...');
  const timeZone = 'America/Costa_Rica';
  const today = new Date().toLocaleDateString('en-CA', { timeZone });
  let lastDrawDate = today;

  try {
    for (let i = 0; i < days; i++) {
      const drawDate = new Date(today);
      drawDate.setDate(drawDate.getDate() + i);
      const formattedDate = drawDate.toLocaleDateString('en-CA', { timeZone });
      lastDrawDate = formattedDate;

      // Generar sorteos de TICA
      for (const time of TICA_DRAW_TIMES) {
        await createDrawIfNotExists('TICA', formattedDate, time);
      }

      // Generar sorteos de NICA
      for (const time of NICA_DRAW_TIMES) {
        await createDrawIfNotExists('NICA', formattedDate, time);
      }
    }
    console.log('[CRON] Sorteos generados hasta:', new Date(lastDrawDate).toLocaleDateString('es-CR', { timeZone }));
  } catch (error) {
    console.error('[CRON] Error generando sorteos:', error);
  }
};
const closeBetsBeforeDraw = async () => {
    // Closes bets 20 minutes before draw time.
    // This is run every minute.
    try {
        const client = await pool.connect();
        
        // Pass current local date/time from common node context to avoid DB timezone issues.
        const now = new Date();
        const dateStr = getCRDateString(now);
        const timeStr = getCRTimeString(now);

        // Find draws that are 'OPEN' and their draw_time is < 20 minutes from now.
        const res = await client.query(`
            UPDATE draws
            SET status = 'CLOSED'
            WHERE status = 'OPEN' 
            AND draw_date = $1
            AND draw_time::time - $2::time < interval '20 minutes'
            RETURNING id, lottery_type, draw_time;
        `, [dateStr, timeStr]);

        if (res.rows.length > 0) {
            console.log(`[cron]: Auto-closed ${res.rows.length} draws for date ${dateStr}. Current time: ${timeStr}`);
        }

        client.release();
    } catch (error) {
        console.error('Auto-close error:', error);
    }
}

export const setupCronJobs = () => {
    // Run daily at 00:05 to create the day's draws
    cron.schedule('5 0 * * *', () => generateDrawsForNextDays(7));

    // Initial setup if restarted mid-day
    generateDrawsForNextDays(7);

    // Run every minute to auto-close draws 20 minutes before
    cron.schedule('* * * * *', closeBetsBeforeDraw);
};
