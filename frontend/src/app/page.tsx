'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootRedirect() {
    const router = useRouter();

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        if (token) {
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            if (user.role === 'ADMIN') {
                router.push('/admin');
            } else {
                router.push('/betting');
            }
        } else {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="text-emerald-500 font-black animate-pulse flex flex-col items-center">
                <span className="text-4xl mb-4">🎰</span>
                <span className="tracking-[0.5em] uppercase text-xs">Cargando Tiempos Pro...</span>
            </div>
        </div>
    );
}
