'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Franchise {
  id: string;
  full_name: string;
  email: string;  
  phone_number: string;
  national_id: string;
  is_active: boolean;
  created_at: string;
  balance: number;
  player_count?: number;
}

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [newFranchise, setNewFranchise] = useState({
    full_name: '',
    national_id: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    password: ''
  });

  useEffect(() => {
    setIsMounted(true);
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/franchises', token);
      if (Array.isArray(data)) {
        setFranchises(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (franchise: Franchise) => {
    const action = franchise.is_active ? 'desactivar' : 'activar';
    if (!confirm(`¿Desea ${action} la franquicia "${franchise.full_name}"?`)) return;
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.put(`/admin/users/${franchise.id}`, {
        full_name: franchise.full_name,
        email: franchise.email,
        is_active: !franchise.is_active
      }, token);
      if (data.error) alert(data.error);
      else fetchFranchises();
    } catch (err) {
      alert('Error al actualizar franquicia.');
    }
  };

  const handleDeleteFranchise = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que desea eliminar la franquicia "${name}"? Sus jugadores quedarán sin franquicia asignada.`)) return;
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.delete(`/admin/franchises/${id}`, token);
      if (data.error) alert(data.error);
      else {
        alert('Franquicia eliminada.');
        fetchFranchises();
      }
    } catch (err) {
      alert('Error al eliminar franquicia.');
    }
  };

  const handleAddFranchise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.post('/auth/register-staff', { ...newFranchise, role: 'FRANCHISE' }, token);
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Franquicia "${newFranchise.full_name}" creada exitosamente.`);
        setShowModal(false);
        setNewFranchise({ full_name: '', national_id: '', phone_number: '', email: '', date_of_birth: '', password: '' });
        fetchFranchises();
      }
    } catch (err) {
      alert('Error al crear franquicia.');
    }
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 glass-panel border-purple-500/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/admin/players" className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-bold">← Volver a Jugadores</Link>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Gestión de Franquicias</h1>
          <p className="text-gray-400 mt-1">Administra las bancas del sistema de lotería</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto py-4 px-8 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-purple-500/30 active:scale-95"
        >
          + NUEVA FRANQUICIA
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border-purple-500/10">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Franquicias</p>
          <p className="text-4xl font-black text-purple-400 mt-2">{franchises.length}</p>
        </div>
        <div className="glass-panel p-6 border-emerald-500/10">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Activas</p>
          <p className="text-4xl font-black text-emerald-400 mt-2">{franchises.filter(f => f.is_active).length}</p>
        </div>
        <div className="glass-panel p-6 border-red-500/10">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Inactivas</p>
          <p className="text-4xl font-black text-red-400 mt-2">{franchises.filter(f => !f.is_active).length}</p>
        </div>
      </div>

      {/* Franchises Table */}
      <div className="glass-panel overflow-hidden border-white/5">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Directorio de Franquicias / Bancas</h2>
          <div className="text-xs text-gray-400 font-mono">{franchises.length} REGISTRADAS</div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Cargando franquicias...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1e293b] text-gray-400 text-[10px] uppercase font-black tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Franquicia</th>
                  <th className="px-8 py-6">Contacto</th>
                  <th className="px-8 py-6">Cédula / ID</th>
                  <th className="px-8 py-6">Saldo</th>
                  <th className="px-8 py-6">Estado</th>
                  <th className="px-8 py-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {franchises.map((f) => (
                  <tr key={f.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 font-black text-lg">
                          {f.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-black">{f.full_name}</p>
                          <p className="text-[10px] text-gray-500 font-mono">#{f.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-gray-600">{new Date(f.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-gray-300 text-sm font-bold">{f.email}</span>
                        <span className="text-gray-500 font-mono text-xs mt-1">{f.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-gray-400 font-mono text-sm">{f.national_id}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl inline-block">
                        <span className="text-emerald-400 font-black text-lg">₡{f.balance ? Number(f.balance).toLocaleString() : '0'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${f.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {f.is_active ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleActive(f)}
                          className={`p-2 rounded-lg border transition-all text-sm ${f.is_active ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                          title={f.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {f.is_active ? '🔴' : '🟢'}
                        </button>
                        <button
                          onClick={() => handleDeleteFranchise(f.id, f.full_name)}
                          className="p-2 bg-white/5 rounded-lg border border-white/10 text-red-400 hover:bg-red-500/20 transition-all"
                          title="Eliminar Franquicia"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {franchises.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                        <span className="text-5xl">🏪</span>
                        <p className="text-lg font-bold">No hay franquicias registradas</p>
                        <p className="text-sm">Crea la primera franquicia o banca del sistema.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Franchise Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-2xl p-8 border-purple-500/30 overflow-y-auto max-h-[90vh]">
            <header className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight">Nueva Franquicia</h2>
                <p className="text-gray-500 text-sm mt-1">La franquicia tendrá acceso al panel de administración para sus jugadores</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white text-2xl p-2">✕</button>
            </header>

            <form onSubmit={handleAddFranchise} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Nombre de la Franquicia / Banca</label>
                <input
                  type="text"
                  required
                  placeholder="Banca XYZ o Nombre Completo del Dueño"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                  value={newFranchise.full_name}
                  onChange={(e) => setNewFranchise({ ...newFranchise, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Cédula / Identificación</label>
                <input
                  type="text"
                  required
                  placeholder="1-1234-5678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                  value={newFranchise.national_id}
                  onChange={(e) => setNewFranchise({ ...newFranchise, national_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Teléfono / SINPE</label>
                <input
                  type="text"
                  required
                  placeholder="+506 8888-8888"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                  value={newFranchise.phone_number}
                  onChange={(e) => setNewFranchise({ ...newFranchise, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Email de Acceso</label>
                <input
                  type="email"
                  required
                  placeholder="banca@ejemplo.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                  value={newFranchise.email}
                  onChange={(e) => setNewFranchise({ ...newFranchise, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Fecha de Nacimiento (Titular)</label>
                <input
                  type="date"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                  value={newFranchise.date_of_birth}
                  onChange={(e) => setNewFranchise({ ...newFranchise, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-1">Contraseña de Acceso</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-purple-500 transition-all"
                  value={newFranchise.password}
                  onChange={(e) => setNewFranchise({ ...newFranchise, password: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">ℹ️ Información Importante</p>
                <p className="text-gray-400 text-sm">La franquicia podrá: gestionar sus jugadores, aprobar recargas SINPE de sus clientes, ver estadísticas de su negocio y los resultados de sorteos. <strong className="text-white">NO podrá</strong> crear otras franquicias ni ver datos de otras bancas.</p>
              </div>

              <div className="md:col-span-2 pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-black rounded-xl hover:brightness-110 transition-all shadow-lg shadow-purple-500/20"
                >
                  CREAR FRANQUICIA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
