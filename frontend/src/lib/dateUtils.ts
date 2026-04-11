/**
 * Obtiene la fecha actual en Costa Rica en formato YYYY-MM-DD
 */
export const getCurrentCostaRicaDate = (): string => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
};

/**
 * Obtiene la hora actual en Costa Rica en formato HH:MM:SS
 */
export const getCurrentCostaRicaTime = (): string => {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Costa_Rica', hour12: false });
};

/**
 * Formatea una fecha de sorteo (YYYY-MM-DD) a formato DD/MM/YYYY
 * 🔥 IMPORTANTE: NO usa new Date() para evitar conversión UTC
 */
export const formatDrawDate = (dateString: string): string => {
    if (!dateString) return '';
    
    // La fecha viene del backend como YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    
    // Fallback para otros formatos
    return dateString;
};

/**
 * Formatea fecha y hora de sorteo
 */
export const formatDrawDateTime = (dateString: string, timeString: string): string => {
    if (!dateString || !timeString) return '';
    const formattedDate = formatDrawDate(dateString);
    return `${formattedDate} ${timeString}`;
};

/**
 * Formatea fecha de transacción (ISO string) a formato local
 * Esta SÍ necesita new Date() porque viene en formato ISO
 */
export const formatTransactionDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleString('es-CR', {
            timeZone: 'America/Costa_Rica',
            dateStyle: 'short',
            timeStyle: 'short'
        });
    } catch (e) {
        return dateString;
    }
};

/**
 * Convierte una fecha ISO a formato YYYY-MM-DD (para inputs date)
 */
export const isoToYMD = (isoString: string): string => {
    if (!isoString) return '';
    return isoString.split('T')[0];
};