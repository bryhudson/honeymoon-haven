import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit, Ban } from 'lucide-react';

export function ActionsDropdown({ onEdit, onCancel, isCancelled }) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    // Calculate position and toggle
    const toggle = (e) => {
        e.stopPropagation();
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Position for FIXED (Viewport-relative):
            // Top = bottom of button rect (no scroll added)
            // Left = right of button rect - menu width (no scroll added)
            setPosition({
                top: rect.bottom + 5,
                left: rect.right - 192
            });
            setIsOpen(true);
        }
    };

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (buttonRef.current && !buttonRef.current.contains(event.target)) {
                // If checking inside the portal, we might need a ref for the menu too, 
                // but since the menu is in a portal, event.target might not be contained in buttonRef logic easily.
                // Simpler: Just close on any click window-wide, stopping prop on menu click.
                setIsOpen(false);
            }
        }

        if (isOpen) {
            // Add a slight delay or ensure this doesn't fire immediately on the toggle click? 
            // Toggle click stops propagation so we are good.
            window.addEventListener("click", handleClickOutside);
        }

        return () => {
            window.removeEventListener("click", handleClickOutside);
        };
    }, [isOpen]);

    // Handle scroll to close (simple fix for floating elements)
    useEffect(() => {
        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };
        window.addEventListener('scroll', handleScroll, true); // Capture phase for all scrolling elements
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggle}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Actions"
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && createPortal(
                <div
                    className="fixed z-[9999] w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-75"
                    style={{ top: position.top, left: position.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {/* Edit Action */}
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onEdit && onEdit();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                            role="menuitem"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Details
                        </button>

                        {/* Cancel Action (if not already cancelled) */}
                        {!isCancelled && onCancel && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onCancel && onCancel();
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 border-t border-slate-100"
                                role="menuitem"
                            >
                                <Ban className="w-4 h-4" />
                                Cancel Booking
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
