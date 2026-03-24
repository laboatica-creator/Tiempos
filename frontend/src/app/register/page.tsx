'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    national_id: '',
    date_of_birth: '',
    franchise_id: '',
  });
  const [franchises, setFranchises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const fetchFranchises = async () => {
      try {
        const data = await api.get('/auth/franchises');
        if (Array.isArray(data)) {
          setFranchises(data);
        }
      } catch (err) {
        console.error('Error fetching franchises', err);
      }
    };
    fetchFranchises();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Ensure empty franchise_id is not sent as an empty string (UUID error in PG)
    const dataToSend = { ...formData };
    if (!dataToSend.franchise_id) {
        delete (dataToSend as any).franchise_id;
    }

    try {
      const data = await api.post('/auth/register', dataToSend);
      if (data.token) {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        if (data.user.role === 'FRANCHISE') {
          router.push('/franchise');
        } else {
          router.push('/betting');
        }
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      alert('Error during registration');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 space-y-8 border-emerald-500/20">
        <div className="text-center space-y-4">
            <div className="flex justify-center">
                <Logo size="text-2xl" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tighter uppercase italic text-emerald-500 mt-[-1rem]">Afiliarse</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-60">Crea tu cuenta ahora mismo</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Nombre Completo</label>
                <input
                type="text"
                name="full_name"
                placeholder="JORGE MARTINEZ"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all uppercase placeholder:text-gray-700 font-bold"
                required
                onChange={handleChange}
                />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Cédula / ID</label>
                <input
                type="text"
                name="national_id"
                placeholder="1-1234-5678"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                required
                onChange={handleChange}
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Fecha Nacimiento</label>
                <input
                type="date"
                name="date_of_birth"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-gray-400"
                required
                onChange={handleChange}
                />
            </div>
            <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Teléfono / Celular</label>
                <input
                type="text"
                name="phone_number"
                placeholder="+506 0000 0000"
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                required
                onChange={handleChange}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Email de Contacto</label>
            <input
              type="email"
              name="email"
              placeholder="EMAIL@EJEMPLO.COM"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700 font-bold"
              required
              onChange={handleChange}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Contraseña Segura</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700"
              required
              onChange={handleChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Franquicia / Banca (Opcional)</label>
            <select
              name="franchise_id"
              value={formData.franchise_id}
              onChange={(e) => setFormData({ ...formData, franchise_id: e.target.value })}
              className="w-full bg-[#1e293b] border border-white/10 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all font-bold text-gray-300"
            >
              <option value="">Oficial (Plataforma Principal)</option>
              {franchises.map((f: any) => (
                <option key={f.id} value={f.id}>{f.full_name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-2xl font-black text-white hover:shadow-2xl hover:shadow-emerald-500/20 active:scale-95 transition-all shadow-xl uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? 'PROCESANDO...' : 'REGISTRARME AHORA'}
          </button>
        </form>

        <div className="text-center pt-6 border-t border-white/5">
            <p className="text-xs text-gray-400 font-bold">
                ¿Ya tienes una cuenta? <Link href="/login" className="text-emerald-400 font-black hover:underline uppercase">Inicia Sesión</Link>
            </p>
        </div>
      </div>
    </main>
  );
}
