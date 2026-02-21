import React, { useState, useMemo, useEffect } from 'react';
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
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center gap-2 hover:opacity-70 transition-opacity"
              aria-label="Select month and year"
            >
              <h2 className="text-2xl font-semibold tracking-tight text-theme-primary">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <ChevronDown className={`w-5 h-5 text-theme-tertiary transition-transform duration-300 ${showMonthPicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick-Nav Month/Year Picker Dropdown */}
            {showMonthPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                <div className="absolute top-[120%] left-0 w-[300px] z-50 volumetric-surface rounded-[24px] p-5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] animate-scale-in origin-top-left flex flex-col gap-5">
                  {/* Year Selector row */}
                  <div className="flex items-center justify-between gap-1">
                    <button onClick={() => setPickerYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover-surface text-theme-tertiary transition-colors">
                      <ChevronLeft className="w-4 h-4"/>
                    </button>
                    <div className="flex-1 flex justify-center gap-1">
                      {yearRange.map(y => (
                        <button
                          key={y}
                          onClick={() => setPickerYear(y)}
                          className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-300 ${pickerYear === y ? 'volumetric-btn volumetric-btn-primary text-theme-primary scale-110 shadow-sm' : 'text-theme-tertiary hover:text-theme-secondary hover-surface'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setPickerYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover-surface text-theme-tertiary transition-colors">
                      <ChevronRight className="w-4 h-4"/>
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
                          className={`py-2 rounded-[14px] text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ease-smooth hover:-translate-y-0.5 active:scale-95 ${
                            isCurrentView
                              ? 'volumetric-btn volumetric-btn-primary text-theme-primary scale-[1.02]' 
                              : 'volumetric-input text-theme-tertiary hover:text-theme-secondary'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
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

        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-medium tracking-wider uppercase text-theme-tertiary mb-4 opacity-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
             <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 md:gap-3 relative z-10">
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
                key={`${currentDate.toISOString()}-${i}`} // re-trigger animation on month change
                onClick={() => setSelectedDate(dayObj.date)}
                onDoubleClick={() => {
                  const dateStr = toLocalDateString(dayObj.date);
                  onAddTaskForDate(dateStr);
                }}
                style={{ animationDelay: `${Math.min(50 + (i * 5), 150)}ms` }}
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-smooth font-semibold text-sm opacity-0 animate-scale-in
                  ${!dayObj.isCurrentMonth ? 'text-theme-muted' : 'text-theme-secondary'}
                  ${isSelected ? 'volumetric-btn volumetric-btn-primary !text-theme-primary scale-110 z-10' : 'volumetric-input hover-surface hover:scale-105'}
                  ${isToday && !isSelected ? 'ring-2 ring-emerald-500/30 dark:ring-emerald-400/25' : ''}
                `}
              >
                <span>{dayObj.date.getDate()}</span>
                {sortedForDots.length > 0 && (
                  <div className="absolute bottom-1.5 flex items-center gap-0.5">
                    {sortedForDots.map((t, idx) => (
                      <div key={idx} className={`w-1 h-1 rounded-full transition-colors duration-300 ${getDotColor(t, isSelected)}`} />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className={`text-[7px] font-bold leading-none ml-0.5 ${isSelected ? 'text-theme-primary' : 'text-theme-tertiary'}`}>
                        +{dayTasks.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
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
            <div className="h-full flex flex-col items-center justify-center text-theme-tertiary opacity-60 animate-fade-in">
              {/* Illustrative Volumetric Empty State */}
              <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                 <div className="absolute inset-0 bg-blue-500/10 blur-[40px] rounded-full" />
                 <div className="absolute top-4 left-4 w-16 h-16 volumetric-surface rounded-2xl rotate-[-15deg] opacity-60 transition-transform duration-700 hover:rotate-[-5deg]" />
                 <div className="absolute bottom-4 right-4 w-20 h-20 volumetric-surface rounded-[20px] rotate-[15deg] opacity-40 transition-transform duration-700 hover:rotate-[5deg]" />
                 <div className="relative z-10 volumetric-surface w-28 h-28 rounded-[32px] flex items-center justify-center transform hover:scale-105 transition-transform duration-500 ease-smooth">
                    <div className="volumetric-btn w-16 h-16 rounded-[20px] flex items-center justify-center bg-blue-500/10 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                       <CalendarIcon className="w-8 h-8" />
                    </div>
                 </div>
              </div>
              <p className="font-medium text-sm text-theme-secondary">No tasks for this date.</p>
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
                  style={{ animationDelay: `${200 + Math.min(index * 10, 150)}ms` }}
                >
                  <div className={`absolute -inset-1 rounded-[28px] blur-[15px] transition-all duration-700 ease-smooth -z-10
                    ${isCompleted ? 'bg-emerald-500/10 group-hover/task:bg-emerald-500/20' 
                    : 'bg-transparent group-hover/task:bg-white/10 dark:group-hover/task:bg-white/5'}
                  `} />
                  <div className={`p-5 rounded-2xl volumetric-input transition-all duration-500 ease-smooth hover:scale-[1.01] ${isCompleted ? 'opacity-40' : ''}`}>
                    <div className="flex items-start gap-4">
                       <button 
                          onClick={() => toggleTaskStatus(task.id)}
                          className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCompleted 
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
    </div>
  );
};
