import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * BaseModal Component
 * A highly reusable, accessible modal shell with standard animations and backdrop.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controlled open state
 * @param {function} props.onClose - Function to call on close (Escape, backdrop click, or X button)
 * @param {string} props.title - Optional modal title
 * @param {string} props.description - Optional modal description
 * @param {string} props.maxSize - Tailwind maxWidth class (default: 'max-w-md')
 * @param {boolean} props.showClose - Whether to show the X close button (default: true)
 * @param {boolean} props.closeOnBackdrop - Whether to close on backdrop click (default: true)
 * @param {children} props.children - Modal content
 */
export function BaseModal({
    isOpen,
    onClose,
    title,
    description,
    maxSize = 'max-w-md',
    showClose = true,
    closeOnBackdrop = true,
    containerClassName = '',
    scrollable = true,
    footer,
    children
}) {
    const [shouldRender, setShouldRender] = useState(isOpen);

    // ... (keep existing effects) ...

    return createPortal(
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div
                className={`fixed inset-0 ${isOpen ? '' : 'pointer-events-none'}`}
                onClick={closeOnBackdrop ? onClose : undefined}
            />

            <div className={`bg-white rounded-2xl shadow-xl w-full ${maxSize} relative z-10 
                animate-in zoom-in-95 fade-in duration-200 
                flex flex-col max-h-[90vh]
                ${containerClassName}
                ${!isOpen ? 'animate-out zoom-out-95 fade-out' : ''}`}>

                {/* Header */}
                {(title || showClose) && (
                    <div className="flex items-center justify-between p-6 pb-2 shrink-0">
                        <div>
                            {title && <h3 className="text-xl font-bold text-slate-900 leading-none">{title}</h3>}
                            {description && <p className="text-sm text-slate-500 mt-1.5">{description}</p>}
                        </div>
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className={`p-6 ${title ? 'pt-4' : ''} ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    {children}
                </div>

                {/* Sticky Footer */}
                {footer && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
