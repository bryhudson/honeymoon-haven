import emailjs from '@emailjs/browser';
import React, { useState, useEffect } from 'react'; // Assuming React and useEffect are needed for the change
import { format, addWeeks, addDays, differenceInCalendarDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { CABIN_OWNERS, getShareholderOrder, calculateDraftSchedule, DRAFT_CONFIG } from '../lib/shareholders';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

import { ConfirmationModal } from './ConfirmationModal';


// Helper for safely showing alerts
const safeAlert = (handler, title, msg) => {
    if (handler) handler(title, msg);
    else alert(`${title}\n\n${msg}`);
};

export function BookingSection({ onCancel, initialBooking, onPass, onDiscard, activePicker, onShowAlert, onFinalize }) {
    const [selectedRange, setSelectedRange] = useState();
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalSuccess, setIsFinalSuccess] = useState(false);

    // Initialize bookedDates from localStorage
    const [allDraftRecords, setAllDraftRecords] = useState([]);
    const [bookedDates, setBookedDates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load Bookings from Firestore Real-time
    useEffect(() => {
        const q = query(collection(db, "bookings"), orderBy("from"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const records = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Firestore Timestamps to JS Dates
                    from: data.from?.toDate ? data.from.toDate() : (data.from ? new Date(data.from) : null),
                    to: data.to?.toDate ? data.to.toDate() : (data.to ? new Date(data.to) : null),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
                };
            });
            setAllDraftRecords(records);
            // Filter out 'pass' records for date blocking logic
            setBookedDates(records.filter(r => r.type !== 'pass'));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const [localBookingId, setLocalBookingId] = useState(null);

    // Filter out the current booking if we are editing (so we don't conflict with ourselves)
    const activeBookedDates = React.useMemo(() => {
        const activeId = initialBooking?.id || localBookingId;
        console.log("Active Booking ID for exclusion:", activeId); // Debug
        if (activeId) {
            return bookedDates.filter(b => b.id !== activeId);
        }
        return bookedDates;
    }, [bookedDates, initialBooking, localBookingId]);

    const [formData, setFormData] = useState({
        shareholderName: activePicker || '', // Use activePicker as initial default
        cabinNumber: '',
        guests: 1,
        email: ''
    });

    // Hydrate form if editing
    useEffect(() => {
        if (initialBooking) {
            setSelectedRange({ from: initialBooking.from, to: initialBooking.to });
            setFormData({
                shareholderName: initialBooking.shareholderName || activePicker || '',
                cabinNumber: initialBooking.cabinNumber || '',
                guests: initialBooking.guests || 1,
                email: initialBooking.email || ''
            });
        }
    }, [initialBooking, activePicker]);

    const [isDraftActive, setIsDraftActive] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); // New Success State

    // REPLACE WITH YOUR EMAILJS KEYS
    // REPLACE WITH YOUR EMAILJS KEYS
    const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    // --- CONFIGURATION ---
    const SEASON_START = new Date(2026, 2, 1); // March 1, 2026
    const SEASON_END = new Date(2026, 9, 31);  // Oct 31, 2026

    const isBooked = (day) => {
        // Normalize day to start of day for comparison
        const d = startOfDay(day);
        return activeBookedDates.some(range => {
            const start = startOfDay(range.from);
            const end = startOfDay(range.to);
            return d >= start && d <= end;
        });
    };

    const isOutsideSeason = (day) => {
        return day < SEASON_START || day > SEASON_END;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Auto-fill logic
        if (name === 'shareholderName') {
            const owner = CABIN_OWNERS.find(o => o.name === value);
            setFormData(prev => ({
                ...prev,
                shareholderName: value,
                cabinNumber: owner ? owner.cabin : '', // Auto-fill cabin if found, otherwise clear
                email: owner ? owner.email : prev.email // Auto-fill email
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    let nights = 0;
    let totalPrice = 0;
    let isTooLong = false;
    let isOverlap = false;
    let conflictingBooking = null;

    if (selectedRange?.from && selectedRange?.to) {
        nights = differenceInCalendarDays(selectedRange.to, selectedRange.from);
        totalPrice = nights * 125;

        // Check for max stay
        if (nights > 7) {
            isTooLong = true;
        }

        // Check for overlaps with existing bookings
        const interval = eachDayOfInterval({ start: selectedRange.from, end: selectedRange.to });

        // Find the specific booking that conflicts
        conflictingBooking = activeBookedDates.find(booking =>
            interval.some(day => {
                const d = startOfDay(day);
                const start = startOfDay(booking.from);
                const end = startOfDay(booking.to);
                return d >= start && d <= end;
            })
        );

        if (conflictingBooking) {
            isOverlap = true;
        }
    }

    // Priority / Draft Logic
    const [bookingStatus, setBookingStatus] = useState({ canBook: true, message: '' });

    useEffect(() => {
        const targetYear = 2026;
        const savedOrder = localStorage.getItem(`shareholderOrder_${targetYear}`);
        const currentOrder = savedOrder ? JSON.parse(savedOrder) : getShareholderOrder(targetYear);

        // Use Global Calculator
        const schedule = calculateDraftSchedule(currentOrder, allDraftRecords);

        if (schedule.phase === 'OPEN_SEASON') {
            // Check Cooldown Logic
            const myBookings = allDraftRecords.filter(b => b.shareholderName === formData.shareholderName && b.type !== 'pass');

            if (myBookings.length > 0 && formData.shareholderName) {
                // Sort by creation time (descending)
                const lastBooking = myBookings.sort((a, b) => b.createdAt - a.createdAt)[0];

                // If booked within last 48 hours
                const hoursSinceBooking = (new Date() - lastBooking.createdAt) / (1000 * 60 * 60);

                if (hoursSinceBooking < 48) {
                    setIsDraftActive(false); // Dropdown still unlocked
                    setBookingStatus({
                        canBook: false,
                        message: `Cooldown Active: You must wait 48 hours after your last booking. (${Math.round(48 - hoursSinceBooking)}h remaining)`
                    });
                    return;
                }
            }

            setIsDraftActive(false);
            setBookingStatus({ canBook: true, message: 'Open Season! First come, first serve.' });
        } else if (schedule.phase === 'PRE_DRAFT') {
            setIsDraftActive(true);
            setBookingStatus({ canBook: false, message: `Booking schedule begins on ${format(schedule.draftStart, 'PPP')}` });
        } else {
            // DRAFT IS ACTIVE (Round 1 or 2)
            if (schedule.activePicker) {
                const owner = CABIN_OWNERS.find(o => o.name === schedule.activePicker);

                setFormData(prev => {
                    const newCabin = owner ? owner.cabin : '';
                    const newEmail = owner ? owner.email : '';
                    if (prev.shareholderName === schedule.activePicker && prev.cabinNumber === newCabin && prev.email === newEmail) return prev;
                    return {
                        ...prev,
                        shareholderName: schedule.activePicker,
                        cabinNumber: newCabin,
                        email: newEmail
                    };
                });

                setBookingStatus({
                    canBook: true,
                    message: schedule.isGracePeriod
                        ? `✨ Early Access: Locked to ${schedule.activePicker}`
                        : `Draft Round Active: Locked to ${schedule.activePicker}`
                });
                setIsDraftActive(true);
            } else {
                setIsDraftActive(true);
                setBookingStatus({ canBook: false, message: 'Draft Active: transitioning...' });
            }
        }
    }, [formData.shareholderName, bookedDates]); // Add dependencies to re-run on user change or new booking


    const handleSelectRange = (range) => {
        setIsSuccess(false);
        setSelectedRange(range);
    };

    const handleBook = async (finalize = false) => {
        if (selectedRange?.from && selectedRange?.to) {
            if (isTooLong || isOverlap || !bookingStatus.canBook) {
                return;
            }
            if (!formData.shareholderName || !formData.email) {
                safeAlert(onShowAlert, "Missing Information", "Please ensure you have selected a shareholder and provided an email address.");
                return;
            }

            // Email is now optional or handled via login context, removing manual validation

            setIsSubmitting(true);
            const newBooking = {
                ...selectedRange,
                ...formData,
                isFinalized: finalize,
                createdAt: new Date() // Track when it was booked
            };

            // 1. Save to Firebase
            try {
                let effectiveId = initialBooking?.id || localBookingId;

                if (effectiveId) {
                    await updateDoc(doc(db, "bookings", effectiveId), {
                        ...newBooking,
                        createdAt: initialBooking?.createdAt || new Date()
                    });
                } else {
                    const docRef = await addDoc(collection(db, "bookings"), {
                        ...newBooking,
                        createdAt: new Date()
                    });
                    effectiveId = docRef.id;
                    setLocalBookingId(docRef.id);
                }

                if (finalize && onFinalize) {
                    // Logic from Dashboard.handleFinalize needs to be handled here or passed in
                    // For now, let's just trigger the callback
                    setIsFinalSuccess(true);
                    await onFinalize(effectiveId, formData.shareholderName);
                }

                // 2. Send Email using EmailJS
                const templateParams = {
                    // Match the variables in the user's "Auto-Reply" template
                    email: "bryan.m.hudson@gmail.com", // OVERRIDE: formData.email,
                    name: formData.shareholderName, // Greeting the shareholder
                    title: `Cabin ${formData.cabinNumber || "?"} Booking: ${format(selectedRange.from, 'MMM d')} - ${format(selectedRange.to, 'MMM d')}`,

                    // Extra data
                    shareholder_name: formData.shareholderName,
                    cabin_number: formData.cabinNumber || "Not specified",
                    check_in: format(selectedRange.from, 'PPP'),
                    check_out: format(selectedRange.to, 'PPP'),
                    guests: formData.guests,
                    total_price: totalPrice,
                    message: finalize
                        ? "Your booking has been finalized. See you at the lake!"
                        : "Your draft has been saved. Please finalize it on the dashboard to lock in your dates."
                };

                emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
                    .then((response) => {
                        console.log('EMAIL SUCCESS!', response.status, response.text);
                    }, (err) => {
                        console.log('EMAIL FAILED...', err);
                        safeAlert(onShowAlert, "Notification Delay", "Your booking has been saved, but we encountered an issue sending the confirmation email.");
                    });

                // SUCCESS HANDLER
                setIsSuccess(true);
            } catch (error) {
                console.error("Error saving booking: ", error);
                safeAlert(onShowAlert, "Save Error", "We encountered an error while saving your booking. Please check your connection and try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleReset = () => {
        setSelectedRange(undefined);
        setIsSuccess(false);
    };

    return (
        <section id="book" className="py-6 relative">
            <div className="container mx-auto px-4">

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">
                        Book Your Stay {formData.shareholderName && <span className="text-primary">for {formData.shareholderName}</span>}
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                        Season: <strong>March 1st - October 31st</strong>. <br />
                        Select your check-in and check-out dates.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
                    {/* Calendar Column */}
                    <div className="p-4 bg-card rounded-xl shadow-md border flex flex-col items-center">
                        <div className="w-full border-b pb-3 mb-3">
                            <h3 className="text-lg font-bold text-primary flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                                Select Dates
                            </h3>
                        </div>
                        <DayPicker
                            mode="range"
                            defaultMonth={new Date(2026, 2)}
                            selected={selectedRange}
                            onSelect={handleSelectRange}
                            numberOfMonths={1}
                            pagedNavigation
                            disabled={date => isBooked(date) || isOutsideSeason(date)}
                            modifiers={{
                                booked: isBooked,
                                outsideSeason: isOutsideSeason
                            }}
                            modifiersStyles={{
                                booked: { textDecoration: 'line-through', color: 'gray' },
                                outsideSeason: { opacity: 0.5 }
                            }}
                            className="p-4"
                        />
                    </div>

                    <div className="p-5 bg-card rounded-xl shadow-md border w-full md:w-[440px]">
                        <div className="border-b pb-3 mb-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-primary flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                                Booking Details
                            </h3>
                            <button
                                onClick={handleReset}
                                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-muted-foreground/30"
                            >
                                Reset
                            </button>
                        </div>

                        {isSuccess ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-50/50 border border-green-100 rounded-xl p-8 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-4 border-4 border-green-50">
                                        <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-black text-green-900 mb-1">
                                        {isFinalSuccess ? "Booking Confirmed! 🎉" : "Draft Saved!"}
                                    </h3>
                                    <p className="text-green-700/80 font-medium text-sm">
                                        {isFinalSuccess
                                            ? "Your turn is complete. See you at the lake!"
                                            : "Dates are held. Finalize on the dashboard when ready."}
                                    </p>
                                </div>

                                {/* Step 3: Payment */}
                                <div className="p-6 bg-card rounded-xl shadow-lg border border-blue-100">
                                    <div className="border-b pb-4 mb-6">
                                        <h3 className="text-lg font-bold text-blue-600 flex items-center gap-3">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm">3</span>
                                            Payment Required
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-600 font-medium">
                                            To lock in your cabin, please send an e-transfer within <span className="text-blue-600 font-bold">24 hours</span>:
                                        </p>

                                        <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <code className="text-sm md:text-base font-mono font-bold select-all flex-1 text-blue-700">honeymoonhavenresort.lc@gmail.com</code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText('honeymoonhavenresort.lc@gmail.com');
                                                }}
                                                className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                                                title="Copy Email"
                                            >
                                                📋
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-6">
                                            <button
                                                onClick={() => onCancel()}
                                                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md transform hover:scale-[1.01]"
                                            >
                                                {isFinalSuccess ? "Return to Dashboard" : "Close & Finish Later"}
                                            </button>
                                            {!isFinalSuccess && (
                                                <button
                                                    onClick={() => setIsSuccess(false)}
                                                    className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    Edit Booking Details
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : selectedRange?.from && selectedRange?.to ? (
                            <div className="space-y-4">
                                {isTooLong && (
                                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                                        Maximum stay is 7 nights. Please select a shorter range.
                                    </div>
                                )}
                                {!isSuccess && isOverlap && (
                                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                                        Dates unavailable.
                                        {conflictingBooking && (
                                            <span className="block text-xs mt-1">
                                                Conflict: {format(conflictingBooking.from, 'MMM d')} - {format(conflictingBooking.to, 'MMM d')}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shareholder</label>
                                        <div className="h-10 flex items-center px-1 font-bold text-lg text-foreground">
                                            {formData.shareholderName || "Guest"}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cabin</label>
                                        <div className="h-10 flex items-center px-1 font-bold text-lg text-foreground">
                                            {formData.cabinNumber || "?"}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Number of Guests</label>
                                        <div className="flex gap-3 items-center">
                                            <input
                                                type="number"
                                                name="guests"
                                                min="1"
                                                max="6"
                                                value={formData.guests}
                                                onChange={handleInputChange}
                                                className="flex h-11 w-24 rounded-xl border border-input bg-background px-3 py-2 text-lg font-bold shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                disabled={isTooLong || isOverlap}
                                            />
                                            <span className="text-sm font-medium text-muted-foreground">Adults & Children</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4 space-y-3">
                                    <div className="border-b pb-3">
                                        <h3 className="text-lg font-bold text-primary flex items-center gap-3">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                                            Review & Confirm
                                        </h3>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-sm">
                                        <span className="text-muted-foreground">Dates</span>
                                        <span className="font-medium">
                                            {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-sm">
                                        <span className="text-muted-foreground">Rate</span>
                                        <span className="font-medium">$125.00 / night</span>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-sm">
                                        <span className="text-muted-foreground">Duration</span>
                                        <span className="font-medium">{nights} Nights</span>
                                    </div>
                                    <div className="flex justify-between py-2 text-xl font-black border-t mt-1">
                                        <span>Total Maintenance Fee</span>
                                        <span className="text-primary">${totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 mt-6">
                                    <button
                                        onClick={() => setShowConfirmation(true)}
                                        disabled={isTooLong || isOverlap || !bookingStatus.canBook || isSubmitting}
                                        className={`w-full py-5 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${!bookingStatus.canBook
                                            ? "bg-slate-300 text-slate-500"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                                            }`}
                                    >
                                        {isSubmitting
                                            ? "Processing..."
                                            : !bookingStatus.canBook
                                                ? "Waiting for priority..."
                                                : "Confirm & Finish Turn"}
                                    </button>

                                    <button
                                        onClick={() => handleBook(false)}
                                        disabled={isTooLong || isOverlap || !bookingStatus.canBook || isSubmitting}
                                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
                                    >
                                        I'm not sure yet, just save as Draft
                                    </button>
                                </div>

                                {initialBooking?.id && (
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            onClick={() => onDiscard && onDiscard(initialBooking.id)}
                                            className="flex-1 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Cancel Booking (Delete)
                                        </button>
                                        <button
                                            onClick={() => onPass && onPass()}
                                            className="flex-1 py-1.5 bg-muted text-foreground hover:bg-muted/80 rounded-md text-sm font-medium transition-colors border"
                                        >
                                            Pass Turn
                                        </button>
                                    </div>
                                )}

                                <p className="text-center text-xs text-muted-foreground mt-2">v2.26 - Success Msg Clarified</p>

                                {!bookingStatus.canBook && formData.shareholderName && (
                                    <div className="text-xs text-center text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                                        ⚠️ {bookingStatus.message}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>Select a date range on the calendar to see pricing and availability.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                onConfirm={() => {
                    setShowConfirmation(false);
                    handleBook(true);
                }}
                title="Finalize Booking?"
                message={`Are you sure you want to lock in these dates? This will officially finish your turn and notify the next shareholder.${(selectedRange?.from && selectedRange?.to) ? `\n\nDates: ${format(selectedRange.from, 'MMM d')} - ${format(selectedRange.to, 'MMM d, yyyy')}` : ''}`}
                confirmText="Yes, Finalize Booking"
            />
        </section >
    );
}
