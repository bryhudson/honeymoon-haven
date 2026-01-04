import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import {
    getShareholderOrder,
    calculateDraftSchedule,
} from '../lib/shareholders';

export function useBookingRealtime() {
    const [allDraftRecords, setAllDraftRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "bookings"), orderBy("from"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const records = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    from: data.from?.toDate ? data.from.toDate() : (data.from ? new Date(data.from) : null),
                    to: data.to?.toDate ? data.to.toDate() : (data.to ? new Date(data.to) : null),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
                };
            });
            setAllDraftRecords(records);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const currentOrder = getShareholderOrder(2026);
    const status = calculateDraftSchedule(currentOrder, allDraftRecords);

    return {
        allDraftRecords,
        loading,
        status,
        currentOrder
    };
}
