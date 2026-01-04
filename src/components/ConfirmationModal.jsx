import React from 'react';

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, isDanger, confirmText = "Confirm", showCancel = true }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-destructive' : 'text-foreground'}`}>
                    {title}
                </h3>
                <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-md hover:bg-muted font-medium text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`px-4 py-2 rounded-md font-bold text-white text-sm shadow-sm transition-colors ${isDanger ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
