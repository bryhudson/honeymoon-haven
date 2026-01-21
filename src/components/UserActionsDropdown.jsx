import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Edit, Key, Trash2, Eye } from 'lucide-react';

export function UserActionsDropdown({ user, onEdit, onPassword, onDelete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    // Toggle logic
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
                left: rect.right - 180 // Width of menu approx
            });
            setIsOpen(true);
        }
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = () => setIsOpen(false);
        if (isOpen) window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [isOpen]);

    // Scroll to close
    useEffect(() => {
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    const handleViewAs = () => {
        setIsOpen(false);
        window.location.href = `#/?masquerade=${encodeURIComponent(user.name)}`;
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggle}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
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
                    <div className="py-1" role="menu">
                        <button
                            onClick={handleViewAs}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            View as Shareholder
                        </button>
                        <div className="border-t border-slate-100"></div>
                        <button
                            onClick={() => { setIsOpen(false); onEdit(user); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Email
                        </button>
                        <button
                            onClick={() => { setIsOpen(false); onPassword(user); }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-2"
                        >
                            <Key className="w-4 h-4" />
                            Change Password
                        </button>
                        <button
                            onClick={() => { setIsOpen(false); onDelete(user); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete User
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
