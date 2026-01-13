import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CABIN_OWNERS } from '../lib/shareholders';

export function EditBookingModal({ isOpen, onClose, onSave, booking }) {
    const [formData, setFormData] = useState({
        shareholderName: '',
        cabinNumber: '',
        from: '',
        to: '',
        isFinalized: false
    });

    useEffect(() => {
        if (booking) {
            setFormData({
                shareholderName: booking.shareholderName || '',
                cabinNumber: booking.cabinNumber || '',
                // Format dates for input type="date" (YYYY-MM-DD)
                from: booking.from ? format(booking.from, 'yyyy-MM-dd') : '',
                to: booking.to ? format(booking.to, 'yyyy-MM-dd') : '',
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
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="isFinalized"
                            name="isFinalized"
                            checked={formData.isFinalized}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isFinalized" className="text-sm font-medium text-slate-700">
                            Booking Finalized
                        </label>
                    </div>
                    <p className="text-xs text-slate-500">
                        Unchecking this moves the booking back to "Draft" status.
                    </p>

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
                            className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-sm"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
