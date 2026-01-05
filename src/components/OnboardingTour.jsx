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
            content: 'This is the Current Booking Status. Each shareholder has a 48-hour window to make their selection. To keep the draft moving, the system will automatically advance to the next person if no action is taken by the deadline.',
            disableBeacon: true,
        },
        {
            target: '#tour-actions',
            content: "When it is your turn, use these buttons to Book or Pass. You will receive an automated email when your turn begins, and a reminder if it's nearing expiration.",
        },
        {
            target: '#tour-recent',
            content: 'The Recent Bookings section shows the most recent activity on the trailer.',
        },
        {
            target: '#tour-schedule',
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
                },
                buttonNext: {
                    backgroundColor: 'hsl(var(--primary))',
                    borderRadius: 'var(--radius)',
                },
                buttonBack: {
                    marginRight: 10,
                },
            }}
        />
    );
}
