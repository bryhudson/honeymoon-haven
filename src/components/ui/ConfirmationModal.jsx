import React from 'react';
import { BaseModal } from './BaseModal';

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isDanger,
    confirmText = "Confirm",
    showCancel = true,
    requireTyping = null,
    closeOnConfirm = true,
    inputType = "text"
}) {
    const [inputValue, setInputValue] = React.useState("");

    // Reset input when modal opens
    React.useEffect(() => {
        if (isOpen) setInputValue("");
    }, [isOpen]);

    const isInputValid = !requireTyping || inputValue === requireTyping;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            showClose={true}
        >
            <div className="space-y-6">
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {message}
                </p>

                {requireTyping && (
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Type <span className="text-slate-900 select-all">{inputType === 'password' ? 'Admin Password' : `"${requireTyping}"`}</span> to confirm:
                        </label>
                        <input
                            type={inputType}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={inputType === 'password' ? 'Enter Admin Password' : requireTyping}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (isInputValid) {
                                onConfirm();
                                if (closeOnConfirm) onClose();
                            }
                        }}
                        disabled={!isInputValid}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white shadow-sm transition-all ${isDanger
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                            } ${!isInputValid ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}

