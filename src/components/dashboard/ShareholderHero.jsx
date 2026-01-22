import React from 'react';
import { Calendar, Clock, CheckCircle, Info, AlertTriangle, PlayCircle, XCircle, Mail } from 'lucide-react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import confetti from 'canvas-confetti';

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
    currentOrder,
    isReadOnly = false,
    onOpenFeedback,
    onCelebrated
}) {
    const [now, setNow] = React.useState(new Date());

    // Update timer every minute to keep countdown alive
    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // --- CONFETTI CELEBRATION ---
    React.useEffect(() => {
        // Find the most recent finalized, paid, but uncelebrated booking
        const paidBooking = drafts?.find(b =>
            b.shareholderName === shareholderName &&
            b.isFinalized &&
            b.isPaid &&
            !b.celebrated &&
            b.type !== 'cancelled' &&
            b.type !== 'pass'
        );

        if (paidBooking && onCelebrated) {
            // FIRE CONFETTI!
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min, max) => Math.random() * (max - min) + min;

            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            // Mark as celebrated in Firestore
            onCelebrated(paidBooking.id);
        }
    }, [drafts, shareholderName, onCelebrated]);

    if (!shareholderName) return null;

    // Helper to convert number to ordinal (1st, 2nd, 3rd, etc.)
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // --- QUEUE CALCULATION ---
    const isAdminPersona = !isReadOnly && (shareholderName === 'HHR Admin' || shareholderName === 'Bryan');

    const queueInfo = React.useMemo(() => {
        if (!currentOrder || !status || !shareholderName) return null;

        const fullTurnOrder = [...currentOrder, ...[...currentOrder].reverse()];
        let activeIndex = -1;

        if (status.phase === 'PRE_DRAFT') {
            activeIndex = -1;
        } else if (status.activePicker) {
            const round1Len = currentOrder.length;
            if (status.phase === 'ROUND_1') {
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i < round1Len);
            } else {
                activeIndex = fullTurnOrder.findIndex((n, i) => n === status.activePicker && i >= round1Len);
                if (activeIndex === -1) activeIndex = fullTurnOrder.findIndex(n => n === status.activePicker);
            }
        }

        let myNextIndex = -1;
        for (let i = 0; i < fullTurnOrder.length; i++) {
            if (fullTurnOrder[i] === shareholderName && i > activeIndex) {
                myNextIndex = i;
                break;
            }
        }

        if (myNextIndex === -1) {
            if (isAdminPersona) {
                return { diff: 99, round: 1 };
            }
            return null;
        }

        const round = myNextIndex < currentOrder.length ? 1 : 2;
        return { diff: myNextIndex - activeIndex, round };
    }, [currentOrder, status, shareholderName, isReadOnly, isAdminPersona]);


    // 1. System Maintenance (Highest Priority)
    if (isSystemFrozen && !isSuperAdmin) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-xl">
                <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-5 bg-amber-100 rounded-2xl text-amber-600 shrink-0 shadow-md">
                        <AlertTriangle className="w-12 h-12" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-4xl font-black text-amber-900 tracking-tight">System Maintenance</h2>
                        <p className="text-amber-800/80 text-lg leading-relaxed">
                            We're performing important system updates. Booking actions are temporarily paused. Please check back shortly.
                        </p>
                    </div>
                </div>
            </div>
        );
    }



    // 2. Open Season
    if (status.phase === 'OPEN_SEASON') {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 md:p-12 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <span className="inline-flex px-4 py-2 rounded-full bg-green-500/20 text-green-300 text-sm font-bold uppercase tracking-wider border border-green-500/30">
                            🎉 Open Season
                        </span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-300">
                            Booking is Open
                        </h1>
                        <p className="text-xl md:text-2xl text-white/60 font-medium">
                            Welcome, <span className="text-white font-bold">{shareholderName}</span>!
                        </p>
                        <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
                            Reservations are now first-come, first-served for all available dates.
                        </p>
                    </div>

                    <div>
                        <button
                            onClick={onOpenBooking}
                            className="group px-10 py-5 bg-green-600 hover:bg-green-500 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Calendar className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            Book Dates Now
                        </button>
                    </div>
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
        (b.isFinalized || b.type === 'pass' || b.type === 'skipped') &&
        b.type !== 'cancelled'
    );
    const isDoneForRound = myActions.length >= roundTarget;
    const lastAction = myActions[myActions.length - 1];

    // Get the absolute most recent action (including cancellations and skips) for generic state detection
    const latestAction = drafts
        .filter(b => b.shareholderName === shareholderName && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled' || b.type === 'skipped'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];


    // Helper: Render Round Status Badges
    const renderBadges = () => {
        const cancelledActions = drafts.filter(b => b.shareholderName === shareholderName && b.type === 'cancelled').sort((a, b) => a.createdAt - b.createdAt);

        return (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                {/* Round 1 Badge */}
                {(() => {
                    const r1Action = myActions[0];
                    const r1Cancelled = !r1Action && cancelledActions.length > 0;
                    const isR1Queue = queueInfo && queueInfo.round === 1;
                    const isR1Turn = status.phase === 'ROUND_1' && isYourTurn;

                    let badgeClass = 'bg-slate-800/50 text-slate-400 border-slate-600/50';
                    let icon = <Clock className="w-4 h-4" />;
                    let text = "Waiting";

                    if (r1Action) {
                        if (r1Action.type === 'pass') {
                            badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = "Passed";
                        } else if (r1Action.type === 'skipped') {
                            badgeClass = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                            icon = <XCircle className="w-4 h-4" />;
                            text = "Skipped";
                        } else {
                            const isPaid = r1Action.paymentStatus === 'paid';
                            badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (r1Cancelled) {
                        badgeClass = 'bg-red-500/10 text-red-300 border-red-500/30';
                        icon = <XCircle className="w-4 h-4" />;
                        text = "Cancelled";
                    } else if (isR1Turn) {
                        badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                        icon = <Clock className="w-4 h-4 animate-pulse" />;
                        text = "Your Turn";
                    } else if (isR1Queue) {
                        badgeClass = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                        icon = <Clock className="w-4 h-4" />;
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border backdrop-blur-sm ${badgeClass}`}>
                            <span className="opacity-70">R1</span>
                            {icon}
                            <span>{text}</span>
                        </div>
                    );
                })()}

                {/* Round 2 Badge */}
                {(() => {
                    const r2Action = myActions.length > 1 ? myActions[1] : null;
                    const r1DoneOrCancelled = myActions.length > 0 || cancelledActions.length > 0;
                    const isR2Cancelled = (myActions.length === 1 && cancelledActions.length >= 1) || (myActions.length === 0 && cancelledActions.length >= 2);
                    const isR2Queue = queueInfo && queueInfo.round === 2;
                    const isR2Turn = status.phase === 'ROUND_2' && isYourTurn;

                    let badgeClass = 'bg-slate-800/50 text-slate-400 border-slate-600/50';
                    let icon = <Clock className="w-4 h-4" />;
                    let text = "Waiting";

                    if (r2Action) {
                        if (r2Action.type === 'pass') {
                            badgeClass = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = "Passed";
                        } else if (r2Action.type === 'skipped') {
                            badgeClass = 'bg-orange-500/10 text-orange-300 border-orange-500/30';
                            icon = <XCircle className="w-4 h-4" />;
                            text = "Skipped";
                        } else {
                            const isPaid = r2Action.paymentStatus === 'paid';
                            badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                            icon = <CheckCircle className="w-4 h-4" />;
                            text = isPaid ? "Paid" : "Confirmed";
                        }
                    } else if (isR2Cancelled) {
                        badgeClass = 'bg-red-500/10 text-red-300 border-red-500/30';
                        icon = <XCircle className="w-4 h-4" />;
                        text = "Cancelled";
                    } else if (isR2Turn) {
                        badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                        icon = <Clock className="w-4 h-4 animate-pulse" />;
                        text = "Your Turn";
                    } else if (isR2Queue) {
                        badgeClass = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                        icon = <Clock className="w-4 h-4" />;
                        text = queueInfo.diff === 1 ? "Up Next!" : `#${queueInfo.diff} in Line`;
                    }

                    return (
                        <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border backdrop-blur-sm ${badgeClass}`}>
                            <span className="opacity-70">R2</span>
                            {icon}
                            <span>{text}</span>
                        </div>
                    );
                })()}
            </div>
        );
    };



    // --- SHARED UI COMPONENTS ---
    const renderStatusCard = (customTheme = 'indigo') => {
        const isJustPassed = lastAction && lastAction.type === 'pass';
        const isUpNext = queueInfo?.diff === 1;

        // Theme mapping
        const themes = {
            indigo: {
                accentFrom: 'from-indigo-400',
                accentTo: 'to-purple-500',
                textColor: 'text-indigo-200',
                labelColor: 'text-indigo-300/70',
                cardBg: 'bg-white/5'
            },
            blue: {
                accentFrom: 'from-blue-400',
                accentTo: 'to-cyan-400',
                textColor: 'text-blue-200',
                labelColor: 'text-blue-300/70',
                cardBg: 'bg-white/5'
            },
            red: {
                accentFrom: 'from-red-400',
                accentTo: 'to-rose-500',
                textColor: 'text-red-200',
                labelColor: 'text-red-300/70',
                cardBg: 'bg-white/5'
            },
            green: {
                accentFrom: 'from-emerald-400',
                accentTo: 'to-green-500',
                textColor: 'text-emerald-200',
                labelColor: 'text-emerald-300/70',
                cardBg: 'bg-white/5'
            }
        };

        const t = themes[customTheme] || themes.indigo;

        return (
            <div className={`${t.cardBg} border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md`}>
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left: Your Position */}
                    <div className="space-y-4">
                        <p className={`text-xs font-bold ${t.labelColor} uppercase tracking-widest`}>Your Position</p>

                        {isUpNext ? (
                            <>
                                <h2 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500 tracking-tight`}>
                                    You're Up Next!
                                </h2>
                                <p className={`text-sm ${t.textColor} leading-relaxed`}>
                                    Get ready! <span className="font-bold text-white">{status.activePicker}</span> is currently picking.
                                </p>
                            </>
                        ) : isJustPassed ? (
                            <>
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Turn Passed</h2>
                                <p className={`text-sm ${t.textColor} leading-relaxed`}>Thanks for your selection! Relax until the next round.</p>
                            </>
                        ) : isYourTurn ? (
                            <>
                                <h2 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${t.accentFrom} ${t.accentTo} tracking-tight`}>
                                    Your Turn
                                </h2>
                                <p className={`text-sm ${t.textColor} leading-relaxed`}>The clock is ticking! Select your dates before the deadline.</p>
                            </>
                        ) : (
                            <>
                                <div className="flex items-baseline gap-3">
                                    <span className={`text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r ${t.accentFrom} ${t.accentTo} tracking-tighter`}>
                                        {getOrdinal(queueInfo?.diff || 1)}
                                    </span>
                                    <span className={`text-2xl font-bold ${t.textColor}`}>in Line</span>
                                </div>
                                <p className={`text-sm ${t.textColor} leading-relaxed`}>Sit tight! We'll email you when it's your turn.</p>
                            </>
                        )}
                    </div>

                    {/* Right: Active Picker Info */}
                    {!isYourTurn && !isJustPassed && (
                        <div className="space-y-4 md:border-l md:border-white/10 md:pl-8">
                            <p className={`text-xs font-bold ${t.labelColor} uppercase tracking-widest`}>Currently Picking</p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white">{status.activePicker}</h3>

                            {status.windowEnds && (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className={`text-xs font-bold ${t.labelColor} uppercase tracking-wide`}>Turn Ends</div>
                                        <div className="text-lg font-bold text-white">
                                            {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                                        </div>
                                    </div>

                                    <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10 text-xs font-semibold text-white">
                                        <Clock className="w-4 h-4" />
                                        {(() => {
                                            const end = new Date(status.windowEnds);
                                            if (end <= now) return 'Ending...';
                                            const diff = intervalToDuration({ start: now, end });
                                            const parts = [];
                                            if (diff.days > 0) parts.push(`${diff.days}d`);
                                            if (diff.hours > 0) parts.push(`${diff.hours}h`);
                                            if (diff.minutes > 0) parts.push(`${diff.minutes}m`);
                                            return parts.join(' ') || '< 1m';
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };



    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <h1 className="text-2xl md:text-3xl font-light text-white/60">
                Welcome, <span className="text-white font-bold">{shareholderName}</span>
            </h1>
            <div id="tour-status">
                {renderBadges()}
            </div>
        </div>
    );

    const renderBackground = (theme = 'blue') => {
        const colors = {
            blue: ['bg-blue-500/10', 'bg-purple-500/10'],
            red: ['bg-red-500/10', 'bg-rose-500/10'],
            green: ['bg-emerald-500/10', 'bg-green-500/10'],
            indigo: ['bg-indigo-500/10', 'bg-purple-500/10']
        };
        const [c1, c2] = colors[theme] || colors.blue;

        return (
            <>
                <div className={`absolute top-0 right-0 w-96 h-96 ${c1} rounded-full blur-3xl pointer-events-none`}></div>
                <div className={`absolute bottom-0 left-0 w-96 h-96 ${c2} rounded-full blur-3xl pointer-events-none`}></div>
            </>
        );
    };



    // --- CASE A: Your Turn + Has Draft ---
    if (isYourTurn && activeDraft) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {renderBackground('blue')}

                <div className="relative z-10 space-y-8">
                    {renderHeader()}

                    <div className="space-y-3">
                        <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight">
                            Draft Saved
                        </h2>
                        <p className="text-lg md:text-xl text-blue-100/60 font-medium leading-relaxed max-w-2xl">
                            You've selected dates. Please <span className="text-white font-bold">finalize</span> your booking to lock them in.
                        </p>
                    </div>

                    {renderStatusCard('blue')}

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md flex flex-col lg:flex-row gap-6 items-center justify-between">
                        <div className="space-y-2 text-center lg:text-left">
                            <p className="text-xs font-bold text-blue-300 uppercase tracking-widest opacity-70">Complete By</p>
                            <div className="text-2xl md:text-3xl font-black text-white">
                                {status.windowEnds && format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            <button
                                onClick={() => onViewDetails(activeDraft)}
                                className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Info className="w-5 h-5" />
                                Review Details
                            </button>
                            <button
                                disabled={isReadOnly}
                                onClick={() => onFinalize(activeDraft.id, shareholderName)}
                                className={`px-10 py-4 text-white text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all 
                                    ${isReadOnly
                                        ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                        : 'bg-green-600 hover:bg-green-500 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                {isReadOnly ? 'Disabled' : 'Finalize Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    // --- CASE B: Your Turn (No Draft) ---
    if (isYourTurn) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {renderBackground('blue')}

                <div className="relative z-10 space-y-8">
                    {renderHeader()}

                    <div className="space-y-3">
                        <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight">
                            It's Your Turn
                        </h2>
                        <p className="text-lg md:text-xl text-blue-100/60 font-medium leading-relaxed max-w-2xl">
                            The calendar is yours! Select your dates or pass your turn to the next shareholder.
                        </p>
                    </div>

                    {renderStatusCard('blue')}

                    <div id="tour-actions" className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md flex flex-col lg:flex-row gap-6 items-center justify-between">
                        <div className="space-y-2 text-center lg:text-left">
                            <p className="text-xs font-bold text-blue-300 uppercase tracking-widest opacity-70">Complete By</p>
                            <div className="text-2xl md:text-3xl font-black text-white">
                                {status.windowEnds && format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            <button
                                onClick={onPass}
                                disabled={isReadOnly}
                                className={`px-6 py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border 
                                    ${isReadOnly
                                        ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border-transparent'
                                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border-white/10'
                                    }`}
                            >
                                {isReadOnly ? 'Pass (Disabled)' : 'Pass Turn'}
                            </button>
                            <button
                                onClick={onOpenBooking}
                                disabled={isReadOnly}
                                className={`px-10 py-4 text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all
                                    ${isReadOnly
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                        : 'bg-white text-slate-900 hover:bg-blue-50 hover:scale-105 active:scale-95 shadow-white/10'
                                    }`}
                            >
                                <PlayCircle className={`w-6 h-6 ${isReadOnly ? 'text-slate-500' : 'text-blue-600'}`} />
                                {isReadOnly ? 'Disabled' : 'Start Booking'}
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        );
    }



    // --- CASE C: Done for Round ---
    if (isDoneForRound) {
        const isPassed = lastAction?.type === 'pass';
        const isSkipped = lastAction?.type === 'skipped';
        let displayDate = null;
        let nights = 0;
        let paymentStatus = null;

        if (!isPassed && lastAction) {
            const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
            const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
            displayDate = { start, end };
            nights = differenceInDays(end, start);
            paymentStatus = lastAction.isPaid ? 'paid' : 'unpaid';
        }

        const isPaid = paymentStatus === 'paid';
        const theme = isPassed ? 'indigo' : (isSkipped ? 'red' : 'green');

        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden text-white">
                {renderBackground(theme)}

                <div className="relative z-10 space-y-8">
                    {renderHeader()}

                    <div className="space-y-4">
                        <h2 className={`text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${isPassed ? 'from-amber-400 to-orange-500' : (isSkipped ? 'from-orange-400 to-red-500' : 'from-emerald-400 to-green-500')}`}>
                            {isPassed ? "Turn Passed" : (isSkipped ? "Turn Skipped" : "You're All Set!")}
                        </h2>
                        <div className="text-lg md:text-xl text-slate-300 leading-relaxed font-medium">
                            {isPassed ? (
                                <p>You've passed your turn for this round. We'll notify you when the next round begins!</p>
                            ) : isSkipped ? (
                                <p>Your turn expired without action. Don't worry—you'll get another chance in the next round!</p>
                            ) : (
                                <div className="space-y-3">
                                    <p>
                                        Booking confirmed for <span className="text-white font-bold">{format(displayDate.start, 'MMM d')} - {format(displayDate.end, 'MMM d, yyyy')}</span>
                                        <span className="text-slate-500 ml-2">({nights} nights)</span>
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {isPaid ? (
                                            <span className="flex items-center gap-2 text-emerald-400 text-sm font-bold uppercase tracking-widest">
                                                <CheckCircle className="w-4 h-4" />
                                                Payment Completed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-amber-500 text-sm font-bold uppercase tracking-widest">
                                                <AlertTriangle className="w-4 h-4" />
                                                Payment Outstanding
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {renderStatusCard(theme)}

                    {!isPassed && !isSkipped && lastAction && (
                        <div className="flex flex-col sm:flex-row gap-4 justify-end">
                            <button
                                onClick={() => onViewDetails(lastAction)}
                                className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Info className="w-5 h-5" />
                                View Details
                            </button>
                            {lastAction.isPaid && onEmail && (
                                <button
                                    onClick={() => onEmail(lastAction)}
                                    className="px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email Guest
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }



    // --- CASE D: Booking Cancelled ---
    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-2xl relative overflow-hidden">
                {renderBackground('red')}

                <div className="relative z-10 space-y-8">
                    {renderHeader()}

                    <div className="space-y-4">
                        <h2 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500">
                            Booking Cancelled
                        </h2>
                        <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed max-w-2xl">
                            Your previous booking was cancelled. You've returned to the queue and will be able to book again in the next available round.
                        </p>
                    </div>

                    {renderStatusCard('red')}

                    <div className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(latestAction)}
                            className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <Info className="w-5 h-5" />
                            View Cancelled Details
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- CASE E: Waiting (Queue) ---
    const upcomingBooking = drafts
        .filter(b => b.shareholderName === shareholderName && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 md:p-10 animate-in fade-in slide-in-from-top-4 shadow-xl relative overflow-hidden text-white">
            {renderBackground('indigo')}

            <div className="relative z-10 space-y-8">
                {renderHeader()}

                <div className="space-y-6">
                    <p className="text-lg md:text-xl text-indigo-100/40 font-medium leading-relaxed max-w-3xl">
                        Thanks for using the new HHR Trailer Booking App!
                        <br />
                        Have questions or feedback? Click <button onClick={onOpenFeedback} className="font-bold text-white hover:text-indigo-300 underline decoration-indigo-500/50 underline-offset-4 transition-colors">here</button> to let us know.
                    </p>
                </div>

                {renderStatusCard('indigo')}

                {upcomingBooking && (
                    <div id="tour-actions" className="flex justify-end">
                        <button
                            onClick={() => onViewDetails(upcomingBooking)}
                            className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <Info className="w-5 h-5" />
                            View Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
