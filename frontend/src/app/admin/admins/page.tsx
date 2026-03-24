'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

export default function AdminManagement() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        permissions: [] as string[]
    });

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const token = sessionStorage.getItem('token');
            const data = await api.get('/admin/admins', token);
            setAdmins(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('token');
            if (editingAdmin) {
                await api.put(`/admin/admins/${editingAdmin.id}`, {
                    permissions: formData.permissions,
                    is_active: editingAdmin.is_active
                }, token);
            } else {
                await api.post('/admin/admins', formData, token);
            }
            setShowModal(false);
            setEditingAdmin(null);
            setFormData({ full_name: '', email: '', password: '', permissions: [] });
            fetchAdmins();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al guardar');
        }
    };

    const togglePermission = (perm: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    const openEdit = (admin: any) => {
        setEditingAdmin(admin);
        setFormData({
            full_name: admin.full_name,
            email: admin.email,
            password: '', 
            permissions: admin.permissions || []
        });
        setShowModal(true);
    };

    const availablePermissions = [
        { id: 'draws', name: 'Sorteos (Resultados)', icon: '🎰' },
        { id: 'recharges', name: 'Recargas (SINPE)', icon: '💰' },
        { id: 'players', name: 'Jugadores (Usuarios)', icon: '👥' }
    ];

    if (loading) return <div className="p-10 text-white font-black uppercase tracking-widest animate-pulse">Cargando Administradores...</div>;

    return (
        <main className="p-4 lg:p-10 space-y-10 max-w-7xl mx-auto pb-32 lg:pb-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Gestión de Administradores</h1>
                    <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mt-1 opacity-70">Control de personal y permisos del sistema</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingAdmin(null);
                        setFormData({ full_name: '', email: '', password: '', permissions: [] });
                        setShowModal(true);
                    }}
                    className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                >
                    <span className="text-lg">➕</span> Nuevo Administrador
                </button>
            </header>

            <div className="glass-panel overflow-x-auto border-white/5 bg-[#1e293b]/30">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-black tracking-widest text-gray-400">
                            <th className="px-8 py-6">Nombre y Correo</th>
                            <th className="px-8 py-6">Nivel</th>
                            <th className="px-8 py-6">Permisos Asignados</th>
                            <th className="px-8 py-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold">{admin.full_name}</span>
                                        <span className="text-xs text-gray-500 lowercase">{admin.email}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    {admin.is_master ? (
                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-[10px] font-black uppercase tracking-tighter border border-purple-500/30">
                                            MASTER ADMIN
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-tighter border border-blue-500/30">
                                            SUB-ADMIN
                                        </span>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-wrap gap-2">
                                        {admin.is_master ? (
                                            <span className="text-gray-500 text-[10px] font-bold italic uppercase">Acceso Total</span>
                                        ) : (
                                            admin.permissions?.length > 0 ? admin.permissions.map((p: string) => (
                                                <span key={p} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold uppercase border border-emerald-500/20">
                                                    {availablePermissions.find(ap => ap.id === p)?.name || p}
                                                </span>
                                            )) : <span className="text-gray-600 text-[10px] font-bold italic uppercase">Sin Permisos</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    {!admin.is_master && (
                                        <button 
                                            onClick={() => openEdit(admin)}
                                            className="p-3 bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 rounded-xl transition-all border border-white/5 flex items-center gap-2 ml-auto"
                                        >
                                            <span className="text-sm">⚙️</span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Editar Permisos</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="glass-panel w-full max-w-2xl p-10 bg-[#0f172a] border-emerald-500/30 relative overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-8 relative z-10 flex items-center gap-4">
                            <span className="w-12 h-12 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-2xl not-italic">🔐</span>
                            {editingAdmin ? 'Configurar Sub-Admin' : 'Nuevo Administrador'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-8 relative z-10">
                            {!editingAdmin && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Nombre Completo</label>
                                        <input 
                                            required
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-700"
                                            placeholder="Ej: Juan Pérez"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Correo Electrónico</label>
                                        <input 
                                            required
                                            type="email"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-gray-700"
                                            placeholder="usuario@tiempos.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Contraseña de acceso</label>
                                        <input 
                                            required
                                            type="password"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-emerald-500/50 transition-colors"
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] block mb-4">Módulos permitidos para este usuario:</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {availablePermissions.map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => togglePermission(p.id)}
                                            className={`p-6 rounded-3xl border cursor-pointer transition-all flex flex-col items-center gap-3 text-center group ${
                                                formData.permissions.includes(p.id)
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10'
                                                    : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'
                                            }`}
                                        >
                                            <span className={`text-3xl transition-transform duration-300 ${formData.permissions.includes(p.id) ? 'scale-110' : 'group-hover:scale-110 opacity-40'}`}>
                                                {p.icon}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-8 border-t border-white/5">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-4 px-6 rounded-2xl bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/40 transition-all active:scale-95"
                                >
                                    {editingAdmin ? 'Actualizar Permisos' : 'Crear Acceso Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
