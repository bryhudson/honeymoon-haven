import React from 'react';
import { Wifi, MapPin, Users, Waves } from 'lucide-react';
import { BookingSection } from '../components/BookingSection';


export function Home() {
    return (
        <div className="flex flex-col gap-16 py-10">
            {/* Intro / Header */}
            <section className="text-center space-y-4 pt-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary">
                    HHR Trailer Booking
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Your peaceful lakeside escape.
                </p>
            </section>

            {/* Booking Section */}
            <BookingSection />

            {/* What's Included */}
            <section id="details" className="container mx-auto px-4">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold tracking-tight mb-2">What's Included</h2>
                    <p className="text-muted-foreground">Everything you need for a comfortable stay.</p>
                </div>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-3 rounded-full bg-primary/10 mb-4">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">Sleeps 4-6</h3>
                        <p className="text-sm text-muted-foreground">Comfortable beds for the whole family.</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-3 rounded-full bg-primary/10 mb-4">
                            <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">Prime Location</h3>
                        <p className="text-sm text-muted-foreground">Directly on the water with private dock access.</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-3 rounded-full bg-primary/10 mb-4">
                            <Waves className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">Lake Access</h3>
                        <p className="text-sm text-muted-foreground">Swimming, fishing, and kayaking right at your doorstep.</p>
                    </div>
                    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-3 rounded-full bg-primary/10 mb-4">
                            <Wifi className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2">Modern Amenities</h3>
                        <p className="text-sm text-muted-foreground">WiFi, AC, and full kitchen included.</p>
                    </div>
                </div>
            </section>

            {/* Description Section */}
            <section className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold tracking-tight">A Home Away From Home</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        Our trailer is permanently situated on a beautiful lakeside property, offering the perfect blend of camping vibes and modern comfort.
                        Enjoy your morning coffee on the deck overlooking the water, spend your days swimming or fishing, and gather around the fire pit at night.
                    </p>
                    <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">✓ Full Kitchen</li>
                        <li className="flex items-center gap-2">✓ Private Deck</li>
                        <li className="flex items-center gap-2">✓ Fire Pit</li>
                        <li className="flex items-center gap-2">✓ BBQ Grill</li>
                        <li className="flex items-center gap-2">✓ Air Conditioning</li>
                        <li className="flex items-center gap-2">✓ Free Parking</li>
                    </ul>
                </div>
                <div className="rounded-xl overflow-hidden shadow-xl">
                    <img
                        src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=1000"
                        alt="Camping vibes"
                        className="w-full h-full object-cover"
                    />
                </div>
            </section>

            {/* Guest Guide / Rules */}
            <section className="container mx-auto px-4 bg-muted/20 py-12 rounded-2xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Guest Guide</h2>
                    <p className="text-muted-foreground">Everything you need to know for a smooth stay.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-card p-6 rounded-lg border shadow-sm text-center">
                        <h3 className="font-semibold text-xl mb-2">How to Book</h3>
                        <p className="text-muted-foreground text-sm">Select your dates above. We'll email you to arrange payment via <strong>E-Transfer</strong>. Booking is confirmed once payment is received.</p>
                    </div>
                    <div className="bg-card p-6 rounded-lg border shadow-sm text-center">
                        <h3 className="font-semibold text-xl mb-2">Check-In</h3>
                        <p className="text-muted-foreground text-sm">Check-in is at <strong>3:00 PM</strong>. We will email you the door code and arrival instructions 24 hours before your stay.</p>
                    </div>
                    <div className="bg-card p-6 rounded-lg border shadow-sm text-center">
                        <h3 className="font-semibold text-xl mb-2">Check-Out</h3>
                        <p className="text-muted-foreground text-sm">Check-out is at <strong>11:00 AM</strong>. Please review the cleaning checklist provided in the trailer before you leave.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

