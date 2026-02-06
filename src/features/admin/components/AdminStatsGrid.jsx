import React from 'react';
import { DollarSign, AlertTriangle, Calendar, Moon } from 'lucide-react';

export function AdminStatsGrid({ analytics }) {
    if (!analytics) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-slate-900">${analytics.totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-100 text-rose-700 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Unpaid Fees</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">${analytics.outstandingFees.toLocaleString()}</h3>
                            <span className="text-sm text-muted-foreground">({analytics.unpaidCount})</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Bookings</p>
                        <h3 className="text-2xl font-bold text-slate-900">{analytics.totalBookings}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                        <Moon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Nights</p>
                        <h3 className="text-2xl font-bold text-slate-900">{analytics.totalNights}</h3>
                    </div>
                </div>
            </div>
        </div>
    );
} 
