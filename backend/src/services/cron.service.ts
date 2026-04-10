import cron from 'node-cron';
import { pool } from '../database/db';

const TICA_TIMES = ['13:00:00', '16:00:00', '19:30:00'];
const NICA_TIMES = ['11:00:00', '15:00:00', '18:00:00', '21:00:00'];

const CTZ = 'America/Costa_Rica';

/**
 * Genera sorteos para los próximos N días asegurando que el estado sea consistente.
 */
export const generateDrawsForNextDays = async (days: number = 7) => {
  console.log(`[CRON] Sincronizando sorteos para los próximos ${days} días...`);
  
  try {
    for (let i = 0; i < days; i++) {
      const drawDate = new Date();
      // Ajuste de fecha basado en zona horaria local para evitar saltos de día incorrectos
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(
        new Date(drawDate.getTime() + (i * 24 * 60 * 60 * 1000))
      );
      
      for (const time of TICA_TIMES) {
        await createDrawIfNotExists('TICA', dateStr, time);
      }
      for (const time of NICA_TIMES) {
        await createDrawIfNotExists('NICA', dateStr, time);
      }
    }
    console.log('✅ [CRON] Sincronización de sorteos completada.');
  } catch (error) {
    console.error('❌ [CRON] Error generando sorteos:', error);
  }
};

const createDrawIfNotExists = async (lottery: string, date: string, time: string) => {
  const existing = await pool.query(
    'SELECT id FROM draws WHERE lottery_type = $1 AND draw_date = $2 AND draw_time = $3',
    [lottery, date, time]
  );
  
  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO draws (lottery_type, draw_date, draw_time, status, max_exposure_limit, min_bet, max_bet) 
       VALUES ($1, $2, $3, 'OPEN', 100000, 100, 20000)`,
      [lottery, date, time]
    );
    console.log(`   + Creado: ${lottery} | ${date} | ${time}`);
  }
};

/**
 * Cierra sorteos pasados automáticamente.
 */
export const closeExpiredDraws = async () => {
  try {
    const now = new Date();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(now);
    const time = now.toLocaleTimeString('en-GB', { timeZone: CTZ, hour12: false }); // Format: HH:MM:SS

    const result = await pool.query(
      `UPDATE draws 
       SET status = 'CLOSED' 
       WHERE status = 'OPEN' 
         AND (draw_date < $1 OR (draw_date = $1 AND draw_time < $2))
       RETURNING id, lottery_type, draw_date`,
      [today, time]
    );
    
    if (result.rows.length > 0) {
      console.log(`[CRON] Cerrados ${result.rows.length} sorteos que ya pasaron su hora.`);
    }
  } catch (error) {
    console.error('❌ [CRON] Error cerrando sorteos:', error);
  }
};

export const setupCronJobs = () => {
  // 1. Cada hora a los 5 minutos generar/sincronizar sorteos (más frecuente para evitar goteo)
  cron.schedule('5 * * * *', () => generateDrawsForNextDays(7));
  
  // 1. Cada minuto cerrar expirados
  cron.schedule('* * * * *', () => closeExpiredDraws());
  
  // Ejecución inicial
  generateDrawsForNextDays(7);
  closeExpiredDraws();

  console.log('🚀 [CRON] Sistema de automatización cargado.');
};