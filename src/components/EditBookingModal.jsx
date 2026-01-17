import React, { useState, useEffect } from 'react';
import { format, startOfDay } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { CABIN_OWNERS } from '../lib/shareholders';

export function EditBookingModal({ isOpen, onClose, onSave, booking, allBookings = [] }) {
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        shareholderName: '',
        cabinNumber: '',
        from: '',
        to: '',
        guests: 1,
        isFinalized: false
    });


    // Validation Effect
    useEffect(() => {
        if (formData.from && formData.to && allBookings.length > 0) {
            checkAvailability(formData.from, formData.to);
        } else {
            setError(null);
        }
    }, [formData.from, formData.to, allBookings]);

    const checkAvailability = (startStr, endStr) => {
        if (!startStr || !endStr) return;

        // Create standard dates for comparison (noon to avoid TZ issues)
        const createCheckDate = (ds) => {
            const [y, m, d] = ds.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        };

        const start = createCheckDate(startStr);
        const end = createCheckDate(endStr);

        // Basic sanity check
        if (start >= end) {
            setError("Check-out date must be after Check-in date (minimum 1 night).");
            return;
        }

        // Duration Check
        const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (nights > 7) {
            setError(`Booking duration (${nights} nights) exceeds the maximum limit of 7 nights.`);
            return;
        }

        // Overlap Check
        const currentId = booking ? booking.id : null;

        // Find conflicting booking
        const conflict = allBookings.find(b => {
            // Skip self
            if (b.id === currentId) return false;
            // Skip Passed/Draft/Cancelled if not blocking? 
            // Usually we only care about active bookings. 
            // In BookingSection, we filter out 'pass'. 'draft' is usually fine to overwrite? 
            // But here "allBookings" typically contains everything. 
            // Let's match BookingSection: filter out 'pass'.
            if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') return false;

            // Date logic
            // b.from and b.to are likely Timestamps or Dates. Convert to Date.
            // AdminDashboard loads them. Let's assume they are Dates or we need to be careful.
            // In AdminDashboard, onSnapshot converts them: `from: data.from?.toDate()...`
            // So they are JS Dates.

            // Standard overlap: (StartA <= EndB) and (EndA >= StartB)
            // But we need to use comparable values (set hours to 0 or 12).
            const bStart = new Date(b.from);
            bStart.setHours(0, 0, 0, 0);

            const bEnd = new Date(b.to);
            bEnd.setHours(0, 0, 0, 0);

            const myStart = new Date(start);
            myStart.setHours(0, 0, 0, 0);

            const myEnd = new Date(end);
            myEnd.setHours(0, 0, 0, 0);

            // Overlap logic
            // Note: If I check out on the same day someone checks in, that IS allowed or NOT?
            // Usually CheckIn day is blocked for others?
            // If Booking A is 1st-5th.
            // Booking B can start on 5th?
            // Existing app logic: `startOfDay(d) <= startOfDay(range.to)` etc.
            // Let's be strict: strict overlap means NO shared dates for full occupancy.
            // But usually "Check Out" date is "Check In" date for next.
            // Let's check BookingSection.jsx logic again if needed.
            // For now, I'll use standard overlap and maybe refine.
            // Re-reading BookingSection:
            // return activeBookedDates.some(range => ... d >= start && d <= end)
            // It blocks every day in the range [from, to].
            // So [1st, 5th] blocks 1, 2, 3, 4, 5.
            // So NO shared endpoints.

            return (myStart <= bEnd && myEnd >= bStart);
        });

        if (conflict) {
            setError(`Dates overlap with booking: ${conflict.shareholderName} (#${conflict.cabinNumber})`);
        } else {
            setError(null);
        }
    };

    useEffect(() => {
        if (booking) {
            setFormData({
                shareholderName: booking.shareholderName || '',
                cabinNumber: booking.cabinNumber || '',
                // Format dates for input type="date" (YYYY-MM-DD)
                from: booking.from ? format(booking.from, 'yyyy-MM-dd') : '',
                to: booking.to ? format(booking.to, 'yyyy-MM-dd') : '',
                guests: booking.guests || 1,
                isFinalized: booking.isFinalized || false
            });
        }
    }, [booking]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleShareholderChange = (e) => {
        const name = e.target.value;
        const owner = CABIN_OWNERS.find(o => o.name === name);
        setFormData(prev => ({
            ...prev,
            shareholderName: name,
            cabinNumber: owner ? owner.cabin : prev.cabinNumber // Auto-fill cabin
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Convert dates back to Date objects (assume check-in is start of day, check-out end of day logic handled elsewhere or just keep date part)
        // Store as Date objects at noon to avoid timezone shift issues for now, or just use new Date(val) which is UTC?
        // simple new Date(val) creates 00:00 UTC or Local?
        // Typically new Date("2026-03-01") is UTC.
        // Existing app uses `startOfDay` logic often.
        // Let's ensure consistent timezone handling: create dates using local time 00:00
        // Helper:
        const createDate = (ds) => {
            if (!ds) return null;
            const [y, m, d] = ds.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0); // Noon local time safest for dates
        };


        const updated = {
            ...booking,
            ...formData,
            from: createDate(formData.from),
            to: createDate(formData.to)
        };

        // If it was a 'pass' and we are saving (implying adding dates), remove the pass type
        if (updated.type === 'pass' || updated.type === 'auto-pass' || updated.type === 'cancelled') {
            updated.type = null; // Signal to remove this field in Firestore
        }

        onSave(updated);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg">Edit Booking</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Shareholder */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Shareholder</label>
                        <select
                            name="shareholderName"
                            value={formData.shareholderName}
                            onChange={handleShareholderChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Shareholder</option>
                            {CABIN_OWNERS.map(o => (
                                <option key={o.name} value={o.name}>{o.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Cabin */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cabin Number</label>
                        <input
                            type="text"
                            name="cabinNumber"
                            value={formData.cabinNumber}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Guests */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Guests</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                name="guests"
                                min="1"
                                max="10"
                                value={formData.guests}
                                onChange={handleChange}
                                className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="text-sm text-slate-500">Adults & Children</span>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Check In</label>
                            <input
                                type="date"
                                name="from"
                                value={formData.from}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Check Out</label>
                            <input
                                type="date"
                                name="to"
                                value={formData.to}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>



                    {/* Status */}
                    <div className="flex items-center gap-3 pt-2 pb-2">
                        <input
                            type="checkbox"
                            id="isFinalized"
                            name="isFinalized"
                            checked={formData.isFinalized}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <label htmlFor="isFinalized" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                            Mark as Finalized
                            <span className="block text-xs text-slate-500 font-normal">
                                If unchecked, booking will be a <span className="text-amber-600 font-bold">Draft</span> (may block schedule).
                            </span>
                        </label>
                    </div>
                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!!error}
                            className={`px-4 py-2 text-sm font-bold text-white rounded-md transition-colors shadow-sm ${error ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
