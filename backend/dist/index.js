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
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cron_service_1 = require("./services/cron.service");
dotenv_1.default.config();
console.log('🔧 [1] Dotenv configurado');
const app = (0, express_1.default)();
// 🔥 Puerto dinámico para Render y fallback 4000 local
const PORT = process.env.PORT || 4000;
console.log(`🔧 [2] Puerto configurado: ${PORT}`);
console.log('🔧 [3] Creando servidor HTTP...');
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
app.set('io', io);
console.log('🔧 [4] Servidor HTTP y Socket.io creados');
// Socket.io
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});
console.log('🔧 [5] Configurando middleware...');
// Middleware de CORS dinámico para Vercel y Render
const allowedOrigins = [
    'http://localhost:3000',
    'https://tiempos.vercel.app',
    'https://tiempos-frontend.vercel.app',
    /\.vercel\.app$/,
    /\.onrender\.com$/
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(ao => typeof ao === 'string' ? ao === origin : ao.test(origin))) {
            callback(null, true);
        }
        else {
            callback(new Error('Origin not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
console.log('🔧 [6] Middleware configurado');
// Rutas base
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Tiempos Pro API',
        version: '1.0.0',
        status: 'ACTIVE'
    });
});
console.log('🔧 [7] Cargando rutas...');
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
console.log('🔧 [8] Rutas cargadas');
// PostgreSQL
console.log('🔧 [9] Configurando PostgreSQL...');
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://tiempos_user:tiempos_password@localhost:5432/tiempos_db',
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
console.log('🔧 [10] PostgreSQL configurado');
// ⚠️ REDIS DESHABILITADO - exportamos null para compatibilidad
exports.redisClient = null;
const isRedisEnabled = false;
// Health check (sin Redis)
app.get('/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbRes = yield exports.pool.query('SELECT NOW()');
        res.json({
            status: 'UP',
            time: dbRes.rows[0].now,
            redis: 'DISABLED'
        });
    }
    catch (err) {
        res.status(500).json({ error: 'System unhealthy' });
    }
}));
console.log('🔧 [13] Health check configurado');
// Start server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🚀 [14] Iniciando servidor...');
    try {
        console.log('⏰ [16] Inicializando cron jobs...');
        try {
            (0, cron_service_1.setupCronJobs)();
            console.log('✅ Cron jobs initialized.');
        }
        catch (e) {
            console.warn('⚠️ Cron jobs failed:', e.message);
        }
        console.log('🗄️ [17] Probando base de datos...');
        try {
            const dbTest = yield exports.pool.query('SELECT NOW()');
            console.log('✅ Database connected successfully at:', dbTest.rows[0].now);
        }
        catch (dbErr) {
            console.error('❌ CRITICAL: Database connection failed:', dbErr.message);
        }
        console.log(`🌐 [18] Iniciando servidor HTTP en puerto ${PORT}...`);
        // 🔥 CORRECCIÓN: listen solo con puerto (bind automático a 0.0.0.0)
        httpServer.listen(PORT, () => {
            console.log(`✅ [server]: Server is running on port ${PORT}`);
        });
        console.log('🔧 [19] httpServer.listen ejecutado (callback registrado)');
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
    }
});
console.log('🔧 [20] Llamando a startServer()...');
startServer();
console.log('🔧 [21] startServer() llamado (continuará asincrónicamente)');
