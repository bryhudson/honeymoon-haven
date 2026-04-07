import React, { useState, useEffect } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { format, differenceInDays, isSameDay, startOfDay } from 'date-fns';
import { Calendar, User, Users, Home, Clock, Info, ShieldCheck, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { CABIN_OWNERS } from '../../../lib/shareholders';
import { calculateBookingCost } from '../../../lib/pricing';
import { db } from '../../../lib/firebase';

export function EditBookingModal({ isOpen, onClose, onSave, booking, allBookings = [] }) {
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        shareholderName: '',
        cabinNumber: '',
        from: '',
        to: '',
        guests: 1
    });

    // Validation Effect
    useEffect(() => {
        if (formData.from && formData.to && allBookings.length > 0) {
            checkAvailability(formData.from, formData.to);
        } else {
            setError(null);
        }
    }, [formData.from, formData.to, formData.guests, allBookings]);

    const checkAvailability = (startStr, endStr) => {
        if (!startStr || !endStr) return;

        const createCheckDate = (ds) => {
            const [y, m, d] = ds.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        };

        const start = createCheckDate(startStr);
        const end = createCheckDate(endStr);

        if (start >= end) {
            setError("Check-out date must be after Check-in date.");
            return;
        }

        const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (nights > 7) {
            setError(`Booking duration (${nights} nights) exceeds the maximum limit of 7 nights.`);
            return;
        }

        if (parseInt(formData.guests) > 6) {
            setError("Max 6 guests permitted (Total 8 occupants).");
            return;
        }

        const currentId = booking ? booking.id : null;
        const conflict = allBookings.find(b => {
            if (b.id === currentId) return false;
            if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') return false;

            const bStart = new Date(b.from);
            bStart.setHours(0, 0, 0, 0);
            const bEnd = new Date(b.to);
            bEnd.setHours(0, 0, 0, 0);
            const myStart = new Date(start);
            myStart.setHours(0, 0, 0, 0);
            const myEnd = new Date(end);
            myEnd.setHours(0, 0, 0, 0);

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
                from: booking.from ? format(booking.from, 'yyyy-MM-dd') : '',
                to: booking.to ? format(booking.to, 'yyyy-MM-dd') : '',
                guests: booking.guests || 1
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
            cabinNumber: owner ? owner.cabin : prev.cabinNumber
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const createDate = (ds) => {
            if (!ds) return null;
            const [y, m, d] = ds.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        };

        const newFrom = createDate(formData.from);
        const newTo = createDate(formData.to);

        // Recalculate fees from the (possibly adjusted) date range
        const cost = calculateBookingCost(newFrom, newTo);

        const updated = {
            ...booking,
            ...formData,
            from: newFrom,
            to: newTo,
            totalPrice: cost.total,
            priceBreakdown: cost.breakdown,
            updatedAt: new Date()
        };

        if (updated.type === 'pass' || updated.type === 'auto-pass' || updated.type === 'cancelled') {
            updated.type = null;
        }

        onSave(updated);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Booking"
            description="Adjust details for this specific reservation"
            maxSize="max-w-lg"
        >
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-slate-600 space-y-2 mb-6">
                <div className="flex gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p>
                            <span className="font-bold text-blue-700 block mb-0.5">Overnight Policy:</span>
                            You are permitted a maximum of 8 people (including yourself and your family).
                        </p>
                        <p>
                            <span className="font-bold text-blue-700 block mb-0.5">Daytime Policy:</span>
                            You can have "day gatherings" of up to 10 people (including yourself and family) without needing special permission.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    {/* Shareholder */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                            <User className="w-3 h-3" /> Shareholder
                        </label>
                        <select
                            name="shareholderName"
                            value={formData.shareholderName}
                            onChange={handleShareholderChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none"
                        >
                            <option value="">Select Shareholder</option>
                            {CABIN_OWNERS.map(o => (
                                <option key={o.name} value={o.name}>{o.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Cabin */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Home className="w-3 h-3" /> Cabin
                            </label>
                            <input
                                type="text"
                                name="cabinNumber"
                                value={formData.cabinNumber}
                                onChange={handleChange}
                                placeholder="e.g. 42"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>

                        {/* Guests */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Users className="w-3 h-3" /> Guests
                            </label>
                            <input
                                type="number"
                                name="guests"
                                min="1"
                                max="6"
                                value={formData.guests}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                            <p className="text-[10px] text-slate-400 font-medium px-1">Max 6 (Total 8 occupants)</p>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> Check In
                            </label>
                            <input
                                type="date"
                                name="from"
                                value={formData.from}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> Check Out
                            </label>
                            <input
                                type="date"
                                name="to"
                                value={formData.to}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Live Fee Preview */}
                {formData.from && formData.to && !error && (() => {
                    const createPreviewDate = (ds) => {
                        const [y, m, d] = ds.split('-').map(Number);
                        return new Date(y, m - 1, d, 12, 0, 0);
                    };
                    const preview = calculateBookingCost(createPreviewDate(formData.from), createPreviewDate(formData.to));
                    if (!preview || preview.nights <= 0) return null;

                    const oldTotal = booking?.totalPrice;
                    const hasChanged = oldTotal != null && oldTotal !== preview.total;

                    return (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Maintenance Fee</span>
                                <div className="text-right">
                                    <span className="text-lg font-black text-slate-800">${preview.total.toLocaleString()}</span>
                                    {hasChanged && (
                                        <span className="ml-2 text-xs font-bold text-amber-600 line-through">${oldTotal.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 text-[10px] text-slate-500 font-medium">
                                <span>{preview.nights} night{preview.nights !== 1 ? 's' : ''}</span>
                                {preview.breakdown?.weeknights > 0 && <span>{preview.breakdown.weeknights} weeknight{preview.breakdown.weeknights !== 1 ? 's' : ''}</span>}
                                {preview.breakdown?.weekends > 0 && <span>{preview.breakdown.weekends} weekend{preview.breakdown.weekends !== 1 ? 's' : ''}</span>}
                                {preview.breakdown?.discount > 0 && <span className="text-emerald-600">-${preview.breakdown.discount} discount</span>}
                            </div>
                            {hasChanged && (
                                <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 inline-block">
                                    Fee updated from ${oldTotal.toLocaleString()} to ${preview.total.toLocaleString()}
                                </div>
                            )}
                        </div>
                    );
                })()}
                {/* Error Message */}
                {error && (
                    <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="leading-relaxed">{error}</span>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!!error}
                        className={`flex-1 py-3.5 font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg text-xs ${error
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/10'
                            }`}
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </BaseModal >
    );
}
