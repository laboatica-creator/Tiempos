'use client';

import React from 'react';

const Logo = ({ className = '', size = 'text-2xl' }: { className?: string, size?: string }) => {
    const ticaUtils = [
        { c: 'text-emerald-400', r: '-rotate-12', y: '-translate-y-1' },
        { c: 'text-yellow-400', r: 'rotate-6', y: 'translate-y-1' },
        { c: 'text-rose-400', r: '-rotate-6', y: '-translate-y-0.5' },
        { c: 'text-blue-400', r: 'rotate-12', y: 'translate-y-0.5' }
    ];
    
    const nicaUtils = [
        { c: 'text-orange-400', r: 'rotate-12', y: 'translate-y-1' },
        { c: 'text-indigo-400', r: '-rotate-6', y: '-translate-y-0.5' },
        { c: 'text-pink-400', r: 'rotate-6', y: 'translate-y-0.5' },
        { c: 'text-teal-400', r: '-rotate-12', y: '-translate-y-1' }
    ];

    return (
        <div className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-3 group cursor-default select-none ${className}`}>
            <span className={`${size === 'text-2xl' ? 'text-xl' : 'text-3xl'} font-extrabold text-white tracking-tighter uppercase italic opacity-90`}>
                Tiempos
            </span>
            <div className="flex gap-1 items-center">
                {/* TICA */}
                <div className="flex">
                    {['T', 'I', 'C', 'A'].map((l, i) => (
                        <span key={i} className={`${size} font-black ${ticaUtils[i].c} ${ticaUtils[i].r} ${ticaUtils[i].y} inline-block transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>
                            {l}
                        </span>
                    ))}
                </div>
                
                <span className="text-xs font-black text-gray-500 mx-1 self-end mb-1 lowercase">y</span>

                {/* NICA */}
                <div className="flex">
                    {['N', 'I', 'C', 'A'].map((l, i) => (
                        <span key={i} className={`${size} font-black ${nicaUtils[i].c} ${nicaUtils[i].r} ${nicaUtils[i].y} inline-block transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>
                            {l}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Logo;
