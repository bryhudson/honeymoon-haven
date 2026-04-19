import { isSameDay, isWithinInterval, startOfDay } from 'date-fns';

export interface Holiday {
    date: Date;
    name: string;
}

export interface SeasonEvent {
    name: string;
    subtitle?: string;
    from: Date;
    to: Date;
    location: string;
    color: string;
}

// 2026 Canadian Statutory Holidays (BC) within the May-September season
export const CANADIAN_HOLIDAYS_2026: Holiday[] = [
    { date: new Date(2026, 4, 18), name: 'Victoria Day' },
    { date: new Date(2026, 6, 1),  name: 'Canada Day 🇨🇦' },
    { date: new Date(2026, 7, 3),  name: 'BC Day' },
    { date: new Date(2026, 8, 7),  name: 'Labour Day' },
    { date: new Date(2026, 8, 30), name: 'National Day for Truth & Reconciliation' },
];

// 2026 Summer Festivals & Events in the Cowichan Valley
export const SUMMER_EVENTS_2026: SeasonEvent[] = [
    {
        name: 'Cowichan Valley Bluegrass Festival',
        subtitle: '25th Anniversary!',
        from: new Date(2026, 5, 19),
        to: new Date(2026, 5, 21),
        location: 'Laketown Ranch',
        color: 'purple',
    },
    {
        name: 'Sunfest Country Music Festival',
        from: new Date(2026, 6, 30),
        to: new Date(2026, 7, 2),
        location: 'Laketown Ranch',
        color: 'purple',
    },
];

export function getHolidayForDate(date: Date): Holiday | undefined {
    return CANADIAN_HOLIDAYS_2026.find(h => isSameDay(h.date, date));
}

export function getEventsForDate(date: Date): SeasonEvent[] {
    return SUMMER_EVENTS_2026.filter(e =>
        isWithinInterval(startOfDay(date), { start: startOfDay(e.from), end: startOfDay(e.to) })
    );
}

export function isHoliday(date: Date): boolean {
    return !!getHolidayForDate(date);
}

export function isEventDay(date: Date): boolean {
    return getEventsForDate(date).length > 0;
}
