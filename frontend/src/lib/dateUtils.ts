export const getCurrentCostaRicaTime = (): string => {
    return new Date().toLocaleTimeString('es-CR', { 
        timeZone: 'America/Costa_Rica',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

export const formatDrawDate = (dateString: string): string => {
    if (!dateString) return '';
    // La fecha viene como YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateString;
};

export const formatDrawDateTime = (dateString: string, timeString: string): string => {
    if (!dateString || !timeString) return '';
    const formattedDate = formatDrawDate(dateString);
    return `${formattedDate} ${timeString}`;
};