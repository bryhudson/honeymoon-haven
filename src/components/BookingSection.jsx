import emailjs from '@emailjs/browser';

// ... (previous imports)

export function BookingSection() {
    // ... (previous state)

    // REPLACE WITH YOUR EMAILJS KEYS
    const SERVICE_ID = "service_7e1orcn";
    const TEMPLATE_ID = "8pah8ln";
    const PUBLIC_KEY = "27gUSecpTorLBXE8z";

    const handleBook = () => {
        if (selectedRange?.from && selectedRange?.to) {
            if (isTooLong) {
                return;
            }
            if (!formData.partyName || !formData.email) {
                alert('Please fill in all required fields.');
                return;
            }

            const newBooking = {
                ...selectedRange,
                ...formData
            };

            // Send Email using EmailJS
            const templateParams = {
                to_email: formData.email,
                party_name: formData.partyName,
                cabin_number: formData.cabinNumber || "Not specified",
                check_in: format(selectedRange.from, 'PPP'),
                check_out: format(selectedRange.to, 'PPP'),
                guests: formData.guests,
                total_price: totalPrice,
                message: "Thank you for booking with Honeymoon Haven Resort!"
            };

            emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
                .then((response) => {
                    console.log('EMAIL SUCCESS!', response.status, response.text);
                    // Only confirm booking if email sends successfully (optional, or do both)
                }, (err) => {
                    console.log('EMAIL FAILED...', err);
                    alert('Note: Confirmation email failed to send, but your booking is saved locally.');
                });

            setBookedDates([...bookedDates, newBooking]);
            setShowConfirmation(true);
        }
    };

    // ... (rest of component)

    const handleCloseConfirmation = () => {
        setShowConfirmation(false);
        setSelectedRange(undefined);
        setFormData({
            cabinNumber: '',
            partyName: '',
            guests: 1,
            email: ''
        });
    };

    const handleReset = () => {
        setSelectedRange(undefined);
    };

    return (
        <section id="book" className="py-20 bg-muted/30 relative">
            {showConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-bold mb-4">Booking Confirmed!</h3>
                        <p className="text-muted-foreground mb-6">
                            Thank you for booking with Honeymoon Haven Resort. An email has been sent to <span className="font-semibold text-foreground">{formData.email}</span> with confirmation details and the rules for your stay.
                        </p>

                        <div className="bg-muted/40 rounded-md p-4 mb-6 text-sm">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <span className="text-muted-foreground">Party Name:</span>
                                <span className="font-medium">{formData.partyName}</span>

                                <span className="text-muted-foreground">Dates:</span>
                                <span className="font-medium">{format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d')}</span>

                                {formData.cabinNumber && (
                                    <>
                                        <span className="text-muted-foreground">Cabin:</span>
                                        <span className="font-medium">{formData.cabinNumber}</span>
                                    </>
                                )}

                                <span className="text-muted-foreground">Guests:</span>
                                <span className="font-medium">{formData.guests}</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                <span>Total Paid</span>
                                <span>${totalPrice.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                <p className="mb-2 font-medium text-foreground">Next Steps:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Check your email for the trailer rules and check-in instructions.</li>
                                    <li>Review the cleaning checklist for checkout.</li>
                                </ul>
                            </div>
                            <button
                                onClick={handleCloseConfirmation}
                                className="w-full rounded-md bg-primary py-2 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Book Your Stay</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Select your check-in and check-out dates. Maximum stay is 7 nights.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-12 justify-center items-start">
                    <div className="p-6 bg-card rounded-xl shadow-lg border">
                        <DayPicker
                            mode="range"
                            selected={selectedRange}
                            onSelect={handleSelectRange}
                            disabled={isBooked}
                            modifiers={{
                                booked: isBooked
                            }}
                            modifiersStyles={{
                                booked: { textDecoration: 'line-through', color: 'gray' }
                            }}
                            className="p-4"
                        />
                    </div>

                    <div className="flex-1 max-w-md space-y-6">
                        <div className="p-6 bg-card rounded-xl shadow-lg border">
                            <h3 className="text-xl font-semibold mb-4 flex justify-between items-center">
                                <span>Booking Details</span>
                                <button
                                    onClick={handleReset}
                                    className="text-sm text-muted-foreground hover:text-primary underline"
                                >
                                    Reset
                                </button>
                            </h3>

                            {selectedRange?.from && selectedRange?.to ? (
                                <div className="space-y-4">
                                    {isTooLong && (
                                        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                                            Maximum stay is 7 nights. Please select a shorter range.
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Cabin Number</label>
                                                <input
                                                    type="text"
                                                    name="cabinNumber"
                                                    value={formData.cabinNumber}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    placeholder="Optional"
                                                    disabled={isTooLong}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-medium text-muted-foreground">Guests</label>
                                                <input
                                                    type="number"
                                                    name="guests"
                                                    min="1"
                                                    max="6"
                                                    value={formData.guests}
                                                    onChange={handleInputChange}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    disabled={isTooLong}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Party Name</label>
                                            <input
                                                type="text"
                                                name="partyName"
                                                value={formData.partyName}
                                                onChange={handleInputChange}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="e.g. The Smith Family"
                                                disabled={isTooLong}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                placeholder="name@example.com"
                                                disabled={isTooLong}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 space-y-2">
                                        <div className="flex justify-between py-1">
                                            <span className="text-muted-foreground">Dates</span>
                                            <span className="font-medium text-sm">
                                                {format(selectedRange.from, 'MMM d')} - {format(selectedRange.to, 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-muted-foreground">Rate</span>
                                            <span className="font-medium">$125.00 / night</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span className="text-muted-foreground">Duration</span>
                                            <span className="font-medium">{nights} Nights</span>
                                        </div>
                                        <div className="flex justify-between py-2 text-lg font-bold border-t mt-2">
                                            <span>Total</span>
                                            <span>${totalPrice.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleBook}
                                        disabled={isTooLong}
                                        className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirm Booking
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>Select a date range on the calendar to see pricing and availability.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
