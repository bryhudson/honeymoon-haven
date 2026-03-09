import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, doc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
    getShareholderOrder,
    calculateDraftSchedule,
    Shareholder,
    Booking,
    DraftStatus
} from '../lib/shareholders';

export interface BookingRealtimeContextValue {
    allBookings: Booking[];
    loading: boolean;
    status: DraftStatus;
    currentOrder: Shareholder[];
    startDateOverride: Date | null;
    isSystemFrozen: boolean;
    bypassTenAM: boolean;
    isTestMode: boolean;
    fastTestingMode: boolean;
}

const BookingRealtimeContext = createContext<BookingRealtimeContextValue | undefined>(undefined);

export function BookingRealtimeProvider({ children }: { children: React.ReactNode }) {
    const [allBookings, setAllBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [startDateOverride, setStartDateOverride] = useState<Date | null>(null);
    const [isSystemFrozen, setIsSystemFrozen] = useState<boolean>(false);
    const [bypassTenAM, setBypassTenAM] = useState<boolean>(false);
    const [isTestMode, setIsTestMode] = useState<boolean>(true);
    const [fastTestingMode, setFastTestingMode] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    // Track auth state - only subscribe to Firestore when authenticated
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setIsAuthenticated(!!user);
            if (!user) {
                // User logged out - clear data
                setAllBookings([]);
                setLoading(true);
            }
        });
        return () => unsubAuth();
    }, []);

    // Only start Firestore listeners AFTER authentication is confirmed
    useEffect(() => {
        if (!isAuthenticated) {
            return; // Don't subscribe until user is authenticated
        }

        console.log('[BookingRealtime] Auth confirmed - starting Firestore listeners');

        const unsubSettings = onSnapshot(doc(db, "settings", "general"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.draftStartDate) {
                    setStartDateOverride(
                        data.draftStartDate instanceof Timestamp
                            ? data.draftStartDate.toDate()
                            : new Date(data.draftStartDate)
                    );
                } else {
                    setStartDateOverride(null);
                }
                setIsSystemFrozen(data.isSystemFrozen || false);
                setBypassTenAM(data.bypassTenAM || false);
                setIsTestMode(data.isTestMode !== undefined ? data.isTestMode : true);
                setFastTestingMode(data.fastTestingMode || false);
            } else {
                setStartDateOverride(null);
                setIsSystemFrozen(false);
                setBypassTenAM(false);
                setIsTestMode(true);
                setFastTestingMode(false);
            }
        }, (error) => {
            console.error("Error fetching settings:", error);
        });

        const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
            const records = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    shareholderName: data.shareholderName,
                    from: data.from instanceof Timestamp ? data.from.toDate() : (data.from ? new Date(data.from) : null),
                    to: data.to instanceof Timestamp ? data.to.toDate() : (data.to ? new Date(data.to) : null),
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()))),
                    cancelledAt: data.cancelledAt instanceof Timestamp ? data.cancelledAt.toDate() : (data.cancelledAt ? new Date(data.cancelledAt) : null)
                } as Booking;
            });

            // Sort in memory to avoid Firestore orderBy caching bugs with local updates
            records.sort((a, b) => {
                const aTime = a.from ? a.from.getTime() : 0;
                const bTime = b.from ? b.from.getTime() : 0;
                return aTime - bTime;
            });

            setAllBookings(records);
            setLoading(false);
            console.log(`[BookingRealtime] Received ${records.length} bookings`);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setLoading(false);
        });

        return () => {
            console.log('[BookingRealtime] Cleaning up Firestore listeners');
            unsubSettings();
            unsubBookings();
        };
    }, [isAuthenticated]); // Re-subscribe when auth state changes

    const currentOrder = useMemo(() => getShareholderOrder(2026), []);

    const status = useMemo(
        () => calculateDraftSchedule(currentOrder, allBookings, new Date(), startDateOverride, bypassTenAM),
        [currentOrder, allBookings, startDateOverride, bypassTenAM]
    );

    const value = useMemo<BookingRealtimeContextValue>(() => ({
        allBookings,
        loading,
        status,
        currentOrder,
        startDateOverride,
        isSystemFrozen,
        bypassTenAM,
        isTestMode,
        fastTestingMode,
    }), [allBookings, loading, status, currentOrder, startDateOverride, isSystemFrozen, bypassTenAM, isTestMode, fastTestingMode]);

    return (
        <BookingRealtimeContext.Provider value={value}>
            {children}
        </BookingRealtimeContext.Provider>
    );
}

export function useBookingRealtimeContext(): BookingRealtimeContextValue {
    const context = useContext(BookingRealtimeContext);
    if (context === undefined) {
        throw new Error('useBookingRealtimeContext must be used within a BookingRealtimeProvider');
    }
    return context;
}
