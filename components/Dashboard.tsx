import React, { useMemo, useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, Note } from '../types';
import { GlassCard } from './GlassCard';
import { Circle, CheckCircle, Clock, AlertCircle, ChevronDown, Trash, Copy, Edit2, Layers, FileText, HelpCircle } from './Icons';
import { formatRelativeDate } from '../utils/formatRelativeDate';
import { toLocalDateString } from '../utils/dateUtils';
import { useRovingTabIndex } from '../hooks/useRovingTabIndex';

const AnimatedNumber: React.FC<{ value: number, className?: string, suffix?: string }> = ({ value, className, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [value, displayValue]);

  return (
    <span className={`inline-block transition-all duration-300 ease-smooth ${isAnimating ? 'scale-110 opacity-70' : 'scale-100 opacity-100'
      } ${className || ''}`}>
      {displayValue}{suffix}
    </span>
  );
};

interface DashboardProps {
  tasks: Task[];
  notes: Note[];
  toggleTaskStatus: (id: string) => void;
  onCycleStatus: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onViewNote: (noteId: string) => void;
  onOpenHelp: () => void;
  focusMode: boolean;
  setFocusMode: (mode: boolean) => void;
  onNavigateToTasks: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  notes,
  toggleTaskStatus,
  onCycleStatus,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onToggleSubtask,
  onViewNote,
  onOpenHelp,
  focusMode,
  setFocusMode,
  onNavigateToTasks
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const overdueRoving = useRovingTabIndex();
  const todayRoving = useRovingTabIndex();

  const todayStr = toLocalDateString();

  const { todayTasks, overdueTasks, upcomingTasks, totalUpcoming, stats, todayProgress } = useMemo(() => {
    let today: Task[] = [];
    let overdue: Task[] = [];
    let upcoming: Task[] = [];
    let completedCount = 0;
    let todayCompletedCount = 0;
    let totalActive = 0;

    tasks.forEach(task => {
      if (task.status === TaskStatus.COMPLETED) {
        completedCount++;
        if (task.dueDate === todayStr) {
          todayCompletedCount++;
        }
      } else {
        totalActive++;
        // If focus mode is on, only include Urgent priority or tasks due today/overdue
        if (focusMode && task.priority !== TaskPriority.URGENT && task.dueDate > todayStr) {
          return;
        }

        if (task.dueDate === todayStr) {
          today.push(task);
        } else if (task.dueDate < todayStr) {
          overdue.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    const sortTasks = (a: Task, b: Task) => {
      const pOrder = { [TaskPriority.URGENT]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    };

    today.sort(sortTasks);
    overdue.sort(sortTasks);

    upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || sortTasks(a, b));
    const limitedUpcoming = upcoming.slice(0, 5);

    const totalToday = today.length + todayCompletedCount;
    const progressPercent = totalToday === 0 ? 0 : Math.round((todayCompletedCount / totalToday) * 100);

    return {
      todayTasks: today,
      overdueTasks: overdue,
      upcomingTasks: limitedUpcoming,
      totalUpcoming: upcoming.length,
      stats: { total: tasks.length, completed: completedCount, pending: totalActive },
      todayProgress: {
        completed: todayCompletedCount,
        total: totalToday,
        percent: progressPercent
      }
    };
  }, [tasks, todayStr, focusMode]);

  const [greeting, setGreeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const newGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
      setGreeting(prev => prev !== newGreeting ? newGreeting : prev);
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleToggleExpand = (id: string) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const circumference = 2 * Math.PI * 54; // r=54
  const strokeDashoffset = circumference - (todayProgress.percent / 100) * circumference;

  return (
    <div className="animate-fade-in space-y-8">
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/10 blur-[50px] rounded-full" />
            <div className="relative z-10 volumetric-surface w-32 h-32 rounded-[36px] flex items-center justify-center">
              <span className="text-5xl font-bold bg-gradient-to-b from-slate-700 to-slate-500 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">A</span>
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-theme-primary mb-3">Welcome to AuraDesk</h2>
          <p className="text-sm font-medium text-theme-secondary max-w-md mx-auto mb-8">
            Your CA workspace is ready. Tap the <strong className="text-emerald-500">+</strong> button to create your first task.
          </p>
        </div>
      )}
      <header className="mb-6 px-2 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div className="flex justify-between items-start w-full md:w-auto">
          <div className="animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-theme-primary">
              {greeting}.
            </h2>
            <p className="text-theme-secondary mt-3 text-sm font-medium">
              You have <strong className="text-theme-primary transition-colors">{todayTasks.length}</strong> tasks due today and <strong className="text-red-500/80 transition-colors">{overdueTasks.length}</strong> overdue.
            </p>
          </div>
        </div>
        <button
          onClick={() => setFocusMode(!focusMode)}
          className={`volumetric-btn px-6 py-3 rounded-[20px] font-semibold tracking-wide flex items-center gap-2 transition-all duration-500 ease-smooth animate-fade-in ${focusMode ? 'volumetric-btn-primary text-theme-primary scale-[1.02]' : 'text-theme-tertiary hover:text-theme-primary'}`}
          style={{ animationDelay: '100ms' }}
        >
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${focusMode ? 'bg-current animate-pulse scale-110' : 'bg-slate-400'}`} />
          {focusMode ? 'Focus Mode Active' : 'Enter Focus Mode'}
        </button>
      </header>

      {/* Progress & Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Hero Progress Card */}
        <div className="md:col-span-2 volumetric-surface rounded-[32px] p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8 opacity-0 animate-slide-up">
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            {/* Ambient glow behind ring */}
            <div className="absolute inset-2 bg-emerald-500/20 blur-xl rounded-full" />
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]" viewBox="0 0 120 120">
              {/* Background Track - Glass style */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-black/8 dark:text-white/10"
              />
              {/* Progress Track */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-1000 ease-smooth drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            <div className="relative z-10 flex flex-col items-center justify-center">
              {todayProgress.total === 0 ? (
                <span className="text-3xl font-bold tracking-tight text-theme-primary">—</span>
              ) : (
                <AnimatedNumber value={todayProgress.percent} suffix="%" className="text-3xl font-bold tracking-tight text-theme-primary" />
              )}
            </div>
          </div>

          <div className="text-center sm:text-left pt-2">
            <h3 className="text-xl font-semibold tracking-tight text-theme-primary mb-2">Today's Progress</h3>
            <p className="text-theme-tertiary font-medium text-sm md:text-base">
              You've completed <AnimatedNumber value={todayProgress.completed} className="text-emerald-600 dark:text-emerald-400 text-lg mx-1" /> of <AnimatedNumber value={todayProgress.total} className="text-theme-secondary text-lg mx-1" /> tasks due today.
            </p>
            {todayProgress.percent === 100 && todayProgress.total > 0 && (
              <span className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-semibold uppercase tracking-wider border border-emerald-500/20 shadow-sm animate-pop">
                <CheckCircle className="w-4 h-4" /> All Done!
              </span>
            )}
            {todayProgress.total === 0 && (
              <span className="inline-block mt-4 px-3 py-1.5 bg-slate-500/10 text-theme-tertiary rounded-xl text-xs font-semibold uppercase tracking-wider border border-slate-500/20 shadow-sm">
                No tasks today
              </span>
            )}
          </div>
        </div>

        {/* Small Stat Pills */}
        <div className="flex flex-col gap-4 justify-center opacity-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <StatPill title="Overdue" value={overdueTasks.length} icon={<AlertCircle className={overdueTasks.length > 0 ? "text-red-500" : "text-theme-tertiary"} />} isAlert={overdueTasks.length > 0} delay={100} />
          <StatPill title="Upcoming" value={totalUpcoming} icon={<Clock className="text-blue-500" />} delay={150} />
          <StatPill title="Total Active" value={stats.pending} icon={<Layers className="text-theme-tertiary" />} delay={200} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {overdueTasks.length > 0 && (
            <GlassCard className="!border-red-500/30 opacity-0 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-400">Overdue Filings</h3>
              </div>
              <div {...overdueRoving.containerProps} className="space-y-4">
                {overdueTasks.map((task, index) => (
                  <div key={task.id} {...overdueRoving.getItemProps(index)}>
                    <TaskItem
                      task={task}
                      relatedNotes={notes.filter(n => n.linkedTaskId === task.id)}
                      index={index}
                      isExpanded={expandedTaskId === task.id}
                      onToggleExpand={() => handleToggleExpand(task.id)}
                      onCycleStatus={() => onCycleStatus(task.id)}
                      onEdit={() => onEditTask(task)}
                      onDuplicate={() => onDuplicateTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onToggleSubtask={(subId) => onToggleSubtask(task.id, subId)}
                      onViewNote={onViewNote}
                      isOverdue
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <GlassCard className="opacity-0 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold tracking-tight text-theme-primary">Today's Agenda</h3>
              <div className="volumetric-input px-4 py-2 rounded-full text-[11px] font-medium uppercase tracking-wider text-theme-tertiary">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            {todayTasks.length === 0 ? (
              <div className="py-12 text-center text-theme-tertiary flex flex-col items-center animate-fade-in">
                {/* Illustrative Volumetric Empty State */}
                <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 bg-emerald-500/10 blur-[40px] rounded-full" />
                  <div className="absolute top-4 left-4 w-16 h-16 volumetric-surface rounded-2xl rotate-[-15deg] opacity-60 transition-transform hover:rotate-[-5deg] duration-500" />
                  <div className="absolute bottom-4 right-4 w-20 h-20 volumetric-surface rounded-[20px] rotate-[15deg] opacity-40 transition-transform hover:rotate-[5deg] duration-500" />
                  <div className="relative z-10 volumetric-surface w-28 h-28 rounded-[32px] flex items-center justify-center transform hover:scale-105 transition-transform duration-500 ease-smooth">
                    <div className="volumetric-btn w-16 h-16 rounded-[20px] flex items-center justify-center bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium text-theme-secondary">All caught up. Enjoy the peace.</p>
              </div>
            ) : (
              <div {...todayRoving.containerProps} className="space-y-4">
                {todayTasks.map((task, index) => (
                  <div key={task.id} {...todayRoving.getItemProps(index)}>
                    <TaskItem
                      task={task}
                      relatedNotes={notes.filter(n => n.linkedTaskId === task.id)}
                      index={index}
                      isExpanded={expandedTaskId === task.id}
                      onToggleExpand={() => handleToggleExpand(task.id)}
                      onCycleStatus={() => onCycleStatus(task.id)}
                      onEdit={() => onEditTask(task)}
                      onDuplicate={() => onDuplicateTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      onToggleSubtask={(subId) => onToggleSubtask(task.id, subId)}
                      onViewNote={onViewNote}
                    />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6 md:space-y-8">
          <GlassCard className="opacity-0 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-xl font-semibold tracking-tight mb-6 flex items-center gap-3 text-theme-primary">
              <div className="volumetric-btn w-10 h-10 rounded-full flex items-center justify-center text-theme-tertiary">
                <Clock className="w-4 h-4" />
              </div>
              Upcoming
            </h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-theme-secondary text-center py-6 font-medium animate-fade-in">No upcoming tasks.</p>
            ) : (
              <div className="space-y-5">
                {upcomingTasks.map((task, index) => {
                  const { label: relDateLabel, urgent: isDateUrgent } = formatRelativeDate(task.dueDate);
                  return (
                    <div key={task.id} className="group flex flex-col gap-1 volumetric-input p-4 rounded-2xl opacity-0 animate-slide-up" style={{ animationDelay: `${Math.min(index * 12, 200)}ms` }}>
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm line-clamp-1 text-theme-secondary flex items-center">
                          {task.title}
                          {task.recurring && (
                            <span className="inline-flex items-center ml-1.5 text-theme-tertiary shrink-0" title={`Repeats ${task.recurringInterval}`}>
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" />
                                <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" />
                              </svg>
                            </span>
                          )}
                        </p>
                        <span
                          className={`text-[11px] font-medium whitespace-nowrap ml-3 bg-theme-divider px-2 py-1 rounded-md ${isDateUrgent ? 'text-red-500' : 'text-theme-tertiary'}`}
                          title={new Date(task.dueDate).toLocaleDateString()}
                        >
                          {relDateLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.category && <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600/70 dark:text-blue-400">{task.category}</span>}
                        {task.clientName && <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted line-clamp-1 border-l border-theme-divider pl-2">{task.clientName}</span>}
                      </div>
                    </div>
                  );
                })}

                {totalUpcoming > 5 && (
                  <button
                    onClick={onNavigateToTasks}
                    className="w-full mt-4 volumetric-input py-3 rounded-xl text-[11px] font-semibold uppercase tracking-wider text-theme-tertiary hover:text-theme-primary text-center transition-colors"
                  >
                    View all {totalUpcoming} upcoming tasks →
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

const StatPill: React.FC<{ title: string, value: number, icon: React.ReactNode, isAlert?: boolean, delay: number }> = ({ title, value, icon, isAlert, delay }) => (
  <div
    className={`volumetric-surface rounded-[20px] p-4 flex items-center justify-between transition-transform duration-500 ease-smooth hover:-translate-y-1 ${isAlert ? '!border-red-500/30 bg-red-500/5' : ''}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${isAlert ? 'bg-red-500/10' : 'volumetric-input'}`}>
        {icon}
      </div>
      <span className="font-semibold text-theme-secondary tracking-wide text-sm">{title}</span>
    </div>
    <AnimatedNumber value={value} className={`text-2xl font-bold tracking-tight ${isAlert ? 'text-red-500' : 'text-theme-primary'}`} />
  </div>
);

interface TaskItemProps {
  task: Task;
  relatedNotes: Note[];
  index?: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCycleStatus: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleSubtask: (subId: string) => void;
  onViewNote: (noteId: string) => void;
  isOverdue?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task, relatedNotes, index = 0, isExpanded, onToggleExpand, onCycleStatus, onEdit, onDuplicate, onDelete, onToggleSubtask, onViewNote, isOverdue = false
}) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isInProgress = task.status === TaskStatus.IN_PROGRESS;
  const [isRippling, setIsRippling] = useState(false);

  const priorityColors = {
    [TaskPriority.URGENT]: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.25)]',
    [TaskPriority.HIGH]: 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.2)]',
    [TaskPriority.MEDIUM]: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.2)]',
    [TaskPriority.LOW]: 'bg-slate-300'
  };

  const completedSubtasks = task.subtasks?.filter(s => s.done).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCompleted) {
      setIsRippling(true);
      setTimeout(() => setIsRippling(false), 800);
    }
    onCycleStatus();
  };

  const { label: relDateLabel } = formatRelativeDate(task.dueDate);

  return (
    <div
      className="relative group/task opacity-0 animate-slide-up"
      style={{ animationDelay: `${Math.min(index * 10, 150)}ms` }}
    >
      {/* Contextual Ambient Glow Layer */}
      <div className={`absolute -inset-1 rounded-[28px] blur-[20px] transition-all duration-700 ease-smooth -z-10
        ${isCompleted ? 'bg-emerald-500/10 group-hover/task:bg-emerald-500/20'
          : isInProgress ? 'bg-indigo-500/10 group-hover/task:bg-indigo-500/20'
            : isOverdue ? 'bg-red-500/10 group-hover/task:bg-red-500/20'
              : 'bg-transparent group-hover/task:bg-white/10 dark:group-hover/task:bg-white/5'}
      `} />

      <div
        className={`group flex flex-col gap-4 p-4 rounded-3xl volumetric-input transition-all duration-500 ease-smooth ${isCompleted ? 'opacity-50' : ''} ${isExpanded ? 'ring-1 scale-[1.01]' : ''}`}
        style={isExpanded ? { background: 'var(--glass-expanded)', '--tw-ring-color': 'var(--glass-border)' } as React.CSSProperties : undefined}
      >

        {/* Task Header row */}
        <div className="flex items-start gap-4 cursor-pointer" onClick={onToggleExpand}>
          <button
            onClick={handleToggle}
            className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isRippling ? 'animate-glass-ripple text-emerald-500' : ''} ${isCompleted
              ? 'volumetric-input text-emerald-500 bg-emerald-500/10'
              : isInProgress
                ? 'volumetric-btn text-indigo-500 bg-indigo-500/10'
                : 'volumetric-btn text-theme-tertiary hover:text-theme-secondary'
              }`}
            aria-label={`Cycle status for task ${task.title}`}
          >
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 animate-pop" />
            ) : isRippling ? (
              <CheckCircle className="w-5 h-5" />
            ) : isInProgress ? (
              <Clock className="w-4 h-4 animate-pulse text-indigo-500" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-500 opacity-50 transition-transform group-hover/task:scale-110" />
            )}
          </button>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3">
              <h4 className={`font-semibold text-base truncate transition-all duration-500 ease-smooth ${isCompleted ? 'line-through text-theme-tertiary' : 'text-theme-primary'}`}>
                {task.title}
                {task.recurring && (
                  <span className="inline-flex items-center ml-1.5 text-theme-tertiary" title={`Repeats ${task.recurringInterval}`}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" />
                      <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" />
                    </svg>
                  </span>
                )}
              </h4>
              {!isCompleted && (
                isInProgress ? (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 animate-pulse flex-shrink-0" title="In Progress" />
                ) : (
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-300 group-hover/task:scale-125 ${priorityColors[task.priority]}`} title={`Priority: ${task.priority}`} />
                )
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-semibold tracking-wider uppercase">
              {isInProgress && !isCompleted && (
                <span className="text-indigo-600/90 dark:text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1 rounded-[8px] border border-indigo-500/20 backdrop-blur-sm shadow-sm">
                  <Clock className="w-3 h-3" /> In Progress
                </span>
              )}
              {task.category && (
                <span className="bg-blue-500/6 text-blue-600/70 dark:text-blue-400 border border-blue-500/8 px-2.5 py-1 rounded-[8px] backdrop-blur-sm transition-colors duration-300 hover:bg-blue-500/10">
                  {task.category}
                </span>
              )}
              {task.clientName && (
                <span className="volumetric-btn px-2.5 py-1 rounded-[8px] text-theme-muted">
                  {task.clientName}
                </span>
              )}
              {task.recurring && (
                <span className="bg-purple-500/6 text-purple-600/70 dark:text-purple-400 border border-purple-500/8 px-2.5 py-1 rounded-[8px] backdrop-blur-sm">
                  {task.recurringInterval}
                </span>
              )}
              {task.tags && task.tags.map(tag => (
                <span key={tag} className="bg-slate-500/6 text-theme-muted border border-theme-divider px-2.5 py-1 rounded-[8px] backdrop-blur-sm">
                  #{tag}
                </span>
              ))}
              {isOverdue && !isCompleted && (
                <span className="text-red-600/80 dark:text-red-400 flex items-center gap-1 bg-red-500/8 px-2.5 py-1 rounded-[8px] border border-red-500/10 backdrop-blur-sm" title={new Date(task.dueDate).toLocaleDateString()}>
                  <AlertCircle className="w-3 h-3" /> {relDateLabel}
                </span>
              )}
            </div>

            {/* Liquid Fill Subtask Progress Bar */}
            {totalSubtasks > 0 && (
              <div className="w-full mt-4">
                <div className="flex justify-between items-center text-[11px] font-medium tracking-wider uppercase text-theme-tertiary mb-1.5">
                  <span>Progress</span>
                  <span className={`transition-colors duration-500 ${completedSubtasks === totalSubtasks ? 'text-emerald-500 animate-pop inline-block' : 'text-theme-tertiary'}`}>
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                </div>
                <div className="h-1.5 w-full volumetric-input rounded-full overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-smooth shadow-[0_0_10px_rgba(16,185,129,0.5)] relative overflow-hidden"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200%] animate-liquid-flow opacity-50" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className={`mt-2 p-2 rounded-full text-theme-tertiary hover:text-theme-primary transition-all duration-500 ease-smooth ${isExpanded ? 'rotate-180 bg-theme-divider text-theme-primary' : ''}`}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Expanded Content Area */}
        {isExpanded && (
          <div className="pl-12 pr-4 pb-2 animate-slide-down origin-top">
            {task.description && (
              <div className="volumetric-surface p-4 rounded-2xl mb-4 text-sm font-medium text-theme-secondary whitespace-pre-wrap leading-relaxed">
                {task.description}
              </div>
            )}

            {totalSubtasks > 0 && (
              <div className="mb-6 space-y-2 mt-4">
                {task.subtasks?.map((sub, sIdx) => (
                  <div key={sub.id} className="flex items-center gap-3 group/sub opacity-0 animate-slide-up" style={{ animationDelay: `${Math.min(sIdx * 30, 150)}ms` }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleSubtask(sub.id); }}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 ease-smooth ${sub.done ? 'volumetric-btn volumetric-btn-primary text-theme-primary' : 'volumetric-input text-transparent hover:text-theme-tertiary'}`}
                    >
                      {sub.done ? <CheckCircle className="w-3 h-3 animate-pop" /> : <CheckCircle className="w-3 h-3 opacity-0 group-hover/sub:opacity-100 transition-opacity" />}
                    </button>
                    <span className={`text-sm font-medium transition-all duration-300 ${sub.done ? 'line-through text-theme-tertiary' : 'text-theme-secondary'}`}>
                      {sub.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {relatedNotes.length > 0 && (
              <div className="mb-6 pt-4 border-t border-theme-divider animate-slide-up">
                <h5 className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 pl-1">Related Notes</h5>
                <div className="space-y-2">
                  {relatedNotes.map((note, nIdx) => (
                    <button
                      key={note.id}
                      onClick={(e) => { e.stopPropagation(); onViewNote(note.id); }}
                      className="w-full text-left p-3 rounded-xl volumetric-input hover-surface transition-colors group/relnote flex flex-col gap-1 opacity-0 animate-slide-up"
                      style={{ animationDelay: `${Math.min(nIdx * 20, 100)}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-500/70" />
                        <span className="font-semibold text-sm text-theme-secondary">{note.title || 'Untitled'}</span>
                      </div>
                      <p className="text-xs text-theme-tertiary line-clamp-1 ml-6">{note.content}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-theme-divider">
              <p className="text-[10px] font-medium uppercase tracking-widest text-theme-muted mb-3">Activity</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-medium text-theme-tertiary">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Created {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {task.updatedAt && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-theme-tertiary">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Updated {new Date(task.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                )}
                {task.completedAt && (
                  <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Completed {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-theme-divider">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="volumetric-btn px-4 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 text-theme-secondary transition-transform hover:-translate-y-0.5"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="volumetric-btn px-4 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 text-theme-secondary transition-transform hover:-translate-y-0.5"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="volumetric-input px-4 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
