'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';

interface SinpeConfig {
  number: string;
  bank: string;
  owner: string;
}

export default function AdminSettingsPage() {
  const [whatsapp, setWhatsapp] = useState('');
  const [sinpeList, setSinpeList] = useState<SinpeConfig[]>([
    { number: '', bank: '', owner: '' },
    { number: '', bank: '', owner: '' },
    { number: '', bank: '', owner: '' }
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/settings', token);
      if (data && !data.error) {
        if (data.whatsapp_support) {
          try {
            const raw = typeof data.whatsapp_support === 'string' ? JSON.parse(data.whatsapp_support) : data.whatsapp_support;
            setWhatsapp(String(raw));
          } catch (e) {
            setWhatsapp(String(data.whatsapp_support));
          }
        }
        if (data.sinpe_numbers) {
            try {
              const list = typeof data.sinpe_numbers === 'string' ? JSON.parse(data.sinpe_numbers) : data.sinpe_numbers;
              if (Array.isArray(list)) {
                  const newList = [...list];
                  while(newList.length < 3) newList.push({ number: '', bank: '', owner: '' });
                  setSinpeList(newList.slice(0, 3));
              }
            } catch (e) {
              console.error('Error parsing sinpe_numbers:', e);
            }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      await Promise.all([
        api.post('/admin/settings', { key: 'whatsapp_support', value: whatsapp }, token),
        api.post('/admin/settings', { key: 'sinpe_numbers', value: sinpeList.filter(s => s.number) }, token)
      ]);
      alert('Configuraciones guardadas correctamente.');
    } catch (err) {
      alert('Error al guardar configuraciones.');
    } finally {
      setSaving(false);
    }
  };

  const updateSinpe = (index: number, field: keyof SinpeConfig, value: string) => {
    const newList = [...sinpeList];
    newList[index][field] = value;
    setSinpeList(newList);
  };

  return (
    <ProtectedRoute role="ADMIN">
      <div className="max-w-4xl mx-auto p-10 space-y-10 animate-in fade-in duration-500">
        <header className="flex justify-between items-center bg-[#1e293b] p-8 rounded-3xl border border-blue-500/20 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin" className="text-blue-400 hover:text-blue-300 text-sm font-bold">← Volver</Link>
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Configuración Global</h1>
            <p className="text-gray-400 font-bold mt-1 uppercase text-[10px] tracking-widest">WhatsApp & SINPE para Jugadores</p>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">Cargando configuración...</div>
        ) : (
          <div className="space-y-8">
            <section className="glass-panel p-8 space-y-6">
              <h2 className="text-xl font-black text-emerald-400 uppercase tracking-tight italic">Soporte WhatsApp</h2>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Número de WhatsApp (con código de país, ej: 50688888888)</label>
                <input 
                  type="text" 
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="50688888888"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-emerald-500"
                />
              </div>
            </section>

            <section className="glass-panel p-8 space-y-6">
              <h2 className="text-xl font-black text-blue-400 uppercase tracking-tight italic">Números de SINPE (Máx. 3)</h2>
              <div className="grid grid-cols-1 gap-6">
                {sinpeList.map((s, i) => (
                  <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Opción #{i+1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-600 uppercase">Número</label>
                        <input 
                          type="text" 
                          value={s.number}
                          onChange={(e) => updateSinpe(i, 'number', e.target.value)}
                          placeholder="8888 8888"
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-600 uppercase">Banco</label>
                        <input 
                          type="text" 
                          value={s.bank}
                          onChange={(e) => updateSinpe(i, 'bank', e.target.value)}
                          placeholder="BNCR, BCR, etc."
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-gray-600 uppercase">A nombre de</label>
                        <input 
                          type="text" 
                          value={s.owner}
                          onChange={(e) => updateSinpe(i, 'owner', e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <button 
              onClick={saveSettings}
              disabled={saving}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-black rounded-2xl shadow-xl hover:scale-[1.01] transition-all uppercase tracking-widest active:scale-95 disabled:opacity-50"
            >
              {saving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
            </button>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
