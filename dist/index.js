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
exports.redisClient = exports.pool = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const redis_1 = require("redis");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cron_service_1 = require("./services/cron.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
// 🔥 Puerto dinámico para Render y fallback 4000 local
const PORT = process.env.PORT || 4000;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
app.set('io', io);
// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Rutas base
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Tiempos Pro API',
        version: '1.0.0',
        status: 'ACTIVE'
    });
});
// Routes
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const wallet_route_1 = __importDefault(require("./routes/wallet.route"));
const bet_route_1 = __importDefault(require("./routes/bet.route"));
const draw_route_1 = __importDefault(require("./routes/draw.route"));
const whatsapp_route_1 = __importDefault(require("./routes/whatsapp.route"));
const admin_route_1 = __importDefault(require("./routes/admin.route"));
app.use('/api/auth', auth_route_1.default);
app.use('/api/wallet', wallet_route_1.default);
app.use('/api/bets', bet_route_1.default);
app.use('/api/draws', draw_route_1.default);
app.use('/api/whatsapp', whatsapp_route_1.default);
app.use('/api/admin', admin_route_1.default);
// PostgreSQL
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://tiempos_user:tiempos_password@localhost:5432/tiempos_db',
});
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // NO cerramos el proceso para Render
});
// Redis
exports.redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
let isRedisEnabled = false;
exports.redisClient.on('error', (err) => {
    if (isRedisEnabled)
        console.log('Redis Client Error', err);
});
// Health check
app.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbRes = yield exports.pool.query('SELECT NOW()');
        let redisPing = 'DISABLED';
        if (isRedisEnabled)
            redisPing = yield exports.redisClient.ping();
        res.json({
            status: 'UP',
            time: dbRes.rows[0].now,
            redis: redisPing
        });
    }
    catch (err) {
        res.status(500).json({ error: 'System unhealthy' });
    }
}));
// Start server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Conectar Redis
        try {
            yield exports.redisClient.connect();
            isRedisEnabled = true;
            console.log('Redis connected successfully.');
        }
        catch (e) {
            isRedisEnabled = false;
            console.warn('Redis connection failed (Continuing without Redis):', e.message);
        }
        // Cron jobs
        try {
            (0, cron_service_1.setupCronJobs)();
            console.log('Cron jobs initialized.');
        }
        catch (e) {
            console.warn('Cron jobs initialization failed:', e.message);
        }
        // Test DB
        try {
            const dbTest = yield exports.pool.query('SELECT NOW()');
            console.log('Database connected successfully at:', dbTest.rows[0].now);
        }
        catch (dbErr) {
            console.error('CRITICAL: Database connection failed:', dbErr.message);
        }
        // Iniciar servidor
        httpServer.listen(PORT, () => {
            console.log(`[server]: Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
    }
});
startServer();
