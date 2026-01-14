import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

export function OnboardingTour() {
    const [run, setRun] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hhr_tour_seen');
        if (!hasSeenTour) {
            // Delay slightly to ensure layout is ready
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const steps = [
        {
            target: '#tour-status',
            title: '🗓️ Booking Status',
            content: "Each shareholder gets a 48-hour window. If the previous person finishes early, you get 'Early Access' immediately, but your official 48-hour clock doesn't start until 10:00 AM the following day. This ensures no one is rushed if a turn changes late at night!",
            disableBeacon: true,
        },
        {
            target: '#tour-actions',
            title: '⚡ Take Action',
            content: "When it is your turn, use these buttons to Book or Pass. You will receive an automated email when your turn begins.",
        },
        {
            target: '#tour-actions',
            title: '💸 Payment Required',
            content: "To complete your booking, please send an e-transfer to honeymoonhavenresort.lc@gmail.com within 48 hours of confirmation. This ensures your dates are officially locked in!",
        },
        {
            target: '#tour-recent',
            title: '📜 Recent Activity',
            content: 'The Recent Bookings section shows the most recent activity on the trailer.',
        },
        {
            target: '#tour-schedule',
            title: '📅 2026 Season Schedule',
            content: 'Finally, the Season Schedule shows the full order for both Round 1 and Round 2 (Snake order).',
        },
    ];

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            localStorage.setItem('hhr_tour_seen', 'true');
            setRun(false);
        }
    };

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={steps}
            styles={{
                options: {
                    primaryColor: 'hsl(var(--primary))',
                    textColor: 'hsl(var(--foreground))',
                    backgroundColor: 'hsl(var(--background))',
                    arrowColor: 'hsl(var(--background))',
                    zIndex: 1000,
                },
                buttonNext: {
                    backgroundColor: 'hsl(var(--primary))',
                    borderRadius: 'var(--radius)',
                    fontSize: '14px',
                },
                buttonBack: {
                    marginRight: 10,
                    fontSize: '14px',
                },
                tooltipTitle: {
                    fontWeight: 'bold',
                    fontSize: '18px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                },
                tooltipContent: {
                    fontSize: '14px',
                    lineHeight: '1.5',
                },
                spotlight: {
                    borderRadius: '12px',
                }
            }}
            spotlightPadding={10}
        />
    );
}
