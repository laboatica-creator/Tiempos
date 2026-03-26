'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LogoutSuccessPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
            <div className="glass-panel w-full max-w-md p-10 text-center animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center mb-8">
                    <Logo size="text-4xl" />
                </div>
                
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <span className="text-5xl">👋</span>
                </div>

                <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
                    ¡Gracias por participar!
                </h1>
                
                <p className="text-gray-400 font-bold mb-10 leading-relaxed">
                    Fue un gusto tenerte con nosotros. Esperamos verte pronto para que sigas <span className="text-emerald-400 uppercase italic">ganando mucho dinero</span> con la mejor plataforma de lotería.
                </p>

                <div className="space-y-4">
                    <Link 
                        href="/login" 
                        className="block w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-105 transition-transform uppercase tracking-widest"
                    >
                        Volver a entrar
                    </Link>
                    
                    <p className="text-[9px] text-gray-700 font-black uppercase tracking-[0.3em] mt-10">
                        Copyright © J. Leslie V.
                    </p>
                </div>
            </div>
        </div>
    );
}
