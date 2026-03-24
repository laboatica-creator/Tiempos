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
exports.getFranchises = exports.resetPassword = exports.forgotPassword = exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const email_service_1 = require("../services/email.service");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { full_name, national_id, phone_number, email, date_of_birth, password, role = 'CUSTOMER', franchise_id, agent_id } = req.body;
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
        const password_hash = yield bcrypt_1.default.hash(password, saltRounds);
        // Insert user
        const result = yield index_1.pool.query(`INSERT INTO users (full_name, national_id, phone_number, email, date_of_birth, password_hash, role, franchise_id, agent_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, role, email, full_name`, [full_name, national_id, phone_number, email, date_of_birth, password_hash, role, franchise_id, agent_id]);
        const newUser = result.rows[0];
        console.log(`Usuario creado ID: ${newUser.id}`);
        // Create wallet for user
        yield index_1.pool.query(`INSERT INTO wallets (user_id, balance) VALUES ($1, $2)`, [newUser.id, 0.00]);
        // Send welcome email
        try {
            yield (0, email_service_1.sendWelcomeEmail)(newUser.email, newUser.full_name);
        }
        catch (mailErr) {
            console.warn('Error enviando correo de bienvenida:', mailErr);
        }
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: newUser
        });
    }
    catch (error) {
        console.error('Registration error details:', error);
        if (error.code === '23505') { // Unique violation
            let field = 'ID, email o teléfono';
            if (error.detail.includes('email'))
                field = 'correo electrónico';
            if (error.detail.includes('national_id'))
                field = 'cédula/identificación';
            if (error.detail.includes('phone_number'))
                field = 'número de teléfono';
            return res.status(409).json({ error: `Ya existe un usuario con este ${field}.` });
        }
        res.status(500).json({ error: 'Error interno del servidor al registrar usuario.' });
    }
});
exports.registerUser = registerUser;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    console.log(`Intento de login para: ${email}`);
    try {
        const trimmedEmail = email.trim().toLowerCase();
        console.log(`Buscando usuario con email (trimmed/lower): '${trimmedEmail}'`);
        const result = yield index_1.pool.query(`SELECT * FROM users WHERE LOWER(TRIM(email)) = $1 AND is_active = TRUE`, [trimmedEmail]);
        console.log(`Cuentas encontradas: ${result.rows.length}`);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
        }
        const user = result.rows[0];
        console.log(`Usuario encontrado: ${user.full_name} (${user.role})`);
        console.log(`Email en BD: '${user.email}'`);
        // Compare password
        const passwordMatch = yield bcrypt_1.default.compare(password, user.password_hash);
        console.log(`¿Contraseña coincide?: ${passwordMatch}`);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            role: user.role,
            franchise_id: user.franchise_id,
            agent_id: user.agent_id
        }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                email: user.email,
                phone: user.phone_number
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
    }
});
exports.loginUser = loginUser;
const forgotPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const result = yield index_1.pool.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        const user = result.rows[0];
        const resetToken = jsonwebtoken_1.default.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        // Save token to DB somewhere, or since JWT is stateless, verify it on reset
        // To be simpler and secure without schema changes, we decode the JWT on reset and compare.
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        yield (0, email_service_1.sendPasswordRecoveryEmail)(user.email, resetLink);
        res.json({ message: 'Correo de recuperación enviado exitosamente.' });
    }
    catch (error) {
        console.error('Error in forgotPassword:', error);
        res.status(500).json({ error: 'Error del servidor al solicitar recuperación.' });
    }
});
exports.forgotPassword = forgotPassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, newPassword } = req.body;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const password_hash = yield bcrypt_1.default.hash(newPassword, 10);
        yield index_1.pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [password_hash, decoded.id]);
        res.json({ message: 'Contraseña restablecida exitosamente.' });
    }
    catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(400).json({ error: 'Enlace inválido o expirado.' });
    }
});
exports.resetPassword = resetPassword;
const getFranchises = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield index_1.pool.query(`SELECT id, full_name FROM users WHERE role = 'FRANCHISE' AND is_active = TRUE`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching franchises:', error);
        res.status(500).json({ error: 'Error del servidor al obtener franquicias.' });
    }
});
exports.getFranchises = getFranchises;
