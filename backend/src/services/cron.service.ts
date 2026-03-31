import cron from 'node-cron';
import { pool } from '../database/db';

// Horarios de sorteos
const TICA_TIMES = ['11:00:00', '14:00:00', '17:00:00', '20:00:00'];
const NICA_TIMES = ['12:00:00', '15:00:00', '18:00:00', '21:00:00'];

/**
 * Genera sorteos para los próximos N días
 */
export const generateDrawsForNextDays = async (days: number = 7) => {
  console.log('[CRON] Generando sorteos para los próximos 7 días...');
  const timeZone = 'America/Costa_Rica';
  
  for (let i = 0; i < days; i++) {
    const drawDate = new Date();
    drawDate.setDate(drawDate.getDate() + i);
    const formattedDate = drawDate.toLocaleDateString('en-CA', { timeZone });
    
    // Generar sorteos de TICA
    for (const time of TICA_TIMES) {
      await createDrawIfNotExists('TICA', formattedDate, time);
    }
    
    // Generar sorteos de NICA
    for (const time of NICA_TIMES) {
      await createDrawIfNotExists('NICA', formattedDate, time);
    }
  }
  console.log('[CRON] Sorteos generados correctamente');
};

/**
 * Crea un sorteo solo si no existe
 */
const createDrawIfNotExists = async (lottery: string, date: string, time: string) => {
  const existing = await pool.query(
    'SELECT id FROM draws WHERE lottery_type = $1 AND draw_date = $2 AND draw_time = $3',
    [lottery, date, time]
  );
  
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO draws (lottery_type, draw_date, draw_time, status, max_exposure_limit, min_bet, max_bet) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [lottery, date, time, 'OPEN', 50000, 100, 20000]
    );
    console.log(`[CRON] Sorteo creado: ${lottery} ${date} ${time}`);
  }
};

/**
 * Cierra los sorteos cuya fecha/hora ya pasó
 */
const closeExpiredDraws = async () => {
  const timeZone = 'America/Costa_Rica';
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-CA', { timeZone });
  const currentTime = now.toLocaleTimeString('en-CA', { timeZone, hour12: false });
  
  const result = await pool.query(
    `UPDATE draws 
     SET status = 'CLOSED' 
     WHERE status = 'OPEN' 
       AND (draw_date < $1 OR (draw_date = $1 AND draw_time < $2))
     RETURNING id, lottery_type, draw_date, draw_time`,
    [currentDate, currentTime]
  );
  
  if (result.rows.length > 0) {
    console.log(`[CRON] Cerrados ${result.rows.length} sorteos vencidos`);
    result.rows.forEach(draw => {
      console.log(`   - ${draw.lottery_type} ${draw.draw_date} ${draw.draw_time}`);
    });
  }
};

/**
 * Inicializa todos los cron jobs
 */
export const setupCronJobs = () => {
  // Generar sorteos diariamente a las 00:05 (hora Costa Rica)
  cron.schedule('5 0 * * *', async () => {
    console.log('[CRON] Ejecutando generación diaria de sorteos...');
    await generateDrawsForNextDays(7);
  });
  
  // Cerrar sorteos vencidos cada minuto
  cron.schedule('* * * * *', async () => {
    await closeExpiredDraws();
  });
  
  // Generar sorteos iniciales al arrancar el servidor
  generateDrawsForNextDays(7);
  
  console.log('✅ [CRON] Cron jobs inicializados');
};