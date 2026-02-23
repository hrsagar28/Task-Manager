import React, { useEffect, useRef } from 'react';
import { ViewState } from '../types';
import { X, Search, HelpCircle, Moon, Sun, Crosshair } from './Icons';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    isDark: boolean;
    onToggleTheme: () => void;
    onOpenCommandPalette: () => void;
    onOpenHelp: () => void;
    focusMode: boolean;
    onToggleFocusMode: () => void;
    currentView: ViewState;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isOpen, onClose, isDark, onToggleTheme, onOpenCommandPalette, onOpenHelp, focusMode, onToggleFocusMode
}) => {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const drawerItems = [
        {
            icon: <Search className="w-5 h-5" />,
            label: 'Search',
            subtitle: 'Find tasks, notes & commands',
            action: () => { onOpenCommandPalette(); onClose(); },
        },
        {
            icon: isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />,
            label: isDark ? 'Light Mode' : 'Dark Mode',
            subtitle: 'Switch appearance',
            action: () => { onToggleTheme(); onClose(); },
            toggle: true,
            toggleState: isDark,
        },
        {
            icon: <Crosshair className="w-5 h-5" />,
            label: 'Focus Mode',
            subtitle: focusMode ? 'Currently active' : 'Minimize distractions',
            action: () => { onToggleFocusMode(); onClose(); },
            toggle: true,
            toggleState: focusMode,
        },
        {
            icon: <HelpCircle className="w-5 h-5" />,
            label: 'Keyboard Shortcuts',
            subtitle: 'View all shortcuts',
            action: () => { onOpenHelp(); onClose(); },
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-sm animate-fade-in md:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="fixed top-0 right-0 bottom-0 z-[151] w-[300px] max-w-[85vw] volumetric-surface shadow-[-20px_0_60px_-12px_rgba(0,0,0,0.15)] md:hidden flex flex-col"
                style={{
                    animation: 'drawer-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                    borderRadius: '28px 0 0 28px',
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Settings drawer"
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-theme-primary">Settings</h2>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-theme-tertiary mt-0.5">AuraDesk</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="volumetric-btn w-10 h-10 rounded-[14px] flex items-center justify-center text-theme-tertiary hover:text-theme-primary transition-colors"
                        aria-label="Close drawer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Drawer Items */}
                <div className="flex-1 overflow-y-auto px-4 space-y-2">
                    {drawerItems.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={item.action}
                            className="w-full flex items-center gap-4 px-4 py-4 rounded-[20px] hover-surface transition-all duration-200 group text-left animate-slide-up"
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="w-10 h-10 rounded-[14px] volumetric-input flex items-center justify-center text-theme-tertiary group-hover:text-theme-secondary transition-colors shrink-0">
                                {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-theme-primary">{item.label}</p>
                                <p className="text-[11px] font-medium text-theme-tertiary mt-0.5">{item.subtitle}</p>
                            </div>
                            {item.toggle && (
                                <div className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center ${item.toggleState
                                        ? 'bg-emerald-500 justify-end'
                                        : 'bg-slate-300 dark:bg-slate-600 justify-start'
                                    }`}>
                                    <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 transition-all" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Drawer Footer */}
                <div className="p-6 pt-4 border-t border-theme-divider">
                    <p className="text-[10px] font-medium text-theme-muted text-center uppercase tracking-widest">
                        AuraDesk v1.0 — CA Workspace
                    </p>
                </div>
            </div>
        </>
    );
};
