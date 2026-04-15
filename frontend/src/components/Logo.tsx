'use client';

import React from 'react';

const Logo = ({ className = '', size = 'text-2xl', showSub = true }: { className?: string, size?: string, showSub?: boolean }) => {
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

    // Determinar tamaño de "PRO" relativo al tamaño principal
    const proSize = size === 'text-2xl' ? 'text-lg' : 'text-2xl';

    return (
        <div className={`flex flex-col items-center group cursor-default select-none ${className}`}>
            {/* TIEMPOS PRO */}
            <div className="flex items-center gap-1">
                <span className={`${size} font-black text-white tracking-tighter uppercase italic opacity-95 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] transition-all`}>
                    Tiempos
                </span>
                <span 
                    className={`${proSize} font-black text-[#ef4444] uppercase italic tracking-tighter`}
                    style={{ 
                        transform: 'rotate(-8deg) translateY(-4px)',
                        textShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
                    }}
                >
                    Pro
                </span>
            </div>

            {/* TICA y NICA (Debajo) */}
            {showSub && (
                <div className="flex gap-1 items-center mt-[-4px]">
                    {/* TICA */}
                    <div className="flex">
                        {['T', 'I', 'C', 'A'].map((l, i) => (
                            <span key={i} className={`text-sm font-black ${ticaUtils[i].c} ${ticaUtils[i].r} ${ticaUtils[i].y} inline-block transition-all duration-300 group-hover:scale-110`}>
                                {l}
                            </span>
                        ))}
                    </div>
                    
                    <span className="text-[10px] font-black text-gray-500 mx-1 uppercase opacity-40">y</span>

                    {/* NICA */}
                    <div className="flex">
                        {['N', 'I', 'C', 'A'].map((l, i) => (
                            <span key={i} className={`text-sm font-black ${nicaUtils[i].c} ${nicaUtils[i].r} ${nicaUtils[i].y} inline-block transition-all duration-300 group-hover:scale-110`}>
                                {l}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logo;
