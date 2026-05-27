import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Caravan, ArrowRight } from 'lucide-react';
import '../styles/demo.css';

// The walkthrough video is hosted in the GitHub repo (kept out of the Firebase
// deploy bundle to keep hosting lightweight). The /demo page links to it rather
// than embedding the ~80MB file.
const DEMO_VIDEO_URL = 'https://github.com/bryhudson/honeymoon-haven/blob/main/media/hhr-demo.mp4';

export function DemoPage() {
    return (
        <div className="demo-page">
            {/* Ambient background */}
            <div className="demo-bg" />

            <div className="demo-content">
                {/* Header */}
                <div className="demo-header">
                    <div className="demo-logo">
                        <Caravan className="demo-logo-icon" />
                        <span>Honeymoon Haven Resort</span>
                    </div>
                </div>

                {/* Title Section */}
                <div className="demo-title-section">
                    <h1 className="demo-title">See the Booking App in Action</h1>
                    <p className="demo-subtitle">
                        Watch a quick walkthrough of how to browse, book, and manage your trailer reservations.
                    </p>
                </div>

                {/* Demo video - hosted on GitHub to keep the app lightweight */}
                <div className="demo-player-wrapper">
                    <a
                        href={DEMO_VIDEO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="demo-player"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer' }}
                    >
                        <div className="demo-play-btn">
                            <Play size={40} style={{ marginLeft: 4 }} />
                        </div>
                        <p className="demo-play-label">Watch the demo on GitHub</p>
                    </a>
                </div>

                {/* CTA */}
                <div className="demo-cta-section">
                    <Link to="/login" className="demo-cta-btn">
                        Sign In to Your Account
                        <ArrowRight size={18} />
                    </Link>
                    <p className="demo-cta-hint">
                        Already have an account? Sign in to start booking.
                    </p>
                </div>

                {/* Footer */}
                <footer className="demo-footer">
                    <p>&copy; {new Date().getFullYear()} Honeymoon Haven Resort</p>
                </footer>
            </div>
        </div>
    );
}
