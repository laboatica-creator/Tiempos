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
        const calculateTime = () => {
            try {
                const [year, month, day] = drawDate.split('-').map(Number);
                const [hour, minute] = drawTime.split(':').map(Number);
                
                const drawDateTime = new Date(year, month - 1, day, hour, minute, 0);
                const closeTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000); // 20 min antes
                const now = new Date();

                const diff = closeTime.getTime() - now.getTime();

                if (diff <= 0) {
                    setTimeLeft('CERRADO');
                    if (!isExpired) {
                        setIsExpired(true);
                        if (onExpire) onExpire();
                    }
                    return;
                }

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`);
            } catch (e) {
                setTimeLeft('--:--');
            }
        };

        const timer = setInterval(calculateTime, 1000);
        calculateTime();

        return () => clearInterval(timer);
    }, [drawDate, drawTime, isExpired, onExpire]);

    return (
        <span className={`font-mono ${isExpired ? 'text-rose-500' : 'text-emerald-400'}`}>
            {timeLeft}
        </span>
    );
};

export default Timer;
