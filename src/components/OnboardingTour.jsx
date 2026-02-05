import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

export function OnboardingTour({ currentUser, defer = false }) {
    const [run, setRun] = useState(false);

    useEffect(() => {
        if (!currentUser?.email || defer) return;

        const storageKey = `hhr_tour_seen_${currentUser.email}`;
        const hasSeenTour = localStorage.getItem(storageKey);

        if (!hasSeenTour) {
            // Delay slightly to ensure layout is ready
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentUser, defer]);

    const steps = [
        {
            target: '#tour-status',
            title: '👋 Your Status at a Glance',
            content: "This shows where you are in the draft! You'll see if it's your turn, or how many folks are ahead of you in line.",
            disableBeacon: true,
        },
        {
            target: '#tour-deadline',
            title: '⏰ Keep an Eye on the Clock!',
            content: "When it's your turn, this is your countdown! You've got 48 hours to book or pass. Don't worry - we'll send reminders too!",
            disableBeacon: true,
        },
        {
            target: '#tour-schedule',
            title: '📅 2026 Season Schedule',
            content: "Curious about the full draft order? Tap here to see the complete 2026 schedule, round dates, and how the snake draft works.",
            disableBeacon: true,
        },
        {
            target: '#tour-recent',
            title: '📋 Bookings & Activity',
            content: "See who's booked what! You can also view, modify, or cancel your own bookings right from this tab. Super handy!",
            disableBeacon: true,
        },
        {
            target: '#tour-guide',
            title: '📖 Trailer Guide & Rules',
            content: "Need a refresher on check-in times, amenities, or the house rules? It's all right here. Happy booking! 🎉",
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
            scrollIntoViewOptions={{ block: 'center' }}
            scrollOffset={150}
        />
    );
}
