import { emailService } from '../services/emailService';
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

export function BookingSection({ onCancel, initialBooking, onPass, onDiscard, activePicker, onShowAlert, onFinalize, startDateOverride }) {
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
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    cancelledAt: data.cancelledAt?.toDate ? data.cancelledAt.toDate() : (data.cancelledAt ? new Date(data.cancelledAt) : null)
                };
            });
            setAllDraftRecords(records);
            // Filter out 'pass' records for date blocking logic
            setBookedDates(records.filter(r => r.type !== 'pass' && r.type !== 'cancelled'));
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

    // Email service initialized in services/emailService.js

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
    let isTooShort = false; // New validation
    let isOverlap = false;
    let conflictingBooking = null;

    if (selectedRange?.from && selectedRange?.to) {
        nights = differenceInCalendarDays(selectedRange.to, selectedRange.from);

        // Prevent 0-night bookings
        if (nights < 1) {
            isTooShort = true;
        }

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
        // Prevent auto-switching the user while they are in the middle of a submission or success screen
        if (isSuccess || isSubmitting) return;

        const targetYear = 2026;
        const savedOrder = localStorage.getItem(`shareholderOrder_${targetYear}`);
        const currentOrder = savedOrder ? JSON.parse(savedOrder) : getShareholderOrder(targetYear);

        // Use Global Calculator
        const schedule = calculateDraftSchedule(currentOrder, allDraftRecords, new Date(), startDateOverride);

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

            // CHECK FOR EXISTING DRAFT (Correction Mode)
            // If the user has a booking that is NOT finalized, allow them to edit it regardless of turn order
            const myDraft = allDraftRecords.find(b => b.shareholderName === formData.shareholderName && b.isFinalized === false && b.type !== 'pass' && b.type !== 'cancelled');

            if (myDraft) {
                setBookingStatus({
                    canBook: true,
                    message: "Correction Mode: You can update your booking."
                });
                setIsDraftActive(true);
                return;
            }

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

            // Sanitize Payload
            const payload = {
                ...newBooking,
                totalPrice: nights * 125, // Add calculated price for record keeping
                guests: parseInt(formData.guests) || 1, // Ensure number
                updatedAt: new Date()
            };

            // Remove undefined values
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            // 1. Save to Firebase
            try {
                let effectiveId = initialBooking?.id || localBookingId;

                if (effectiveId) {
                    await updateDoc(doc(db, "bookings", effectiveId), payload);
                } else {
                    const docRef = await addDoc(collection(db, "bookings"), payload);
                    effectiveId = docRef.id;
                    setLocalBookingId(docRef.id);
                }

                if (finalize && onFinalize) {
                    // Logic from Dashboard.handleFinalize needs to be handled here or passed in
                    // For now, let's just trigger the callback
                    setIsFinalSuccess(true);
                    await onFinalize(effectiveId, formData.shareholderName);
                }

                if (finalize) {
                    try {
                        await emailService.sendBookingConfirmed({
                            name: formData.shareholderName,
                            email: "bryan.m.hudson@gmail.com" // OVERRIDE for safety/testing as per previous code
                        }, {
                            name: formData.shareholderName,
                            check_in: format(selectedRange.from, 'PPP'),
                            check_out: format(selectedRange.to, 'PPP'),
                            cabin_number: formData.cabinNumber || "Not specified",
                            guests: formData.guests,
                            nights: nights,
                            total_price: totalPrice,
                            dashboard_url: "https://hhr-trailer-booking.web.app/"
                        });
                        console.log('Confirmation email sent successfully');
                    } catch (error) {
                        console.error('Failed to send confirmation email:', error);
                        safeAlert(onShowAlert, "Notification Delay", "Your booking has been saved, but we encountered an issue sending the confirmation email.");
                    }
                }

                // SUCCESS HANDLER
                setIsSuccess(true);
            } catch (error) {
                console.error("Error saving booking: ", error);
                safeAlert(onShowAlert, "Save Error", `We encountered an error while saving your booking: ${error.message}`);
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
        <section id="book" className="py-2 relative">
            <div className="container mx-auto px-2">

                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold tracking-tight mb-1">
                        Book Your Stay {formData.shareholderName && <span className="text-primary">for {formData.shareholderName}</span>}
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
                        Season: <strong>March 1st - October 31st</strong>. Select check-in and check-out dates.
                    </p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 justify-center items-start">
                    {/* Calendar Column */}
                    <div className="p-3 bg-card rounded-xl shadow-md border flex flex-col items-center">
                        <div className="w-full border-b pb-2 mb-2">
                            <h3 className="text-base font-bold text-primary flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
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
                            className="p-0 border-0"
                            styles={{
                                caption: { padding: '4px 0' },
                                head_cell: { fontSize: '0.8rem', padding: '0 4px' },
                                cell: { padding: '0' },
                                day: { margin: '0', width: '32px', height: '32px', fontSize: '0.9rem' }
                            }}
                        />
                    </div>

                    <div className="p-3 bg-card rounded-xl shadow-md border w-full md:w-[400px]">
                        <div className="border-b pb-2 mb-3 flex justify-between items-center">
                            <h3 className="text-base font-bold text-primary flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                                Booking Details
                            </h3>

                        </div>

                        {isSuccess ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-50/50 border border-green-100 rounded-xl p-6 text-center">
                                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 mb-2 border-4 border-green-50">
                                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-black text-green-900 mb-1">
                                        {isFinalSuccess ? "Booking Confirmed! 🎉" : "Draft Saved!"}
                                    </h3>
                                    <p className="text-green-700/80 font-medium text-xs">
                                        {isFinalSuccess
                                            ? "Your turn is complete. See you at the lake!"
                                            : "Dates are held. Finalize on the dashboard when ready."}
                                    </p>
                                </div>

                                {/* Step 3: Payment - Only show when booking is finalized */}
                                {isFinalSuccess && (
                                    <div className="p-4 bg-card rounded-xl shadow-lg border border-blue-100">
                                        <div className="border-b pb-2 mb-3">
                                            <h3 className="text-base font-bold text-blue-600 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs">3</span>
                                                Payment Required
                                            </h3>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-600 font-medium">
                                                To lock in your cabin, please send an e-transfer within <span className="text-blue-600 font-bold">48 hours</span>:
                                            </p>

                                            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <code className="text-xs md:text-sm font-mono font-bold select-all flex-1 text-blue-700 text-center">honeymoonhavenresort.lc@gmail.com</code>
                                            </div>

                                            <div className="flex flex-col gap-2 pt-2">
                                                <button
                                                    onClick={() => onCancel()}
                                                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all shadow-md text-sm"
                                                >
                                                    Return to Dashboard
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Draft actions - Only show when NOT finalized */}
                                {!isFinalSuccess && (
                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            onClick={() => onCancel()}
                                            className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all shadow-md text-sm"
                                        >
                                            Close & Finish Later
                                        </button>
                                        <button
                                            onClick={() => setIsSuccess(false)}
                                            className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            Edit Booking Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : selectedRange?.from && selectedRange?.to ? (
                            <div className="space-y-3">
                                {isTooLong && (
                                    <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                                        Maximum stay is 7 nights. Please select a shorter range.
                                    </div>
                                )}
                                {!isSuccess && !isSubmitting && isOverlap && (
                                    <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                                        Dates unavailable.
                                        {conflictingBooking && (
                                            <span className="block text-[10px] mt-1">
                                                Conflict: {format(conflictingBooking.from, 'MMM d')} - {format(conflictingBooking.to, 'MMM d')}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {isTooShort && (
                                    <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
                                        Invalid duration. Please ensure check-out is after check-in.
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Shareholder</label>
                                        <div className="h-8 flex items-center px-1 font-bold text-sm text-foreground truncate">
                                            {formData.shareholderName || "Guest"}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cabin</label>
                                        <div className="h-8 flex items-center px-1 font-bold text-sm text-foreground">
                                            {formData.cabinNumber || "?"}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-0">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Guests</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                name="guests"
                                                min="1"
                                                max="6"
                                                value={formData.guests}
                                                onChange={handleInputChange}
                                                className="flex h-9 w-20 rounded-lg border border-input bg-background px-2 py-1 text-base font-bold shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                                disabled={isTooLong || isOverlap}
                                            />
                                            <span className="text-xs font-medium text-muted-foreground">Adults & Children</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-2 space-y-1">
                                    <div className="border-b pb-1 mb-1">
                                        <h3 className="text-base font-bold text-primary flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                                            Review
                                        </h3>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-xs">
                                        <span className="text-muted-foreground">Dates</span>
                                        <span className="font-medium">
                                            {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-xs">
                                        <span className="text-muted-foreground">Rate</span>
                                        <span className="font-medium">$125.00 / night</span>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-xs">
                                        <span className="text-muted-foreground">Duration</span>
                                        <span className="font-medium">{nights} Nights</span>
                                    </div>
                                    <div className="flex justify-between py-1 text-sm font-black border-t mt-1">
                                        <span>Total</span>
                                        <span className="text-primary">${totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 mt-4">
                                    <button
                                        onClick={() => setShowConfirmation(true)}
                                        disabled={isTooLong || isTooShort || isOverlap || !bookingStatus.canBook || isSubmitting}
                                        className={`w-full py-3 rounded-xl font-bold text-sm shadow-md transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${!bookingStatus.canBook
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
                                        disabled={isTooLong || isTooShort || isOverlap || !bookingStatus.canBook || isSubmitting}
                                        className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-4 text-center"
                                    >
                                        Save as Draft
                                    </button>
                                </div>

                                {initialBooking?.id && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => onPass && onPass()}
                                            className="w-full py-2 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-xs font-bold transition-colors border"
                                        >
                                            Pass Turn
                                        </button>
                                    </div>
                                )}

                                <p className="text-center text-[10px] text-muted-foreground mt-1 opacity-50">v2.68.37 - Compact UI</p>

                                {!bookingStatus.canBook && formData.shareholderName && (
                                    <div className="text-[10px] text-center text-amber-600 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                                        ⚠️ {bookingStatus.message}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p className="text-sm">Select a date range on the calendar.</p>
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
