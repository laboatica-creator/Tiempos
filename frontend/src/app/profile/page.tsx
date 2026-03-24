'use client';

import React from 'react';

export default function Profile() {
    const user = {
        name: 'Carlos Rodríguez',
        phone: '+506 8888-8888',
        email: 'carlos@example.com',
        role: 'CLIENTE',
        status: 'ACTIVO'
    };

    return (
        <main className="p-6 flex-1 max-w-4xl mx-auto w-full space-y-10">
            <header className="py-12 text-center bg-gradient-to-br from-blue-500/10 to-transparent rounded-3xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full text-[10px] font-black tracking-widest ring-1 ring-emerald-500/50 uppercase">
                        {user.status}
                    </span>
                </div>
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-blue-500/30">
                    CR
                </div>
                <h1 className="text-3xl font-black">{user.name}</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mt-1">{user.role}</p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 space-y-6">
                    <h3 className="font-bold border-b border-white/5 pb-2 text-gray-400 uppercase tracking-widest text-xs">Información de Cuenta</h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Teléfono</p>
                            <p className="font-mono">{user.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Email</p>
                            <p>{user.email}</p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 space-y-6">
                    <h3 className="font-bold border-b border-white/5 pb-2 text-gray-400 uppercase tracking-widest text-xs">Acciones Rápidas</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <button className="text-left w-full p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all font-bold">
                            📝 Editar Perfil
                        </button>
                        <button className="text-left w-full p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all font-bold">
                            🔒 Cambiar Contraseña
                        </button>
                        <button className="text-left w-full p-4 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all font-bold">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            </section>

            <section className="glass-panel p-10 text-center space-y-6">
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold flex items-center justify-center gap-2">
                    <span>⚠️</span> Recordatorio: Solo para mayores de 18 años. Juegue con responsabilidad.
                </div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em] max-w-sm mx-auto">
                    Si tienes problemas con el juego, busca ayuda profesional.
                </p>
            </section>
        </main>
    );
}
