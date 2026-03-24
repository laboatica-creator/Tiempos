'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      const data = await api.post('/auth/forgot-password', { email });

      if (data.error) {
        setError(data.error);
      } else {
        setMessage(data.message || 'Si el correo existe, recibirás un enlace de recuperación.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="glass-panel w-full max-w-md p-10 animate-in fade-in zoom-in duration-500 border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-200">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-400 mt-2 font-bold text-sm tracking-wide">
            Ingresa tu correo asociado a la cuenta.
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
            <label className="text-xs font-black uppercase text-gray-400 ml-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@hotmail.com"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-indigo-500 transition-all placeholder:text-gray-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !!message}
            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl transition-all transform active:scale-95 ${
              isLoading || !!message
              ? 'bg-white/10 text-gray-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white hover:brightness-110 shadow-indigo-500/40'
            }`}
          >
            {isLoading ? 'Enviando...' : 'ENVIAR ENLACE'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link href="/login" className="text-indigo-400 font-bold hover:underline text-sm">
            ← Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}
