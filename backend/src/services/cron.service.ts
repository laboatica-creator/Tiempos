import cron from 'node-cron';
import { pool } from '../database/db';

const TICA_TIMES = ['13:00:00', '16:00:00', '19:30:00'];
const NICA_TIMES = ['12:00:00', '15:00:00', '18:00:00', '21:00:00'];
const CTZ = 'America/Costa_Rica';

export const generateDrawsForNextDays = async (days: number = 7) => {
  try {
    for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(date);
        for (const time of TICA_TIMES) await createIfNotExists('TICA', dateStr, time);
        for (const time of NICA_TIMES) await createIfNotExists('NICA', dateStr, time);
    }
  } catch (error) { 
    console.error('Error cron:', error); 
  }
};

const createIfNotExists = async (lottery: string, date: string, time: string) => {
    const exists = await pool.query(
        'SELECT id FROM draws WHERE lottery_type = $1 AND draw_date = $2 AND draw_time = $3', 
        [lottery, date, time]
    );
    if (exists.rows.length === 0) {
        await pool.query(
            `INSERT INTO draws (lottery_type, draw_date, draw_time, status) VALUES ($1, $2, $3, 'OPEN')`, 
            [lottery, date, time]
        );
    }
};

export const setupCronJobs = () => {
    cron.schedule('0 * * * *', () => generateDrawsForNextDays(7), { timezone: CTZ });
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(now);
        const currentTime = new Intl.DateTimeFormat('en-GB', { timeZone: CTZ, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
        await pool.query(
            `UPDATE draws SET status = 'CLOSED' WHERE status = 'OPEN' AND (draw_date < $1 OR (draw_date = $1 AND draw_time <= $2))`, 
            [today, currentTime]
        );
    }, { timezone: CTZ });
    generateDrawsForNextDays(7);
};