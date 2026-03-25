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
exports.requirePermission = exports.requireRole = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ error: 'Token is not valid or has expired.' });
            }
            req.user = decoded;
            next();
        });
    }
    else {
        res.status(401).json({ error: 'Authorization header is missing or invalid.' });
    }
};
exports.authenticateJWT = authenticateJWT;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requirePermission = (permission) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado.' });
        }
        // Master admin bypass
        if (req.user.is_master)
            return next();
        // If it's a franchise or agent, we generally allow them to proceed to their designated routes
        // This middleware is primarily to restrict SUB-ADMINS.
        if (req.user.role === 'FRANCHISE' || req.user.role === 'AGENT') {
            return next();
        }
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permisos administrativos.' });
        }
        try {
            const { pool } = require('../index');
            const userRes = yield pool.query('SELECT permissions, is_master FROM users WHERE id = $1', [req.user.id]);
            if (userRes.rows.length === 0)
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            const user = userRes.rows[0];
            if (user.is_master)
                return next();
            const perms = Array.isArray(user.permissions) ? user.permissions : [];
            if (!perms.includes(permission)) {
                return res.status(403).json({ error: `Acceso denegado: Se requiere módulo de ${permission}.` });
            }
            next();
        }
        catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error de servidor verificando permisos.' });
        }
    });
};
exports.requirePermission = requirePermission;
