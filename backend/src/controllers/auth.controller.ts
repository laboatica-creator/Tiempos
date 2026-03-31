import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../index';
import { sendWelcomeEmail, sendPasswordRecoveryEmail } from '../services/email.service';
import { applyNewUserBonus } from '../services/promotion.service';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';

export const registerUser = async (req: Request, res: Response) => {
    const { 
        full_name, national_id, phone_number, email, 
        date_of_birth, password, role = 'CUSTOMER', 
        franchise_id, agent_id 
    } = req.body;
    console.log(`Solicitud de registro para: ${email} (${role})`);

    try {
        // Validate inputs
        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Faltan campos obligatorios (email, password, nombre).' });
        }

        // Validate age >= 18
        if (!date_of_birth) {
             return res.status(400).json({ error: 'La fecha de nacimiento es obligatoria.' });
        }
        const birthDateObj = new Date(date_of_birth);
        const ageDifMs = Date.now() - birthDateObj.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);

        if (age < 18) {
            return res.status(400).json({ error: 'Debes ser mayor de 18 años para registrarte.' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (full_name, national_id, phone_number, email, date_of_birth, password_hash, role, franchise_id, agent_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, role, email, full_name`,
            [full_name, national_id, phone_number, email, date_of_birth, password_hash, role, franchise_id, agent_id]
        );

        const newUser = result.rows[0];
        console.log(`Usuario creado ID: ${newUser.id}`);

        // Create wallet for user
        await pool.query(
            `INSERT INTO wallets (user_id, balance) VALUES ($1, $2)`,
            [newUser.id, 0.00]
        );

        // Send welcome email
        try {
            await sendWelcomeEmail(newUser.email, newUser.full_name);
        } catch (mailErr) {
            console.warn('Error enviando correo de bienvenida:', mailErr);
        }

        // Aplicar bono de bienvenida si hay promoción activa
        try {
            await applyNewUserBonus(newUser.id);
        } catch (bonusErr) {
            console.warn('Error aplicando bono de bienvenida:', bonusErr);
        }

        // Generate token for auto-login
        const token = jwt.sign(
            { 
                id: newUser.id, 
                role: newUser.role, 
                is_master: false,
                franchise_id: franchise_id || null,
                agent_id: agent_id || null
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: newUser,
            token
        });
    } catch (error: any) {
        console.error('Registration error details:', error);
        if (error.code === '23505') { // Unique violation
            let field = 'ID, email o teléfono';
            if (error.detail.includes('email')) field = 'correo electrónico';
            if (error.detail.includes('national_id')) field = 'cédula/identificación';
            if (error.detail.includes('phone_number')) field = 'número de teléfono';
            return res.status(409).json({ error: `Ya existe un usuario con este ${field}.` });
        }
        res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    console.log(`Intento de login para: ${email}`);

    try {
        const trimmedEmail = email.trim().toLowerCase();
        console.log(`Buscando usuario con email (trimmed/lower): '${trimmedEmail}'`);
        
        const result = await pool.query(
            `SELECT * FROM users WHERE LOWER(TRIM(email)) = $1 AND is_active = TRUE`,
            [trimmedEmail]
        );

        console.log(`Cuentas encontradas: ${result.rows.length}`);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
        }

        const user = result.rows[0];
        console.log(`Usuario encontrado: ${user.full_name} (${user.role})`);
        console.log(`Email en BD: '${user.email}'`);

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`¿Contraseña coincide?: ${passwordMatch}`);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role, 
                is_master: user.is_master || false,
                permissions: user.permissions || [],
                franchise_id: user.franchise_id, 
                agent_id: user.agent_id 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                is_master: user.is_master || false,
                permissions: user.permissions || [],
                email: user.email,
                phone: user.phone_number
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
        const result = await pool.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        
        const user = result.rows[0];
        const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        
        // Save token to DB somewhere, or since JWT is stateless, verify it on reset
        // To be simpler and secure without schema changes, we decode the JWT on reset and compare.
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        await sendPasswordRecoveryEmail(user.email, resetLink);
        
        res.json({ message: 'Correo de recuperación enviado exitosamente.' });
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ error: 'Error del servidor al solicitar recuperación.' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const password_hash = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`, 
            [password_hash, decoded.id]
        );
        
        res.json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(400).json({ error: 'Enlace inválido o expirado.' });
    }
};

export const getFranchises = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name FROM users WHERE role = 'FRANCHISE' AND is_active = TRUE`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching franchises:', error);
        res.status(500).json({ error: 'Error del servidor al obtener franquicias.' });
    }
};