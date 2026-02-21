import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, Note } from '../types';
import { Search, Archive, CheckCircle, Edit2, Trash, CheckSquare, Square, Layers, ChevronDown, FileText, Copy } from './Icons';
import { formatRelativeDate } from '../utils/formatRelativeDate';

interface TasksViewProps {
  tasks: Task[];
  notes: Note[];
  toggleTaskStatus: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDuplicateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onBulkAction: (ids: string[], action: 'complete' | 'delete' | 'archive') => void;
  onToggleSubtask: (taskId: string, subId: string) => void;
  onViewNote: (noteId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks, notes, toggleTaskStatus, onEditTask, onDuplicateTask, onDeleteTask, onToggleArchive, onBulkAction, onToggleSubtask, onViewNote
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [filterArchived, setFilterArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'DUE_DATE' | 'CREATED_AT' | 'PRIORITY'>('DUE_DATE');
  const [groupBy, setGroupBy] = useState<'NONE' | 'PRIORITY' | 'CATEGORY' | 'STATUS'>('NONE');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => filterArchived ? t.isArchived : !t.isArchived);

    if (filterStatus !== 'ALL') {
      result = result.filter(t => {
        if (filterStatus === 'COMPLETED') return t.status === TaskStatus.COMPLETED;
        if (filterStatus === 'IN_PROGRESS') return t.status === TaskStatus.IN_PROGRESS;
        return t.status === TaskStatus.PENDING;
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(lower) || 
        (t.description && t.description.toLowerCase().includes(lower)) ||
        (t.clientName && t.clientName.toLowerCase().includes(lower)) || 
        (t.category && t.category.toLowerCase().includes(lower)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(lower)))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'DUE_DATE') return a.dueDate.localeCompare(b.dueDate);
      if (sortBy === 'CREATED_AT') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'PRIORITY') {
        const pOrder = { [TaskPriority.URGENT]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
        return pOrder[a.priority] - pOrder[b.priority];
      }
      return 0;
    });

    return result;
  }, [tasks, filterStatus, filterArchived, searchTerm, sortBy]);

  const groupedTasks = useMemo(() => {
    if (groupBy === 'NONE') return [{ label: null, tasks: filteredTasks }];

    const groups = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      let key: string;
      switch (groupBy) {
        case 'PRIORITY': key = task.priority; break;
        case 'CATEGORY': key = task.category || 'Uncategorized'; break;
        case 'STATUS': key = task.status; break;
        default: key = 'All';
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    });

    // Order priority groups logically
    if (groupBy === 'PRIORITY') {
      const order = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      return order
        .filter(k => groups.has(k))
        .map(k => ({ label: k, tasks: groups.get(k)! }));
    }
    if (groupBy === 'STATUS') {
      const order = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
      return order
        .filter(k => groups.has(k))
        .map(k => ({ 
          label: k === 'IN_PROGRESS' ? 'In Progress' : k.charAt(0) + k.slice(1).toLowerCase(), 
          tasks: groups.get(k)! 
        }));
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, tasks]) => ({ label, tasks }));
  }, [filteredTasks, groupBy]);

  const handleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTaskIds(newSet);
  };

  const executeBulkAction = (action: 'complete' | 'delete' | 'archive') => {
    onBulkAction(Array.from(selectedTaskIds), action);
    setSelectedTaskIds(new Set());
  };

  const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
    const styles = {
      [TaskPriority.URGENT]: 'text-red-600/80 dark:text-red-400 bg-red-500/10 border-red-400/15',
      [TaskPriority.HIGH]: 'text-orange-600/80 dark:text-orange-400 bg-orange-500/10 border-orange-400/15',
      [TaskPriority.MEDIUM]: 'text-blue-600/70 dark:text-blue-400 bg-blue-500/8 border-blue-400/12',
      [TaskPriority.LOW]: 'text-theme-muted bg-slate-500/6 border-slate-400/10'
    };
    return (
      <span className={`px-2.5 py-1 rounded-[10px] border text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm shadow-[0_0.5px_0_0_rgba(255,255,255,0.15)_inset] ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-4rem)] relative">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end mb-6 opacity-0 animate-slide-up">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-4 text-theme-primary">
            <div className="volumetric-btn w-14 h-14 rounded-[20px] flex items-center justify-center text-theme-tertiary">
              <Layers className="w-7 h-7" />
            </div>
            Master Tasks
          </h2>
          <p className="text-theme-secondary text-sm font-normal mt-2 pl-1">Manage and organize your complete task database.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col volumetric-surface rounded-[32px] overflow-hidden opacity-0 animate-slide-up shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]" style={{ animationDelay: '100ms' }}>
        {/* Glass Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 p-4 md:px-6 md:pt-6 border-b border-theme-divider relative z-20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="volumetric-input w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium text-theme-secondary placeholder:text-theme-tertiary transition-all focus:-translate-y-0.5"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 volumetric-input p-1.5 rounded-2xl flex-wrap">
              {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map(status => (
                <button 
                  key={status}
                  onClick={() => { setFilterArchived(false); setFilterStatus(status); }} 
                  className={`px-4 py-2 rounded-[10px] text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ease-smooth whitespace-nowrap ${!filterArchived && filterStatus === status ? 'volumetric-surface shadow-sm text-theme-primary scale-[1.02]' : 'text-theme-tertiary hover:text-theme-secondary'}`}
                >
                  {status === 'IN_PROGRESS' ? 'In Progress' : status}
                </button>
              ))}
              <div className="w-px h-6 bg-theme-divider mx-1" />
              <button 
                onClick={() => { setFilterArchived(true); }} 
                className={`px-4 py-2 rounded-[10px] text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ease-smooth flex items-center gap-2 whitespace-nowrap ${filterArchived ? 'volumetric-surface shadow-sm text-theme-primary scale-[1.02]' : 'text-theme-tertiary hover:text-theme-secondary'}`}
              >
                <Archive className="w-3 h-3" /> Archived
              </button>
            </div>

            <div className="flex items-center gap-1 volumetric-input p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
              {(['NONE', 'PRIORITY', 'CATEGORY', 'STATUS'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                    groupBy === g
                      ? 'volumetric-surface text-theme-primary shadow-sm'
                      : 'text-theme-tertiary hover:text-theme-secondary hover-surface'
                  }`}
                >
                  {g === 'NONE' ? 'Flat' : g === 'PRIORITY' ? 'Priority' : g === 'CATEGORY' ? 'Category' : 'Status'}
                </button>
              ))}
            </div>
            
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)} 
              className="volumetric-input px-4 py-3 rounded-xl text-[10px] font-semibold uppercase tracking-wider text-theme-tertiary outline-none cursor-pointer min-w-[140px]"
            >
              <option value="DUE_DATE">Sort by Due Date</option>
              <option value="PRIORITY">Sort by Priority</option>
              <option value="CREATED_AT">Sort by Created</option>
            </select>
          </div>
        </div>

        {/* Task List Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-theme-divider bg-theme-divider text-[10px] font-semibold uppercase tracking-wider text-theme-tertiary">
           <div className="col-span-5 flex items-center gap-4">
              <button onClick={handleSelectAll} className="hover:text-theme-secondary transition-colors">
                {selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}
              </button>
              <span>Task Details</span>
           </div>
           <div className="col-span-2">Client</div>
           <div className="col-span-2">Category</div>
           <div className="col-span-1">Due Date</div>
           <div className="col-span-1">Priority</div>
           <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Task List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 relative">
          {filteredTasks.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-theme-tertiary opacity-60 animate-fade-in">
                <Layers className="w-16 h-16 mb-4 opacity-50" />
                <p className="font-normal text-sm text-theme-tertiary">No tasks found matching your criteria.</p>
             </div>
          ) : (
            groupedTasks.map((group, gIdx) => (
              <div key={group.label || 'all'} className="mb-4 last:mb-0">
                {group.label && (
                  <div className="sticky top-0 z-10 px-4 py-3 backdrop-blur-xl bg-slate-100/50 dark:bg-slate-800/50 border border-theme-divider mb-2 rounded-[20px] shadow-sm flex items-center gap-3 animate-fade-in">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-theme-secondary">
                      {group.label}
                    </h3>
                    <span className="volumetric-input px-2 py-0.5 rounded-md text-[10px] font-bold text-theme-primary">{group.tasks.length}</span>
                  </div>
                )}
                <div className="space-y-1">
                  {group.tasks.map((task, idx) => {
                    const isSelected = selectedTaskIds.has(task.id);
                    const isExpanded = expandedTaskId === task.id;
                    const isCompleted = task.status === TaskStatus.COMPLETED;
                    const { label: relDateLabel, urgent: isDateUrgent } = formatRelativeDate(task.dueDate);
                    
                    const totalSubtasks = task.subtasks?.length || 0;
                    const completedSubtasks = task.subtasks?.filter(s => s.done).length || 0;
                    const progressPercent = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                    const relatedNotes = notes.filter(n => n.linkedTaskId === task.id);

                    return (
                      <div 
                        key={task.id} 
                        className={`group flex flex-col p-4 rounded-[20px] transition-all duration-300 ease-smooth hover-surface animate-slide-up ${isSelected ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''} ${isExpanded ? 'shadow-sm ring-1' : ''}`}
                        style={{ 
                          animationDelay: `${Math.min(idx * 6, 120)}ms`,
                          ...(isExpanded ? { background: 'var(--glass-expanded)', '--tw-ring-color': 'var(--glass-border)' } as React.CSSProperties : {})
                        }}
                      >
                        <div 
                          className="flex items-center gap-4 cursor-pointer w-full"
                          onClick={() => setExpandedTaskId(prev => prev === task.id ? null : task.id)}
                        >
                          <button onClick={(e) => { e.stopPropagation(); handleToggleSelect(task.id); }} className="text-theme-tertiary hover:text-blue-500 transition-colors shrink-0">
                            {isSelected ? <CheckSquare className="w-5 h-5 text-blue-500 animate-pop"/> : <Square className="w-5 h-5"/>}
                          </button>
                          
                          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div className="md:col-span-5 flex items-center gap-3">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task.id); }} 
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shrink-0 ${isCompleted ? 'bg-emerald-500/20 text-emerald-500' : 'volumetric-input text-transparent hover:text-theme-tertiary'}`}
                                >
                                  <CheckCircle className={`w-4 h-4 ${isCompleted ? 'animate-pop text-emerald-500' : ''}`} />
                                </button>
                                <div className="min-w-0">
                                  <span className={`font-medium text-[15px] truncate block transition-all ${isCompleted ? 'line-through text-theme-tertiary' : 'text-theme-secondary'}`}>
                                    {task.title}
                                  </span>
                                  {/* Mobile only details */}
                                  <div className="md:hidden flex flex-wrap gap-2 mt-2">
                                     {task.clientName && <span className="text-[10px] uppercase font-semibold tracking-wider text-theme-muted">{task.clientName}</span>}
                                     {task.category && <span className="text-[10px] uppercase font-semibold tracking-wider text-blue-600/70 dark:text-blue-400">{task.category}</span>}
                                     <span 
                                       className={`text-[10px] font-semibold tracking-wider ${isDateUrgent && !isCompleted ? 'text-red-500/90' : 'text-theme-muted'}`}
                                       title={new Date(task.dueDate).toLocaleDateString()}
                                     >
                                       {relDateLabel}
                                     </span>
                                  </div>
                                </div>
                            </div>
                            
                            <div className="hidden md:block md:col-span-2 truncate">
                                {task.clientName && <span className="px-2.5 py-1 rounded-[8px] bg-slate-500/5 text-theme-muted border border-slate-500/8 text-[10px] font-semibold uppercase tracking-wider truncate max-w-full inline-block backdrop-blur-sm">{task.clientName}</span>}
                            </div>
                            <div className="hidden md:block md:col-span-2 truncate">
                                {task.category && <span className="px-2.5 py-1 rounded-[8px] bg-blue-500/6 text-blue-600/70 dark:text-blue-400 border border-blue-500/8 text-[10px] font-semibold uppercase tracking-wider truncate inline-block backdrop-blur-sm">{task.category}</span>}
                            </div>
                            
                            <div 
                              className={`hidden md:flex md:col-span-1 items-center text-xs font-medium ${isDateUrgent && !isCompleted ? 'text-red-500' : 'text-theme-tertiary'}`}
                              title={new Date(task.dueDate).toLocaleDateString()}
                            >
                                {relDateLabel}
                            </div>
                            
                            <div className="hidden md:flex md:col-span-1 items-center">
                                <PriorityBadge priority={task.priority} />
                            </div>

                            <div className="md:col-span-1 flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="p-2 rounded-xl text-theme-tertiary hover:text-theme-secondary hover-surface transition-all" title="Edit Task"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={(e) => { e.stopPropagation(); onToggleArchive(task.id); }} className="p-2 rounded-xl text-theme-tertiary hover:text-theme-secondary hover-surface transition-all" title={task.isArchived ? "Restore to Active" : "Move to Archive"}>
                                <Archive className="w-4 h-4"/>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }} className="p-2 rounded-xl text-theme-tertiary hover:text-red-500 hover:bg-red-500/5 transition-all" title="Delete Task">
                                <Trash className="w-4 h-4"/>
                              </button>
                              <ChevronDown className={`w-4 h-4 text-theme-tertiary ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* EXPANDED CONTENT AREA */}
                        {isExpanded && (
                          <div className="pl-12 pr-4 pt-4 pb-2 mt-2 border-t border-theme-divider animate-slide-down origin-top w-full cursor-default" onClick={e => e.stopPropagation()}>
                            {task.description && (
                              <div className="volumetric-surface p-4 rounded-2xl mb-4 text-sm font-medium text-theme-secondary whitespace-pre-wrap leading-relaxed">
                                {task.description}
                              </div>
                            )}

                            {totalSubtasks > 0 && (
                              <div className="mb-6 space-y-2 mt-4">
                                {/* Progress Bar */}
                                <div className="w-full mb-4">
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

                                {task.subtasks?.map((sub, sIdx) => (
                                  <div key={sub.id} className="flex items-center gap-3 group/sub opacity-0 animate-slide-up" style={{ animationDelay: `${Math.min(sIdx * 30, 150)}ms` }}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onToggleSubtask(task.id, sub.id); }}
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

                            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-theme-divider">
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                className="volumetric-btn px-4 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 text-theme-secondary transition-transform hover:-translate-y-0.5"
                              >
                                <Edit2 className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDuplicateTask(task); }}
                                className="volumetric-btn px-4 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 text-theme-secondary transition-transform hover:-translate-y-0.5"
                              >
                                <Copy className="w-4 h-4" /> Duplicate
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                className="volumetric-input px-4 py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedTaskIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="volumetric-surface px-6 py-4 rounded-[24px] flex items-center gap-6 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
              <span className="text-sm font-semibold bg-blue-500/6 text-blue-600/70 dark:text-blue-400 border border-blue-500/8 px-3 py-1.5 rounded-[8px] backdrop-blur-sm">{selectedTaskIds.size} selected</span>
              <div className="w-px h-8 bg-theme-divider" />
              <button onClick={() => executeBulkAction('complete')} className="text-sm font-semibold text-emerald-500 hover:text-emerald-600 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"><CheckCircle className="w-4 h-4"/> Complete</button>
              <button onClick={() => executeBulkAction('archive')} className="text-sm font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"><Archive className="w-4 h-4"/> Archive</button>
              <button onClick={() => executeBulkAction('delete')} className="text-sm font-semibold text-red-500 hover:text-red-600 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"><Trash className="w-4 h-4"/> Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};