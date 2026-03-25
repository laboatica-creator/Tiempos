'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface Player {
  id: string;
  full_name: string;
  email: string;
  national_id: string;
  phone_number: string;
  balance: number;
  is_active: boolean;
  created_at: string;
  role: string;
}

export default function PlayerAffiliationPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [newPlayer, setNewPlayer] = useState({
    full_name: '',
    national_id: '',
    phone_number: '',
    email: '',
    date_of_birth: '',
    password: 'password123' 
  });

  useEffect(() => {
    setIsMounted(true);
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    setCurrentUser(user);
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const data = await api.get('/admin/users', token);
      if (Array.isArray(data)) {
        setPlayers(data);
      } else if (data && data.error) {
        console.error('Players Error:', data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlayer = async (p: Player) => {
    const newName = prompt('Nuevo nombre:', p.full_name);
    const newEmail = prompt('Nuevo email:', p.email);
    if (!newName || !newEmail) return;

    try {
        const token = sessionStorage.getItem('token');
        const data = await api.put(`/admin/users/${p.id}`, {
            full_name: newName,
            email: newEmail,
            is_active: p.is_active
        }, token);

        if (data.error) alert(data.error);
        else {
            alert('Jugador actualizado');
            fetchPlayers();
        }
    } catch (err) {
        alert('Error al actualizar');
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este jugador? Esta acción es irreversible.')) return;
    try {
        const token = sessionStorage.getItem('token');
        const data = await api.delete(`/admin/users/${id}`, token);
        if (data.error) alert(data.error);
        else {
            alert('Jugador eliminado');
            fetchPlayers();
        }
    } catch (err) {
        alert('Error al eliminar');
    }
  };

  const handlePromoteToFranchise = async (p: Player) => {
    if (!confirm(`¿Seguro que desea convertir a "${p.full_name}" en una FRANQUICIA? Podrá gestionar sus propios jugadores.`)) return;
    try {
        const token = sessionStorage.getItem('token');
        const data = await api.put(`/admin/promote-franchise/${p.id}`, {}, token);
        if (data.error) alert(data.error);
        else {
            alert(data.message);
            fetchPlayers();
        }
    } catch (err) {
        alert('Error al ascender usuario');
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       const token = sessionStorage.getItem('token');
       
       let payload = { 
         email: newPlayer.email,
         password: newPlayer.password,
         full_name: newPlayer.full_name,
         national_id: newPlayer.national_id,
         phone_number: newPlayer.phone_number,
         date_of_birth: newPlayer.date_of_birth,
         role: 'CUSTOMER' 
        };

       if (currentUser?.role === 'FRANCHISE') {
           payload = { ...payload, franchise_id: currentUser.id } as any;
       }

       const data = await api.post('/auth/register', payload, token);
       if (data.error) {
         alert(data.error);
       } else {
         alert('Jugador registrado exitosamente.');
         setShowModal(false);
         setNewPlayer({ full_name: '', national_id: '', phone_number: '', email: '', date_of_birth: '', password: 'password123' });
         fetchPlayers();
       }
    } catch (err) {
       alert('Error al registrar jugador.');
    }
  };

  const filteredPlayers = players.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) || 
    p.phone_number.includes(search) || 
    p.national_id.includes(search)
  );

  if (!isMounted) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 glass-panel border-blue-500/20 transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
             <Link href="/admin" className="text-blue-400 hover:text-blue-300 transition-colors text-xs font-black uppercase tracking-widest">← Volver al Panel</Link>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic">Afiliación de Jugadores</h1>
          <p className="text-gray-400 mt-1 uppercase text-[10px] font-bold tracking-[0.2em] opacity-60">Control maestro de base de datos de usuarios</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto relative z-10">
            {currentUser?.role === 'ADMIN' && (
              <Link href="/admin/franchises" className="flex-1 md:flex-none py-4 px-6 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-black rounded-xl hover:bg-purple-500/20 transition-all text-center uppercase text-[10px] tracking-widest shadow-lg shadow-purple-500/5 transform hover:-translate-y-1">
                Gestión de Bancas
              </Link>
            )}
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-blue-500/20 active:scale-95 transform hover:-translate-y-1 uppercase text-xs tracking-widest"
            >
              + NUEVO JUGADOR
            </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="glass-panel p-4 flex items-center gap-4 border-white/5 shadow-xl transition-all hover:bg-white/[0.03]">
        <div className="flex-1 relative">
           <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-lg">🔍</span>
           <input 
             type="text" 
             placeholder="Buscar por nombre, cédula o teléfono..."
             className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white outline-none focus:border-blue-500 transition-all font-medium text-sm"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      {/* Players List */}
      <div className="glass-panel overflow-hidden border-white/5 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-6 -mt-6"></div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic z-10">Base de Datos de Afiliados</h2>
            <div className="text-[10px] text-blue-400 font-black tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full z-10">{players.length} USUARIOS</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1e293b]/50 text-gray-400 text-[10px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">ID / Registro</th>
                <th className="px-8 py-6">Información del Jugador</th>
                <th className="px-8 py-6">Teléfono / WhatsApp</th>
                <th className="px-8 py-6">Créditos</th>
                <th className="px-8 py-6">Estado</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPlayers.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-mono text-[10px] font-black uppercase">#{p.id.slice(0, 8)}</span>
                      <span className="text-[10px] text-gray-600 mt-1 font-bold">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transform transition-transform group-hover:scale-110 shadow-lg ${p.role === 'FRANCHISE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                            {p.full_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black group-hover:text-blue-400 transition-colors text-base tracking-tight">{p.full_name}</span>
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-gray-500">{p.email}</span>
                              {p.role === 'FRANCHISE' && <span className="text-[8px] bg-purple-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Banca</span>}
                            </div>
                        </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-gray-300 font-mono font-bold text-sm">
                    {p.phone_number}
                  </td>
                  <td className="px-8 py-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl inline-block group-hover:shadow-lg group-hover:shadow-emerald-500/5 transition-all">
                        <span className="text-emerald-400 font-black text-lg tracking-tighter">₡{p.balance ? Number(p.balance).toLocaleString() : '0'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${p.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {p.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-20 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <a 
                        href={`https://wa.me/${p.phone_number.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20" 
                        title="Contactar WhatsApp"
                      >
                         🟢
                      </a>
                      {p.role !== 'FRANCHISE' && currentUser?.role === 'ADMIN' && (
                        <button 
                          onClick={() => handlePromoteToFranchise(p)} 
                          className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-all shadow-lg hover:shadow-purple-500/20" 
                          title="Ascender a Banca"
                        >
                           🏦
                        </button>
                      )}
                      <button onClick={() => handleEditPlayer(p)} className="p-3 bg-white/5 rounded-xl border border-white/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-lg hover:shadow-blue-500/20" title="Editar Jugador">
                         ✏️
                      </button>
                      <button onClick={() => handleDeletePlayer(p.id)} className="p-3 bg-white/5 rounded-xl border border-white/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20" title="Eliminar Jugador">
                         🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPlayers.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-8 py-20 text-center text-gray-500 font-black uppercase italic text-xs tracking-[0.5em] opacity-30">No se encontraron afiliados registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Player Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-2xl p-10 border-blue-500/30 overflow-y-auto max-h-[95vh] relative shadow-[0_0_100px_rgba(59,130,246,0.15)]">
            <header className="flex justify-between items-center mb-10">
               <div>
                 <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">Nuevo Afiliado</h2>
                 <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase mt-1">Registro de cuenta bajo {currentUser?.full_name}</p>
               </div>
               <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all focus:outline-none">✕</button>
            </header>
            
            <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Nombre Completo del Jugador</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Mario Vargas"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all font-medium" 
                    value={newPlayer.full_name}
                    onChange={(e) => setNewPlayer({...newPlayer, full_name: e.target.value})}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Número de Cédula (ID)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="1-0000-0000"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all font-mono" 
                    value={newPlayer.national_id}
                    onChange={(e) => setNewPlayer({...newPlayer, national_id: e.target.value})}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Teléfono (Envío SINPE)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="+506 8888-8888"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all font-mono" 
                    value={newPlayer.phone_number}
                    onChange={(e) => setNewPlayer({...newPlayer, phone_number: e.target.value})}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    required
                    placeholder="email@tiempos.com"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all font-medium" 
                    value={newPlayer.email}
                    onChange={(e) => setNewPlayer({...newPlayer, email: e.target.value})}
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all text-sm h-[66px]" 
                    value={newPlayer.date_of_birth}
                    onChange={(e) => setNewPlayer({...newPlayer, date_of_birth: e.target.value})}
                  />
               </div>
               <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-1">Contraseña Preestablecida</label>
                  <input 
                    type="text" 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-blue-500 transition-all font-mono" 
                    value={newPlayer.password}
                    onChange={(e) => setNewPlayer({...newPlayer, password: e.target.value})}
                  />
               </div>

               <div className="md:col-span-2 pt-8 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-5 bg-white/5 text-gray-400 font-bold rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/10 uppercase text-[10px] tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-5 px-12 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-black rounded-2xl hover:brightness-110 transition-all shadow-2xl shadow-blue-500/20 uppercase text-xs tracking-widest transform active:scale-95"
                  >
                    AFILIAR JUGADOR AHORA
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
