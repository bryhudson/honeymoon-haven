import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * Generic Portal-based Dropdown Menu
 * @param {Object} props
 * @param {React.ReactNode} props.trigger - Custom trigger element (default: MoreVertical button)
 * @param {Array} props.items - Array of menu items { label, icon: IconComponent, onClick, className, divider, danger, hidden }
 * @param {string} props.align - Alignment 'left' or 'right' (default: 'right')
 * @param {number} props.width - Menu width in pixels (default: 192)
 */
export function MenuDropdown({
    trigger,
    items = [],
    align = 'right',
    width = 192
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    const toggle = (e) => {
        e.stopPropagation();
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 5,
                left: align === 'right' ? rect.right - width : rect.left
            });
            setIsOpen(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = () => setIsOpen(false);
        if (isOpen) window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    const visibleItems = items.filter(item => !item.hidden);

    return (
        <div className="relative inline-block">
            <div ref={buttonRef} onClick={toggle}>
                {trigger || (
                    <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    className="fixed z-[9999] rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-75"
                    style={{ top: position.top, left: position.left, width: `${width}px` }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="py-1" role="menu">
                        {visibleItems.map((item, idx) => (
                            <React.Fragment key={idx}>
                                {item.divider && <div className="border-t border-slate-100 my-1"></div>}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsOpen(false);
                                        item.onClick && item.onClick();
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${item.danger
                                            ? 'text-red-600 hover:bg-red-50'
                                            : item.className || 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                                        }`}
                                >
                                    {item.icon && <item.icon className="w-4 h-4" />}
                                    {item.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
