import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';

export function PromptModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    placeholder = "",
    defaultValue = "",
    confirmText = "Confirm",
    cancelText = "Cancel",
    inputType = "text",
    requireConfirmation = false,
    confirmPlaceholder = "Confirm"
}) {
    const [value, setValue] = useState(defaultValue);
    const [confirmValue, setConfirmValue] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setConfirmValue("");
            setError("");
        }
    }, [isOpen, defaultValue]);

    const mismatch = requireConfirmation && confirmValue.length > 0 && value !== confirmValue;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (requireConfirmation && value !== confirmValue) {
            setError("Values do not match.");
            return;
        }
        onConfirm(value);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            showClose={true}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {message}
                </p>

                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <input
                        type={inputType}
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setError(""); }}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-900"
                        autoFocus
                    />
                    {requireConfirmation && (
                        <input
                            type={inputType}
                            value={confirmValue}
                            onChange={(e) => { setConfirmValue(e.target.value); setError(""); }}
                            placeholder={confirmPlaceholder}
                            className={`w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all font-medium text-slate-900 ${mismatch ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:ring-indigo-500/20"}`}
                        />
                    )}
                    {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-700 font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all text-xs"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="submit"
                        disabled={requireConfirmation && (!value || value !== confirmValue)}
                        className="flex-1 py-3.5 font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/10 transition-all bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed text-white text-xs"
                    >
                        {confirmText}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
}
