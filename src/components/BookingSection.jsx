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

                    <div className="p-5 md:p-6 bg-card rounded-xl shadow-md border w-full md:w-[450px]">
                        <div className="border-b pb-4 mb-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-primary flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                                Booking Details
                            </h3>
                        </div>

                        {isSuccess ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-50/50 border border-green-100 rounded-xl p-8 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4 border-4 border-green-50">
                                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-black text-green-900 mb-2">
                                        {isFinalSuccess ? "Booking Confirmed! 🎉" : "Draft Saved!"}
                                    </h3>
                                    <p className="text-green-700/80 font-medium text-sm">
                                        {isFinalSuccess
                                            ? "Your turn is complete. See you at the lake!"
                                            : "Dates are held. Finalize on the dashboard when ready."}
                                    </p>
                                </div>

                                {/* Step 3: Payment - Only show when booking is finalized */}
                                {isFinalSuccess && (
                                    <div className="p-6 bg-slate-50 rounded-xl shadow-lg border border-blue-100">
                                        <div className="border-b border-slate-200 pb-3 mb-4">
                                            <h3 className="text-lg font-bold text-blue-600 flex items-center gap-3">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">3</span>
                                                Payment Required
                                            </h3>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                                To lock in your cabin, please send an e-transfer within <span className="text-blue-600 font-bold">48 hours</span>:
                                            </p>

                                            <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                <code className="text-sm md:text-base font-mono font-bold select-all flex-1 text-blue-700 text-center">honeymoonhavenresort.lc@gmail.com</code>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-4">
                                                <button
                                                    onClick={() => onCancel()}
                                                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md text-base"
                                                >
                                                    Return to Dashboard
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Draft actions - Only show when NOT finalized */}
                                {!isFinalSuccess && (
                                    <div className="flex flex-col gap-3 pt-2">
                                        <button
                                            onClick={() => onCancel()}
                                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md text-base"
                                        >
                                            Close & Finish Later
                                        </button>
                                        <button
                                            onClick={() => setIsSuccess(false)}
                                            className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors py-2"
                                        >
                                            Edit Booking Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : selectedRange?.from && selectedRange?.to ? (
                            <div className="space-y-6">
                                {isTooLong && (
                                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-bold flex items-center gap-2">
                                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Maximum stay is 7 nights.
                                    </div>
                                )}
                                {!isSuccess && !isSubmitting && isOverlap && (
                                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
                                        Dates unavailable.
                                        {conflictingBooking && (
                                            <span className="block text-xs font-normal mt-1 opacity-80">
                                                Conflict: {format(conflictingBooking.from, 'MMM d')} - {format(conflictingBooking.to, 'MMM d')}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {isTooShort && (
                                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-bold">
                                        Invalid duration. Check-out must be after check-in.
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shareholder</label>
                                        <div className="min-h-[44px] flex items-center px-3 bg-slate-50/50 rounded-lg border border-slate-200 font-bold text-base text-slate-800 truncate">
                                            {formData.shareholderName || "Guest"}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cabin</label>
                                        <div className="min-h-[44px] flex items-center px-3 bg-slate-50/50 rounded-lg border border-slate-200 font-bold text-base text-slate-800">
                                            {formData.cabinNumber || "?"}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Guests</label>
                                        <div className="flex gap-3 items-center">
                                            <input
                                                type="number"
                                                name="guests"
                                                min="1"
                                                max="6"
                                                value={formData.guests}
                                                onChange={handleInputChange}
                                                className="flex h-12 w-24 rounded-lg border border-slate-300 bg-white px-3 text-lg font-bold shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all text-center"
                                                disabled={isTooLong || isOverlap}
                                            />
                                            <span className="text-sm font-bold text-slate-600">Adults & Children</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Modern Review Section */}
                                <div className="mt-6 bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                                    <div className="border-b border-slate-200 pb-2 mb-2">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">3</span>
                                            Review Summary
                                        </h3>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm font-medium text-slate-500">Dates</span>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-slate-900">
                                                    {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-500">Rate</span>
                                            <span className="text-sm font-bold text-slate-900">$125.00 / night</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-500">Duration</span>
                                            <span className="text-sm font-bold text-slate-900">{nights} Nights</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-2">
                                        <span className="text-base font-bold text-slate-700">Total</span>
                                        <span className="text-2xl font-black text-primary tracking-tight">${totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 mt-6 pt-2">
                                    <button
                                        onClick={() => setShowConfirmation(true)}
                                        disabled={isTooLong || isTooShort || isOverlap || !bookingStatus.canBook || isSubmitting}
                                        className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${!bookingStatus.canBook
                                            ? "bg-slate-200 text-slate-400 shadow-none"
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
                                        className="text-sm font-bold text-slate-500 hover:text-primary transition-colors py-2"
                                    >
                                        Save as Draft
                                    </button>
                                </div>

                                {initialBooking?.id && (
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => onPass && onPass()}
                                            className="w-full py-3 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-sm font-bold transition-all border border-slate-200"
                                        >
                                            Pass Turn
                                        </button>
                                    </div>
                                )}

                                <p className="text-center text-[10px] text-slate-400 mt-2">v2.68.127 - Enhanced UI</p>

                                {!bookingStatus.canBook && formData.shareholderName && (
                                    <div className="text-xs text-center text-amber-700 font-bold bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        {bookingStatus.message}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 flex flex-col items-center justify-center h-full text-muted-foreground bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-slate-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <p className="text-sm font-medium">Select dates to begin</p>
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
