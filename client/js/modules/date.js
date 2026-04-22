export function getMonday(inputDate) {
    const date = new Date(inputDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatMonthDay(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function getWeekDates(monday) {
    const dates = [];
    for (let index = 0; index < 7; index += 1) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        dates.push(date);
    }
    return dates;
}

export function getWeekNumber(date) {
    const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}
