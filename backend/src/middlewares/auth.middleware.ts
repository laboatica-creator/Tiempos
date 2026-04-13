import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../index';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        is_master: boolean;
        franchise_id?: string;
        agent_id?: string;
    };
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
            if (err) {
                return res.status(403).json({ error: 'Token is not valid or has expired.' });
            }
            
            req.user = decoded;
            
            // 🔥 VERIFICAR SESIÓN ÚNICA: obtener session_token del header
            const clientSessionToken = req.headers['x-session-token'];
            
            if (!clientSessionToken) {
                return res.status(401).json({ error: 'Sesión no válida. Inicie sesión nuevamente.' });
            }
            
            // 🔥 Verificar que el session_token coincida con el guardado en BD
            try {
                const result = await pool.query(
                    `SELECT session_token FROM users WHERE id = $1`,
                    [decoded.id]
                );
                
                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'Usuario no encontrado.' });
                }
                
                const dbSessionToken = result.rows[0].session_token;
                
                if (!dbSessionToken || dbSessionToken !== clientSessionToken) {
                    return res.status(401).json({ 
                        error: '⚠️ Sesión cerrada en otro dispositivo. Inicie sesión nuevamente.' 
                    });
                }
                
                next();
            } catch (dbError) {
                console.error('Error verificando session_token:', dbError);
                return res.status(500).json({ error: 'Error interno al validar sesión.' });
            }
        });
    } else {
        res.status(401).json({ error: 'Authorization header is missing or invalid.' });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
        }
        next();
    };
};

export const requirePermission = (permission: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado.' });
        }

        // Master admin bypass
        if (req.user.is_master) return next();

        // If it's a franchise or agent, we generally allow them to proceed to their designated routes
        // This middleware is primarily to restrict SUB-ADMINS.
        if (req.user.role === 'FRANCHISE' || req.user.role === 'AGENT') {
            return next();
        }

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permisos administrativos.' });
        }

        try {
            const userRes = await pool.query('SELECT permissions, is_master FROM users WHERE id = $1', [req.user.id]);
            if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
            
            const user = userRes.rows[0];
            if (user.is_master) return next();
            
            const perms = Array.isArray(user.permissions) ? user.permissions : [];
            if (!perms.includes(permission)) {
                return res.status(403).json({ error: `Acceso denegado: Se requiere módulo de ${permission}.` });
            }
            next();
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error de servidor verificando permisos.' });
        }
    };
};