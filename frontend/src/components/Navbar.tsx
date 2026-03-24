'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from './Logo';

const Navbar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = React.useState<any>(null);
    const [userRole, setUserRole] = React.useState<string | null>(null);

    React.useEffect(() => {
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
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
    };

    const isAdminPath = pathname?.startsWith('/admin');
    const isAuthPath = pathname === '/login' || pathname === '/register';

    if (isAuthPath) return null;

    let navItems = [];

    if (isAdminPath) {
        const perms = user?.permissions || [];
        const isMaster = user?.is_master;

        navItems = [
            { name: 'Dashboard', path: '/admin', icon: '📊', show: true },
            { name: 'Sorteos', path: '/admin/results', icon: '🎰', show: isMaster || perms.includes('draws') },
            { name: 'Recargas', path: '/admin/recharges', icon: '💰', show: isMaster || perms.includes('recharges') },
            { name: 'Jugadores', path: '/admin/players', icon: '👥', show: isMaster || perms.includes('players') },
            { name: 'Admins', path: '/admin/admins', icon: '🔑', show: isMaster },
            { name: 'Salir', path: '/login', icon: '🔚', onClick: handleLogout, show: true },
        ].filter(i => i.show);
    } else {
        navItems = [
            ...(userRole ? [] : [{ name: 'Afiliarse', path: '/', icon: '📝' }]),
            { name: 'Apostar', path: '/betting', icon: '🎰' },
            { name: 'Mis Jugadas', path: '/my-bets', icon: '🎟️' },
            { name: 'Billetera', path: '/wallet', icon: '💰' },
            { name: 'Resultados', path: '/results', icon: '🏆' },
            userRole ? { name: 'Salir', path: '/login', icon: '🔚', onClick: handleLogout } : { name: 'Login', path: '/login', icon: '🔑' },
        ];
        
        if (userRole === 'ADMIN') {
            navItems = [{ name: 'Panel Admin', path: '/admin', icon: '⚙️' }, ...navItems];
        }
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-t border-white/10 px-6 py-3 lg:top-0 lg:bottom-auto lg:border-t-0 lg:border-b">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="hidden lg:flex items-center">
                    <Logo />
                </div>
                
                <div className="flex w-full lg:w-auto justify-around lg:justify-end gap-0 lg:gap-8 overflow-x-auto">
                    {navItems.map((item: any) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                href={item.path}
                                onClick={item.onClick}
                                className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-2 px-3 py-1 rounded-xl transition-all flex-shrink-0 ${
                                    isActive ? 'text-emerald-400 lg:bg-emerald-400/10' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <span className="text-xl lg:text-base">{item.icon}</span>
                                <span className="text-[10px] lg:text-sm font-bold uppercase tracking-wider">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
