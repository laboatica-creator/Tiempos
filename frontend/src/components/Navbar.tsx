'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setUserRole(parsed.role);
            } catch (e) {
                setUser(null);
                setUserRole(null);
            }
        } else {
            setUser(null);
            setUserRole(null);
        }
    }, [pathname]);

    const handleLogout = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!confirm('¿Desea cerrar su sesión actual?')) return;
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
    };

    const isAdminPath = pathname?.startsWith('/admin');
    const isAuthPath = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
    const hasToken = isMounted && !!sessionStorage.getItem('token');

    if (isAuthPath || (!hasToken && pathname !== '/')) return null;

    let navItems = [];

    if (isAdminPath) {
        const perms = user?.permissions || [];
        const isMaster = user?.is_master;

        navItems = [
            { name: 'Panel', path: '/admin', icon: '📊', show: true },
            { name: 'Sorteos', path: '/admin/results', icon: '🎰', show: isMaster || perms.includes('draws') },
            { name: 'Recargas', path: '/admin/recharges', icon: '💰', show: isMaster || perms.includes('recharges') },
            { name: 'Afiliados', path: '/admin/players', icon: '👥', show: isMaster || perms.includes('players') },
            { name: 'Salir', path: '/login', icon: '🔚', onClick: handleLogout, show: true },
        ].filter(i => i.show);
    } else {
        navItems = [
            { name: 'Apostar', path: '/betting', icon: '🎰' },
            { name: 'Historial', path: '/my-bets', icon: '🎟️' },
            { name: 'Billetera', path: '/wallet', icon: '💰' },
            { name: 'Resultados', path: '/results', icon: '🏆' },
            userRole ? { name: 'Cerrar', path: '/login', icon: '🔚', onClick: handleLogout } : { name: 'Entrar', path: '/login', icon: '🔑' },
        ];
        
        if (userRole === 'ADMIN' || userRole === 'FRANCHISE') {
            navItems = [{ name: 'Admin', path: '/admin', icon: '⚙️' }, ...navItems];
        }
    }

    return (
        <>
            {/* Desktop Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] hidden lg:block transition-all duration-300 ${scrolled ? 'bg-[#0f172a]/90 backdrop-blur-xl border-b border-white/10 py-2' : 'bg-transparent py-4'}`}>
                <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
                    <Logo />
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                        {navItems.map((item: any) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link 
                                    key={item.path} 
                                    href={item.path}
                                    onClick={item.onClick}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${
                                        isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation (Native App Style) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#1e293b]/95 backdrop-blur-2xl border-t border-white/10 safe-bottom pb-env">
                <div className="max-w-md mx-auto flex justify-between items-center px-4 py-3">
                    {navItems.map((item: any) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                href={item.path}
                                onClick={item.onClick}
                                className={`flex flex-col items-center gap-1.5 transition-all flex-1 py-1 ${
                                    isActive ? 'text-emerald-400 scale-110' : 'text-gray-500 active:scale-90'
                                }`}
                            >
                                <span className={`text-2xl transition-transform ${isActive ? 'animate-bounce-short' : ''}`}>{item.icon}</span>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.name}</span>
                                {isActive && <div className="w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Top Header (Just for Logo/Status) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-[90] bg-[#0f172a]/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/5 shadow-xl">
                <Logo size="text-xl" />
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">En Línea</span>
                        <span className="text-[10px] text-white font-mono">
                            {isMounted ? new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content Spacer for Mobile Header */}
            <div className="lg:hidden h-16" />
        </>
    );
};

export default Navbar;
