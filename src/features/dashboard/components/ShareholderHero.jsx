import React from 'react';
import { format, differenceInDays, intervalToDuration } from 'date-fns';
import {
    AlertTriangle, Clock, Calendar, CheckCircle, XCircle, Info, Mail,
    Tent, Map, Caravan, Compass, ArrowRight, User
} from 'lucide-react';
import { normalizeName, formatNameForDisplay } from '../../../lib/shareholders';
import confetti from 'canvas-confetti';

export function ShareholderHero({
    currentUser,
    status,
    shareholderName,
    bookings,
    onOpenBooking,
    onFinalize,
    onPass,
    isSystemFrozen,
    isSuperAdmin,
    onViewDetails,
    onEmail,
    currentOrder,
    isReadOnly = false,
    onOpenFeedback,
    onCelebrated
}) {
    const [now, setNow] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // --- CONFETTI ---
    React.useEffect(() => {
        const paidBooking = bookings?.find(b =>
            normalizeName(b.shareholderName) === normalizeName(shareholderName) &&
            b.isFinalized && b.isPaid && !b.celebrated &&
            b.type !== 'cancelled' && b.type !== 'pass'
        );
        if (paidBooking && onCelebrated) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min, max) => Math.random() * (max - min) + min;
            const interval = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            onCelebrated(paidBooking.id);
        }
    }, [bookings, shareholderName, onCelebrated]);

    if (!shareholderName) return null;

    const normalizedMe = normalizeName(shareholderName);
    const isAdminPersona = !isReadOnly && (normalizedMe === 'hhr admin' || normalizedMe === 'bryan');

    // --- Queue calc ---
    const queueInfo = React.useMemo(() => {
        if (!currentOrder || !status || !shareholderName) return null;
        const fullTurnOrder = [...currentOrder, ...[...currentOrder].reverse()];
        let activeIndex = -1;
        if (status.phase === 'PRE_DRAFT') {
            activeIndex = -1;
        } else if (status.activePicker) {
            const round1Len = currentOrder.length;
            if (status.phase === 'ROUND_1') {
                activeIndex = fullTurnOrder.findIndex((n, i) => normalizeName(n) === normalizeName(status.activePicker) && i < round1Len);
            } else {
                activeIndex = fullTurnOrder.findIndex((n, i) => normalizeName(n) === normalizeName(status.activePicker) && i >= round1Len);
                if (activeIndex === -1) activeIndex = fullTurnOrder.findIndex(n => normalizeName(n) === normalizeName(status.activePicker));
            }
        }
        let myNextIndex = -1;
        for (let i = 0; i < fullTurnOrder.length; i++) {
            if (normalizeName(fullTurnOrder[i]) === normalizedMe && i > activeIndex) { myNextIndex = i; break; }
        }
        if (myNextIndex === -1) {
            if (isAdminPersona) return { diff: 99, round: 1 };
            return null;
        }
        return { diff: myNextIndex - activeIndex, round: myNextIndex < currentOrder.length ? 1 : 2 };
    }, [currentOrder, status, shareholderName, isReadOnly, isAdminPersona]);

    // --- User state ---
    const isYourTurn = status.activePicker && normalizeName(status.activePicker) === normalizedMe;
    let roundTarget = 1;
    if (status.phase === 'ROUND_2') roundTarget = 2;
    const myActions = bookings.filter(b =>
        normalizeName(b.shareholderName) === normalizedMe &&
        (b.isFinalized || b.type === 'pass' || b.type === 'skipped' || b.type === 'cancelled' || b.status === 'cancelled')
    ).sort((a, b) => a.createdAt - b.createdAt);
    const isDoneForRound = myActions.length >= roundTarget;
    const lastAction = myActions[myActions.length - 1];
    const latestAction = bookings
        .filter(b => normalizeName(b.shareholderName) === normalizedMe && (b.isFinalized || b.type === 'pass' || b.type === 'cancelled' || b.type === 'skipped' || b.status === 'cancelled'))
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    // --- Admin-Style Widget (V5.6) ---


    // ============================================
    // HELPER: Booking Banner (For usage in Stacked Views & Done State)
    // ============================================
    const renderBookingBanner = (bookingAction) => {
        const start = bookingAction.from?.toDate ? bookingAction.from.toDate() : new Date(bookingAction.from);
        const end = bookingAction.to?.toDate ? bookingAction.to.toDate() : new Date(bookingAction.to);
        const nights = differenceInDays(end, start);
        const isPaid = bookingAction.isPaid;

        return (
            <ModernTrailerWidget
                key={bookingAction.id || 'booking'}
                shareholderName={shareholderName}
                accentColor={isPaid ? "emerald" : "amber"}
                icon={Caravan}
                title="Booking Confirmed"
                subtitle={`${roundLabel} - ${isPaid ? "Ready for Check-in" : "Payment Pending"}`}
                mainContent={
                    <div className="flex items-center gap-2 text-white/80">
                        {/* Removed redundant configuration text */}
                        <span className="font-medium text-white/60">Reference: {bookingAction.id?.slice(0, 8)}</span>
                    </div>
                }
                rightContent={
                    <div className={`rounded-xl p-4 min-w-[260px] border ${isPaid ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-amber-500/20 border-amber-500/30'}`}>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${isPaid ? 'bg-emerald-500/30' : 'bg-amber-500/30'}`}>
                                <Calendar className={`w-5 h-5 ${isPaid ? 'text-emerald-200' : 'text-amber-200'}`} />
                            </div>
                            <div>
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isPaid ? 'text-emerald-200' : 'text-amber-200'}`}>
                                    Reservation
                                </div>
                                <div className="text-lg font-bold text-white tracking-tight">
                                    {format(start, 'MMM d')} - {format(end, 'MMM d')}
                                </div>
                                <div className="text-sm text-white/60 mt-0.5">
                                    {nights} Nights
                                </div>
                                {!isPaid && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 border border-amber-400/30 rounded text-amber-200 text-xs font-bold">
                                        <AlertTriangle className="w-3 h-3" /> Fee Outstanding
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                }
                actions={
                    <div className="flex gap-2 w-full">
                        {isPaid && onEmail && (
                            <button
                                onClick={() => onEmail(bookingAction)}
                                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold transition-colors"
                            >
                                Email Info
                            </button>
                        )}
                        <button
                            onClick={() => onViewDetails(bookingAction)}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-colors"
                        >
                            View Details
                        </button>
                    </div>
                }
            />
        );
    };

    // ============================================
    // 1. SYSTEM MAINTENANCE
    // ============================================
    if (isSystemFrozen && !isSuperAdmin) {
        return <ModernTrailerWidget
            shareholderName={shareholderName}
            accentColor="amber"
            icon={AlertTriangle}
            title="Maintenance"
            subtitle="System Upgrade"
            mainContent="The system is currently undergoing maintenance."
        />;
    }

    // ============================================
    // 2. PRE-DRAFT
    // ============================================
    if (status.phase === 'PRE_DRAFT' || (!status.activePicker && status.phase !== 'OPEN_SEASON')) {
        return <ModernTrailerWidget
            shareholderName={shareholderName}
            accentColor="slate"
            icon={Calendar}
            title="Pre-Season"
            subtitle="2026 Draft"
            mainContent={status.windowStarts ? `Draft Starts ${format(new Date(status.windowStarts), 'MMMM d')} @ 10am` : 'Schedule Coming Soon'}
        />;
    }

    // ============================================
    // 3. OPEN SEASON
    // ============================================
    if (status.phase === 'OPEN_SEASON') {
        const confirmedBookings = myActions.filter(b => b.isFinalized && b.type !== 'cancelled');

        const hero = <ModernTrailerWidget
            shareholderName={shareholderName}
            accentColor="emerald"
            icon={Tent}
            title="Open Season"
            subtitle="First Come, First Served"
            mainContent="All remaining dates are available for booking."
            actions={
                <button
                    onClick={onOpenBooking}
                    disabled={isReadOnly}
                    className={`w-full md:w-auto px-6 py-2.5 text-sm font-bold rounded-lg transition-all
                        ${isReadOnly
                            ? 'bg-emerald-900/30 text-emerald-500/50 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95'}`}
                >
                    Book Dates
                </button>
            }
        />;
    }

    // ============================================
    // 4. YOUR TURN
    // ============================================
    if (isYourTurn) {
        const targetDate = status.windowEnds;
        const timeLeft = targetDate ? (() => {
            const end = new Date(targetDate);
            if (end <= now) return 'Ending...';
            const diff = intervalToDuration({ start: now, end });
            const p = [];
            if (diff.days > 0) p.push(`${diff.days}d`);
            if (diff.hours > 0) p.push(`${diff.hours}h`);
            p.push(`${diff.minutes}m`);
            return p.join(' ');
        })() : null;

        const isEarly = status.isGracePeriod;

        // Find any existing confirmed bookings (from Round 1 etc)
        const confirmedBookings = myActions.filter(b => b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass' && b.type !== 'skipped');

        const hero = <ModernTrailerWidget
            shareholderName={shareholderName}
            accentColor="blue"
            icon={Clock}
            title={isEarly ? "Early Access" : "Your Turn"}
            subtitle={`${roundLabel} - ${isEarly ? "Bonus Time Active" : "Official Window Open"}`}
            mainContent={
                <p>
                    It's your turn to pick! Select your dates before the window closes.
                </p>
            }
            rightContent={
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 min-w-[280px] text-center lg:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4">
                        <div className="p-2 bg-blue-500/30 rounded-lg shrink-0">
                            <Clock className="w-5 h-5 text-blue-200" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">
                                Complete By
                            </div>
                            <div className="text-xl font-bold text-white tabular-nums tracking-tight">
                                {targetDate ? format(new Date(targetDate), 'MMM d, h:mm a') : 'No Deadline'}
                            </div>
                            {timeLeft && (
                                <div className="flex items-center justify-center lg:justify-start mt-2">
                                    <span className={`inline-flex items-center px-3 py-1 ${isEarly ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' : 'bg-blue-500/20 text-blue-200 border-blue-400/30'} text-xs font-bold rounded-lg border`}>
                                        Ends in {timeLeft}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            }
            actions={
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={onOpenBooking}
                        disabled={isReadOnly}
                        className={`flex-1 px-6 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20
                            ${isReadOnly
                                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                : 'bg-white text-slate-900 hover:bg-blue-50'}`}
                    >
                        Book Dates <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onPass}
                        disabled={isReadOnly}
                        className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white/70 hover:text-white border border-slate-600 rounded-lg text-sm font-bold transition-all"
                    >
                        Pass Turn
                    </button>
                </div>
            }
        />;

        return confirmedBookings.length > 0 ? (
            <div className="flex flex-col gap-4">
                {hero}
                {confirmedBookings.map(b => renderBookingBanner(b))}
            </div>
        ) : hero;
    }

    // ============================================
    // 5. DONE FOR ROUND
    // ============================================
    if (isDoneForRound && lastAction?.type !== 'cancelled') {
        const isPassed = lastAction?.type === 'pass';
        const isSkipped = lastAction?.type === 'skipped';

        if (isPassed || isSkipped) {
            return <ModernTrailerWidget
                shareholderName={shareholderName}
                accentColor="slate"
                icon={isSkipped ? ArrowRight : XCircle}
                title={isSkipped ? "Turn Skipped" : "Passed Round"}
                subtitle="Wait for next round"
                mainContent={<div className="text-white/60">You opted out of this selection round.</div>}
            />;
        }

        const start = lastAction.from?.toDate ? lastAction.from.toDate() : new Date(lastAction.from);
        const end = lastAction.to?.toDate ? lastAction.to.toDate() : new Date(lastAction.to);
        const nights = differenceInDays(end, start);
        const isPaid = lastAction.isPaid;

        return renderBookingBanner(lastAction);
    }

    // ============================================
    // 6. BOOKING CANCELLED
    // ============================================
    if (latestAction?.type === 'cancelled' && !isYourTurn) {
        return <ModernTrailerWidget
            shareholderName={shareholderName}
            accentColor="rose"
            icon={XCircle}
            title="Cancelled"
            subtitle={`${roundLabel} - Booking Removed`}
            mainContent={<div className="text-white/60">Your previous booking was cancelled. Wait for next round.</div>}
            actions={
                <button
                    onClick={() => onViewDetails(latestAction)}
                    className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-colors"
                >
                    Details
                </button>
            }
        />;
    }

    // ============================================
    // 7. WAITING IN LINE
    // ============================================
    const upcomingBooking = bookings
        .filter(b => normalizeName(b.shareholderName) === normalizedMe && b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass')
        .sort((a, b) => b.createdAt - a.createdAt)[0];

    const isUpNext = queueInfo?.diff === 1;
    const roundLabel = queueInfo?.round === 1 ? 'Round 1' : 'Round 2';

    const confirmedBookings = myActions.filter(b => b.isFinalized && b.type !== 'cancelled' && b.type !== 'pass' && b.type !== 'skipped');

    const hero = <ModernTrailerWidget
        shareholderName={shareholderName}
        accentColor="indigo"
        icon={isUpNext ? Compass : Map}
        title={isUpNext ? "You are Next" : `In Line: #${getOrdinal(queueInfo?.diff || 0)}`}
        subtitle={`${roundLabel} Queue`}
        mainContent={
            <div className="flex items-center gap-2 text-white/80">
                <span>Picking now:</span>
                <span className="font-bold text-white flex items-center gap-1">
                    <User className="w-4 h-4 text-indigo-400" />
                    {status.activePicker || "Loading..."}
                </span>
            </div>
        }
        rightContent={
            status.windowEnds && (
                <div className="bg-indigo-500/20 border border-indigo-400/30 rounded-xl p-4 min-w-[200px] text-center lg:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-center lg:justify-start gap-4">
                        <div className="p-2 bg-indigo-500/30 rounded-lg shrink-0">
                            <Clock className="w-5 h-5 text-indigo-200" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">
                                Until
                            </div>
                            <div className="text-xl font-bold text-white tabular-nums tracking-tight">
                                {format(new Date(status.windowEnds), 'MMM d, h:mm a')}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
        actions={
            <div className="flex gap-2 w-full">
                <button onClick={onOpenFeedback} className="flex-1 px-3 py-2 text-xs font-medium text-white/30 hover:text-indigo-300 transition-colors">
                    Feedback
                </button>
                {upcomingBooking && (
                    <button
                        onClick={() => onViewDetails(upcomingBooking)}
                        className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-colors"
                    >
                        View Booking
                    </button>
                )}
            </div>
        }
    />;

    return confirmedBookings.length > 0 ? (
        <div className="flex flex-col gap-4">
            {hero}
            {confirmedBookings.map(b => renderBookingBanner(b))}
        </div>
    ) : hero;
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// --- Admin-Style Widget (V5.6) ---
// Moved outside main component and declared as function to ensure hoisting and avoid initialization/hoisting errors in prod builds
function ModernTrailerWidget({
    accentColor = "emerald",
    icon: Icon,
    title,
    subtitle,
    shareholderName, // Passed implicitly now? No, need to pass it or remove if unused in badge
    mainContent,
    actions,
    rightContent // New prop for the Action Card (Timer/Details)
}) {
    // Map themes to gradient colors
    const themes = {
        emerald: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-emerald-500",
            badge: "bg-emerald-900/50 text-emerald-200 border-emerald-500/30",
            icon: "text-emerald-400"
        },
        amber: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-amber-500",
            badge: "bg-amber-900/50 text-amber-200 border-amber-500/30",
            icon: "text-amber-400"
        },
        indigo: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-indigo-500",
            badge: "bg-indigo-900/50 text-indigo-200 border-indigo-500/30",
            icon: "text-indigo-400"
        },
        red: { // Fallback for 'red'
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-red-500",
            badge: "bg-red-900/50 text-red-200 border-red-500/30",
            icon: "text-red-400"
        },
        rose: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-rose-500",
            badge: "bg-rose-900/50 text-rose-200 border-rose-500/30",
            icon: "text-rose-400"
        },
        slate: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-slate-500",
            badge: "bg-slate-800 text-slate-300 border-slate-600",
            icon: "text-slate-400"
        },
        violet: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-purple-500",
            badge: "bg-purple-900/50 text-purple-200 border-purple-500/30",
            icon: "text-purple-400"
        },
        blue: {
            bg: "bg-slate-900",
            border: "border-slate-700",
            highlight: "bg-blue-500",
            badge: "bg-blue-900/50 text-blue-200 border-blue-500/30",
            icon: "text-blue-400"
        }
    };

    const theme = themes[accentColor] || themes.slate;

    return (
        <div data-tour="status-hero" className={`relative rounded-2xl border overflow-hidden shadow-2xl ${theme.bg} ${theme.border} p-6 md:p-8 animate-in fade-in slide-in-from-top-4 text-white`}>

            {/* V5.6 Admin-Style Gradients */}
            <div className={`absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none ${theme.highlight}`}></div>
            <div className={`absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none ${theme.highlight}`}></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* LEFT: Info Block */}
                <div className="space-y-4 text-center lg:text-left max-w-2xl w-full">
                    {/* Badge Row */}
                    <div className="flex items-center justify-center lg:justify-start gap-2">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.badge}`}>
                            <Icon className="w-3 h-3" />
                            <span>{title}</span>
                        </div>
                        {shareholderName && (
                            <div className={`hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border opacity-60 ${theme.badge}`}>
                                <User className="w-3 h-3" />
                                {formatNameForDisplay(shareholderName)}
                            </div>
                        )}
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">{subtitle}</h2>
                        <div className="text-lg text-slate-300 leading-relaxed">
                            {mainContent}
                        </div>
                    </div>

                    {/* Mobile Actions (Below Text) */}
                    <div className="lg:hidden w-full pt-4">
                        {actions && <div className="grid grid-cols-1 gap-3">{actions}</div>}
                    </div>
                </div>

                {/* RIGHT: Action Card (Desktop) or Timer */}
                {/* If rightContent exists, show it. Otherwise show desktop actions if available. */}
                {(rightContent || (actions && <div className="hidden lg:block">{actions}</div>)) && (
                    <div className="flex flex-col w-full lg:w-auto gap-4">
                        {rightContent}
                        {/* Desktop Actions (if not passed as rightContent) */}
                        {!rightContent && actions && <div className="hidden lg:flex flex-col gap-3">{actions}</div>}
                        {/* If rightContent exists AND actions exist, render actions below rightContent on desktop */}
                        {rightContent && actions && <div className="hidden lg:grid grid-cols-1 gap-3">{actions}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};
