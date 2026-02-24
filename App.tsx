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
import { ConfirmDialog } from './components/ConfirmDialog';
import { CheckCircle, AlertCircle, X } from './components/Icons';
import { toLocalDateString } from './utils/dateUtils';

// Helper: Calculate next due date based on recurrence interval
function getNextRecurringDate(currentDueDate: string, interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
  const date = new Date(currentDueDate + 'T00:00:00');
  const originalDay = date.getDate();
  switch (interval) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  // Clamp to last day of target month if the day overflowed (e.g. Jan 31 → Mar 3 → Feb 28)
  if (interval !== 'weekly' && date.getDate() !== originalDay) {
    date.setDate(0); // Rolls back to last day of previous month
  }
  return toLocalDateString(date);
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const local = localStorage.getItem('auradesk-tasks'); return local ? JSON.parse(local) : INITIAL_TASKS; } catch { return INITIAL_TASKS; }
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    try { const local = localStorage.getItem('auradesk-notes'); return local ? JSON.parse(local) : INITIAL_NOTES; } catch { return INITIAL_NOTES; }
  });
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');

  // Date refresh state to ensure app updates at midnight if left open
  const [currentDateStr, setCurrentDateStr] = useState(toLocalDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = toLocalDateString();
      if (now !== currentDateStr) {
        setCurrentDateStr(now);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDueDate, setDefaultDueDate] = useState<string | null>(null);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel?: string;
    variant?: 'danger' | 'warning'; onConfirm: () => void;
  } | null>(null);

  // Hidden file input for import
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on tablet-sized screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize(); // Run on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus Mode State - Hoisted for layout-wide dimming
  const [focusMode, setFocusMode] = useState(false);

  // Archive Retention State (user-selectable: 30, 90, 180, 365 days)
  const [archiveRetentionDays, setArchiveRetentionDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('auradesk-archive-retention');
      return saved ? parseInt(saved, 10) : 90;
    } catch { return 90; }
  });

  useEffect(() => {
    localStorage.setItem('auradesk-archive-retention', String(archiveRetentionDays));
  }, [archiveRetentionDays]);

  // Toast & Undo State
  const [toast, setToast] = useState<{ message: string, type?: 'success' | 'info' | 'error', action?: { label: string, onClick: () => void } } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStackRef = useRef<Array<{ label: string; execute: () => void }>>([]);

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



  // Sync state across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auradesk-tasks' && e.newValue) {
        try {
          setTasks(JSON.parse(e.newValue));
        } catch { /* ignore parse errors */ }
      }
      if (e.key === 'auradesk-notes' && e.newValue) {
        try {
          setNotes(JSON.parse(e.newValue));
        } catch { /* ignore parse errors */ }
      }
      if (e.key === 'auradesk-theme') {
        setIsDark(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    const overdue = activeTasks.filter(t =>
      t.status !== TaskStatus.COMPLETED && t.dueDate < currentDateStr
    ).length;
    return {
      dashboard: overdue,
      tasks: activeTasks.filter(t => t.status !== TaskStatus.COMPLETED).length,
    };
  }, [activeTasks, currentDateStr]);

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
    // If there's an undo action, push to stack
    if (action) {
      undoStackRef.current.push({ label: action.label, execute: action.onClick });
      // Keep only last 10 undo actions
      if (undoStackRef.current.length > 10) {
        undoStackRef.current.shift();
      }
    }

    setToast({ message, type, action });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      // Clear undo stack after timeout (can't undo after toast disappears)
      undoStackRef.current = [];
    }, action ? 7000 : 3000);
  }, []);

  // Persist state to localStorage with quota guard
  useEffect(() => { try { localStorage.setItem('auradesk-tasks', JSON.stringify(tasks)); } catch (e) { showToast('Storage full — some changes may not be saved. Export your data to avoid data loss.', 'error'); } }, [tasks, showToast]);
  useEffect(() => { try { localStorage.setItem('auradesk-notes', JSON.stringify(notes)); } catch (e) { showToast('Storage full — some changes may not be saved. Export your data to avoid data loss.', 'error'); } }, [notes, showToast]);

  // Auto-cleanup archived tasks older than retention period
  useEffect(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - archiveRetentionDays);
    const cutoffISO = cutoff.toISOString();
    const stale = tasks.filter(t =>
      t.isArchived && t.updatedAt && t.updatedAt < cutoffISO
    );
    if (stale.length > 0) {
      setTasks(prev => prev.filter(t =>
        !(t.isArchived && t.updatedAt && t.updatedAt < cutoffISO)
      ));
      showToast(`Cleaned up ${stale.length} archived task${stale.length > 1 ? 's' : ''} older than ${archiveRetentionDays} days`, 'info');
    }
    // Run only on mount and when retention setting changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveRetentionDays]);

  // Global Ctrl+Z / Cmd+Z undo shortcut
  useEffect(() => {
    const handleUndo = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Don't hijack undo inside text inputs
        const tag = (e.target as HTMLElement)?.tagName;
        const editable = (e.target as HTMLElement)?.isContentEditable;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return;

        const action = undoStackRef.current.pop();
        if (action) {
          e.preventDefault();
          action.execute();
          setToast({ message: `Undo: ${action.label}`, type: 'info' });
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
        }
      }
    };
    window.addEventListener('keydown', handleUndo);
    return () => window.removeEventListener('keydown', handleUndo);
  }, []);

  const handleToggleTaskStatus = useCallback((id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;

      const isCompleting = task.status !== TaskStatus.COMPLETED;
      const now = new Date().toISOString();
      const updatedTasks = prev.map(t =>
        t.id === id
          ? { ...t, status: isCompleting ? TaskStatus.COMPLETED : TaskStatus.PENDING, updatedAt: now, completedAt: isCompleting ? now : undefined }
          : t
      );

      // If completing a recurring task, auto-generate the next instance
      if (isCompleting && task.recurring && task.recurringInterval) {
        const nextDueDate = getNextRecurringDate(task.dueDate, task.recurringInterval);
        const nextTask: Task = {
          ...task,
          id: crypto.randomUUID(),
          dueDate: nextDueDate,
          status: TaskStatus.PENDING,
          createdAt: new Date().toISOString(),
          updatedAt: undefined,
          isArchived: false,
          subtasks: task.subtasks
            ? task.subtasks.map(s => ({ ...s, id: crypto.randomUUID(), done: false }))
            : [],
        };
        updatedTasks.push(nextTask);
        setTimeout(() => showToast(`Next "${task.title}" created for ${new Date(nextDueDate + 'T00:00:00').toLocaleDateString()}`, 'info'), 100);
      }

      return updatedTasks;
    });
  }, [showToast]);

  const handleCycleTaskStatus = useCallback((id: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;

      const nextStatusMap = {
        [TaskStatus.PENDING]: TaskStatus.IN_PROGRESS,
        [TaskStatus.IN_PROGRESS]: TaskStatus.COMPLETED,
        [TaskStatus.COMPLETED]: TaskStatus.PENDING,
      };
      const nextStatus = nextStatusMap[task.status];
      const isCompleting = nextStatus === TaskStatus.COMPLETED;

      const now = new Date().toISOString();
      const updatedTasks = prev.map(t =>
        t.id === id ? { ...t, status: nextStatus, updatedAt: now, completedAt: isCompleting ? now : (nextStatus === TaskStatus.PENDING ? undefined : t.completedAt) } : t
      );

      if (isCompleting && task.recurring && task.recurringInterval) {
        const nextDueDate = getNextRecurringDate(task.dueDate, task.recurringInterval);
        const nextTask: Task = {
          ...task,
          id: crypto.randomUUID(),
          dueDate: nextDueDate,
          status: TaskStatus.PENDING,
          createdAt: new Date().toISOString(),
          updatedAt: undefined,
          isArchived: false,
          subtasks: task.subtasks
            ? task.subtasks.map(s => ({ ...s, id: crypto.randomUUID(), done: false }))
            : [],
        };
        updatedTasks.push(nextTask);
        setTimeout(() => showToast(`Next "${task.title}" created for ${new Date(nextDueDate + 'T00:00:00').toLocaleDateString()}`, 'info'), 100);
      }

      return updatedTasks;
    });
  }, [showToast]);

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
        id: crypto.randomUUID(),
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
    const duplicated: Task = {
      ...task,
      id: crypto.randomUUID(),
      title: `${task.title} (Copy)`,
      status: TaskStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
      isArchived: false,
      // Deep-copy subtasks with new unique IDs, reset completion
      subtasks: task.subtasks
        ? task.subtasks.map(s => ({
          ...s,
          id: crypto.randomUUID(),
          done: false,
        }))
        : [],
      // Deep-copy tags array (arrays are reference types)
      tags: [...(task.tags || [])],
    };
    setTasks(prev => [...prev, duplicated]);
    showToast('Task duplicated', 'info');
  }, [showToast]);

  const handleDeleteTask = useCallback((id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setConfirmDialog({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${taskToDelete.title}"? You can undo this action briefly after deletion.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        setTasks(prev => prev.filter(t => t.id !== id));
        showToast('Task deleted', 'info', {
          label: 'Undo',
          onClick: () => {
            setTasks(prev => [...prev, taskToDelete]);
            showToast('Task restored');
          }
        });
        setConfirmDialog(null);
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
    const newId = crypto.randomUUID();
    const newNote: Note = { id: newId, title: '', content: '', color: 'default', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setNotes(prev => [newNote, ...prev]);
    return newId;
  }, []);

  const handleUpdateNote = useCallback((updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    setConfirmDialog({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${noteToDelete.title || 'Untitled Note'}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        setNotes(prev => prev.filter(n => n.id !== id));
        showToast('Note deleted', 'info', {
          label: 'Undo',
          onClick: () => {
            setNotes(prev => [noteToDelete, ...prev]);
            showToast('Note restored');
          }
        });
        setConfirmDialog(null);
      }
    });
  }, [notes, showToast]);

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

      // Multi-step undo: Ctrl+Z pops the last undo action from the stack
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          const lastUndo = undoStackRef.current.pop()!;
          lastUndo.execute();
          return;
        }
      }

      // Global shortcut for Command Palette: Ctrl + / or Ctrl + K
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
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

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Data Export with integrity checksum
  const handleExportData = useCallback(async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      notes,
    };
    const payloadStr = JSON.stringify(payload);
    // Compute SHA-256 checksum for integrity verification
    let checksum = '';
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
      checksum = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { /* crypto.subtle unavailable (non-HTTPS) — skip checksum */ }
    const data = { ...payload, checksum };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auradesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully');
  }, [tasks, notes, showToast]);

  // Data Import
  const handleImportData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.tasks || !Array.isArray(data.tasks) || !data.notes || !Array.isArray(data.notes)) {
          showToast('Invalid backup file — missing tasks or notes data.', 'error');
          return;
        }
        // Verify checksum integrity if present
        const doImport = () => {
          setTasks(data.tasks);
          setNotes(data.notes);
          showToast(`Imported ${data.tasks.length} tasks and ${data.notes.length} notes`);
          setConfirmDialog(null);
        };

        const verifyAndImport = async () => {
          let checksumValid = true;
          if (data.checksum) {
            try {
              const { checksum, ...payload } = data;
              const payloadStr = JSON.stringify(payload);
              const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
              const computed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
              checksumValid = computed === checksum;
            } catch { checksumValid = true; /* Can't verify — skip */ }
          }

          const warningPrefix = !checksumValid ? '⚠️ Checksum mismatch — this file may have been modified. ' : '';
          setConfirmDialog({
            title: 'Import Data',
            message: `${warningPrefix}This will replace all your current data with ${data.tasks.length} tasks and ${data.notes.length} notes from the backup. This cannot be undone.`,
            confirmLabel: 'Import',
            variant: !checksumValid ? 'danger' : 'warning',
            onConfirm: doImport
          });
        };
        verifyAndImport();
      } catch {
        showToast('Failed to read backup file — invalid JSON.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  }, [showToast]);

  const isAnyModalOpen = isTaskModalOpen || isHelpOpen || isCommandPaletteOpen || !!confirmDialog;

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isAnyModalOpen]);

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
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          isFocusMode={focusMode}
          badgeCounts={badgeCounts}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onOpenDrawer={() => setIsMobileDrawerOpen(true)}
          onCloseDrawer={() => setIsMobileDrawerOpen(false)}
          onToggleFocusMode={() => setFocusMode(prev => !prev)}
          onExportData={handleExportData}
          onImportData={() => importFileRef.current?.click()}
          archiveRetentionDays={archiveRetentionDays}
          onSetArchiveRetention={setArchiveRetentionDays}
          tasks={activeTasks}
          onEditTask={handleEditTask}
          onNavigateToTasks={() => handleViewChange('TASKS')}
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

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        onConfirm={confirmDialog?.onConfirm || (() => { })}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Hidden file input for data import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        onChange={handleImportData}
        className="hidden"
        aria-hidden="true"
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