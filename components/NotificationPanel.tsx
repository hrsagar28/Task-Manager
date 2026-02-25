import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { AlertCircle, Clock, CheckCircle, ChevronRight, X, Bell } from './Icons';
import { toLocalDateString } from '../utils/dateUtils';


interface NotificationPanelProps {
    tasks: Task[];
    onEditTask: (task: Task) => void;
    onNavigateToTasks: () => void;
    expanded?: boolean;
}

interface NotificationItem {
    id: string;
    type: 'overdue' | 'due_today' | 'due_tomorrow' | 'upcoming';
    task: Task;
    message: string;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
    tasks, onEditTask, onNavigateToTasks, expanded = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('auradesk-dismissed-notifications');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });
    const panelRef = useRef<HTMLDivElement>(null);

    // Persist dismissed IDs
    useEffect(() => {
        localStorage.setItem('auradesk-dismissed-notifications', JSON.stringify([...dismissedIds]));
    }, [dismissedIds]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const today = toLocalDateString();
    const tomorrow = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return toLocalDateString(d);
    })();
    const nextWeek = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return toLocalDateString(d);
    })();

    const notifications = useMemo<NotificationItem[]>(() => {
        const items: NotificationItem[] = [];
        const activeTasks = tasks.filter(t => !t.isArchived && t.status !== TaskStatus.COMPLETED);

        activeTasks.forEach(task => {
            if (dismissedIds.has(task.id + '-' + task.dueDate)) return;

            if (task.dueDate < today) {
                const daysOverdue = Math.floor(
                    (new Date(today + 'T00:00:00').getTime() - new Date(task.dueDate + 'T00:00:00').getTime()) / 86400000
                );
                items.push({
                    id: task.id,
                    type: 'overdue',
                    task,
                    message: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`
                });
            } else if (task.dueDate === today) {
                items.push({
                    id: task.id,
                    type: 'due_today',
                    task,
                    message: 'Due today'
                });
            } else if (task.dueDate === tomorrow) {
                items.push({
                    id: task.id,
                    type: 'due_tomorrow',
                    task,
                    message: 'Due tomorrow'
                });
            } else if (task.dueDate <= nextWeek && (task.priority === TaskPriority.URGENT || task.priority === TaskPriority.HIGH)) {
                items.push({
                    id: task.id,
                    type: 'upcoming',
                    task,
                    message: `Due ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                });
            }
        });

        // Sort: overdue first, then today, tomorrow, upcoming
        const priority = { overdue: 0, due_today: 1, due_tomorrow: 2, upcoming: 3 };
        return items.sort((a, b) => priority[a.type] - priority[b.type]);
    }, [tasks, today, tomorrow, nextWeek, dismissedIds]);

    const overdueCount = notifications.filter(n => n.type === 'overdue').length;
    const totalCount = notifications.length;

    const dismissNotification = (taskId: string, dueDate: string) => {
        setDismissedIds(prev => {
            const next = new Set(prev);
            next.add(taskId + '-' + dueDate);
            return next;
        });
    };

    const clearAllDismissed = () => {
        setDismissedIds(new Set());
    };

    const getTypeStyles = (type: NotificationItem['type']) => {
        switch (type) {
            case 'overdue':
                return {
                    icon: <AlertCircle className="w-4 h-4 text-red-500" />,
                    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15',
                    dot: 'bg-red-500'
                };
            case 'due_today':
                return {
                    icon: <Clock className="w-4 h-4 text-amber-500" />,
                    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15',
                    dot: 'bg-amber-500'
                };
            case 'due_tomorrow':
                return {
                    icon: <Clock className="w-4 h-4 text-blue-500" />,
                    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15',
                    dot: 'bg-blue-500'
                };
            case 'upcoming':
                return {
                    icon: <Clock className="w-4 h-4 text-theme-tertiary" />,
                    badge: 'bg-slate-500/10 text-theme-secondary border border-slate-500/10',
                    dot: 'bg-slate-400'
                };
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            {expanded ? (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative volumetric-btn w-full py-3.5 px-5 rounded-[20px] flex items-center gap-4 transition-all hover:text-theme-primary"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label={`Notifications: ${totalCount} pending`}
                    title={`${totalCount} notification${totalCount !== 1 ? 's' : ''}`}
                >
                    <div className="relative shrink-0">
                        <Bell className="w-5 h-5" />
                        {totalCount > 0 && (
                            <span className={`absolute -top-2 -right-2 min-w-[16px] h-[16px] rounded-full text-white text-[8px] font-bold flex items-center justify-center px-0.5 shadow-sm ${overdueCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
                                {totalCount > 99 ? '99+' : totalCount}
                            </span>
                        )}
                    </div>
                    <span className="font-semibold text-sm tracking-tight">Notifications</span>
                    {totalCount > 0 && (
                        <span className="ml-auto text-[10px] font-medium text-theme-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
                            {totalCount} pending
                        </span>
                    )}
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative volumetric-btn w-11 h-11 rounded-[16px] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label={`Notifications: ${totalCount} pending`}
                    title={`${totalCount} notification${totalCount !== 1 ? 's' : ''}`}
                >
                    <Bell className="w-5 h-5" />
                    {totalCount > 0 && (
                        <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm ${overdueCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                            }`}>
                            {totalCount > 99 ? '99+' : totalCount}
                        </span>
                    )}
                </button>
            )}

            {/* Dropdown Panel */}
            {isOpen && (
                <div
                    className={`
                        fixed md:absolute 
                        top-[80px] left-[50%] -translate-x-1/2 md:translate-x-0 md:left-auto
                        md:${expanded ? 'bottom-full mb-3 left-0 top-auto' : 'top-full mt-3 right-0'} 
                        w-[calc(100vw-2rem)] md:w-[380px] max-w-[400px] max-h-[70dvh] 
                        rounded-[24px] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25),0_8px_20px_rgba(0,0,0,0.1)] 
                        overflow-hidden z-[200] animate-glass-materialize glass-tier-3
                        origin-top md:${expanded ? 'origin-bottom-left' : 'origin-top-right'}
                    `}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider">
                        <h3 className="font-semibold text-base text-theme-primary">Notifications</h3>
                        {totalCount > 0 && (
                            <span className="text-[11px] font-medium text-theme-tertiary bg-black/5 dark:bg-white/5 px-2 py-1 rounded-full">
                                {totalCount} pending
                            </span>
                        )}
                        <button
                            className="md:hidden volumetric-btn w-8 h-8 rounded-[12px] flex items-center justify-center text-theme-tertiary"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="overflow-y-auto max-h-[50vh] custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
                                <p className="text-sm font-medium text-theme-secondary">All clear!</p>
                                <p className="text-xs text-theme-tertiary mt-1">No pending notifications.</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-1.5">
                                {notifications.map((notification, idx) => {
                                    const styles = getTypeStyles(notification.type);
                                    return (
                                        <div
                                            key={notification.id + idx}
                                            className="group flex items-start gap-3 p-3 rounded-[16px] hover-surface transition-all duration-200 cursor-pointer animate-slide-up"
                                            style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
                                            onClick={() => {
                                                onEditTask(notification.task);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <div className="mt-0.5 shrink-0">{styles.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-theme-primary truncate">
                                                    {notification.task.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${styles.badge}`}>
                                                        {notification.message}
                                                    </span>
                                                    {notification.task.clientName && (
                                                        <span className="text-[10px] font-medium text-theme-muted truncate">
                                                            {notification.task.clientName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    dismissNotification(notification.task.id, notification.task.dueDate);
                                                }}
                                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                                                aria-label="Dismiss notification"
                                                title="Dismiss"
                                            >
                                                <X className="w-3.5 h-3.5 text-theme-tertiary" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-6 py-3 border-t border-theme-divider flex items-center justify-between">
                            <button
                                onClick={() => { onNavigateToTasks(); setIsOpen(false); }}
                                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                                View all tasks <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                                onClick={clearAllDismissed}
                                className="text-[10px] font-medium text-theme-muted hover:text-theme-secondary transition-colors"
                            >
                                Reset dismissed
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
