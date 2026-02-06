import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, Timestamp } from 'firebase/firestore';
import {
    getShareholderOrder,
    calculateDraftSchedule,
    Shareholder,
    Booking,
    DraftStatus
} from '../lib/shareholders';

export interface BookingRealtimeHook {
    allBookings: Booking[];
    loading: boolean;
    status: DraftStatus;
    currentOrder: Shareholder[];
    startDateOverride: Date | null;
    isSystemFrozen: boolean;
    bypassTenAM: boolean;
}

export function useBookingRealtime(): BookingRealtimeHook {
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [startDateOverride, setStartDateOverride] = useState<Date | null>(null);
    const [isSystemFrozen, setIsSystemFrozen] = useState<boolean>(false);
    const [bypassTenAM, setBypassTenAM] = useState<boolean>(false);

    useEffect(() => {
        // Fetch Settings
        const unsubSettings = onSnapshot(doc(db, "settings", "general"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.draftStartDate) {
                    setStartDateOverride(data.draftStartDate instanceof Timestamp ? data.draftStartDate.toDate() : new Date(data.draftStartDate));
                } else {
                    setStartDateOverride(null);
                }
                setIsSystemFrozen(data.isSystemFrozen || false);
                setBypassTenAM(data.bypassTenAM || false);
            } else {
                setStartDateOverride(null);
                setIsSystemFrozen(false);
                setBypassTenAM(false);
            }
        });

        // Fetch Bookings
        const q = query(collection(db, "bookings"), orderBy("from"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const records: Booking[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    shareholderName: data.shareholderName,
                    from: data.from instanceof Timestamp ? data.from.toDate() : (data.from ? new Date(data.from) : null),
                    to: data.to instanceof Timestamp ? data.to.toDate() : (data.to ? new Date(data.to) : null),
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                    cancelledAt: data.cancelledAt instanceof Timestamp ? data.cancelledAt.toDate() : (data.cancelledAt ? new Date(data.cancelledAt) : null)
                } as Booking;
            });
            setAllBookings(records);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setLoading(false);
        });

        return () => {
            unsubscribe();
            unsubSettings();
        };
    }, []);

    const currentOrder = getShareholderOrder(2026);
    // Use simulation start date from settings
    const status = calculateDraftSchedule(currentOrder, allBookings, new Date(), startDateOverride, bypassTenAM);

    return {
        allBookings,
        loading,
        status,
        currentOrder,
        startDateOverride,
        isSystemFrozen,
        bypassTenAM
    };
}
