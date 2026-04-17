'use client';

import React, { useState, useEffect } from 'react';
import { getTimeUntilClose } from '@/lib/drawUtils';

interface TimerProps {
    drawTime: string;
    drawDate: string;
    isOpen: boolean;
    onExpire?: () => void;
}

export default function Timer({ drawTime, drawDate, isOpen, onExpire }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');

    useEffect(() => {
        if (!isOpen) {
            setTimeLeft('');
            if (onExpire) onExpire();
            return;
        }

        const updateTimer = () => {
            const remaining = getTimeUntilClose(drawDate, drawTime);
            if (remaining === 'CERRADO') {
                if (onExpire) onExpire();
                setTimeLeft('');
            } else {
                setTimeLeft(remaining);
            }
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [drawTime, drawDate, isOpen, onExpire]);
    
    if (!isOpen) {
        return <span className="text-red-500 font-bold text-xs">🔒 CERRADO</span>;
    }
    
    if (!timeLeft) {
        return <span className="text-emerald-400 font-mono text-xs">⏱️ --</span>;
    }
    
    return <span className="text-emerald-400 font-mono text-xs">⏱️ {timeLeft}</span>;
}