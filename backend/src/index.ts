import announcementRoutes from './routes/announcement.route';
import promotionRoutes from './routes/promotion.route';
import { runMigrations } from './database/migrate';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupCronJobs } from './services/cron.service';

dotenv.config();
process.env.TZ = 'America/Costa_Rica';

console.log('🔧 [1] Dotenv configurado');

const app: Express = express();

const PORT = process.env.PORT || 4000;
console.log(`🔧 [2] Puerto configurado: ${PORT}`);

console.log('🔧 [3] Creando servidor HTTP...');
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
app.set('io', io);
console.log('🔧 [4] Servidor HTTP y Socket.io creados');

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

console.log('🔧 [5] Configurando middleware...');

const allowedOrigins = [
  'http://localhost:3000',
  'https://tiempos.vercel.app',
  'https://tiempos-frontend.vercel.app',
  /\.vercel\.app$/,
  /\.onrender\.com$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(ao => typeof ao === 'string' ? ao === origin : ao.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log('🔧 [6] Middleware configurado');

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Tiempos Pro API',
    version: '1.0.0',
    status: 'ACTIVE'
  });
});

console.log('🔧 [7] Cargando rutas...');

// 🔥 IMPORTAR TODAS LAS RUTAS
import authRoutes from './routes/auth.route';
import walletRoutes from './routes/wallet.route';
import betRoutes from './routes/bet.route';
import drawRoutes from './routes/draw.route';
import whatsappRoutes from './routes/whatsapp.route';
import adminRoutes from './routes/admin.route';
import adminReportsRoutes from './routes/admin.reports.route';
import userRoutes from './routes/user.route';
import paymentRoutes from './routes/payment.route';
import webhookRoutes from './routes/webhook.route';

// 🔥 REGISTRAR RUTAS
app.use('/api/webhook', webhookRoutes);
app.use('/api/payment-methods', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user', userRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin/promotions', promotionRoutes);

// 🔥 LOG DE VERIFICACIÓN DE RUTAS
console.log('✅ [RUTAS REGISTRADAS]');
console.log('   - /api/auth');
console.log('   - /api/wallet');
console.log('   - /api/user');
console.log('   - /api/bets');
console.log('   - /api/draws');
console.log('   - /api/whatsapp');
console.log('   - /api/admin');
console.log('   - /api/admin/reports');
console.log('   - /api/payment-methods');
console.log('   - /api/announcements');
console.log('   - /api/admin/promotions');
console.log('   - /api/webhook');
console.log('🔧 [8] Rutas cargadas');

// PostgreSQL
console.log('🔧 [9] Configurando PostgreSQL...');
import { pool } from './database/db';
export { pool };
console.log('🔧 [10] PostgreSQL configurado');

export const redisClient = null;

app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      status: 'UP',
      time: dbRes.rows[0].now,
      redis: 'DISABLED'
    });
  } catch (err) {
    res.status(500).json({ error: 'System unhealthy' });
  }
});

// 🔥 ENDPOINT PARA OBTENER LA HORA EXACTA DE COSTA RICA
app.get('/api/time', (req: Request, res: Response) => {
    const now = new Date();
    const timeZone = 'America/Costa_Rica';
    res.json({
        serverTime: now.toISOString(),
        costaRicaDate: now.toLocaleDateString('en-CA', { timeZone }),
        costaRicaTime: now.toLocaleTimeString('en-GB', { timeZone, hour12: false }),
        timezone: timeZone
    });
});

console.log('🔧 [13] Health check configurado');

const startServer = async () => {
  console.log('🚀 [14] Iniciando servidor...');
  
  try {
    console.log('⏰ [16] Inicializando cron jobs...');
    try {
      setupCronJobs();
      console.log('✅ Cron jobs initialized.');
    } catch (e) {
      console.warn('⚠️ Cron jobs failed:', (e as Error).message);
    }

    console.log('🗄️ [16.5] Ejecutando migraciones...');
    try {
      await runMigrations();
      console.log('✅ Migraciones completadas.');
    } catch (migErr: any) {
      console.error('⚠️ Migraciones fallidas (continuando):', migErr.message);
    }

    console.log('🗄️ [17] Probando base de datos...');
    try {
      const dbTest = await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', dbTest.rows[0].now);
    } catch (dbErr: any) {
      console.error('❌ CRITICAL: Database connection failed:', dbErr.message);
    }

    console.log(`🌐 [18] Iniciando servidor HTTP en puerto ${PORT}...`);
    httpServer.listen(PORT, () => {
      console.log(`✅ [server]: Server is running on port ${PORT}`);
    });
    console.log('🔧 [19] httpServer.listen ejecutado (callback registrado)');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

console.log('🔧 [20] Llamando a startServer()...');
startServer();
console.log('🔧 [21] startServer() llamado (continuará asincrónicamente)');" " 
