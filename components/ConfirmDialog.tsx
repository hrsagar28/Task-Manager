import React, { useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}) => {
    const focusTrapRef = useFocusTrap(isOpen);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const iconColor = variant === 'danger' ? 'text-red-500' : 'text-amber-500';
    const iconBg = variant === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10';
    const btnColor = variant === 'danger'
        ? 'bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border-red-500/20'
        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/20';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <div
                className="absolute inset-0 backdrop-blur-xl saturate-150 animate-fade-in"
                style={{ background: 'var(--modal-backdrop)' }}
                onClick={onCancel}
                aria-hidden="true"
            />
            <div
                ref={focusTrapRef}
                className="relative w-full max-w-sm glass-tier-2 glass-noise rounded-[28px] overflow-hidden animate-glass-materialize"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
            >
                <div className="p-8 text-center space-y-5">
                    <div className={`w-14 h-14 mx-auto rounded-full ${iconBg} flex items-center justify-center`}>
                        {variant === 'danger' ? (
                            <svg className={`w-7 h-7 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        ) : (
                            <svg className={`w-7 h-7 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h3 id="confirm-title" className="text-lg font-semibold text-theme-primary">{title}</h3>
                        <p id="confirm-message" className="text-sm font-medium text-theme-tertiary mt-2 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 px-8 pb-8">
                    <button
                        onClick={onCancel}
                        className="flex-1 volumetric-btn px-5 py-3.5 rounded-[18px] font-semibold text-sm text-theme-secondary transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-5 py-3.5 rounded-[18px] font-semibold text-sm border transition-all hover:scale-[1.02] active:scale-[0.98] ${btnColor}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
