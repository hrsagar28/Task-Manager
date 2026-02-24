import React from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { APP_VERSION } from '../version';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const focusTrapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-2xl saturate-150 animate-fade-in" style={{ background: 'var(--modal-backdrop)' }} aria-hidden="true" />
      <div
        ref={focusTrapRef as any}
        className="relative volumetric-surface w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        {/* Desktop View */}
        <div className="hidden md:block">
          <h3 id="help-title" className="text-xl font-semibold tracking-tight mb-6 text-theme-primary">⌨️ Keyboard Shortcuts</h3>
          <div className="space-y-4">
            {[
              ['Ctrl + 1', 'Dashboard View'],
              ['Ctrl + 2', 'Calendar View'],
              ['Ctrl + 3', 'Master Tasks View'],
              ['Ctrl + 4', 'Notes View'],
              ['Alt + N', 'New Task'],
              ['Alt + Shift + N', 'New Note'],
              ['Ctrl + /', 'Search Palette'],
              ['Ctrl + Shift + D', 'Toggle Dark Mode'],
              ['Esc', 'Close / Go Back']
            ].map(([keys, label], i) => (
              <div key={keys} className="flex justify-between items-center border-b border-theme-divider pb-3 opacity-0 animate-slide-up" style={{ animationDelay: `${Math.min(i * 10, 200)}ms` }}>
                <span className="text-sm font-semibold text-theme-secondary">{label}</span>
                <span className="volumetric-input px-3 py-1.5 rounded-lg text-xs font-semibold font-mono text-theme-secondary">{keys}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          <h3 id="help-title" className="text-xl font-semibold tracking-tight mb-6 text-theme-primary">💡 Quick Tips</h3>
          <div className="space-y-4">
            {[
              'Tap the + button to create a new task',
              'Tap the bottom navigation to switch views',
              'Tap any task to expand details and subtasks',
              'Use the search in Tasks view to find any task by client or category'
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-theme-divider pb-3 opacity-0 animate-slide-up" style={{ animationDelay: `${Math.min(i * 10, 200)}ms` }}>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0 opacity-80" />
                <span className="text-sm font-semibold text-theme-secondary leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 volumetric-btn py-4 rounded-[20px] font-semibold tracking-wide text-theme-primary transition-transform hover:scale-[1.02] active:scale-95"
        >
          Close
        </button>
        <p className="text-[10px] font-medium text-theme-muted text-center uppercase tracking-widest mt-4">AuraDesk v{APP_VERSION}</p>
      </div>
    </div>
  );
};