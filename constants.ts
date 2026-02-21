import { Task, TaskPriority, TaskStatus, Note } from './types';
import { toLocalDateString } from './utils/dateUtils';

export const TASK_CATEGORIES = [
  "Tax Filing", "GST", "Audit", "ROC", "Advisory", "Litigation", 
  "Incorporation", "Follow-up", "Personal", "Other"
];

export const NOTE_COLORS = [
  { id: 'default', name: 'Glass Default', className: '' },
  { id: 'slate', name: 'Slate', className: 'bg-slate-500/10 border-slate-500/20' },
  { id: 'emerald', name: 'Emerald', className: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'amber', name: 'Amber', className: 'bg-amber-500/10 border-amber-500/20' },
  { id: 'rose', name: 'Rose', className: 'bg-rose-500/10 border-rose-500/20' },
  { id: 'indigo', name: 'Indigo', className: 'bg-indigo-500/10 border-indigo-500/20' },
];

const getTodayDateString = () => toLocalDateString();
const getFutureDateString = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
};
const getPastDateString = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateString(d);
};

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'File GST Returns (GSTR-3B)',
    description: 'Ensure all input tax credits are reconciled before filing.',
    dueDate: getTodayDateString(),
    status: TaskStatus.PENDING,
    priority: TaskPriority.URGENT,
    category: 'GST',
    clientName: 'Stark Industries',
    tags: ['Tax', 'Filing'],
    subtasks: [
      { id: 's1', text: 'Reconcile GSTR-2B', done: true },
      { id: 's2', text: 'Prepare Chalan', done: false }
    ],
    recurring: true,
    recurringInterval: 'monthly',
    createdAt: getPastDateString(2)
  },
  {
    id: 't2',
    title: 'Finalize Audit Report',
    description: 'Review the fixed assets schedule and verify depreciation calculations.',
    dueDate: getTodayDateString(),
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    category: 'Audit',
    clientName: 'Wayne Enterprises',
    tags: ['Audit', 'Review'],
    createdAt: getPastDateString(5)
  },
  {
    id: 't3',
    title: 'Prepare TDS Challan',
    description: 'Calculate TDS for rent and professional fees for the current month.',
    dueDate: getFutureDateString(2),
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    category: 'Tax Filing',
    clientName: 'Acme Corp',
    tags: ['Tax', 'TDS'],
    createdAt: getTodayDateString()
  }
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Stark Ind. Audit Queries',
    content: '1. Need invoices for machinery purchased in Q2.\n2. Clarify the sudden spike in travel expenses.\n3. Verify PF deductions for contract workers.',
    color: 'emerald',
    pinned: true,
    createdAt: getPastDateString(1),
    updatedAt: getPastDateString(1),
    linkedTaskId: 't2'
  },
  {
    id: 'n2',
    title: 'Important Deadlines Q3',
    content: '- Advance Tax 2nd Installment: Sept 15\n- GST Annual Return: Dec 31\n- Income Tax Return (Audit Cases): Oct 31',
    color: 'rose',
    pinned: false,
    createdAt: getPastDateString(10),
    updatedAt: getPastDateString(2)
  }
];