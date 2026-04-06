import React, { useState } from 'react';
import {
    Waves, Mountain, Music, UtensilsCrossed, ShoppingBag, Compass,
    MapPin, ExternalLink, Calendar, Clock, ChevronDown, ChevronUp,
    Sun, TreePine, Fish, Bike, Wine, Camera, Ticket, Star
} from 'lucide-react';

// ============================================================
// DATA: Curated Lake Cowichan Summer 2026 Content
// ============================================================

const FESTIVALS = [
    {
        name: "Cowichan Valley Bluegrass Festival",
        dates: "June 19 - 21, 2026",
        location: "Laketown Ranch, Lake Cowichan",
        description: "The 25th anniversary edition of the beloved Bluegrass Festival! Enjoy three days of international and local bluegrass, old-time, and folk music alongside camping, workshops, and community jams.",
        highlight: "25th Anniversary!",
        url: "https://cowichanbluegrass.com",
        color: "amber"
    },
    {
        name: "Sunfest Country Music Festival",
        dates: "July 30 - August 2, 2026",
        location: "Laketown Ranch, Lake Cowichan",
        description: "Vancouver Island's biggest country music festival. Four days of incredible live performances, camping under the stars, and lakeside vibes.",
        lineup: ["Tyler Hubbard", "Jon Pardi", "Riley Green", "James Barker Band", "Nate Smith"],
        url: "https://sunfestconcerts.com",
        color: "rose"
    },
    {
        name: "Cowichan Valley Wine Festival",
        dates: "August 1 - 31, 2026",
        location: "Cowichan Valley Wineries",
        description: "A month-long self-guided wine tasting experience across the valley's finest wineries. Purchase a pass and explore Pinot Gris, Pinot Noir, Ortega, and more at your own pace.",
        url: "https://cowichanwineries.com",
        color: "purple"
    }
];

const WATER_ACTIVITIES = [
    {
        name: "River Tubing",
        provider: "The Tube Shack",
        description: "Float 2.5 - 3 hours down the beautiful Cowichan River. Tube rental includes shuttle service back to start.",
        price: "From ~$20/person",
        tip: "Book ahead on weekends. Bring water shoes and sunscreen!",
        icon: Waves,
        url: "https://cowichanriver.com"
    },
    {
        name: "Kayak & SUP Rentals",
        provider: "Kaatza Adventures",
        description: "Explore the lake by single/double kayak, canoe, or stand-up paddleboard. Gear and PFDs included.",
        price: "From ~$30/hour",
        tip: "Full-day rates available (~$80). Online booking recommended.",
        icon: Compass,
        url: "https://kaatzaadventures.com"
    },
    {
        name: "Paddleboard at Gordon Bay",
        provider: "Pristine Paddleboard Adventures",
        description: "Located right in Gordon Bay Provincial Park near Honeymoon Bay. SUP, kayak, and canoe rentals on the water.",
        price: "From ~$30/hour",
        tip: "Perfect if you're already camping or visiting Gordon Bay beach.",
        icon: Sun,
        url: "https://pristinepaddleboard.com"
    },
    {
        name: "Fishing",
        provider: "Local Guides Available",
        description: "Cowichan Lake and River are renowned for rainbow trout, cutthroat trout, and bass fishing. Guided trips available.",
        price: "Varies by guide",
        tip: "Check BC fishing regulations and get your freshwater license before heading out.",
        icon: Fish,
        url: null
    }
];

const SWIMMING_SPOTS = [
    {
        name: "Arbutus Park (Youbou)",
        description: "Popular family beach with sandy shore, floating dock, lifeguard in summer, playground, and picnic areas.",
        vibe: "Family Favorite"
    },
    {
        name: "Gordon Bay Provincial Park",
        description: "Large sandy beach in Honeymoon Bay with marked swimming area, shade trees, boat launch, and 126-site campground.",
        vibe: "Full Day Destination"
    },
    {
        name: "The Duck Pond (Riverside Park)",
        description: "Town of Lake Cowichan near the control weir. Sandy beach, floating dock, perfect for small kids. Great tubing launch point.",
        vibe: "Kid-Friendly"
    }
];

const HIKING_TRAILS = [
    {
        name: "Bald Mountain (Peninsula)",
        difficulty: "Moderate",
        time: "2 - 3 hours",
        description: "Beautiful switchback trail with panoramic lake views at the summit. One of the area's most rewarding hikes."
    },
    {
        name: "Christopher Rock (Youbou)",
        difficulty: "Easy-Moderate",
        time: "20 - 30 min",
        description: "Short but steep scramble with stunning views of the entire lake. Quick and worth it."
    },
    {
        name: "Cowichan River Footpath",
        difficulty: "Easy",
        time: "1 - 4 hours",
        description: "Multi-kilometer trail along the river with scenic banks, swimming holes, and access near Skutz Falls."
    },
    {
        name: "Robertson River Falls",
        difficulty: "Moderate",
        time: "1.5 - 2 hours",
        description: "Beautiful waterfall hike. Getting to the base of the falls can be challenging - stay on marked paths."
    },
    {
        name: "Kinsol Trestle",
        difficulty: "Easy",
        time: "40 min round trip",
        description: "One of the world's tallest free-standing timber railway trestles. Easy 1.2km walk from parking. Wheelchair accessible. Free!",
        highlight: true
    }
];

const DINING = [
    {
        name: "Jake's at the Lake",
        type: "Waterfront Grill",
        description: "West Coast classics - fish tacos, salads, poutine. Beautiful lake views and outdoor patio.",
        vibe: "🌊 Lakeside Dining"
    },
    {
        name: "Youbou Bar & Grill",
        type: "Pub & Comfort Food",
        description: "Incredible patio views of the lake. Burgers, pizza, and sandwiches done right.",
        vibe: "🍔 Local Favorite"
    },
    {
        name: "The Riverside Pub + River Cafe",
        type: "Pub & Cafe",
        description: "Right on the Cowichan River. Pub-style menu, local craft beers, family-friendly until 9 PM.",
        vibe: "🍺 Riverside Vibes"
    },
    {
        name: "The Cow Restaurant",
        type: "Family Restaurant",
        description: "Family-run Lake Cowichan favorite with dog-friendly patio. Burgers, brunch, fresh salads, and daily specials from local ingredients.",
        vibe: "🐄 Dog-Friendly"
    },
    {
        name: "Poblanos",
        type: "Mexican",
        description: "Quick and flavorful Mexican food. Perfect stop after a day of tubing.",
        vibe: "🌮 Quick Bite"
    },
    {
        name: "Garden Made",
        type: "Health & Wellness",
        description: "Smoothies, bubble tea, and healthy eats in a unique biophilic design cafe.",
        vibe: "🥤 Healthy Fuel"
    }
];

const MARKETS = [
    {
        name: "Honeymoon Bay Outdoor Market",
        schedule: "Saturdays, Victoria Day - Thanksgiving",
        location: "10052 South Shore Road, Honeymoon Bay",
        description: "Local vendors, crafts, produce, and a warm community atmosphere right near the resort."
    },
    {
        name: "Duncan Farmers' Market",
        schedule: "Saturdays, Year-Round",
        location: "Craig & Ingram Streets, Downtown Duncan",
        description: "One of the largest markets in the region. Local produce, artisan foods, crafts, and baked goods."
    },
    {
        name: "Chemainus Wednesday Market",
        schedule: "Wednesdays, Mid-May - Mid-September",
        location: "Waterwheel Park, Chemainus",
        description: "Charming mid-week market in the famous mural town."
    }
];

// ============================================================
// SECTION COMPONENTS
// ============================================================

function SectionHeader({ icon: Icon, title, subtitle, color = "blue" }) {
    const colorMap = {
        blue: "bg-blue-100 text-blue-600",
        emerald: "bg-emerald-100 text-emerald-600",
        amber: "bg-amber-100 text-amber-600",
        rose: "bg-rose-100 text-rose-600",
        purple: "bg-purple-100 text-purple-600",
        cyan: "bg-cyan-100 text-cyan-600",
        orange: "bg-orange-100 text-orange-600",
    };

    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
        </div>
    );
}

function FestivalCard({ festival }) {
    const colorMap = {
        amber: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", accent: "text-amber-600" },
        rose: { bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700", accent: "text-rose-600" },
        purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", accent: "text-purple-600" },
    };
    const c = colorMap[festival.color] || colorMap.amber;

    return (
        <div className={`${c.bg} border ${c.border} rounded-xl p-5 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-bold text-slate-900">{festival.name}</h4>
                        {festival.highlight && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
                                <Star className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                                {festival.highlight}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">{festival.dates}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{festival.location}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{festival.description}</p>
                    {festival.lineup && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {festival.lineup.map(artist => (
                                <span key={artist} className="text-xs font-medium bg-white/80 border border-slate-200 px-2 py-1 rounded-md text-slate-700">
                                    {artist}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {festival.url && (
                <a
                    href={festival.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 mt-4 text-sm font-bold ${c.accent} hover:underline`}
                >
                    <Ticket className="w-3.5 h-3.5" />
                    Get Tickets / More Info
                    <ExternalLink className="w-3 h-3" />
                </a>
            )}
        </div>
    );
}

function ActivityCard({ activity }) {
    const Icon = activity.icon;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-cyan-300 transition-all">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900">{activity.name}</h4>
                    <p className="text-xs text-slate-400 font-medium mb-2">{activity.provider}</p>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">{activity.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                            {activity.price}
                        </span>
                    </div>
                    {activity.tip && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-md">
                            💡 {activity.tip}
                        </p>
                    )}
                    {activity.url && (
                        <a href={activity.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-cyan-600 hover:underline">
                            Visit Website <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const SECTIONS = [
    { id: 'festivals', label: 'Festivals', icon: Music, color: 'amber' },
    { id: 'water', label: 'On the Water', icon: Waves, color: 'cyan' },
    { id: 'hiking', label: 'Hiking', icon: Mountain, color: 'emerald' },
    { id: 'dining', label: 'Dining', icon: UtensilsCrossed, color: 'orange' },
    { id: 'markets', label: 'Markets', icon: ShoppingBag, color: 'purple' },
];

export function LakeCowichanEvents() {
    const [activeSection, setActiveSection] = useState('festivals');

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Sun className="w-8 h-8 text-amber-500" />
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">What's Happening This Summer</h2>
                    <p className="text-sm text-slate-500">Lake Cowichan & Cowichan Valley - Summer 2026</p>
                </div>
            </div>

            {/* Section Pills */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="flex border-b overflow-x-auto">
                    {SECTIONS.map(section => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        const colorClasses = {
                            amber: isActive ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500' : '',
                            cyan: isActive ? 'bg-cyan-50 text-cyan-700 border-b-2 border-cyan-500' : '',
                            emerald: isActive ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : '',
                            orange: isActive ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : '',
                            purple: isActive ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-500' : '',
                        };

                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`flex-1 py-3 md:py-4 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 font-bold text-xs md:text-sm uppercase tracking-wider transition-colors ${
                                    isActive
                                        ? colorClasses[section.color]
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-center">{section.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 md:p-8">

                    {/* FESTIVALS */}
                    {activeSection === 'festivals' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <SectionHeader
                                icon={Music}
                                title="Summer Festivals"
                                subtitle="Major events at Laketown Ranch and across the valley"
                                color="amber"
                            />
                            <div className="grid gap-4">
                                {FESTIVALS.map(f => <FestivalCard key={f.name} festival={f} />)}
                            </div>
                        </div>
                    )}

                    {/* ON THE WATER */}
                    {activeSection === 'water' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <SectionHeader
                                icon={Waves}
                                title="On the Water"
                                subtitle="Tubing, kayaking, paddleboarding, fishing, and swimming"
                                color="cyan"
                            />

                            {/* Activities */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {WATER_ACTIVITIES.map(a => <ActivityCard key={a.name} activity={a} />)}
                            </div>

                            {/* Swimming Spots */}
                            <div className="mt-8">
                                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Sun className="w-4 h-4 text-cyan-500" />
                                    Best Swimming Spots
                                </h4>
                                <div className="grid md:grid-cols-3 gap-3">
                                    {SWIMMING_SPOTS.map(spot => (
                                        <div key={spot.name} className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-bold text-cyan-600 bg-white/70 px-2 py-0.5 rounded-full border border-cyan-200">{spot.vibe}</span>
                                            </div>
                                            <h5 className="font-bold text-slate-900 text-sm">{spot.name}</h5>
                                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{spot.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HIKING */}
                    {activeSection === 'hiking' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <SectionHeader
                                icon={Mountain}
                                title="Hiking & Trails"
                                subtitle="Trails maintained by the Cowichan Lake Trail Blazers"
                                color="emerald"
                            />
                            <div className="space-y-3">
                                {HIKING_TRAILS.map(trail => (
                                    <div
                                        key={trail.name}
                                        className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                                            trail.highlight
                                                ? 'bg-emerald-50 border-emerald-300'
                                                : 'bg-white border-slate-200 hover:border-emerald-300'
                                        }`}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900">{trail.name}</h4>
                                                {trail.highlight && (
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                        Must-See
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                    trail.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                                    trail.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {trail.difficulty}
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {trail.time}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{trail.description}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-4">
                                Trail info maintained by <a href="https://cowichanlaketrailblazers.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium">Cowichan Lake Trail Blazers</a>. Always check conditions before heading out.
                            </p>
                        </div>
                    )}

                    {/* DINING */}
                    {activeSection === 'dining' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <SectionHeader
                                icon={UtensilsCrossed}
                                title="Where to Eat"
                                subtitle="Local restaurants, cafes, and pubs around the lake"
                                color="orange"
                            />
                            <div className="grid md:grid-cols-2 gap-3">
                                {DINING.map(spot => (
                                    <div key={spot.name} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-orange-300 transition-all">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900">{spot.name}</h4>
                                            <span className="text-xs shrink-0">{spot.vibe}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium mb-2">{spot.type}</p>
                                        <p className="text-sm text-slate-600 leading-relaxed">{spot.description}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                💡 Summer is peak season - call ahead for reservations, especially for waterfront patios on weekends.
                            </p>
                        </div>
                    )}

                    {/* MARKETS */}
                    {activeSection === 'markets' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <SectionHeader
                                icon={ShoppingBag}
                                title="Farmers Markets"
                                subtitle="Make it, Bake it, Grow it - local produce, crafts, and more"
                                color="purple"
                            />
                            <div className="space-y-4">
                                {MARKETS.map(market => (
                                    <div key={market.name} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-purple-300 transition-all">
                                        <h4 className="font-bold text-slate-900 mb-2">{market.name}</h4>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-md">
                                                <Calendar className="w-3 h-3" />
                                                {market.schedule}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                <MapPin className="w-3 h-3" />
                                                {market.location}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{market.description}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Wine Tours */}
                            <div className="bg-gradient-to-br from-purple-50 to-rose-50 border border-purple-200 rounded-xl p-5 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wine className="w-5 h-5 text-purple-600" />
                                    <h4 className="font-bold text-slate-900">Cowichan Valley Wine Tours</h4>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                                    Vancouver Island's premier wine region! Self-guided or hop on a guided tour from local operators. Popular stops include Blue Grouse Estate, Unsworth Vineyards, and boutique producers.
                                </p>
                                <a
                                    href="https://cowichanwineries.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:underline"
                                >
                                    <Wine className="w-3.5 h-3.5" />
                                    Explore Wineries
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-slate-400 text-center px-4">
                Info curated for HHR shareholders. Dates and prices are subject to change - always confirm with official sources before your visit.
            </p>
        </div>
    );
}
