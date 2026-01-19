import { emailService } from '../services/emailService';
import React, { useState, useEffect } from 'react'; // Assuming React and useEffect are needed for the change
import { format, addWeeks, addDays, differenceInCalendarDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CABIN_OWNERS, getShareholderOrder, calculateDraftSchedule, DRAFT_CONFIG } from '../lib/shareholders';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

import { ConfirmationModal } from './ConfirmationModal';
import ErrorBoundary from './ErrorBoundary';


// Helper for safely showing alerts
const safeAlert = (handler, title, msg) => {
    if (handler) handler(title, msg);
    else alert(`${title}\n\n${msg}`);
};

export function BookingSection({ onCancel, initialBooking, onPass, onDiscard, activePicker, onShowAlert, onFinalize, startDateOverride, bookings }) {
    // Parse initial booking synchronously to prevent render race conditions
    const getInitialRange = (booking) => {
        if (!booking?.from || !booking?.to) return undefined;
        try {
            const from = booking.from.toDate ? booking.from.toDate() : (booking.from instanceof Date ? booking.from : new Date(booking.from));
            const to = booking.to.toDate ? booking.to.toDate() : (booking.to instanceof Date ? booking.to : new Date(booking.to));
            if (isNaN(from.getTime()) || isNaN(to.getTime())) return undefined;
            return { from, to };
        } catch (e) {
            console.error("Error parsing initial booking range:", e);
            return undefined;
        }
    };

    const [selectedRange, setSelectedRange] = useState(() => getInitialRange(initialBooking));

    // START STEP LOGIC: If we have a valid range, start at Step 2 (Details)
    const [step, setStep] = useState(() => getInitialRange(initialBooking) ? 2 : 1);

    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFinalSuccess, setIsFinalSuccess] = useState(false);
    const [localBookingId, setLocalBookingId] = useState(null);

    // Filter out 'pass' records for date blocking logic

    const activeBookedDates = React.useMemo(() => {
        // DEBUG LOGGING
        console.group("BookingSection: activeBookedDates Recalculation");
        console.log("Raw bookings prop:", bookings);
        console.log("Initial Booking:", initialBooking);

        // Use passed bookings prop, fallback to empty array
        const records = Array.isArray(bookings) ? bookings : [];

        // ULTRA-SAFE FILTER & MAP: Ensure record exists, is object, has VALID 'from' and 'to', and convert to Date
        const validRecords = records
            .filter(r => {
                if (!r || typeof r !== 'object') return false;
                if (r.type === 'pass' || r.type === 'cancelled') return false;
                // VERBOSE DEBUG
                if (!r) { console.warn("Record is null"); return false; }
                if (!r.from) {
                    console.warn("Found booking with missing 'from':", r);
                    return false;
                }
                return true;
            })
            .map(r => {
                try {
                    return {
                        ...r,
                        from: r.from instanceof Date ? r.from : new Date(r.from),
                        to: r.to ? (r.to instanceof Date ? r.to : new Date(r.to)) : (r.from instanceof Date ? r.from : new Date(r.from))
                    };
                } catch (e) {
                    console.error("Error converting dates for record:", r, e);
                    return null;
                }
            })
            // Extra safety: Filter out any Invalid Dates that resulted from new Date()
            .filter(r => {
                const isValid = r && !isNaN(r.from?.getTime()) && !isNaN(r.to?.getTime());
                if (!isValid) console.warn("Filtered out invalid record during map:", r);
                return isValid;
            });

        const activeId = initialBooking?.id || localBookingId;
        if (activeId) {
            console.log("Filtering out active ID:", activeId);
            return validRecords.filter(b => b.id !== activeId);
        }

        console.log("Final activeBookedDates:", validRecords);
        console.groupEnd();
        return validRecords;
    }, [bookings, initialBooking, localBookingId]);

    const [formData, setFormData] = useState({
        shareholderName: activePicker || '', // Use activePicker as initial default
        cabinNumber: '',
        guests: 1,
        email: ''
    });

    // Calendar View State (Fix for stuck navigation)
    const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2)); // Default to March 2026

    // Hydrate form if editing
    useEffect(() => {
        if (initialBooking?.from && initialBooking?.to) {
            // Ensure we are working with real Dates (handle Firestore Timestamps)
            const fromDate = initialBooking.from?.toDate ? initialBooking.from.toDate() : (initialBooking.from instanceof Date ? initialBooking.from : new Date(initialBooking.from));
            const toDate = initialBooking.to?.toDate ? initialBooking.to.toDate() : (initialBooking.to instanceof Date ? initialBooking.to : new Date(initialBooking.to));

            if (!isNaN(fromDate) && !isNaN(toDate)) {
                setSelectedRange({ from: fromDate, to: toDate });
                setFormData({
                    shareholderName: initialBooking.shareholderName || activePicker || '',
                    cabinNumber: initialBooking.cabinNumber || '',
                    guests: initialBooking.guests || 1,
                    email: initialBooking.email || ''
                });
                setCurrentMonth(fromDate); // Sync calendar view
            }
        }
    }, [initialBooking, activePicker]);

    const [isDraftActive, setIsDraftActive] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); // New Success State



    // Email service initialized in services/emailService.js

    // --- CONFIGURATION ---
    const SEASON_START = new Date(2026, 2, 1); // March 1, 2026
    const SEASON_END = new Date(2026, 9, 31);  // Oct 31, 2026

    const isBooked = (day) => {
        try {
            if (!day) return false;
            // Normalize day to start of day for comparison
            const d = startOfDay(day);
            return activeBookedDates.some(range => {
                if (!range || !range.from || !range.to) return false; // Defensive check
                const start = startOfDay(range.from);
                const end = startOfDay(range.to);
                return d >= start && d <= end;
            });
        } catch (e) {
            console.error("isBooked CRASHED for day:", day, e);
            return false;
        }
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
                // Double check validity before date math
                if (!booking || !booking.from || !booking.to) return false;

                try {
                    const d = startOfDay(day);
                    const start = startOfDay(booking.from);
                    const end = startOfDay(booking.to);
                    return d >= start && d <= end;
                } catch (err) {
                    return false;
                }
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
        const schedule = calculateDraftSchedule(currentOrder, bookings || [], new Date(), startDateOverride);

        if (schedule.phase === 'OPEN_SEASON') {
            // Check Cooldown Logic
            const myBookings = (bookings || []).filter(b => b.shareholderName === formData.shareholderName && b.type !== 'pass');

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
            const myDraft = (bookings || []).find(b => b.shareholderName === formData.shareholderName && b.isFinalized === false && b.type !== 'pass' && b.type !== 'cancelled');

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
    }, [formData.shareholderName, bookings]); // Add dependencies to re-run on user change or new booking


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

    const handleContinue = () => {
        if (selectedRange?.from && selectedRange?.to && !isTooLong && !isTooShort && !isOverlap) {
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
        setIsSuccess(false);
    };

    // STRICT SAFETY for DayPicker selection
    const safeSelected = React.useMemo(() => {
        if (!selectedRange) return undefined;
        if (selectedRange.from instanceof Date && !isNaN(selectedRange.from)) {
            // Re-construct to ensure clean object
            return {
                from: selectedRange.from,
                to: (selectedRange.to instanceof Date && !isNaN(selectedRange.to)) ? selectedRange.to : undefined
            };
        }
        return undefined;
    }, [selectedRange]);

    return (
        <section id="book" className="py-2 relative flex flex-col justify-center">
            <div className="container mx-auto px-2 max-w-lg">

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black tracking-tight mb-2">
                        {step === 1 ? "Select Dates" : "Finalize Booking"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {step === 1
                            ? <span>Season: <strong>March 1st - Oct 31st</strong></span>
                            : <span>for <strong className="text-primary">{formData.shareholderName || "Guest"}</strong></span>
                        }
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="flex justify-center mb-8 gap-3">
                    <div className={`h-2 rounded-full transition-all duration-300 ${step === 1 ? "w-12 bg-primary" : "w-3 bg-slate-200"}`}></div>
                    <div className={`h-2 rounded-full transition-all duration-300 ${step === 2 ? "w-12 bg-primary" : "w-3 bg-slate-200"}`}></div>
                </div>

                <div className="flex flex-col items-center">

                    {/* STEP 1: CALENDAR */}
                    {step === 1 && (
                        <div className="w-full bg-card rounded-2xl shadow-xl border overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="p-4 bg-slate-50/50 border-b flex justify-between items-center">
                                <h3 className="font-bold text-slate-700">Calendar</h3>
                                {selectedRange?.from && selectedRange?.to && (
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                                        {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d')}
                                    </span>
                                )}
                            </div>

                            <div className="p-4 flex justify-center flex-col items-center">
                                <ErrorBoundary>
                                    <DayPicker
                                        mode="range"
                                        month={currentMonth}
                                        onMonthChange={setCurrentMonth}
                                        selected={safeSelected}
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
                                            caption: { padding: '8px 0', color: '#1e293b', fontWeight: 'bold' },
                                            head_cell: { fontSize: '0.9rem', padding: '0 8px', color: '#64748b' },
                                            cell: { padding: '0' },
                                            day: { margin: '2px', width: '40px', height: '40px', fontSize: '1rem', borderRadius: '8px' } // Larger touch targets
                                        }}
                                    />
                                </ErrorBoundary>
                            </div>

                            {/* Validation Messages for Step 1 */}
                            <div className="px-6 pb-2">
                                {isTooLong && <p className="text-center text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">Max stay is 7 nights</p>}
                                {isTooShort && <p className="text-center text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">Select check-out date</p>}
                                {isOverlap && <p className="text-center text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">Dates unavailable</p>}
                            </div>

                            <div className="p-4 border-t bg-slate-50">
                                <button
                                    onClick={handleContinue}
                                    disabled={!selectedRange?.from || !selectedRange?.to || isTooLong || isTooShort || isOverlap}
                                    className="w-full py-4 bg-primary text-primary-foreground text-lg font-bold rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    Continue
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: DETAILS */}
                    {step === 2 && (
                        <div className="w-full bg-card rounded-2xl shadow-xl border animate-in fade-in slide-in-from-right-4 duration-300">


                            <div className="p-4 space-y-4">

                                {isSuccess ? (
                                    /* SUCCESS VIEW */
                                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="bg-green-50/50 border border-green-100 rounded-xl p-8 text-center">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4 border-4 border-green-50">
                                                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-black text-green-900 mb-2">
                                                {isFinalSuccess ? "Booking Confirmed!" : "Draft Saved!"}
                                            </h3>
                                            <p className="text-green-700/80 font-medium text-sm">
                                                {isFinalSuccess
                                                    ? "Your turn is complete. See you at the lake!"
                                                    : "Dates held. Finalize on dashboard."}
                                            </p>
                                        </div>

                                        {/* Step 3: Payment - Only show when booking is finalized */}
                                        {isFinalSuccess && (
                                            <div className="p-6 bg-slate-50 rounded-xl shadow-lg border border-blue-100">
                                                <div className="border-b border-slate-200 pb-3 mb-4">
                                                    <h3 className="text-lg font-bold text-blue-600 flex items-center gap-3">
                                                        Payment Info
                                                    </h3>
                                                </div>

                                                <div className="space-y-3">
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                                        E-transfer within <span className="text-blue-600 font-bold">48 hours</span>:
                                                    </p>

                                                    <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                                        <code className="text-sm md:text-base font-mono font-bold select-all flex-1 text-blue-700 text-center">honeymoonhavenresort.lc@gmail.com</code>
                                                    </div>

                                                    <div className="flex flex-col gap-3 pt-4">
                                                        <button
                                                            onClick={() => onCancel()}
                                                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md text-base"
                                                        >
                                                            All Done
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!isFinalSuccess && (
                                            <button
                                                onClick={() => onCancel()}
                                                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                                            >
                                                Close
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    /* FORM VIEW */
                                    <>
                                        {/* Unified Details Card */}
                                        <div className="bg-slate-50/80 rounded-xl p-0 overflow-hidden border border-slate-200 shadow-sm">
                                            {/* Header Row: Back + Cabin */}
                                            <div className="flex items-center justify-between p-3 border-b border-slate-200/60 bg-white">
                                                <button onClick={handleBack} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                    Change Dates
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Cabin</span>
                                                    <span className="font-black text-slate-800 text-lg">{formData.cabinNumber || "?"}</span>
                                                </div>
                                            </div>

                                            {/* Details Body */}
                                            <div className="p-4 space-y-3">

                                                {/* Row: Dates */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-500">Dates</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-slate-900">
                                                            {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d, yyyy')}
                                                        </span>
                                                        <button
                                                            onClick={handleBack}
                                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Row: Guests (Integrated Input) */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-500">Guests</span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleInputChange({ target: { name: 'guests', value: Math.max(1, parseInt(formData.guests) - 1) } })}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300 font-bold"
                                                        >-</button>
                                                        <span className="w-4 text-center font-bold text-slate-800">{formData.guests}</span>
                                                        <button
                                                            onClick={() => handleInputChange({ target: { name: 'guests', value: Math.min(6, parseInt(formData.guests) + 1) } })}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300 font-bold"
                                                        >+</button>
                                                    </div>
                                                </div>

                                                {/* Row: Rate */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-slate-500">Rate</span>
                                                    <span className="text-sm font-bold text-slate-900">$125.00 / night</span>
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-slate-200 my-2"></div>

                                                {/* Row: Total */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-base font-bold text-slate-700">Total</span>
                                                    <span className="text-2xl font-black text-primary tracking-tight">${totalPrice.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 pt-2">
                                            <button
                                                onClick={() => setShowConfirmation(true)}
                                                disabled={!bookingStatus.canBook || isSubmitting}
                                                className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${!bookingStatus.canBook
                                                    ? "bg-slate-200 text-slate-400 shadow-none"
                                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                                    }`}
                                            >
                                                {isSubmitting
                                                    ? "Processing..."
                                                    : !bookingStatus.canBook
                                                        ? "Waiting for priority..."
                                                        : "Confirm & Finish"}
                                            </button>

                                            <button
                                                onClick={() => handleBook(false)}
                                                disabled={isSubmitting}
                                                className="text-sm font-bold text-slate-500 hover:text-primary transition-colors py-2"
                                            >
                                                Save as Draft
                                            </button>
                                        </div>

                                        {!bookingStatus.canBook && (
                                            <div className="text-xs text-center text-amber-700 font-bold bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                ⚠️ {bookingStatus.message}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

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
                message={`Are you sure you want to lock in these dates? This will officially finish your turn and notify the next shareholder.`}
                confirmText="Yes, Finalize Booking"
                requireTyping="agree"
            />
        </section>
    );
}
