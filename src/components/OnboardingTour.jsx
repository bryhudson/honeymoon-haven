import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

export function OnboardingTour({ currentUser }) {
    const [run, setRun] = useState(false);

    useEffect(() => {
        if (!currentUser?.email) return;

        const storageKey = `hhr_tour_seen_${currentUser.email}`;
        const hasSeenTour = localStorage.getItem(storageKey);

        if (!hasSeenTour) {
            // Delay slightly to ensure layout is ready
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentUser]);

    const steps = [
        {
            target: '#tour-status',
            title: '👀 Your Queue Position',
            content: "Check here to see exactly where you stand in line (e.g., 'You are Up Next!'). We've also added a clear countdown so you know when the current turn ends.",
            disableBeacon: true,
        },
        {
            target: '#tour-actions',
            title: '⚡ Take Action',
            content: "When it's your turn, the 'Start Booking' button will appear here. You can also finalize your draft or review booking details directly from this panel.",
            disableBeacon: true,
        },
        {
            target: '#tour-recent',
            title: '📜 Recent Activity',
            content: 'Click here to see who has booked recently. If you have an active booking, you can also modify or cancel it from here.',
            disableBeacon: true,
        },
        {
            target: '#tour-schedule',
            title: '📅 New Season Schedule',
            content: "Scroll down to see the revamped schedule. We've added a helpful 'How it Works' section that explains the 10:00 AM start time and Early Access rules!",
            disableBeacon: true,
        },
    ];

    const handleJoyrideCallback = (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status) && currentUser?.email) {
            const storageKey = `hhr_tour_seen_${currentUser.email}`;
            localStorage.setItem(storageKey, 'true');
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
