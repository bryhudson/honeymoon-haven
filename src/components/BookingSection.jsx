import { emailService } from '../services/emailService';
import { Calendar } from 'lucide-react';
import React, { useState, useEffect } from 'react'; // Assuming React and useEffect are needed for the change
import { format, addWeeks, addDays, differenceInCalendarDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CABIN_OWNERS, getShareholderOrder, calculateDraftSchedule, DRAFT_CONFIG } from '../lib/shareholders';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

import { ConfirmationModal } from './ConfirmationModal';
import { calculateBookingCost } from '../lib/pricing';
import ErrorBoundary from './ErrorBoundary';


// Helper removed - using direct handlers


export function BookingSection({ onCancel, initialBooking, onPass, onDiscard, activePicker, onShowAlert, onFinalize, startDateOverride, bookings, status }) {
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
    const [alertData, setAlertData] = useState(null);

    // Filter out 'pass' records for date blocking logic

    const activeBookedDates = React.useMemo(() => {
        // DEBUG LOGGING


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

            return validRecords.filter(b => b.id !== activeId);
        }

        console.groupEnd();
        return validRecords;
    }, [bookings, initialBooking, localBookingId]);

    const [formData, setFormData] = useState({
        shareholderName: activePicker || '', // Use activePicker as initial default
        cabinNumber: '',
        guests: 1
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
                    guests: initialBooking.guests || 1
                });
                setCurrentMonth(fromDate); // Sync calendar view
            }
        }
    }, [initialBooking, activePicker]);

    // Auto-populate Cabin Number for new bookings
    useEffect(() => {
        if (!initialBooking && formData.shareholderName && !formData.cabinNumber) {
            const owner = CABIN_OWNERS.find(o => o.name === formData.shareholderName);
            if (owner) {

                setFormData(prev => ({ ...prev, cabinNumber: owner.cabin }));
            }
        }
    }, [formData.shareholderName, initialBooking, formData.cabinNumber]);

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
                cabinNumber: owner ? owner.cabin : '' // Auto-fill cabin if found, otherwise clear
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
    let priceDetails = null;
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

        const cost = calculateBookingCost(selectedRange.from, selectedRange.to);
        totalPrice = cost.total;
        priceDetails = cost;

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

    // Priority / Schedule Logic
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
            // SCHEDULE IS ACTIVE (Round 1 or 2)


            if (schedule.activePicker) {
                const owner = CABIN_OWNERS.find(o => o.name === schedule.activePicker);

                setFormData(prev => {
                    const newCabin = owner ? owner.cabin : '';
                    if (prev.shareholderName === schedule.activePicker && prev.cabinNumber === newCabin) return prev;
                    return {
                        ...prev,
                        shareholderName: schedule.activePicker,
                        cabinNumber: newCabin
                    };
                });

                setBookingStatus({
                    canBook: true,
                    message: schedule.isGracePeriod
                        ? `✨ Early Access: Locked to ${schedule.activePicker}`
                        : `Schedule Round Active: Locked to ${schedule.activePicker}`
                });
                setIsDraftActive(true);
            } else {
                setIsDraftActive(true);
                setBookingStatus({ canBook: false, message: 'Schedule Active: transitioning...' });
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
            if (!formData.shareholderName) {
                if (onShowAlert) onShowAlert("Missing Information", "Please ensure you have selected a shareholder.");
                else setAlertData({ title: "Missing Information", message: "Please ensure you have selected a shareholder." });
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
                totalPrice: totalPrice, // Use calculated dynamic price
                priceBreakdown: priceDetails?.breakdown || null, // Save detailed breakdown
                guests: parseInt(formData.guests) || 1, // Ensure number
                updatedAt: new Date(),
                round: status?.phase === 'ROUND_1' ? 1 : 2,
                phase: status?.phase || 'OPEN_SEASON'
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
                    // DUPLICATE EMAIL FIX:
                    // Backend `emailTriggers.js` now handles the confirmation email automatically.
                    // Frontend trigger disabled to prevent double emails (3:02 PM Issue).



                }

                // SUCCESS HANDLER
                setIsSuccess(true);
            } catch (error) {
                console.error("Error saving booking: ", error);
                if (onShowAlert) onShowAlert("Save Error", `We encountered an error while saving your booking: ${error.message}`);
                else setAlertData({ title: "Save Error", message: `We encountered an error while saving your booking: ${error.message}`, isDanger: true });
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
            <div className="container mx-auto px-0 max-w-md">

                {/* Compact Header */}
                <div className="flex items-center justify-between mb-2 px-2">
                    <div className="text-left">
                        <h2 className="text-lg font-black tracking-tight text-foreground leading-none">
                            {step === 1 ? "Select Dates" : "Finalize Booking"}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-medium mt-1">
                            {step === 1
                                ? <span className="flex items-center gap-1">Season: 2026 <span className="opacity-50">|</span> Mar 1 - Oct 31</span>
                                : <span>Guest: <strong className="text-primary">{formData.shareholderName || "Guest"}</strong></span>
                            }
                        </p>
                    </div>

                    {/* Compact Steps */}
                    <div className="flex gap-1.5">
                        <div className={`h-1.5 w-6 rounded-full transition-all ${step === 1 ? "bg-primary" : "bg-slate-200"}`}></div>
                        <div className={`h-1.5 w-6 rounded-full transition-all ${step === 2 ? "bg-primary" : "bg-slate-200"}`}></div>
                    </div>
                </div>

                <div className="flex flex-col items-center">

                    {/* STEP 1: CALENDAR */}
                    {step === 1 && (
                        <div className="w-full bg-card rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Floating Date Badge (if selected) */}
                            {selectedRange?.from && selectedRange?.to && (
                                <div className="bg-primary/5 border-b border-primary/10 p-2 text-center">
                                    <span className="text-xs font-bold text-primary flex items-center justify-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d')}
                                        <span className="opacity-50">|</span>
                                        {differenceInCalendarDays(selectedRange.to, selectedRange.from)} nights
                                    </span>
                                </div>
                            )}

                            <div className="p-0 md:p-2 flex justify-center flex-col items-center">
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

                            <div className="p-3 border-t bg-slate-50">
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
                                        <div className="bg-green-50/50 border border-green-100 rounded-xl p-5 text-center">
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-2 border-4 border-green-50">
                                                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-black text-green-900 mb-1">
                                                Booking Confirmed!
                                            </h3>
                                            <p className="text-green-700/80 font-medium text-sm">
                                                Your turn is complete. See you at the lake!
                                            </p>
                                        </div>

                                        {/* Step 3: Payment - Only show when booking is finalized */}
                                        {isFinalSuccess && (
                                            <div className="p-4 bg-slate-50 rounded-xl shadow-lg border border-blue-100">
                                                <div className="border-b border-slate-200 pb-2 mb-3">
                                                    <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2">
                                                        Maintenance Fee Info
                                                    </h3>
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                                        E-transfer within <span className="text-blue-600 font-bold">48 hours</span>:
                                                    </p>

                                                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                        <code className="text-sm md:text-base font-mono font-bold select-all flex-1 text-blue-700 text-center">honeymoonhavenresort.lc@gmail.com</code>
                                                    </div>

                                                    <div className="flex flex-col gap-2 pt-3">
                                                        <button
                                                            onClick={() => onCancel()}
                                                            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md text-base"
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
                                                {/* Row: Maintenance Fee Breakdown */}
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm font-medium text-slate-500 pt-1">Maintenance Fee Breakdown</span>
                                                    <div className="text-right space-y-1">
                                                        {/* Weeknights */}
                                                        {priceDetails?.breakdown?.weeknights > 0 && (
                                                            <div className="text-xs text-slate-700">
                                                                <span className="font-bold">{priceDetails.breakdown.weeknights}</span> Weeknight{priceDetails.breakdown.weeknights !== 1 ? 's' : ''} x $100
                                                            </div>
                                                        )}

                                                        {/* Weekends */}
                                                        {priceDetails?.breakdown?.weekends > 0 && (
                                                            <div className="text-xs text-slate-700">
                                                                <span className="font-bold">{priceDetails.breakdown.weekends}</span> Weekend{priceDetails.breakdown.weekends !== 1 ? 's' : ''} x $125
                                                            </div>
                                                        )}

                                                        {/* Discount */}
                                                        {priceDetails?.breakdown?.discount > 0 && (
                                                            <div className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded inline-block">
                                                                -${priceDetails.breakdown.discount} Weekly Discount
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Divider */}
                                                <div className="border-t border-slate-200 my-2"></div>

                                                {/* Row: Total */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-base font-bold text-slate-700">Total Fee</span>
                                                    <span className="text-2xl font-black text-primary tracking-tight">${totalPrice.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 pt-2">
                                            <button
                                                onClick={() => setShowConfirmation(true)}
                                                disabled={!bookingStatus.canBook || isSubmitting}
                                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${!bookingStatus.canBook
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

            <ConfirmationModal
                isOpen={!!alertData}
                onClose={() => setAlertData(null)}
                onConfirm={() => setAlertData(null)}
                title={alertData?.title}
                message={alertData?.message}
                isDanger={alertData?.isDanger}
                confirmText="OK"
                showCancel={false}
            />
        </section>
    );
}
