'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Falta el token de recuperación en el enlace.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.post('/auth/reset-password', { token, newPassword });

      if (data.error) {
        setError(data.error);
      } else {
        setMessage(data.message || 'Contraseña restablecida exitosamente.');
        setTimeout(() => {
            router.push('/login');
        }, 2000);
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="glass-panel w-full max-w-md p-10 animate-in fade-in zoom-in duration-500 border-purple-500/20 shadow-2xl shadow-purple-500/10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-200">
            Nueva Contraseña
          </h1>
          <p className="text-gray-400 mt-2 font-bold text-sm tracking-wide">
            Ingresa tu nueva contraseña para la cuenta.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center">
             🚫 {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm font-bold text-center">
             ✅ {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Nueva Contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              disabled={!token}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500 transition-all placeholder:text-gray-600 focus:bg-white/10"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              disabled={!token}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-purple-500 transition-all placeholder:text-gray-600 focus:bg-white/10"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !!message || !token}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl transition-all transform active:scale-95 ${
              isLoading || !!message || !token
              ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-500 to-purple-400 text-white hover:brightness-110 shadow-purple-500/40'
            }`}
          >
            {isLoading ? 'Actualizando...' : 'RESTABLECER'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link href="/login" className="text-purple-400 font-bold hover:underline text-sm">
            ← Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Cargando...</div>}>
      <ResetPasswordContent />
    </React.Suspense>
  )
}
