import cron from 'node-cron';
import { pool } from '../index';
import { getCRDateString, getCRTimeString } from '../utils/date';

// Schedules for draws
// TICA: 13:00, 16:00, 19:30
// NICA: 12:00, 15:00, 21:00
// NICA Weekend: 18:00

const initializeDailyDraws = async () => {
    console.log('Generating automated draws for the next 7 days...');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        for (let i = 0; i <= 7; i++) {
            const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
            const dateStr = getCRDateString(date);

            const ticaTimes = ['13:00:00', '16:00:00', '19:30:00'];
            const nicaTimes = ['12:00:00', '15:00:00', '21:00:00'];

            for (const time of ticaTimes) {
                await client.query(
                    `INSERT INTO draws (lottery_type, draw_date, draw_time, status)
                     SELECT 'TICA', $1, $2, 'OPEN'
                     WHERE NOT EXISTS (
                         SELECT 1 FROM draws WHERE lottery_type = 'TICA' AND draw_date = $1 AND draw_time = $2
                     )`,
                    [dateStr, time]
                );
            }

            for (const time of nicaTimes) {
                await client.query(
                    `INSERT INTO draws (lottery_type, draw_date, draw_time, status)
                     SELECT 'NICA', $1, $2, 'OPEN'
                     WHERE NOT EXISTS (
                         SELECT 1 FROM draws WHERE lottery_type = 'NICA' AND draw_date = $1 AND draw_time = $2
                     )`,
                    [dateStr, time]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Future draws (7 days) initialized successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error generating daily draws:', error);
    } finally {
        client.release();
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
    cron.schedule('5 0 * * *', initializeDailyDraws);

    // Initial setup if restarted mid-day
    initializeDailyDraws();

    // Run every minute to auto-close draws 20 minutes before
    cron.schedule('* * * * *', closeBetsBeforeDraw);
};
