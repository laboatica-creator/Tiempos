'use client';

import React, { useState, useEffect } from 'react';

interface TimerProps {
    drawDate: string;
    drawTime: string;
    onExpire?: () => void;
}

const Timer = ({ drawDate, drawTime, onExpire }: TimerProps) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculate = () => {
            try {
                // Parseo manual para evitar 'Invalid Date'
                const datePart = drawDate.split('T')[0];
                const [y, m, d] = datePart.split('-').map(Number);
                const [h, min] = drawTime.split(':').map(Number);
                
                const drawDateTime = new Date(y, m - 1, d, h, min, 0);
                const closeTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
                const now = new Date();

                const diff = closeTime.getTime() - now.getTime();

                if (diff <= 0) {
                    setTimeLeft('CERRADO');
                    if (!isExpired) {
                        setIsExpired(true);
                        if (onExpire) onExpire();
                    }
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`);
                    setIsExpired(false);
                }
            } catch (e) {
                setTimeLeft('--:--');
            }
        };

        const interval = setInterval(calculate, 1000);
        calculate();
        return () => clearInterval(interval);
    }, [drawDate, drawTime, isExpired, onExpire]);

    return (
        <span className={`font-mono ${isExpired ? 'text-rose-500' : 'text-emerald-400 font-bold'}`}>
            {timeLeft}
        </span>
    );
};

export default Timer;
