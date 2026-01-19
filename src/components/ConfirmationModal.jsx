import React from 'react';

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, isDanger, confirmText = "Confirm", showCancel = true, requireTyping = null, closeOnConfirm = true }) {
    const [inputValue, setInputValue] = React.useState("");

    // Reset input when modal opens/closes
    React.useEffect(() => {
        if (isOpen) setInputValue("");
    }, [isOpen]);

    if (!isOpen) return null;

    const isInputValid = !requireTyping || inputValue.toLowerCase() === requireTyping.toLowerCase();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-background border rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-destructive' : 'text-foreground'}`}>
                    {title}
                </h3>
                <p className="text-muted-foreground mb-6 whitespace-pre-wrap">
                    {message}
                </p>

                {requireTyping && (
                    <div className="mb-6 space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Type <span className="font-bold select-all">"{requireTyping}"</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={requireTyping}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                            autoFocus
                        />
                    </div>
                )}

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
                        onClick={() => {
                            console.log("ConfirmationModal: Confirm Clicked", { isInputValid, requireTyping, inputValue });
                            if (isInputValid) {
                                console.log("ConfirmationModal: Executing onConfirm");
                                onConfirm();
                                if (closeOnConfirm) {
                                    console.log("ConfirmationModal: Executing onClose");
                                    onClose();
                                }
                            } else {
                                console.warn("ConfirmationModal: Clicked but invalid");
                            }
                        }}
                        disabled={!isInputValid}
                        className={`px-4 py-2 rounded-md font-bold text-white text-sm shadow-sm transition-all ${isDanger
                            ? 'bg-destructive hover:bg-destructive/90'
                            : 'bg-primary hover:bg-primary/90'
                            } ${!isInputValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

