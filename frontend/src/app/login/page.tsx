'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const data = await api.post('/auth/login', {
        email,
        password
      });

      if (data.error) {
        setError(data.error);
      } else {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        if (data.user.role === 'ADMIN' || data.user.role === 'FRANCHISE') {
          router.push('/admin');
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
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="glass-panel w-full max-w-md p-10 animate-in fade-in zoom-in duration-500 border-emerald-500/20 shadow-2xl shadow-emerald-500/10 text-center">
        <div className="flex justify-center mb-10">
          <Logo size="text-4xl" />
        </div>
        <p className="text-gray-400 mt-[-2rem] mb-10 font-bold uppercase text-[10px] tracking-widest relative z-10">Plataforma de Lotería Digital</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center animate-shake">
             🚫 {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@hotmail.com"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-gray-600"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-12 text-white outline-none focus:border-emerald-500 transition-all placeholder:text-gray-600"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-xl leading-none"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl transition-all transform active:scale-95 ${
              isLoading 
              ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:brightness-110 shadow-emerald-500/40'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ...
              </span>
            ) : 'ENTRAR'}
          </button>
        </form>

        <div className="mt-10 text-center space-y-6">
          <p className="text-gray-600 text-xs font-medium tracking-wide">
            ¿Aún no te has afiliado? <Link href="/register" className="text-emerald-400 font-black hover:underline">Regístrate ahora</Link>
          </p>
          <p className="text-gray-600 text-xs font-medium tracking-wide">
            ¿Olvidaste tu contraseña? <Link href="/forgot-password" className="text-emerald-400 font-black hover:underline">Recupérala aquí</Link>
          </p>
          
          <div className="pt-6 border-t border-white/5 space-y-4">
             <button 
                onClick={() => {
                    sessionStorage.clear();
                    window.location.href = 'about:blank';
                }}
                className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-500 font-black rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[10px]"
             >
                🔚 SALIDA / EXIT
             </button>
             <div className="opacity-30 space-y-2">
                 <p className="text-[10px] text-gray-500 font-mono">USUARIO SEGURO - SSL ENCRYPTED</p>
                 <div className="flex justify-between items-center text-[7px] font-black tracking-widest text-emerald-500/50 uppercase">
                    <span>ADMIN: laboarica@hotmail.com</span>
                    <span>PLAYER: usuario@tiempos.com</span>
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
