import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, TaskStatus, TaskPriority } from '../types';
import { GlassCard } from './GlassCard';
import { ChevronLeft, ChevronRight, ChevronDown, Circle, CheckCircle, Calendar as CalendarIcon, Plus, Edit2, Trash } from './Icons';
import { toLocalDateString } from '../utils/dateUtils';

interface CalendarViewProps {
  tasks: Task[];
  toggleTaskStatus: (id: string) => void;
  onAddTaskForDate: (date: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, toggleTaskStatus, onAddTaskForDate, onEditTask, onDeleteTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Quick-nav picker state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [mobileView, setMobileView] = useState<'week' | 'month'>('week');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowMonthPicker(false);
      }
    }
    if (showMonthPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthPicker]);

  useEffect(() => {
    if (showMonthPicker && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPickerPos({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [showMonthPicker]);

  // Sync picker year when calendar changes externally
  useEffect(() => {
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -firstDay.getDay() + i + 1);
      days.push({ date: d, isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(new Date(pickerYear, monthIndex, 1));
    setShowMonthPicker(false);
  };

  const selectedDateStr = toLocalDateString(selectedDate);
  const todayStr = toLocalDateString();

  const tasksForSelectedDate = useMemo(() =>
    tasks.filter(t => t.dueDate === selectedDateStr),
    [tasks, selectedDateStr]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      const existing = map.get(t.dueDate) || [];
      map.set(t.dueDate, [...existing, t]);
    });
    return map;
  }, [tasks]);

  const yearRange = Array.from({ length: 5 }, (_, i) => pickerYear - 2 + i);

  const getDotColor = (task: Task, isSelected: boolean) => {
    if (task.status === TaskStatus.COMPLETED) {
      return isSelected ? 'bg-emerald-600' : 'bg-emerald-500';
    }
    const colors = {
      [TaskPriority.URGENT]: 'bg-red-500',
      [TaskPriority.HIGH]: 'bg-orange-500',
      [TaskPriority.MEDIUM]: 'bg-blue-400 dark:bg-blue-500',
      [TaskPriority.LOW]: isSelected ? 'bg-slate-800 dark:bg-slate-200' : 'bg-slate-400 dark:bg-slate-500',
    };
    return colors[task.priority] || (isSelected ? 'bg-slate-800 dark:bg-slate-200' : 'bg-slate-400 dark:bg-slate-500');
  };

  return (
    <div className="animate-fade-in flex flex-col lg:flex-row gap-6 md:gap-8 h-full">
      {/* Calendar Widget */}
      <GlassCard className="flex-1 lg:max-w-[420px] h-fit">
        <div className="flex items-center justify-between mb-8 opacity-0 animate-slide-up relative z-30">
          <div className="relative">
            <button
              ref={triggerRef}
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              aria-label="Select month and year"
            >
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-theme-primary">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <ChevronDown className={`w-5 h-5 text-theme-tertiary transition-transform duration-300 ${showMonthPicker ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex gap-2 relative z-20">
            <button onClick={prevMonth} className="volumetric-btn w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95" aria-label="Previous month">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDate(today);
              }}
              className="volumetric-btn px-4 py-2 rounded-full text-[11px] font-medium uppercase tracking-wider text-theme-tertiary transition-transform hover:scale-105 active:scale-95"
            >
              Today
            </button>
            <button onClick={nextMonth} className="volumetric-btn w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95" aria-label="Next month">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Week View */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-theme-secondary">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setMobileView(mobileView === 'week' ? 'month' : 'week')}
              className="volumetric-input px-3 py-1.5 rounded-xl text-[11px] font-medium uppercase tracking-wider text-theme-tertiary"
            >
              {mobileView === 'week' ? 'Month' : 'Week'}
            </button>
          </div>

          {mobileView === 'week' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
              {(() => {
                const weekStart = new Date(selectedDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                return Array.from({ length: 7 }, (_, i) => {
                  const day = new Date(weekStart);
                  day.setDate(weekStart.getDate() + i);
                  const dateStr = toLocalDateString(day);
                  const dayTasks = (tasksByDate.get(dateStr) || []).filter(t => t.status !== TaskStatus.COMPLETED);
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      style={isSelected ? {
                        boxShadow: '0 0.5px 0 0 var(--edge-top) inset, 0 -0.5px 0 0 var(--edge-bottom) inset, 0 4px 12px -2px rgba(16, 185, 129, 0.15), 0 8px 24px -4px rgba(0,0,0,0.08)',
                        background: 'linear-gradient(180deg, var(--glass-primary-from), var(--glass-primary-to))'
                      } : {}}
                      className={`relative snap-center flex flex-col items-center min-w-[56px] min-h-[64px] py-3 px-2 rounded-2xl transition-all duration-300 ease-smooth ${isSelected
                        ? 'scale-[1.08] z-10'
                        : 'hover-surface'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-b from-white/30 to-transparent rounded-full blur-sm pointer-events-none" />
                      )}
                      <span className="text-[10px] font-medium uppercase tracking-wider text-theme-tertiary relative z-10">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className={`text-lg font-semibold mt-1 relative z-10 ${isSelected ? 'text-theme-primary' : 'text-theme-secondary'}`}>
                        {day.getDate()}
                      </span>
                      {isToday && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] mt-1 relative z-10" />
                      )}
                      {dayTasks.length > 0 && (
                        <div className="flex gap-0.5 mt-1.5 relative z-10">
                          {dayTasks.slice(0, 3).map((t, idx) => {
                            const dotColor = t.priority === TaskPriority.URGENT ? 'bg-red-400' : t.priority === TaskPriority.HIGH ? 'bg-orange-400' : 'bg-blue-400';
                            return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;
                          })}
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Desktop Month Grid + Mobile Month View (toggled) */}
        <div className={`${mobileView === 'month' ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium tracking-wider uppercase text-theme-tertiary mb-4 opacity-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2 relative z-10">
            {daysInMonth.map((dayObj, i) => {
              const dateStr = toLocalDateString(dayObj.date);
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayStr;
              const dayTasks = tasksByDate.get(dateStr) || [];

              const sortedForDots = [...dayTasks].sort((a, b) => {
                if (a.status === TaskStatus.COMPLETED && b.status !== TaskStatus.COMPLETED) return 1;
                if (a.status !== TaskStatus.COMPLETED && b.status === TaskStatus.COMPLETED) return -1;
                const pOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3);
              }).slice(0, 3);

              return (
                <button
                  key={`${currentDate.toISOString()}-${i}`}
                  onClick={() => setSelectedDate(dayObj.date)}
                  onDoubleClick={() => {
                    const dateStr = toLocalDateString(dayObj.date);
                    onAddTaskForDate(dateStr);
                  }}
                  style={{
                    animationDelay: `${Math.min(50 + (i * 5), 150)}ms`,
                    ...(isSelected ? {
                      boxShadow: '0 0.5px 0 0 var(--edge-top) inset, 0 -0.5px 0 0 var(--edge-bottom) inset, 0 4px 12px -2px rgba(16, 185, 129, 0.15), 0 8px 24px -4px rgba(0,0,0,0.08)',
                      background: 'linear-gradient(180deg, var(--glass-primary-from), var(--glass-primary-to))'
                    } : {})
                  }}
                  className={`
                    relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-smooth font-semibold text-sm opacity-0 animate-scale-in
                    ${!dayObj.isCurrentMonth ? 'text-theme-muted' : 'text-theme-secondary'}
                    ${isSelected
                      ? 'scale-[1.08] z-10 !text-theme-primary'
                      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:scale-105 active:scale-95'}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-b from-white/30 to-transparent rounded-full blur-sm pointer-events-none" />
                  )}
                  <span className="relative z-10">{dayObj.date.getDate()}</span>

                  {isToday && (
                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)] relative z-10" />
                  )}

                  {sortedForDots.length > 0 && (
                    <div className="absolute bottom-1.5 flex items-center gap-0.5 max-h-3 overflow-hidden md:max-h-none md:overflow-visible z-10">
                      {sortedForDots.map((t, idx) => (
                        <div key={idx} className={`w-1 h-1 rounded-full transition-colors duration-300 ${getDotColor(t, isSelected)}`} />
                      ))}
                      {dayTasks.length > 3 && (
                        <>
                          <span className={`text-[7px] font-bold leading-none ml-0.5 hidden md:inline ${isSelected ? 'text-theme-primary' : 'text-theme-tertiary'}`}>
                            +{dayTasks.length - 3}
                          </span>
                          <span className={`text-[8px] font-bold leading-none ml-0.5 md:hidden ${isSelected ? 'text-theme-primary' : 'text-theme-tertiary'}`}>
                            +{dayTasks.length - 3}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Selected Date Tasks List */}
      <GlassCard className="flex-1 flex flex-col h-[500px] lg:h-auto">
        <div className="mb-8 border-b border-theme-divider pb-6 opacity-0 animate-slide-up flex flex-row justify-between items-start" style={{ animationDelay: '200ms' }}>
          <div>
            <h3 className="text-3xl font-semibold tracking-tight text-theme-primary">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            <p className="text-theme-secondary text-sm font-medium mt-2 transition-all">
              {tasksForSelectedDate.length} task{tasksForSelectedDate.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button
            onClick={() => onAddTaskForDate(selectedDateStr)}
            className="volumetric-btn volumetric-btn-primary px-4 py-2 rounded-[16px] flex items-center gap-2 text-theme-primary font-semibold text-sm transition-transform hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-3 space-y-4 custom-scrollbar">
          {tasksForSelectedDate.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in pb-10">
              <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/8 blur-[40px] rounded-full" />
                <div className="absolute top-3 left-3 w-14 h-14 rounded-2xl rotate-[-12deg] opacity-40 bg-white/[0.07] dark:bg-white/[0.02] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.15),0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.05),0_2px_8px_-2px_rgba(0,0,0,0.2)]" />
                <div className="absolute bottom-3 right-3 w-16 h-16 rounded-[18px] rotate-[12deg] opacity-30 bg-white/[0.07] dark:bg-white/[0.02] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.15),0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.05),0_2px_8px_-2px_rgba(0,0,0,0.2)]" />
                <div className="relative z-10 volumetric-surface glass-noise w-24 h-24 rounded-[28px] flex items-center justify-center">
                  <div className="volumetric-btn w-14 h-14 rounded-[18px] flex items-center justify-center text-emerald-500/60">
                    <CalendarIcon className="w-7 h-7" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-theme-secondary">No tasks on {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-xs font-medium text-theme-tertiary mt-2">Tap + to add one</p>
            </div>
          ) : (
            tasksForSelectedDate.map((task, index) => {
              const isCompleted = task.status === TaskStatus.COMPLETED;
              const priorityColors: Record<string, string> = {
                [TaskPriority.URGENT]: 'bg-red-500',
                [TaskPriority.HIGH]: 'bg-orange-400',
                [TaskPriority.MEDIUM]: 'bg-blue-400',
                [TaskPriority.LOW]: 'bg-slate-300 dark:bg-slate-500',
              };

              return (
                <div
                  key={task.id}
                  className={`relative group/task opacity-0 animate-slide-up`}
                  style={{ animationDelay: `${Math.min(index * 10, 200)}ms` }}
                >
                  <div className={`absolute -inset-1 rounded-[28px] blur-[15px] transition-all duration-700 ease-smooth -z-10
                    ${isCompleted ? 'bg-emerald-500/10 group-hover/task:bg-emerald-500/20'
                      : 'bg-transparent group-hover/task:bg-white/10 dark:group-hover/task:bg-white/5'}
                  `} />
                  <div className={`p-5 rounded-2xl volumetric-input transition-all duration-500 ease-smooth hover:scale-[1.01] ${isCompleted ? 'opacity-40' : ''}`}>
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                          ? 'volumetric-input text-emerald-500 bg-emerald-500/10'
                          : 'volumetric-btn text-theme-tertiary hover:text-theme-secondary'
                          }`}
                      >
                        {isCompleted ? <CheckCircle className="w-5 h-5 animate-pop" /> : <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-500 opacity-50 transition-transform group-hover/task:scale-110" />}
                      </button>
                      <div className="flex-1 pt-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold tracking-tight text-base transition-all duration-300 truncate ${isCompleted ? 'line-through text-theme-tertiary' : 'text-theme-primary'}`}>
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
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority]}`} title={`Priority: ${task.priority}`} />
                          )}
                        </div>
                        {task.clientName && <p className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mt-1.5">{task.clientName}</p>}
                        {task.description && <p className="text-sm font-medium text-theme-secondary mt-1 line-clamp-2">{task.description}</p>}
                      </div>

                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover/task:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-2 rounded-xl text-theme-tertiary hover:text-theme-secondary hover-surface transition-all"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-2 rounded-xl text-theme-tertiary hover:text-red-500 hover:bg-red-500/5 transition-all"
                          title="Delete Task"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      {/* Quick-Nav Month/Year Picker Dropdown Portal */}
      {showMonthPicker && pickerPos && createPortal(
        <div
          ref={pickerRef}
          className="fixed w-[calc(100vw-3rem)] max-w-[320px] md:w-[340px] md:max-w-none rounded-[28px] p-5 shadow-2xl animate-scale-in origin-top-left flex flex-col gap-5 border border-black/5 dark:border-white/10"
          style={{
            top: pickerPos.top,
            left: pickerPos.left,
            zIndex: 9999,
            backgroundColor: 'var(--flyout-bg, #ffffff)',
          }}
        >
          {/* Year Selector row */}
          <div className="flex items-center justify-between gap-1">
            <button onClick={() => setPickerYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-theme-tertiary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex justify-center gap-1">
              {yearRange.map(y => (
                <button
                  key={y}
                  onClick={() => setPickerYear(y)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 ${pickerYear === y ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 scale-110 shadow-sm' : 'text-theme-tertiary hover:text-theme-secondary hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {y}
                </button>
              ))}
            </div>
            <button onClick={() => setPickerYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-theme-tertiary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m, i) => {
              const isCurrentView = pickerYear === currentDate.getFullYear() && i === currentDate.getMonth();
              return (
                <button
                  key={m}
                  onClick={() => handleMonthSelect(i)}
                  className={`py-2 rounded-[14px] text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ease-smooth hover:-translate-y-0.5 active:scale-95 border border-transparent ${isCurrentView
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 scale-[1.02]'
                    : 'bg-black/5 dark:bg-white/5 text-theme-tertiary hover:text-theme-secondary hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
