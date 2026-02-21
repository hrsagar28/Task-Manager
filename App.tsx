import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Task, Note, ViewState, TaskStatus } from './types';
import { INITIAL_TASKS, INITIAL_NOTES } from './constants';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { NotesView } from './components/NotesView';
import { TasksView } from './components/TasksView';
import { TaskModal } from './components/TaskModal';
import { CommandPalette } from './components/CommandPalette';
import { HelpModal } from './components/HelpModal';
import { CheckCircle, AlertCircle, X } from './components/Icons';

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const local = localStorage.getItem('auradesk-tasks'); return local ? JSON.parse(local) : INITIAL_TASKS; } catch { return INITIAL_TASKS; }
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    try { const local = localStorage.getItem('auradesk-notes'); return local ? JSON.parse(local) : INITIAL_NOTES; } catch { return INITIAL_NOTES; }
  });
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | null>(null);
  
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Focus Mode State - Hoisted for layout-wide dimming
  const [focusMode, setFocusMode] = useState(false);

  // Toast & Undo State
  const [toast, setToast] = useState<{ message: string, type?: 'success' | 'info' | 'error', action?: { label: string, onClick: () => void } } | null>(null);
  const deletedTaskRef = useRef<Task | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme State
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('auradesk-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply theme class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('auradesk-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('auradesk-theme');
      if (!saved) setIsDark(e.matches); // Only auto-switch if user hasn't manually chosen
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(() => setIsDark(prev => !prev));
      });
    } else {
      setIsDark(prev => !prev);
    }
  }, []);

  useEffect(() => { localStorage.setItem('auradesk-tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('auradesk-notes', JSON.stringify(notes)); }, [notes]);

  // Derived state to keep Dashboard & Calendar clean
  const activeTasks = useMemo(() => tasks.filter(t => !t.isArchived), [tasks]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(t => {
      if (t.tags) t.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [tasks]);

  const badgeCounts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = activeTasks.filter(t => 
      t.status !== TaskStatus.COMPLETED && t.dueDate < todayStr
    ).length;
    return { 
      dashboard: overdue,
      tasks: activeTasks.filter(t => t.status !== TaskStatus.COMPLETED).length,
    };
  }, [activeTasks]);

  // Dynamic Depth Mapping (Lighting)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Maps the mouse coordinates globally so that radial gradients inside volumetric elements follow the cursor
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success', action?: { label: string, onClick: () => void }) => {
    setToast({ message, type, action });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), action ? 6000 : 3000);
  }, []);

  const handleToggleTaskStatus = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === TaskStatus.COMPLETED ? TaskStatus.PENDING : TaskStatus.COMPLETED } : t));
  }, []);

  const handleCycleTaskStatus = useCallback((id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextStatus = {
        [TaskStatus.PENDING]: TaskStatus.IN_PROGRESS,
        [TaskStatus.IN_PROGRESS]: TaskStatus.COMPLETED,
        [TaskStatus.COMPLETED]: TaskStatus.PENDING,
      };
      return { ...t, status: nextStatus[t.status] };
    }));
  }, []);

  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.subtasks) {
        return { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) };
      }
      return t;
    }));
  }, []);

  const handleToggleArchive = useCallback((id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newlyArchived = !t.isArchived;
        showToast(newlyArchived ? 'Task archived' : 'Task restored to active', 'info');
        return { ...t, isArchived: newlyArchived };
      }
      return t;
    }));
  }, [showToast]);

  const handleBulkAction = useCallback((ids: string[], action: 'complete' | 'delete' | 'archive') => {
    if (action === 'delete') {
      const tasksToDelete = tasks.filter(t => ids.includes(t.id));
      deletedTaskRef.current = null;
      setTasks(prev => prev.filter(t => !ids.includes(t.id)));
      showToast(`${ids.length} tasks deleted`, 'info', {
        label: 'Undo',
        onClick: () => {
          setTasks(prev => [...prev, ...tasksToDelete]);
          showToast(`${tasksToDelete.length} tasks restored`);
        }
      });
    } else if (action === 'complete') {
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: TaskStatus.COMPLETED } : t));
      showToast(`${ids.length} tasks marked completed`);
    } else if (action === 'archive') {
      setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, isArchived: true } : t));
      showToast(`${ids.length} tasks archived`, 'info');
    }
  }, [tasks, showToast]);

  const handleSaveTask = useCallback((taskData: Partial<Task>) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData, updatedAt: new Date().toISOString() } as Task : t));
      showToast('Task updated successfully');
    } else {
      const newTask: Task = {
        ...(taskData as Task),
        id: `t_${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: TaskStatus.PENDING,
        isArchived: false
      };
      setTasks(prev => [...prev, newTask]);
      showToast('Task created');
    }
    setEditingTask(null);
  }, [editingTask, showToast]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleDuplicateTask = useCallback((task: Task) => {
    const duplicated: Task = { ...task, id: `t_${Date.now()}`, title: `${task.title} (Copy)`, status: TaskStatus.PENDING, createdAt: new Date().toISOString() };
    setTasks(prev => [...prev, duplicated]);
    showToast('Task duplicated', 'info');
  }, [showToast]);

  const handleDeleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;
    deletedTaskRef.current = taskToDelete;
    
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast('Task deleted', 'info', {
      label: 'Undo',
      onClick: () => {
        if (deletedTaskRef.current) {
          const taskToRestore = deletedTaskRef.current;
          setTasks(prev => [...prev, taskToRestore]);
          deletedTaskRef.current = null;
          showToast('Task restored');
        }
      }
    });
  }, [tasks, showToast]);

  const handleAddNewTask = useCallback((date?: string) => {
    setDefaultDueDate(date || null);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  // Notes Actions
  const handleAddNote = useCallback(() => {
    const newId = `n_${Date.now()}`;
    const newNote: Note = { id: newId, title: '', content: '', color: 'default', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setNotes(prev => [newNote, ...prev]);
    return newId;
  }, []);

  const handleUpdateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast('Note deleted', 'info');
  }, [showToast]);

  // View Transitions
  const handleViewChange = useCallback((view: ViewState) => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(() => {
          setCurrentView(view);
          if (view !== 'NOTES') setActiveNoteId(null);
        });
      });
    } else {
      setCurrentView(view);
      if (view !== 'NOTES') setActiveNoteId(null);
    }
  }, []);

  const handleViewNote = useCallback((noteId: string) => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(() => {
          setActiveNoteId(noteId);
          setCurrentView('NOTES');
        });
      });
    } else {
      setActiveNoteId(noteId);
      setCurrentView('NOTES');
    }
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow escape to close modals
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsHelpOpen(false);
        return;
      }
      
      // Global shortcut for Command Palette: Ctrl + / or Ctrl + K
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (isTaskModalOpen || isHelpOpen || isCommandPaletteOpen) return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case '1': e.preventDefault(); handleViewChange('DASHBOARD'); break;
          case '2': e.preventDefault(); handleViewChange('CALENDAR'); break;
          case '3': e.preventDefault(); handleViewChange('TASKS'); break;
          case '4': e.preventDefault(); handleViewChange('NOTES'); break;
        }
      }

      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const newId = handleAddNote();
        handleViewNote(newId);
        return;
      }

      if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setDefaultDueDate(null);
        setEditingTask(null);
        setIsTaskModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTaskModalOpen, isHelpOpen, isCommandPaletteOpen, handleViewChange, toggleTheme, handleAddNote, handleViewNote]);

  const isAnyModalOpen = isTaskModalOpen || isHelpOpen || isCommandPaletteOpen;

  return (
    <>
      <div 
        className="h-full w-full relative" 
        inert={isAnyModalOpen ? true : undefined} 
        aria-hidden={isAnyModalOpen ? "true" : undefined}
      >
        <Layout 
          currentView={currentView} 
          setCurrentView={handleViewChange}
          onAddNew={() => handleAddNewTask()}
          onOpenHelp={() => setIsHelpOpen(true)}
          isFocusMode={focusMode}
          badgeCounts={badgeCounts}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        >
          {currentView === 'DASHBOARD' && (
            <Dashboard 
              tasks={activeTasks} 
              notes={notes}
              toggleTaskStatus={handleToggleTaskStatus} 
              onCycleStatus={handleCycleTaskStatus}
              onEditTask={handleEditTask}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onToggleSubtask={handleToggleSubtask}
              onViewNote={handleViewNote}
              onOpenHelp={() => setIsHelpOpen(true)}
              focusMode={focusMode}
              setFocusMode={setFocusMode}
              onNavigateToTasks={() => handleViewChange('TASKS')}
            />
          )}
          {currentView === 'CALENDAR' && (
            <CalendarView 
               tasks={activeTasks} 
               toggleTaskStatus={handleToggleTaskStatus} 
               onAddTaskForDate={handleAddNewTask}
               onEditTask={handleEditTask}
               onDeleteTask={handleDeleteTask}
            />
          )}
          {currentView === 'TASKS' && (
            <TasksView 
              tasks={tasks} 
              notes={notes}
              toggleTaskStatus={handleToggleTaskStatus}
              onEditTask={handleEditTask}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onToggleArchive={handleToggleArchive}
              onBulkAction={handleBulkAction}
              onToggleSubtask={handleToggleSubtask}
              onViewNote={handleViewNote}
            />
          )}
          {currentView === 'NOTES' && (
            <NotesView 
              notes={notes} 
              tasks={tasks}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              activeNoteId={activeNoteId}
              onSelectNote={setActiveNoteId}
            />
          )}
        </Layout>
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} 
        onSave={handleSaveTask} 
        initialData={editingTask}
        defaultDueDate={defaultDueDate}
        allTags={allTags}
      />

      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tasks={tasks}
        notes={notes}
        onNavigate={handleViewChange}
        onNewTask={() => handleAddNewTask()}
        onEditTask={handleEditTask}
        onSelectNote={handleViewNote}
        onNewNote={() => {
          const newId = handleAddNote();
          handleViewNote(newId);
        }}
      />

      <HelpModal 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
      />

      {/* Global Toast - always render the live region, conditionally render content */}
      <div aria-live="polite" aria-atomic="true" className="fixed left-1/2 -translate-x-1/2 z-[200] bottom-28 md:bottom-10 pointer-events-none">
        {toast && (
          <div className="animate-slide-up pointer-events-auto">
            <div className="volumetric-surface px-6 py-4 rounded-[24px] flex items-center gap-4 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)]" role="status">
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
              <span className="font-semibold text-sm tracking-wide text-theme-primary whitespace-nowrap">{toast.message}</span>
              {toast.action && (
                <button 
                  onClick={toast.action.onClick}
                  className="volumetric-btn volumetric-btn-primary px-4 py-2 rounded-xl text-xs font-semibold text-theme-primary ml-2 hover:scale-105 active:scale-95 transition-transform shrink-0"
                >
                  {toast.action.label}
                </button>
              )}
              <button onClick={() => setToast(null)} className="ml-2 text-theme-tertiary hover:text-theme-primary transition-colors shrink-0" aria-label="Dismiss notification">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;