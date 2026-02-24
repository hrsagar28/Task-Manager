import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full volumetric-input flex items-center justify-center mb-6 text-theme-tertiary">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-theme-primary mb-2">{title}</h3>
        <p className="text-sm font-medium text-theme-tertiary max-w-xs mb-6 leading-relaxed">{description}</p>
        {actionLabel && onAction && (
            <button
                onClick={onAction}
                className="volumetric-btn volumetric-btn-primary px-8 py-3.5 rounded-[20px] font-semibold text-sm text-theme-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
                {actionLabel}
            </button>
        )}
    </div>
);
