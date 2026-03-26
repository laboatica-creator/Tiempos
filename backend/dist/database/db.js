"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://tiempos_user:tiempos_password@localhost:5432/tiempos_db',
    connectionTimeoutMillis: 5000,
    ssl: {
        rejectUnauthorized: false // 🔥 Necesario para Render PostgreSQL
    }
});
exports.pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});
