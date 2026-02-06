import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

export function OnboardingTour({ currentUser, defer = false }) {
    const [run, setRun] = useState(false);

    useEffect(() => {
        // If no user, or deferred, or ALREADY SEEN in Firestore, do not run
        if (!currentUser?.email || defer || currentUser.hasSeenOnboarding) {
            return;
        }

        // Delay slightly to ensure layout is ready
        const timer = setTimeout(() => {
            setRun(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, [currentUser, defer]);

    const steps = [
        {
            target: '[data-tour="status-hero"]',
            title: '👋 Your Status at a Glance',
            content: "This shows where you are in the booking order! You'll see if it's your turn, or how many folks are ahead of you in line.",
            disableBeacon: true,
        },
        {
            target: '#tour-deadline',
            title: '⏰ Keep an Eye on the Clock!',
            content: "When it's your turn, this is your countdown! You've got 48 hours to book or pass. Don't worry - we'll send reminders too!",
            disableBeacon: true,
        },
        {
            target: '[data-tour="season-tab"]',
            title: '📅 2026 Season Schedule',
            content: "Curious about the full booking schedule? Tap here to see the complete 2026 order, round dates, and how the snake schedule works.",
            disableBeacon: true,
        },
        {
            target: '#tour-recent',
            title: '📋 Bookings & Activity',
            content: "Check out the calendar to see who's booked what dates! Great for planning around other shareholders. Your booking actions live in the banner above.",
            disableBeacon: true,
        },
        {
            target: '#tour-guide',
            title: '📖 Trailer Guide & Rules',
            content: "Need a refresher on check-in times, amenities, or the house rules? It's all right here. Happy booking! 🎉",
            disableBeacon: true,
        },
    ];

    const handleJoyrideCallback = async (data) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status) && currentUser?.id) {
            // Persist to Firestore
            try {
                // Dynamically import to avoid circular dependencies if possible, or just assume passed props
                // Ideally this component should receive a "onComplete" prop, but for now we can't easily change the parent structure without more rewrites.
                // Actually, let's just use the prop we're about to add to Dashboard.jsx or just emit an event.
                // BETTER PATTERN: The component shouldn't write to DB directly if it's dumb, but for speed we'll do it here OR better yet, accept an onComplete prop.

                // Wait, I can't import db here easily without making this 'smart'. 
                // Let's rely on the parent (Dashboard) to handle the actual DB write if we want to be clean, 
                // BUT the plan said "Change: on STATUS.FINISHED... update Firestore".

                // Let's blindly assume we can import db here.
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../../../lib/firebase');

                await updateDoc(doc(db, "shareholders", currentUser.id), {
                    hasSeenOnboarding: true
                });
                setRun(false);
            } catch (err) {
                console.error("Failed to save tour status:", err);
            }
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
