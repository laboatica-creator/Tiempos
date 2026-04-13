'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionTimeout() {
    const router = useRouter();
    const pathname = usePathname();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        router.push('/login');
    };

    const resetTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            const token = sessionStorage.getItem('token');
            if (token) {
                alert('⚠️ Sesión expirada por inactividad. Por favor, inicie sesión nuevamente.');
                logout();
            }
        }, 5 * 60 * 1000);
    };

    useEffect(() => {
        if (pathname === '/login' || pathname === '/register') {
            return;
        }

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        resetTimer();

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [pathname]);

    return null;
}