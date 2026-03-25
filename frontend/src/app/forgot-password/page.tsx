'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await api.post('/forgot-password', { email });

      if (data.error) {
        setError(data.error);
      } else {
        setMessage(data.message || 'Se ha enviado un correo con las instrucciones para recuperar tu contraseña.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="glass-panel w-full max-w-md p-8 animate-in fade-in zoom-in duration-500 border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
        <div className="flex justify-center mb-6">
          <Logo size="text-3xl" />
        </div>
        <p className="text-gray-400 text-center text-xs uppercase tracking-widest mb-8">Recuperar contraseña</p>

        {message && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-bold text-center">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center">
            🚫 {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@hotmail.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              isLoading 
                ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white hover:brightness-110'
            }`}
          >
            {isLoading ? 'Enviando...' : 'ENVIAR INSTRUCCIONES'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-500 text-sm">
          <Link href="/login" className="text-emerald-400 hover:underline">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}