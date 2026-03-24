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

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       const token = sessionStorage.getItem('token');
       
       let payload = { ...newPlayer, role: 'CUSTOMER' };
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 glass-panel border-blue-500/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <Link href="/admin" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-bold">← Volver al Panel</Link>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase">Afiliación de Jugadores</h1>
          <p className="text-gray-400 mt-1">Registra y gestiona los jugadores de la plataforma</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
            {currentUser?.role === 'ADMIN' && (
              <Link href="/admin/franchises" className="flex-1 md:flex-none py-4 px-6 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold rounded-xl hover:bg-purple-500/20 transition-all text-center">
                Gestión de Bancas
              </Link>
            )}
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none py-4 px-8 bg-blue-500 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              + NUEVO JUGADOR
            </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="glass-panel p-4 flex items-center gap-4 border-white/5">
        <div className="flex-1 relative">
           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
           <input 
             type="text" 
             placeholder="Buscar por nombre, cédula o teléfono..."
             className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-blue-500 transition-all"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      {/* Players List */}
      <div className="glass-panel overflow-hidden border-white/5">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Base de Datos de Afiliados</h2>
            <div className="text-xs text-gray-400 font-mono">{players.length} USUARIOS REGISTRADOS</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1e293b] text-gray-400 text-[10px] uppercase font-black tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6">ID / Fecha</th>
                <th className="px-8 py-6">Información del Jugador</th>
                <th className="px-8 py-6">Teléfono / WhatsApp</th>
                <th className="px-8 py-6">Billetera</th>
                <th className="px-8 py-6">Estado</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPlayers.map((p) => ( // Changed from players.map to filteredPlayers.map
                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-gray-500 font-mono text-xs">#{p.id.slice(0, 8)}</span>
                      <span className="text-[10px] text-gray-600 mt-1">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 font-black">
                            {p.full_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold group-hover:text-blue-400 transition-colors">{p.full_name}</span>
                            <span className="text-xs text-gray-500">{p.email}</span>
                        </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                        <span className="text-gray-300 font-mono">{p.phone_number}</span>
                        <span className="text-[10px] text-emerald-500 font-black tracking-widest uppercase">Verificado</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl inline-block">
                        <span className="text-emerald-400 font-black text-lg">₡{p.balance ? Number(p.balance).toLocaleString() : '0'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                      {p.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={`https://wa.me/${p.phone_number.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center" 
                        title="Contactar WhatsApp"
                      >
                         🟢
                      </a>
                      <button onClick={() => handleEditPlayer(p)} className="p-2 bg-white/5 rounded-lg border border-white/10 text-blue-400 hover:bg-blue-500/20 transition-all" title="Editar Jugador">
                         ✏️
                      </button>
                      <button onClick={() => handleDeletePlayer(p.id)} className="p-2 bg-white/5 rounded-lg border border-white/10 text-red-400 hover:bg-red-500/20 transition-all" title="Eliminar Jugador">
                         🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPlayers.length === 0 && ( // Changed from players.length to filteredPlayers.length
                <tr>
                   <td colSpan={6} className="px-8 py-20 text-center text-gray-500 italic">No se encontraron jugadores registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Player Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-2xl p-8 border-blue-500/30 overflow-y-auto max-h-[90vh]">
            <header className="flex justify-between items-center mb-8">
               <h2 className="text-3xl font-black text-white uppercase tracking-tight">Nuevo Jugador</h2>
               <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white text-2xl">✕</button>
            </header>
            
            <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase text-gray-400 ml-1">Nombre Completo</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" 
                    value={newPlayer.full_name}
                    onChange={(e) => setNewPlayer({...newPlayer, full_name: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 ml-1">Identificación / Cédula</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" 
                    value={newPlayer.national_id}
                    onChange={(e) => setNewPlayer({...newPlayer, national_id: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 ml-1">Teléfono (SINPE)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" 
                    value={newPlayer.phone_number}
                    onChange={(e) => setNewPlayer({...newPlayer, phone_number: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 ml-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    required
                    placeholder="usuario@ejemplo.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" 
                    value={newPlayer.email}
                    onChange={(e) => setNewPlayer({...newPlayer, email: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 ml-1">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" 
                    value={newPlayer.date_of_birth}
                    onChange={(e) => setNewPlayer({...newPlayer, date_of_birth: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 ml-1">Contraseña</label>
                  <input 
                    type="password" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500" 
                    value={newPlayer.password}
                    onChange={(e) => setNewPlayer({...newPlayer, password: e.target.value})}
                  />
               </div>

               <div className="md:col-span-2 pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-4 px-12 bg-blue-500 text-white font-black rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                  >
                    AFILIAR JUGADOR
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
