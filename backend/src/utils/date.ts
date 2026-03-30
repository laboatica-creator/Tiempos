export const getCRDateString = (dateObj = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Costa_Rica',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(dateObj); // Returns YYYY-MM-DD
};

export const getCRTimeString = (dateObj = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Costa_Rica',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(dateObj); // Returns HH:MM:SS
};
