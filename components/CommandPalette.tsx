import React, { useState, useEffect, useRef } from 'react';
import { Task, Note, ViewState } from '../types';
import { Search, FileText, CheckCircle, LayoutDashboard, Calendar, Layers, Plus } from './Icons';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  notes: Note[];
  onNavigate: (view: ViewState) => void;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen, onClose, tasks, notes, onNavigate, onNewTask, onEditTask, onSelectNote, onNewNote
}) => {
  const focusTrapRef = useFocusTrap(isOpen);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // focusTrap handles initial focus, but we'll ensure the input is specifically focused
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const lowerQuery = query.toLowerCase();

  const filteredTasks = query ? tasks.filter(t =>
    t.title.toLowerCase().includes(lowerQuery) ||
    (t.clientName && t.clientName.toLowerCase().includes(lowerQuery)) ||
    (t.category && t.category.toLowerCase().includes(lowerQuery)) ||
    (t.tags && t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  ).slice(0, 5) : [];

  const filteredNotes = query ? notes.filter(n => n.title.toLowerCase().includes(lowerQuery) || n.content.toLowerCase().includes(lowerQuery)).slice(0, 3) : [];

  const commands = [
    { label: 'Go to Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, action: () => onNavigate('DASHBOARD') },
    { label: 'Go to Calendar', icon: <Calendar className="w-4 h-4" />, action: () => onNavigate('CALENDAR') },
    { label: 'Go to Master Tasks', icon: <Layers className="w-4 h-4" />, action: () => onNavigate('TASKS') },
    { label: 'Go to Notes', icon: <FileText className="w-4 h-4" />, action: () => onNavigate('NOTES') },
    { label: 'Create New Task', icon: <Plus className="w-4 h-4" />, action: () => onNewTask() },
    { label: 'Create New Note', icon: <FileText className="w-4 h-4" />, action: () => onNewNote() },
  ].filter(c => c.label.toLowerCase().includes(lowerQuery));

  // Flatten results for keyboard navigation
  const allResults = [
    ...commands.map(c => ({ type: 'command', action: () => { c.action(); onClose(); } })),
    ...filteredTasks.map(t => ({ type: 'task', action: () => { onEditTask(t); onClose(); } })),
    ...filteredNotes.map(n => ({ type: 'note', action: () => { onSelectNote(n.id); onClose(); } }))
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < allResults.length) {
        allResults[activeIndex].action();
      }
    }
  };

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-2xl saturate-150 animate-fade-in" style={{ background: 'var(--modal-backdrop)' }} aria-hidden="true" />

      <div
        ref={focusTrapRef as any}
        className="relative w-full max-w-2xl volumetric-surface rounded-[32px] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className="flex items-center px-6 py-4 border-b border-theme-divider bg-white/5">
          <Search className="w-6 h-6 text-theme-tertiary mr-4" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-xl font-semibold text-theme-primary placeholder:text-theme-tertiary"
            placeholder="Search tasks, notes, or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="volumetric-input px-2 py-1 rounded-md text-[10px] font-medium text-theme-tertiary font-mono">ESC</span>
        </div>

        <div ref={listRef} className="overflow-y-auto p-4 space-y-6 custom-scrollbar flex-1">
          {query && filteredTasks.length === 0 && filteredNotes.length === 0 && commands.length === 0 && (
            <div className="text-center py-10 text-theme-tertiary font-medium animate-fade-in">
              No results found for "{query}"
            </div>
          )}

          {commands.length > 0 && (
            <div className="animate-fade-in">
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 px-2">Commands</h4>
              <div className="space-y-2">
                {commands.map((cmd, i) => {
                  const currentIndex = globalIndex++;
                  const isActive = currentIndex === activeIndex;
                  return (
                    <button
                      key={i}
                      data-index={currentIndex}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl volumetric-input hover-surface transition-all text-left group animate-slide-up cursor-pointer ${isActive ? 'bg-black/5 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/20 scale-[1.01]' : ''}`}
                      style={{ animationDelay: `${i * 10}ms` }}
                      onClick={() => { cmd.action(); onClose(); }}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                    >
                      <div className={`w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-theme-secondary transition-transform duration-300 ease-spring ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {cmd.icon}
                      </div>
                      <span className={`font-semibold text-base transition-colors ${isActive ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'}`}>{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div className="animate-fade-in">
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 px-2">Tasks</h4>
              <div className="space-y-2">
                {filteredTasks.map((task, idx) => {
                  const currentIndex = globalIndex++;
                  const isActive = currentIndex === activeIndex;
                  return (
                    <button
                      key={task.id}
                      data-index={currentIndex}
                      onClick={() => { onEditTask(task); onClose(); }}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl volumetric-input hover-surface text-left animate-slide-up transition-all cursor-pointer group ${isActive ? 'bg-black/5 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/20 scale-[1.01]' : ''}`}
                      style={{ animationDelay: `${idx * 10}ms` }}
                    >
                      <CheckCircle className={`w-5 h-5 transition-colors ${isActive ? 'text-emerald-500' : 'text-theme-tertiary group-hover:text-emerald-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-base transition-colors truncate flex items-center ${isActive ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'}`}>
                          {task.title}
                          {task.recurring && (
                            <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-theme-muted bg-slate-500/10 px-1.5 py-0.5 rounded shrink-0">↻ Recurring</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.clientName && (
                            <span className="text-[10px] uppercase font-medium text-theme-tertiary">{task.clientName}</span>
                          )}
                          {task.category && (
                            <span className="text-[10px] uppercase font-medium text-blue-500/70">{task.category}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredNotes.length > 0 && (
            <div className="animate-fade-in">
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 px-2">Notes</h4>
              <div className="space-y-2">
                {filteredNotes.map((note, idx) => {
                  const currentIndex = globalIndex++;
                  const isActive = currentIndex === activeIndex;
                  return (
                    <button
                      key={note.id}
                      data-index={currentIndex}
                      onClick={() => { onSelectNote(note.id); onClose(); }}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`w-full flex items-start gap-4 px-4 py-3 rounded-xl volumetric-input hover-surface text-left animate-slide-up transition-all cursor-pointer group ${isActive ? 'bg-black/5 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/20 scale-[1.01]' : ''}`}
                      style={{ animationDelay: `${idx * 10}ms` }}
                    >
                      <FileText className={`w-5 h-5 mt-0.5 transition-colors ${isActive ? 'text-amber-500' : 'text-theme-tertiary group-hover:text-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-base transition-colors truncate ${isActive ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'}`}>{note.title || 'Untitled Note'}</p>
                        <p className="text-xs text-theme-tertiary truncate mt-1">{note.content}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};