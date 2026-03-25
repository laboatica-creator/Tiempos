import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from 'redis';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupCronJobs } from './services/cron.service';

dotenv.config();

const app: Express = express();

// 🔥 Puerto dinámico para Render y fallback 4000 local
const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
app.set('io', io);

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Middleware
// Middleware de CORS dinámico para Vercel
const allowedOrigins = [
  'http://localhost:3000',
  'https://tiempos.vercel.app', // Ejemplo de producción
  'https://tiempos-frontend.vercel.app',
  /\.vercel\.app$/ // Permitir todas las previews de Vercel
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

// Rutas base
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Tiempos Pro API',
    version: '1.0.0',
    status: 'ACTIVE'
  });
});

// Routes
import authRoutes from './routes/auth.route';
import walletRoutes from './routes/wallet.route';
import betRoutes from './routes/bet.route';
import drawRoutes from './routes/draw.route';
import whatsappRoutes from './routes/whatsapp.route';
import adminRoutes from './routes/admin.route';

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin', adminRoutes);

// PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://tiempos_user:tiempos_password@localhost:5432/tiempos_db',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // NO cerramos el proceso para Render
});

// Redis
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

let isRedisEnabled = false;
redisClient.on('error', (err) => {
  if (isRedisEnabled) console.log('Redis Client Error', err);
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    let redisPing = 'DISABLED';
    if (isRedisEnabled) redisPing = await redisClient.ping();
    res.json({
      status: 'UP',
      time: dbRes.rows[0].now,
      redis: redisPing
    });
  } catch (err) {
    res.status(500).json({ error: 'System unhealthy' });
  }
});

// Start server
const startServer = async () => {
  try {
    // Conectar Redis
    try {
      await redisClient.connect();
      isRedisEnabled = true;
      console.log('Redis connected successfully.');
    } catch (e) {
      isRedisEnabled = false;
      console.warn('Redis connection failed (Continuing without Redis):', (e as Error).message);
    }

    // Cron jobs
    try {
      setupCronJobs();
      console.log('Cron jobs initialized.');
    } catch (e) {
      console.warn('Cron jobs initialization failed:', (e as Error).message);
    }

    // Test DB
    try {
      const dbTest = await pool.query('SELECT NOW()');
      console.log('Database connected successfully at:', dbTest.rows[0].now);
    } catch (dbErr: any) {
      console.error('CRITICAL: Database connection failed:', dbErr.message);
    }

    // Iniciar servidor
    httpServer.listen(PORT, () => {
      console.log(`[server]: Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();