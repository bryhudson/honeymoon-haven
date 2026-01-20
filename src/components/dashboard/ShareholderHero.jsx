import React from 'react';
import { Calendar, Clock, CheckCircle, Info, AlertTriangle, PlayCircle, XCircle, Mail, DollarSign } from 'lucide-react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';

export function ShareholderHero({
    currentUser,
    status,
    shareholderName,
    drafts,
    onOpenBooking,
    onFinalize,
    onPass,
    isSystemFrozen,
    isSuperAdmin,
    onViewDetails,
    onEmail,
    onViewSchedule,
    currentOrder
}) {
    if (!shareholderName) return null;

    // --- QUEUE CALCULATION (Moved to top to avoid ReferenceError) ---
    const queueInfo = React.useMemo(() => {
        if (!currentOrder || !status || !shareholderName) return null;

        // ADMIN OVERRIDE: If name is Admin/Bryan but they are not in the list, return a mock object
        // so they can see the "Active Turn" or "Waiting" UI without crashing or return null
        const isAdminPersona = shareholderName === 'HHR Admin' || shareholderName === 'Bryan';
        // Note: 'Bryan' might actually be in the list if he's playing. 'HHR Admin' is definitely not.

        const fullTurnOrder = [...currentOrder, ...[...currentOrder].reverse()];
        let activeIndex = -1;

        if (status.phase === 'PRE_DRAFT') {
            activeIndex = -1;
        } else if (status.activePicker) {
            const round1Len = currentOrder.length;
            if (status.phase === 'ROUND_1') {
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i < round1Len);
            } else {
                // If phase is ROUND_2 (or fallback), look in 2nd half
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i >= round1Len);
                // Fallback: if not found in 2nd half (edge case), find anywhere
                if (activeIndex === -1) activeIndex = fullTurnOrder.findIndex(n => n === status.activePicker);
            }
        }

        // Use findIndex with a filter condition is not direct, so loop
        let myNextIndex = -1;
        for (let i = 0; i < fullTurnOrder.length; i++) {
            if (fullTurnOrder[i] === shareholderName && i > activeIndex) {
                myNextIndex = i;
                break;
            }
        }

        if (myNextIndex === -1) {
            if (isAdminPersona) {
                // Return a mock object so the rest of the component renders "Waiting" state
                return { diff: 99, round: 1 };
            }
            return null;
        }

        // Determine which round the next slot belongs to
        // If myNextIndex is within the first half of the full order (which is length * 2), it's Round 1
        // Actually fullTurnOrder is [R1, R2]. R1 length is currentOrder.length.
        const round = myNextIndex < currentOrder.length ? 1 : 2;

        return { diff: myNextIndex - activeIndex, round };
    }, [currentOrder, status, shareholderName]);

    // 1. System Maintenance (Highest Priority)
    if (isSystemFrozen && !isSuperAdmin) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-sm">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-4 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-amber-900 mb-2">System Maintenance</h2>
                        <p className="text-amber-800/80 text-lg">
                            We are currently performing important system updates. Booking actions are temporarily paused. Please check back shortly.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Open Season
    if (status.phase === 'OPEN_SEASON') {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden group">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-green-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-emerald-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Calendar className="w-48 h-48 text-green-500 transform rotate-12" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 rounded-full bg-green-900/50 text-green-200 text-xs font-bold uppercase tracking-wider border border-green-500/30">
                                Open Season
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            Welcome, {shareholderName}
                        </h1>
                        <p className="text-lg text-slate-300 max-w-xl">
                            Booking is now <span className="font-bold text-green-400">Open Season</span>. Reservations are first-come, first-served.
                        </p>
                    </div>

                    <button
                        onClick={onOpenBooking}
                        className="w-full md:w-auto px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                    >
                        <Calendar className="w-6 h-6" />
                        Book Dates Now
                    </button>
                </div>
            </div>
        );
    }

    // Helper for Phase Badge
    const getPhaseLabel = (phase) => {
        if (phase === 'ROUND_1') return 'Round 1';
        if (phase === 'ROUND_2') return 'Round 2';
        if (phase === 'OPEN_SEASON') return 'Open Season';
        return null;
    };
    const phaseLabel = getPhaseLabel(status.phase);

    // 3. User State Logic
    const isYourTurn = status.activePicker === shareholderName;
    const activeDraft = drafts.find(b => b.shareholderName === shareholderName && !b.isFinalized && b.type !== 'cancelled');

    // Determine completed status
    let roundTarget = 1;
    if (status.phase === 'ROUND_2') roundTarget = 2;
    const myActions = drafts.filter(b =>
        b.shareholderName === shareholderName &&
        (b.isFinalized || b.type === 'pass') &&
        b.type !== 'cancelled'
    );
    const isDoneForRound = myActions.length >= roundTarget;
    const lastAction = myActions[myActions.length - 1];

    // Helper: Render Split Round Badges
    const renderBadges = () => {
        return (
            <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-2 mt-2">
                {/* Round 1 Status Badge */}
                {(() => {
                    const r1Action = myActions[0]; // Logic assumes chronological order
                    // Check if Round 1 is active relative to queue or phase
                    const isR1Queue = queueInfo && queueInfo.round === 1;
                    const isR1Turn = status.phase === 'ROUND_1' && isYourTurn;

                    let bg = 'bg-slate-800/50 text-slate-400 border-slate-700/50';
                    let icon = <Clock className="w-3 h-3" />;
                    let text = "Waiting";

                    if (r1Action) {
                        if (r1Action.type === 'pass') {
                            bg = 'bg-amber-900/50 text-amber-200 border-amber-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = "Passed";
                        } else {
                            const isPaid = r1Action.paymentStatus === 'paid';
                            bg = 'bg-green-900/50 text-green-200 border-green-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR1Turn) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        icon = <PlayCircle className="w-3 h-3" />;
                        text = "Your Turn";
                    } else if (isR1Queue) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${bg}`}>
                            <span className="opacity-70 mr-1">R1:</span>
                            {icon}
                            {text}
                        </div>
                    );
                })()}

                {/* Round 2 Status Badge */}
                {(() => {
                    // Logic: Round 2 action is the second one if it exists
                    // OR if R1 action exists, then the next 'myActions' slot would be R2?
                    // Actually myActions only has Completed items.
                    // If myActions has 2 items, r2Action is index 1.
                    const r2Action = myActions.length > 1 ? myActions[1] : null;

                    const isR2Queue = queueInfo && queueInfo.round === 2;
                    // If R2 is active phase and R1 is done, and it's your turn
                    const isR2Turn = status.phase === 'ROUND_2' && isYourTurn;

                    let bg = 'bg-slate-800/50 text-slate-400 border-slate-700/50';
                    let icon = <Clock className="w-3 h-3" />;
                    let text = "Waiting";

                    if (r2Action) {
                        if (r2Action.type === 'pass') {
                            bg = 'bg-amber-900/50 text-amber-200 border-amber-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = "Passed";
                        } else {
                            const isPaid = r2Action.paymentStatus === 'paid';
                            bg = 'bg-green-900/50 text-green-200 border-green-500/30';
                            icon = <CheckCircle className="w-3 h-3" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR2Turn) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        icon = <PlayCircle className="w-3 h-3" />;
                        text = "Your Turn";
                    } else if (isR2Queue) {
                        bg = 'bg-blue-900/50 text-blue-200 border-blue-500/30';
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${bg}`}>
                            <span className="opacity-70 mr-1">R2:</span>
                            {icon}
                            {text}
                        </div>
                    );
                })()}
            </div>
        );
    };

    // --- TIMER LOGIC (Unified) ---
    // Only show if windowEnds is defined AND (it's my turn OR I'm up next)
    const showTimer = status.windowEnds && (isYourTurn || queueInfo?.diff === 1);

    const TimerComponent = showTimer ? (
        <div className={`mt-2 text-sm font-bold flex items-center justify-center lg:justify-start gap-2 ${isYourTurn ? 'text-blue-300' : 'text-indigo-300'}`}>
            <Clock className="w-4 h-4" />
            {isYourTurn ? "Your turn ends in:" : "Your turn starts within:"} {(() => {
                if (!status.windowEnds) return '--';
                const end = new Date(status.windowEnds);
                const now = new Date();
                if (end <= now) return 'Ending soon...';

                const diff = intervalToDuration({ start: now, end });
                const parts = [];
                if (diff.days > 0) parts.push(`${diff.days}d`);
                if (diff.hours > 0) parts.push(`${diff.hours}h`);
                if (diff.minutes > 0) parts.push(`${diff.minutes}m`);

                return parts.join(' ') || '< 1m';
            })()}
        </div>
    ) : null;

    // --- CASE A: Your Turn + Has Draft ---
    if (isYourTurn && activeDraft) {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-purple-900 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center lg:text-left w-full lg:w-auto">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            Welcome, {shareholderName}
                        </h1>
                        <div id="tour-status" className="flex flex-col items-center lg:items-start gap-1">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-2">
                                {/* Phase Badge */}
                                {phaseLabel && (
                                    <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-600/30">
                                        {phaseLabel}
                                    </span>
                                )}
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 text-blue-200 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                    It's Your Turn
                                </div>
                            </div>
                            {/* TIMER INJECTED HERE */}
                            {TimerComponent}
                        </div>
                        <h2 className="text-2xl font-bold text-blue-100">
                            Draft Selection Saved
                        </h2>
                        <p className="text-lg text-slate-300">
                            You have selected dates. Please <span className="font-bold text-white">finalize</span> to lock them in.
                        </p>
                    </div>

                    <div id="tour-actions" className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
                        <button
                            onClick={() => onViewDetails(activeDraft)}
                            className="flex-1 lg:flex-none px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <Info className="w-5 h-5" />
                            Review Booking Details
                        </button>
                        <button
                            onClick={() => onFinalize(activeDraft.id, shareholderName)}
                            className="flex-1 lg:flex-none px-8 py-3 bg-green-600 text-white text-lg font-bold rounded-xl shadow-lg hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 animate-pulse"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Finalize Booking
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- CASE B: Your Turn (No Draft) ---
    if (isYourTurn) {
        return (
            <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-slate-800 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center lg:text-left max-w-2xl">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                            Welcome, {shareholderName}
                        </h1>
                        <div id="tour-status" className="flex flex-col items-center lg:items-start gap-1">
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                                {/* Phase Badge */}
                                {phaseLabel && (
                                    <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-600/30">
                                        {phaseLabel}
                                    </span>
                                )}
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                                    <Clock className="w-3 h-3" />
                                    Action Required
                                </div>
                            </div>
                            {/* TIMER INJECTED HERE (Text color handled in component definition) */}
                        </div>

                        {/* HIGH PRIORITY DEADLINE TIMER */}
                        {showTimer && status.windowEnds && (
                            <div className="mt-6 bg-indigo-500/20 border border-indigo-400/30 rounded-xl p-4 max-w-md mx-auto md:mx-0">
                                <div className="flex flex-col md:flex-row items-center md:items-start md:text-left gap-3 md:gap-4 text-center">
                                    <div className="p-2 bg-indigo-500/30 rounded-lg animate-pulse shrink-0">
                                        <Clock className="w-5 h-5 text-indigo-200" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">
                                            Complete Request By
                                        </div>
                                        <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                                            {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                        </div>
                                        <div className="text-sm text-indigo-200 mt-1 font-medium flex items-center justify-center md:justify-start gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>Time remaining:</span>
                                            <span className="text-white font-bold">
                                                {(() => {
                                                    const end = new Date(status.windowEnds);
                                                    const now = new Date();
                                                    if (end <= now) return 'Ending soon...';
                                                    const diff = intervalToDuration({ start: now, end });
                                                    const parts = [];
                                                    if (diff.days > 0) parts.push(`${diff.days}d`);
                                                    if (diff.hours > 0) parts.push(`${diff.hours}h`);
                                                    if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
                                                    return parts.join(' ') || '< 1m';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        <h2 className="text-2xl font-bold text-blue-100 mt-6">
                            It's Your Turn
                        </h2>
                        <p className="text-lg text-slate-300 leading-relaxed">
                            The calendar is yours! Please select your dates or pass your turn to the next shareholder.
                        </p>
                    </div>

                    <div id="tour-actions" className="flex flex-col w-full sm:w-auto gap-4">
                        <button
                            onClick={onOpenBooking}
                            className="w-full sm:w-64 px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-blue-50 hover:scale-105 transition-all flex items-center justify-center gap-3"
                        >
                            <PlayCircle className="w-6 h-6 text-blue-600" />
                            Start Booking
                        </button>
                        <button
                            onClick={onPass}
                            className="w-full sm:w-64 px-8 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                            Pass Turn
                        </button>
                    </div>
                </div >
            </div >
        );
    }

    // --- CASE C: Done for Round ---
    if (isDoneForRound) {
        const isPassed = lastAction?.type === 'pass';

        // Helper to extract booking details if not passed
        let displayDate = null;
        let nights = 0;
        let paymentStatus = null; // 'paid', 'unpaid', null

        if (!isPassed && lastAction) {
            const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
            const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
            displayDate = { start, end };
            nights = differenceInDays(end, start);
            paymentStatus = lastAction.isPaid ? 'paid' : 'unpaid';
        }

        const isPaid = paymentStatus === 'paid';

        return (
            <div className={`
                rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden text-white
                ${isPassed ? 'bg-slate-900' : 'bg-slate-900'}
            `}>
                {/* Abstract Background Shapes */}
                <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isPassed ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                <div className={`absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none ${isPassed ? 'bg-amber-600' : 'bg-green-600'}`}></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4 text-center md:text-left max-w-2xl">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                            Welcome, {shareholderName}
                        </h1>

                        <div id="tour-status">
                            {renderBadges()}
                        </div>

                        <h2 className="text-2xl font-bold text-white/90">
                            {isPassed ? "" : "You're All Set!"}
                        </h2>

                        <div className="text-lg text-slate-300 leading-relaxed">
                            {isPassed ? (
                                <span className="text-slate-200">
                                    You have passed your turn for this round. We'll let you know when the next round begins!
                                    <br />
                                    <span className="text-sm opacity-70 mt-1 block">Enjoy the break!</span>
                                </span>
                            ) : (
                                <div className="space-y-1">
                                    <p>
                                        booked for <span className="text-white font-bold">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d, yyyy')}</span>
                                        <span className="opacity-60 ml-2">({nights} nights)</span>
                                    </p>
                                    {isPaid ? (
                                        <p className="text-green-400 text-sm font-bold flex items-center justify-center md:justify-start gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Payment Completed
                                        </p>
                                    ) : (
                                        <p className="text-amber-400 text-sm font-bold flex items-center justify-center md:justify-start gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                                            Payment Outstanding
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {!isPassed && lastAction && (
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <button
                                onClick={() => onViewDetails(lastAction)}
                                className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                            >
                                <Info className="w-5 h-5" />
                                View Details
                            </button>
                            {lastAction.isPaid && onEmail && (
                                <button
                                    onClick={() => onEmail(lastAction)}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Guest
                                </button>
                            )}
                        </div>
                    )}
                    {/* For Passed, simply show nothing or a "View Schedule" if we had one. Currently just the banner is enough notification. */}
                    {/* For Passed, show View Schedule to match Cancelled state visual balance */}

                </div>
            </div>
        );
    }

    // --- CASE D: Waiting (or Cancelled) ---

    // Special check: Did they cancel their turn this round?
    // We look for a booking that is: Mine, Finalized, Cancelled, and (if strict round logic applied) matches this round.
    // For now, we just check if the MOST RECENT action was a cancellation and they are not currently the active picker.
    const latestAction = drafts
        .filter(b => b.shareholderName === shareholderName && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const isJustCancelled = latestAction && latestAction.type === 'cancelled';
    const isJustPassed = latestAction && latestAction.type === 'pass';

    // Find any upcoming confirmed booking to show details for (valid ones)
    const upcomingBooking = drafts
        .filter(b => b.shareholderName === shareholderName && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white">
            {/* Background Flair - Aligning with AdminTurnHero (Indigo/Purple Theme) */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="space-y-4 text-center lg:text-left max-w-2xl">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                        Welcome, {shareholderName}
                    </h1>

                    <div id="tour-status">
                        {renderBadges()}
                    </div>

                    <div className="text-lg text-slate-300 leading-relaxed">
                        {isJustCancelled ? (
                            <span className="text-slate-200">
                                You have cancelled your booking. No worries! You can rejoin the action when the next round opens or if another spot becomes available.
                                <br />
                                <span className="text-sm opacity-70 mt-1 block">In the meantime, sit back and relax.</span>
                            </span>
                        ) : isJustPassed ? (
                            <span className="text-slate-200">
                                You have passed your turn for this round. We'll let you know when the next round begins!
                                <br />
                                <span className="text-sm opacity-70 mt-1 block">Enjoy the break!</span>
                            </span>
                        ) : (
                            status.phase === 'PRE_DRAFT' ? (
                                <span>
                                    The 2026 Draft begins on <span className="font-bold text-white">{status.draftStart ? format(status.draftStart, 'MMMM do') : 'March 1st'}</span>.
                                    <br className="hidden md:block" />
                                    First up: <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">{status.nextPicker}</span>.
                                </span>
                            ) : (
                                <span>
                                    Waiting for <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded">{status.activePicker}</span> to finish their turn.
                                </span>
                            )
                        )}

                        {/* Timer only relevant if Up Next */}
                        {queueInfo?.diff === 1 && TimerComponent}
                    </div>
                </div>

                <div id="tour-actions" className="flex flex-col sm:flex-row w-full lg:w-auto gap-4">
                    {upcomingBooking && (
                        <button
                            onClick={() => onViewDetails(upcomingBooking)}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <Info className="w-5 h-5" />
                            View Details
                        </button>
                    )}




                </div>
            </div>
        </div>
    );
}
