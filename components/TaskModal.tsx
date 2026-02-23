import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, Subtask, TaskStatus } from '../types';
import { X, Plus, Trash } from './Icons';
import { TASK_CATEGORIES } from '../constants';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { toLocalDateString } from '../utils/dateUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initialData?: Task | null;
  defaultDueDate?: string | null;
  allTags?: string[];
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialData, defaultDueDate, allTags = [] }) => {
  const focusTrapRef = useFocusTrap(isOpen);

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(toLocalDateString());
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.PENDING);
  const [category, setCategory] = useState<string>('Other');
  const [clientName, setClientName] = useState('');

  // Checklist State
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  // Tags State
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Recurring State
  const [recurring, setRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    if (isOpen) {
      setTitleError(false);
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setDueDate(initialData.dueDate);
        setPriority(initialData.priority);
        setStatus(initialData.status || TaskStatus.PENDING);
        setCategory(initialData.category || 'Other');
        setClientName(initialData.clientName || '');
        setSubtasks(initialData.subtasks || []);
        setRecurring(initialData.recurring || false);
        setRecurringInterval(initialData.recurringInterval || 'monthly');
        setTags(initialData.tags || []);
      } else {
        setTitle('');
        setDescription('');
        setDueDate(defaultDueDate || toLocalDateString());
        setPriority(TaskPriority.MEDIUM);
        setStatus(TaskStatus.PENDING);
        setCategory('Other');
        setClientName('');
        setSubtasks([]);
        setRecurring(false);
        setRecurringInterval('monthly');
        setTags([]);
      }
      setTagInput('');
    }
  }, [isOpen, initialData, defaultDueDate]);

  const submitTask = useCallback(() => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }

    onSave({
      title: title.trim(),
      description,
      dueDate,
      priority,
      status,
      category,
      clientName,
      subtasks,
      recurring,
      recurringInterval: recurring ? recurringInterval : undefined,
      tags
    });
    onClose();
  }, [title, description, dueDate, priority, status, category, clientName, subtasks, recurring, recurringInterval, tags, onSave, onClose]);

  // Keyboard shortcut to save (Ctrl+Enter or Cmd+Enter)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitTask]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTask();
  };

  const handleAddSubtask = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (('key' in e && e.key === 'Enter') || e.type === 'click') {
      e.preventDefault();
      if (newSubtask.trim()) {
        setSubtasks([...subtasks, { id: `sub_${Date.now()}`, text: newSubtask.trim(), done: false }]);
        setNewSubtask('');
      }
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const suggestedTags = allTags.filter(t => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())).slice(0, 5);

  const isMac = typeof navigator !== 'undefined' && ((navigator as any).userAgentData?.platform === 'macOS' || /Mac|iPhone|iPad/.test(navigator.userAgent));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 backdrop-blur-2xl saturate-150 animate-fade-in"
        style={{ background: 'var(--modal-backdrop)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={focusTrapRef}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col volumetric-surface rounded-[32px] overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center p-8 pb-4 flex-shrink-0">
          <h2 id="modal-title" className="text-2xl font-semibold tracking-tight text-theme-primary">
            {initialData ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="volumetric-btn w-12 h-12 rounded-full flex items-center justify-center text-theme-tertiary transition-transform hover:scale-110 active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="task-form" onSubmit={handleSubmit} className="p-8 pt-4 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Title Area */}
          <div>
            <label htmlFor="title" className={`block text-[11px] font-medium uppercase tracking-wider mb-2 pl-1 transition-colors ${titleError ? 'text-red-500' : 'text-theme-tertiary'}`}>Title <span className="text-red-500">*</span></label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
              className={`volumetric-input w-full px-5 py-4 rounded-[20px] font-semibold text-base transition-all focus:-translate-y-0.5 text-theme-primary ${titleError ? '!border-red-400/40 !shadow-[0_0_0_3px_rgba(239,68,68,0.1)_inset]' : ''}`}
              placeholder="e.g. File Q3 Returns"
            />
            {titleError && (
              <p className="text-red-500 text-[10px] font-medium mt-2 pl-2 animate-fade-in">Task title is required</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="clientName" className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-2 pl-1">Client Name</label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="volumetric-input w-full px-5 py-4 rounded-[20px] font-semibold text-sm transition-all focus:-translate-y-0.5 text-theme-primary"
                placeholder="e.g. Wayne Enterprises"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-2 pl-1">Due Date</label>
              <input
                id="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="volumetric-input w-full px-5 py-4 rounded-[20px] font-semibold text-sm transition-all focus:-translate-y-0.5 text-theme-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="priority" className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-2 pl-1">Priority</label>
              <div className="relative">
                <select
                  id="priority"
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="volumetric-input w-full px-5 py-4 rounded-[20px] font-semibold text-sm appearance-none cursor-pointer transition-all focus:-translate-y-0.5 text-theme-primary"
                >
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                  <option value={TaskPriority.URGENT}>Urgent</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Recurring Toggle */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-2 pl-1">Recurring</label>
              <div className="flex items-center gap-3 h-[52px]">
                <button
                  type="button"
                  onClick={() => setRecurring(!recurring)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-smooth ${recurring ? 'bg-emerald-500' : 'volumetric-input'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 ease-spring ${recurring ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
                {recurring && (
                  <select
                    value={recurringInterval}
                    onChange={e => setRecurringInterval(e.target.value as any)}
                    className="volumetric-input px-4 py-2 rounded-xl font-semibold text-sm appearance-none cursor-pointer flex-1 animate-scale-in origin-left text-theme-primary"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>
              {recurring && (
                <div className="mt-3 px-1">
                  <p className="text-[11px] text-theme-tertiary">
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" />
                        <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" />
                      </svg>
                      When completed, a new task will be created due{' '}
                      <strong className="text-theme-secondary">
                        {recurringInterval === 'weekly' && '1 week'}
                        {recurringInterval === 'monthly' && '1 month'}
                        {recurringInterval === 'quarterly' && '3 months'}
                        {recurringInterval === 'yearly' && '1 year'}
                      </strong>{' '}
                      after the current due date.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Categories - Mobile Horizontal Scroll */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 pl-1">Category</label>
            <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap gap-2 pb-2 -mx-2 px-2 sm:pb-0 sm:mx-0 sm:px-0">
              {TASK_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-[14px] text-[11px] font-medium uppercase tracking-wider whitespace-nowrap transition-all duration-300 ease-smooth hover:-translate-y-0.5 active:scale-95 ${category === cat
                      ? 'volumetric-btn volumetric-btn-primary text-theme-primary scale-[1.02]'
                      : 'volumetric-input text-theme-tertiary hover:text-theme-primary'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 pl-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span key={tag} className="volumetric-btn px-3 py-1 rounded-xl text-[11px] font-semibold uppercase tracking-wider text-theme-secondary flex items-center gap-1.5">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type a tag and press Enter or comma..."
              className="volumetric-input w-full px-5 py-3 rounded-[16px] font-medium text-sm transition-all focus:-translate-y-0.5 text-theme-secondary mb-2"
            />
            {suggestedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] font-medium text-theme-tertiary">Suggested:</span>
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (!tags.includes(tag)) setTags([...tags, tag]);
                      setTagInput('');
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-theme-tertiary bg-theme-divider hover-surface transition-colors border border-theme-divider"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Selection (Visible only in Edit Mode) */}
          {initialData && (
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 pl-1">Status</label>
              <div className="flex bg-theme-divider p-1 rounded-[16px] gap-1">
                {[
                  { val: TaskStatus.PENDING, label: 'Pending' },
                  { val: TaskStatus.IN_PROGRESS, label: 'In Progress' },
                  { val: TaskStatus.COMPLETED, label: 'Completed' }
                ].map(s => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setStatus(s.val)}
                    className={`flex-1 py-2.5 rounded-[12px] text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ease-smooth ${status === s.val
                        ? 'volumetric-surface shadow-sm text-theme-primary scale-[1.02]'
                        : 'text-theme-tertiary hover:text-theme-secondary hover-surface'
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-2 pl-1">Notes</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="volumetric-input w-full px-5 py-4 rounded-[20px] font-medium text-sm resize-none custom-scrollbar transition-all focus:-translate-y-0.5 text-theme-secondary"
              placeholder="Any additional details..."
            />
          </div>

          {/* Checklist */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-2 pl-1">Checklist</label>
            <div className="space-y-3 mb-3">
              {subtasks.map((sub, idx) => (
                <div key={sub.id} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${idx * 10}ms` }}>
                  <span className="text-sm font-medium flex-1 pl-2 text-theme-secondary transition-colors">• {sub.text}</span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(sub.id)}
                    className="p-2 text-theme-tertiary hover:text-red-500 transition-colors hover:scale-110 active:scale-95"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={handleAddSubtask}
                placeholder="Add subtask..."
                className="volumetric-input flex-1 px-5 py-3 rounded-[16px] font-medium text-sm transition-all focus:-translate-y-0.5 text-theme-secondary"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="volumetric-btn w-12 rounded-[16px] flex items-center justify-center text-theme-tertiary transition-transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

        </form>

        <div className="p-8 pt-4 flex flex-wrap justify-between items-center gap-4 border-t border-theme-divider flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="volumetric-input px-8 py-4 rounded-[20px] font-semibold text-theme-tertiary hover:text-theme-primary transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Cancel
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-medium text-theme-tertiary hidden sm:inline-block">
              {isMac ? 'Cmd' : 'Ctrl'} + Enter to save
            </span>
            <button
              type="submit"
              form="task-form"
              className="volumetric-btn volumetric-btn-primary px-10 py-4 rounded-[20px] font-semibold tracking-wide text-theme-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {initialData ? 'Update Task' : 'Save Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};