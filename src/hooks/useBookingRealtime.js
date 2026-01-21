import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import {
    getShareholderOrder,
    calculateDraftSchedule,
} from '../lib/shareholders';

export function useBookingRealtime() {
    const [allDraftRecords, setAllDraftRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDateOverride, setStartDateOverride] = useState(null);
    const [isSystemFrozen, setIsSystemFrozen] = useState(false);
    const [fastTestingMode, setFastTestingMode] = useState(false);

    useEffect(() => {
        // Fetch Settings
        const unsubSettings = onSnapshot(doc(db, "settings", "general"), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.draftStartDate) {
                    setStartDateOverride(data.draftStartDate.toDate ? data.draftStartDate.toDate() : new Date(data.draftStartDate));
                } else {
                    setStartDateOverride(null);
                }
                setIsSystemFrozen(data.isSystemFrozen || false);
                setFastTestingMode(data.fastTestingMode || false);
            } else {
                setStartDateOverride(null);
                setIsSystemFrozen(false);
                setFastTestingMode(false);
            }
        });

        // Fetch Bookings
        const q = query(collection(db, "bookings"), orderBy("from"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const records = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    from: data.from?.toDate ? data.from.toDate() : (data.from ? new Date(data.from) : null),
                    to: data.to?.toDate ? data.to.toDate() : (data.to ? new Date(data.to) : null),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                    cancelledAt: data.cancelledAt?.toDate ? data.cancelledAt.toDate() : (data.cancelledAt ? new Date(data.cancelledAt) : null)
                };
            });
            setAllDraftRecords(records);
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
    const status = calculateDraftSchedule(currentOrder, allDraftRecords, new Date(), startDateOverride, fastTestingMode);


    return {
        allDraftRecords,
        loading,
        status,
        currentOrder,
        startDateOverride,
        isSystemFrozen,
        fastTestingMode
    };
}
