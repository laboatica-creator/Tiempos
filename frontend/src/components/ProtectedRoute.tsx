'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'ADMIN' | 'CUSTOMER' | 'FRANCHISE' }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const userStr = sessionStorage.getItem('user');

        if (!token || !userStr) {
            router.replace('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            
            // Role check
            if (role && user.role !== role && user.role !== 'ADMIN') {
                router.replace('/login');
                return;
            }

            setIsAuthorized(true);
        } catch (e) {
            router.replace('/login');
        }
    }, [router, role, pathname]);

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 bg-[#0f172a] z-[999] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span className="text-xs font-black text-emerald-500 uppercase tracking-[0.5em] animate-pulse">Verificando Acceso...</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
