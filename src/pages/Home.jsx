import React from 'react';
import { Wifi, MapPin, Users, Waves } from 'lucide-react';
import { BookingSection } from '../components/BookingSection';

export function Home() {
    return (
        <div className="flex flex-col gap-16 pb-10">
            {/* Hero Section */}
            <section className="relative h-[600px] w-full overflow-hidden">
                <img
                    src="/hero.png"
                    alt="Sunny Lake Cowichan"
                    className="h-full w-full object-cover brightness-75"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 drop-shadow-lg">
                        Escape to the Lake
                    </h1>
                    <p className="text-lg md:text-xl max-w-2xl drop-shadow-md mb-8">
                        Experience tranquility in our cozy lakeside trailer. Perfect for family getaways and peaceful retreats.
                    </p>
                    <a
                        href="#book"
                        className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-lg font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        Book Your Stay
                    </a>
                </div>
            </section>

            {/* Details Section */}
            <section id="details" className="container mx-auto px-4">
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

            <BookingSection />
        </div>
    );
}

