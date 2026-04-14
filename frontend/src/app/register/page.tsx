'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [franchises, setFranchises] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    national_id: '',
    phone: '',
    date_of_birth: '',
    password: '',
    confirmPassword: '',
    franchise_id: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    try {
      const data = await api.get('/auth/franchises');
      if (Array.isArray(data)) {
        setFranchises(data);
      }
    } catch (err) {
      console.error('Error fetching franchises:', err);
    }
  };

  if (!isMounted) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    try {
      const dataToSend = {
        full_name: formData.name,
        email: formData.email,
        national_id: formData.national_id,
        phone_number: formData.phone,
        date_of_birth: formData.date_of_birth,
        password: formData.password,
        role: selectedRole, // 🔥 AHORA USA EL ROL SELECCIONADO
        franchise_id: formData.franchise_id || null
      };

      const data = await api.post('/auth/register', dataToSend);

      if (data.error) {
        setError(data.error);
      } else {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        // 🔥 Redirigir según el rol
        if (selectedRole === 'SELLER') {
          router.push('/seller/dashboard');
        } else {
          router.push('/betting');
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="glass-panel w-full max-w-2xl p-8 animate-in fade-in zoom-in duration-500 border-emerald-500/20 shadow-2xl shadow-emerald-500/10 transform transition-all duration-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-emerald-500/10 transition-colors"></div>
        
        <div className="flex justify-center mb-6 relative z-10">
          <Logo size="text-3xl" />
        </div>
        <p className="text-gray-400 text-center text-xs uppercase tracking-widest mb-8 relative z-10 font-bold">Unirse a Tiempos Pro</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center animate-shake relative z-10">
            🚫 {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          
          {/* 🔥 NUEVO: Selector de rol - Jugador o Vendedor */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Quiero registrarme como:</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('CUSTOMER')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  selectedRole === 'CUSTOMER'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                🎲 Jugador
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('SELLER')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                  selectedRole === 'SELLER'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                🏪 Vendedor
              </button>
            </div>
            <p className="text-gray-500 text-[10px] ml-1">
              {selectedRole === 'SELLER' 
                ? '💼 Los vendedores registran apuestas en efectivo desde su terminal'
                : '🎯 Los jugadores apuestan en línea desde su billetera digital'}
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Nombre completo</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Juan Pérez"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Número de Cédula</label>
            <input
              type="text"
              name="national_id"
              value={formData.national_id}
              onChange={handleChange}
              required
              placeholder="1-1234-5678"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Teléfono / WhatsApp</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+506 8888-8888"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Correo electrónico</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="usuario@ejemplo.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Fecha de Nacimiento</label>
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all text-sm h-[58px]"
            />
          </div>

          {/* 🔥 Solo mostrar opción de franquicia si NO es vendedor */}
          {selectedRole !== 'SELLER' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase text-gray-400 ml-1">Afiliarse a una Banca / Franquicia</label>
              <select
                name="franchise_id"
                value={formData.franchise_id}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all appearance-none"
              >
                <option value="" className="bg-[#0f172a]">Administrador Maestro (Directo)</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id} className="bg-[#0f172a]">
                    {f.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 🔥 Para vendedores, mostrar campo de código de invitación (opcional) */}
          {selectedRole === 'SELLER' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase text-gray-400 ml-1">Código de invitación (opcional)</label>
              <input
                type="text"
                name="invite_code"
                placeholder="Ingrese código si tiene"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all"
              />
              <p className="text-gray-500 text-[9px] ml-1">Si tiene un código de invitación de un administrador, ingréselo aquí</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-white outline-none focus:border-emerald-500 transition-all"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Confirmar contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-white outline-none focus:border-emerald-500 transition-all"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`md:col-span-2 w-full py-5 rounded-2xl font-black text-lg transition-all transform active:scale-95 shadow-xl hover:-translate-y-1 ${
              isLoading 
                ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-emerald-600 to-emerald-400 text-white hover:brightness-110 shadow-emerald-500/20'
            }`}
          >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    CREANDO CUENTA...
                </span>
            ) : selectedRole === 'SELLER' ? 'REGISTRARSE COMO VENDEDOR' : 'REGISTRARSE AHORA'}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500 text-sm relative z-10 font-bold uppercase tracking-wider">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Entrar aquí
          </Link>
        </p>
      </div>
    </div>
  );
}