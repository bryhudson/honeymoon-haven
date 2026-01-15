import React, { useState, useEffect } from 'react';

export function PromptModal({ isOpen, onClose, onConfirm, title, message, placeholder = "", defaultValue = "", confirmText = "Confirm", cancelText = "Cancel", inputType = "text" }) {
    const [value, setValue] = useState(defaultValue);

    // Reset value when modal opens
    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(value);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                <h3 className="text-lg font-bold mb-2 text-foreground">
                    {title}
                </h3>
                <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                    {message}
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type={inputType}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-6"
                        autoFocus
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-md hover:bg-muted font-medium text-sm transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-md font-bold text-white text-sm shadow-sm transition-colors bg-primary hover:bg-primary/90"
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
