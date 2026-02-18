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
    inputType = "text"
}) {
    const [value, setValue] = useState(defaultValue);

    // Reset value when modal opens
    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
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
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-900"
                        autoFocus
                    />
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
                        className="flex-1 py-3.5 font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/10 transition-all bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                    >
                        {confirmText}
                    </button>
                </div>
            </form>
        </BaseModal>
    );
}
