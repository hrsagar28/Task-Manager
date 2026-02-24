import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ViewState } from '../types';
import { X, Search, HelpCircle, Moon, Sun, Crosshair, Download, Upload } from './Icons';
import { APP_VERSION } from '../version';

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
    onExportData?: () => void;
    onImportData?: () => void;
    archiveRetentionDays?: number;
    onSetArchiveRetention?: (days: number) => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isOpen, onClose, isDark, onToggleTheme, onOpenCommandPalette, onOpenHelp, focusMode, onToggleFocusMode, onExportData, onImportData, archiveRetentionDays = 90, onSetArchiveRetention
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
        ...(onExportData ? [{
            icon: <Download className="w-5 h-5" />,
            label: 'Export Data',
            subtitle: 'Download a backup (JSON)',
            action: () => { onExportData(); onClose(); },
        }] : []),
        ...(onImportData ? [{
            icon: <Upload className="w-5 h-5" />,
            label: 'Import Data',
            subtitle: 'Restore from a backup',
            action: () => { onImportData(); onClose(); },
        }] : []),
    ];

    const RETENTION_OPTIONS = [
        { value: 30, label: '30 days' },
        { value: 90, label: '90 days' },
        { value: 180, label: '6 months' },
        { value: 365, label: '1 year' },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                className="absolute inset-0 z-[150] bg-black/30 backdrop-blur-sm animate-fade-in md:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer Container (Fixed to viewport to guarantee position) */}
            <div className="fixed inset-0 z-[151] pointer-events-none flex justify-end md:hidden">
                <div
                    ref={drawerRef}
                    className="pointer-events-auto w-[300px] max-w-[85vw] h-full volumetric-surface shadow-[-20px_0_60px_-12px_rgba(0,0,0,0.15)] flex flex-col"
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
                                style={{ animationDelay: `${Math.min(idx * 50, 200)}ms` }}
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

                    {/* Data Cleanup Setting */}
                    {onSetArchiveRetention && (
                        <div className="mt-4 pt-4 border-t border-theme-divider px-4">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-theme-tertiary mb-3">Auto-Delete Archived Tasks</p>
                            <div className="flex flex-wrap gap-2">
                                {RETENTION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => onSetArchiveRetention(opt.value)}
                                        className={`px-3 py-2 rounded-[14px] text-[11px] font-semibold tracking-wider transition-all duration-300 ${archiveRetentionDays === opt.value
                                            ? 'volumetric-btn volumetric-btn-primary text-theme-primary scale-[1.02]'
                                            : 'volumetric-input text-theme-tertiary hover:text-theme-primary'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-theme-muted mt-2 pl-1">Archived tasks older than {archiveRetentionDays} days are automatically removed.</p>
                        </div>
                    )}

                    {/* Drawer Footer */}
                    <div className="p-6 pt-4 border-t border-theme-divider mt-auto">
                        <p className="text-[10px] font-medium text-theme-muted text-center uppercase tracking-widest">
                            AuraDesk v{APP_VERSION} — CA Workspace
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};
