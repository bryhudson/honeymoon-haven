import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Maximize, Volume2, VolumeX, Caravan, ArrowRight } from 'lucide-react';
import '../styles/demo.css';

export function DemoPage() {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showOverlay, setShowOverlay] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);

    const handlePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play();
            setIsPlaying(true);
            setHasStarted(true);
            // Hide overlay after a moment
            setTimeout(() => setShowOverlay(false), 800);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    const handleVideoClick = () => {
        if (!hasStarted) {
            handlePlayPause();
            return;
        }
        setShowOverlay(prev => !prev);
        if (isPlaying) {
            videoRef.current?.pause();
            setIsPlaying(false);
        } else {
            videoRef.current?.play();
            setIsPlaying(true);
            setTimeout(() => setShowOverlay(false), 2000);
        }
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (video && video.duration) {
            setProgress((video.currentTime / video.duration) * 100);
        }
    };

    const handleProgressClick = (e) => {
        const video = videoRef.current;
        const bar = e.currentTarget;
        if (!video || !bar) return;
        const rect = bar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    };

    const handleFullscreen = (e) => {
        e.stopPropagation();
        const video = videoRef.current;
        const el = containerRef.current;
        if (!video || !el) return;

        // Try native video fullscreen first (best on mobile), fall back to container
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        } else {
            const target = video.requestFullscreen ? el : el;
            target.requestFullscreen?.() || target.webkitRequestFullscreen?.();
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setShowOverlay(true);
    };

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

                {/* Video Player */}
                <div className="demo-player-wrapper" ref={containerRef}>
                    <div className="demo-player">
                        <video
                            ref={videoRef}
                            className="demo-video"
                            src="/media/hhr-demo.mp4"
                            onTimeUpdate={handleTimeUpdate}
                            onEnded={handleEnded}
                            playsInline
                            preload="metadata"
                            onClick={handleVideoClick}
                        />

                        {/* Play overlay (initial + paused state) */}
                        {showOverlay && (
                            <div className="demo-overlay" onClick={handlePlayPause}>
                                <div className={`demo-play-btn ${hasStarted ? 'demo-play-btn--small' : ''}`}>
                                    {isPlaying ? <Pause size={hasStarted ? 28 : 40} /> : <Play size={hasStarted ? 28 : 40} style={{ marginLeft: hasStarted ? 2 : 4 }} />}
                                </div>
                                {!hasStarted && (
                                    <p className="demo-play-label">Tap to play</p>
                                )}
                            </div>
                        )}

                        {/* Controls bar - stopPropagation prevents pausing video when clicking controls */}
                        {hasStarted && (
                            <div className={`demo-controls ${showOverlay ? 'demo-controls--visible' : ''}`} onClick={(e) => e.stopPropagation()}>
                                {/* Progress bar */}
                                <div className="demo-progress" onClick={(e) => { e.stopPropagation(); handleProgressClick(e); }}>
                                    <div className="demo-progress-fill" style={{ width: `${progress}%` }} />
                                    <div className="demo-progress-thumb" style={{ left: `${progress}%` }} />
                                </div>

                                <div className="demo-controls-row">
                                    <button className="demo-ctrl-btn" onClick={(e) => { e.stopPropagation(); handlePlayPause(); }} aria-label={isPlaying ? "Pause" : "Play"}>
                                        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
                                    </button>

                                    <button className="demo-ctrl-btn" onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }} aria-label={isMuted ? "Unmute" : "Mute"}>
                                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>

                                    <div style={{ flex: 1 }} />

                                    <button className="demo-ctrl-btn" onClick={handleFullscreen} aria-label="Fullscreen">
                                        <Maximize size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
