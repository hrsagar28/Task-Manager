export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO Date string YYYY-MM-DD
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  clientName?: string;
  tags: string[];
  subtasks?: Subtask[];
  recurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  createdAt: string;
  updatedAt?: string;
  isArchived?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  linkedTaskId?: string;
}

export type ViewState = 'DASHBOARD' | 'CALENDAR' | 'NOTES' | 'TASKS';