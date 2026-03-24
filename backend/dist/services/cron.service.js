"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const index_1 = require("../index");
// Schedules for draws
// TICA: 13:00, 16:00, 19:30
// NICA: 12:00, 15:00, 21:00
// NICA Weekend: 18:00
const initializeDailyDraws = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Generating automated draws for the next 7 days...');
    const client = yield index_1.pool.connect();
    try {
        yield client.query('BEGIN');
        for (let i = 0; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const ticaTimes = ['13:00:00', '16:00:00', '19:30:00'];
            const nicaTimes = isWeekend
                ? ['12:00:00', '15:00:00', '18:00:00', '21:00:00']
                : ['12:00:00', '15:00:00', '21:00:00'];
            for (const time of ticaTimes) {
                yield client.query(`INSERT INTO draws (lottery_type, draw_date, draw_time, status)
                     SELECT 'TICA', $1, $2, 'OPEN'
                     WHERE NOT EXISTS (
                         SELECT 1 FROM draws WHERE lottery_type = 'TICA' AND draw_date = $1 AND draw_time = $2
                     )`, [dateStr, time]);
            }
            for (const time of nicaTimes) {
                yield client.query(`INSERT INTO draws (lottery_type, draw_date, draw_time, status)
                     SELECT 'NICA', $1, $2, 'OPEN'
                     WHERE NOT EXISTS (
                         SELECT 1 FROM draws WHERE lottery_type = 'NICA' AND draw_date = $1 AND draw_time = $2
                     )`, [dateStr, time]);
            }
        }
        yield client.query('COMMIT');
        console.log('Future draws (7 days) initialized successfully.');
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error generating daily draws:', error);
    }
    finally {
        client.release();
    }
});
const closeBetsBeforeDraw = () => __awaiter(void 0, void 0, void 0, function* () {
    // Closes bets 20 minutes before draw time.
    // This is run every minute.
    try {
        const client = yield index_1.pool.connect();
        // Find draws that are 'OPEN' and their draw_time is < 20 minutes from now.
        // PostgreSql time comparison requires casting correctly.
        const res = yield client.query(`
            UPDATE draws
            SET status = 'CLOSED'
            WHERE status = 'OPEN' 
            AND draw_date = CURRENT_DATE
            AND draw_time - LOCALTIME < interval '20 minutes'
            RETURNING id, lottery_type, draw_time;
        `);
        if (res.rows.length > 0) {
            console.log(`Auto-closed ${res.rows.length} draws 20 minutes before time.`);
            // Optionally, emit websocket event that draw is locked.
        }
        client.release();
    }
    catch (error) {
        console.error('Auto-close error:', error);
    }
});
const setupCronJobs = () => {
    // Run daily at 00:05 to create the day's draws
    node_cron_1.default.schedule('5 0 * * *', initializeDailyDraws);
    // Initial setup if restarted mid-day
    initializeDailyDraws();
    // Run every minute to auto-close draws 20 minutes before
    node_cron_1.default.schedule('* * * * *', closeBetsBeforeDraw);
};
exports.setupCronJobs = setupCronJobs;
