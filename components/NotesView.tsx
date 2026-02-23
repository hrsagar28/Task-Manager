import React, { useState, useRef, useEffect } from 'react';
import { Note, Task } from '../types';
import { GlassCard } from './GlassCard';
import { Plus, FileText, Pin, Trash, Search, BoldIcon, ItalicIcon, ListIcon, EyeIcon, EditIcon, LinkIcon, X, ChevronLeft } from './Icons';
import { NOTE_COLORS } from '../constants';
import { marked } from 'marked';

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true
});

// Create a custom renderer that opens links in new tabs safely
const renderer = new marked.Renderer();
renderer.link = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.use({ renderer });

interface NotesViewProps {
  notes: Note[];
  tasks: Task[];
  onAddNote: () => string;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  activeNoteId: string | null;
  onSelectNote: (id: string | null) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ notes, tasks, onAddNote, onUpdateNote, onDeleteNote, activeNoteId, onSelectNote }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreview, setIsPreview] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNewNoteRef = useRef(false);

  const [showSaved, setShowSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNoteId = activeNoteId || (notes.length > 0 ? notes[0].id : null);
  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const otherNotes = filteredNotes.filter(n => !n.pinned);

  // Focus textarea when un-toggling preview
  useEffect(() => {
    if (!isPreview && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isPreview]);

  // Reset linking state and ensure preview mode when note changes
  useEffect(() => {
    setIsLinking(false);
    setLinkSearch('');
    if (isNewNoteRef.current) {
      isNewNoteRef.current = false;
    } else {
      setIsPreview(true);
    }
  }, [selectedNoteId]);

  const handleAdd = () => {
    const newId = onAddNote();
    isNewNoteRef.current = true;
    onSelectNote(newId);
    setIsPreview(false);
    setSearchTerm('');
  };

  const handleDeleteClick = (id: string) => {
    if (pendingDeleteId === id) {
      onDeleteNote(id);
      setPendingDeleteId(null);
      if (selectedNoteId === id) {
        onSelectNote(null);
      }
    } else {
      setPendingDeleteId(id);
      setTimeout(() => {
        setPendingDeleteId(current => current === id ? null : current);
      }, 5000);
    }
  };

  const handleUpdateField = (field: keyof Note, value: any) => {
    if (selectedNote) {
      onUpdateNote({ ...selectedNote, [field]: value, updatedAt: new Date().toISOString() });
      setShowSaved(true);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setShowSaved(false), 1500);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!selectedNote || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedNote.content;
    const before = text.substring(0, start);
    const selected = text.substring(start, end) || 'text';
    const after = text.substring(end);

    const newContent = `${before}${prefix}${selected}${suffix}${after}`;
    handleUpdateField('content', newContent);

    // Focus back and set cursor position (setTimeout required to wait for render)
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selected.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const renderSafeMarkdown = (content: string) => {
    try {
      if (!content || !content.trim()) return '<p class="text-theme-tertiary italic">Empty note</p>';

      // Strip <script> tags and event handlers but preserve markdown-valid HTML
      const sanitized = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript\s*:/gi, '');

      return marked.parse(sanitized) as string;
    } catch (e) {
      return '<p class="text-red-500">Error rendering preview.</p>';
    }
  };

  const renderNoteList = (list: Note[], title?: string, staggerOffset: number = 0) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-6">
        {title && <h3 className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 pl-2 opacity-0 animate-fade-in" style={{ animationDelay: `${staggerOffset}ms` }}>{title}</h3>}
        <div className="space-y-3">
          {list.map((note, index) => {
            const colorClass = NOTE_COLORS.find(c => c.id === note.color)?.className || '';
            return (
              <button
                key={note.id}
                onClick={() => {
                  onSelectNote(note.id);
                  setIsPreview(true);
                }}
                style={{ animationDelay: `${staggerOffset + Math.min(index * 10, 150)}ms` }}
                className={`w-full text-left p-5 rounded-[24px] transition-all duration-300 ease-smooth relative group/note opacity-0 animate-slide-up ${selectedNoteId === note.id
                  ? `volumetric-btn ${colorClass} scale-[1.02] z-10`
                  : `volumetric-input hover-surface ${colorClass}`
                  }`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-50">
                  {note.linkedTaskId && <LinkIcon className="w-3 h-3 text-blue-500" />}
                  {note.pinned && <Pin className="w-3 h-3 text-theme-tertiary" />}
                </div>
                <h4 className="font-semibold text-base line-clamp-1 pr-10 text-theme-primary">{note.title || 'Untitled Note'}</h4>
                <p className="text-sm mt-2 line-clamp-2 font-medium text-theme-secondary">{note.content}</p>
                <span className="text-[10px] font-medium uppercase tracking-widest text-theme-muted block mt-3">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in flex flex-col md:flex-row gap-4 md:gap-6 h-[calc(100vh-10rem)] md:h-[calc(100vh-4rem)]">
      {/* Sidebar List - Hidden on mobile when a note is selected */}
      <GlassCard className={`${selectedNote ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-64 lg:w-80 h-full shrink-0`}>
        <div className="flex items-center justify-between mb-8 opacity-0 animate-slide-up">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-3 text-theme-primary">
            <div className="volumetric-btn w-10 h-10 rounded-full flex items-center justify-center text-theme-tertiary">
              <FileText className="w-4 h-4" />
            </div>
            Notes
          </h2>
          <button
            onClick={handleAdd}
            className="volumetric-btn w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 text-theme-primary"
            aria-label="New Note"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-6 opacity-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="volumetric-input w-full pl-12 pr-4 py-3 rounded-[20px] text-sm font-medium text-theme-secondary placeholder:text-theme-tertiary transition-all focus:-translate-y-0.5"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {renderNoteList(pinnedNotes, "Pinned", 150)}
          {renderNoteList(otherNotes, pinnedNotes.length > 0 ? "Others" : undefined, 150 + (pinnedNotes.length * 10))}

          {filteredNotes.length === 0 && (
            <p className="text-center text-sm font-medium text-theme-tertiary py-10 animate-fade-in">No notes found.</p>
          )}
        </div>
      </GlassCard>

      {/* Main Editor Area - Hidden on mobile when no note is selected */}
      <GlassCard className={`${!selectedNote && notes.length > 0 ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full transition-colors duration-700 ease-smooth ${selectedNote ? (NOTE_COLORS.find(c => c.id === selectedNote.color)?.className || '') : ''}`}>
        {selectedNote ? (
          <div key={selectedNote.id} className="flex flex-col h-full animate-fade-in p-2">
            <button
              onClick={() => onSelectNote(null)}
              className="md:hidden flex items-center gap-2 mb-4 text-sm font-semibold text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>All Notes</span>
            </button>
            <div className="flex justify-between items-start mb-4 border-b border-theme-divider pb-4 relative">
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full text-3xl md:text-4xl font-semibold tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 text-theme-primary placeholder:text-theme-tertiary transition-colors"
                  value={selectedNote.title}
                  onChange={e => handleUpdateField('title', e.target.value)}
                  placeholder="Note Title"
                />
                <div className="mt-3 flex items-center gap-2">
                  {selectedNote.linkedTaskId ? (() => {
                    const linkedTask = tasks.find(t => t.id === selectedNote.linkedTaskId);
                    return (
                      <div className="volumetric-input px-3 py-2 rounded-xl text-[11px] font-semibold text-blue-600/70 dark:text-blue-400 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${linkedTask?.status === 'COMPLETED' ? 'bg-emerald-400' :
                          linkedTask?.status === 'IN_PROGRESS' ? 'bg-blue-400' : 'bg-slate-400'
                          }`} />
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {linkedTask?.title || 'Unknown Task'}
                        </span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider ml-auto shrink-0 ${linkedTask?.status === 'COMPLETED' ? 'text-emerald-500' : 'text-theme-tertiary'
                          }`}>
                          {linkedTask?.status === 'IN_PROGRESS' ? 'In Progress' : (linkedTask?.status || 'unknown').toLowerCase()}
                        </span>
                        <button onClick={() => handleUpdateField('linkedTaskId', undefined)} className="hover:text-red-500 ml-1 transition-colors shrink-0" title="Unlink task">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })() : (
                    <div className="relative">
                      {isLinking ? (
                        <div className="absolute top-0 left-0 z-20 w-[280px] volumetric-surface rounded-[16px] p-2 shadow-xl animate-scale-in origin-top-left">
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-tertiary" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Search task to link..."
                              value={linkSearch}
                              onChange={e => setLinkSearch(e.target.value)}
                              className="volumetric-input w-full pl-8 pr-3 py-2 text-xs rounded-lg font-medium text-theme-primary"
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                            {tasks.filter(t => t.title.toLowerCase().includes(linkSearch.toLowerCase())).slice(0, 5).map(t => (
                              <button
                                key={t.id}
                                onClick={() => { handleUpdateField('linkedTaskId', t.id); setIsLinking(false); }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-theme-secondary hover-surface rounded-lg truncate transition-colors"
                              >
                                {t.title}
                              </button>
                            ))}
                            {tasks.filter(t => t.title.toLowerCase().includes(linkSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-xs text-theme-tertiary text-center">No matching tasks</div>
                            )}
                          </div>
                          <button onClick={() => setIsLinking(false)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full volumetric-surface shadow-sm flex items-center justify-center text-theme-tertiary hover:text-theme-primary transition-transform hover:scale-110"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setIsLinking(true); setLinkSearch(''); }} className="volumetric-input px-3 py-1.5 rounded-xl text-[11px] font-medium text-theme-tertiary hover:text-theme-primary flex items-center gap-1.5 transition-colors">
                          <LinkIcon className="w-3 h-3" /> Link to task...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleUpdateField('pinned', !selectedNote.pinned)}
                  className={`volumetric-btn w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${selectedNote.pinned ? 'text-blue-500 scale-110' : 'text-theme-tertiary hover:scale-105'}`}
                  title={selectedNote.pinned ? 'Unpin Note' : 'Pin Note'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(selectedNote.id)}
                  className={`transition-all duration-300 flex items-center justify-center ${pendingDeleteId === selectedNote.id
                    ? 'volumetric-btn bg-red-500/20 !border-red-500/50 text-red-600 dark:text-red-400 px-4 h-10 rounded-xl gap-2 hover:bg-red-500/30 ring-2 ring-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'volumetric-input w-10 h-10 rounded-full text-theme-tertiary hover:text-red-500'
                    }`}
                  title={pendingDeleteId === selectedNote.id ? "Confirm Delete?" : "Delete Note"}
                >
                  <Trash className="w-4 h-4" />
                  {pendingDeleteId === selectedNote.id && <span className="text-xs font-bold tracking-wide">Confirm?</span>}
                </button>
              </div>
            </div>

            {/* Rich Text Toolbar */}
            <div className="flex items-center justify-between mb-4 pb-2 opacity-0 animate-slide-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  disabled={isPreview}
                  className={`volumetric-btn w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary transition-all active:scale-95 ${isPreview ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Bold"
                >
                  <BoldIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*')}
                  disabled={isPreview}
                  className={`volumetric-btn w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary transition-all active:scale-95 ${isPreview ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Italic"
                >
                  <ItalicIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-theme-divider mx-1" />
                <button
                  onClick={() => insertFormatting('- ')}
                  disabled={isPreview}
                  className={`volumetric-btn w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary transition-all active:scale-95 ${isPreview ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Bullet List"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsPreview(!isPreview)}
                className="volumetric-input px-3 py-1.5 rounded-xl text-[11px] font-medium uppercase tracking-wider flex items-center gap-2 text-theme-tertiary transition-transform active:scale-95"
              >
                {isPreview ? <><EditIcon className="w-4 h-4" /> Edit</> : <><EyeIcon className="w-4 h-4" /> Preview</>}
              </button>
            </div>

            {/* Editor vs Preview Area */}
            {isPreview ? (
              <div
                className="flex-1 w-full overflow-y-auto markdown-body text-theme-secondary leading-relaxed font-medium text-sm custom-scrollbar px-2 animate-fade-in"
                dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(selectedNote.content) }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                className="flex-1 w-full resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-theme-secondary placeholder:text-theme-tertiary leading-relaxed font-medium text-sm custom-scrollbar opacity-0 animate-slide-up"
                style={{ animationDelay: '150ms' }}
                value={selectedNote.content}
                onChange={e => handleUpdateField('content', e.target.value)}
                placeholder="Start typing your notes using markdown..."
              />
            )}

            <div className="mt-4 pt-4 flex flex-wrap justify-between items-center gap-4 border-t border-theme-divider opacity-0 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex gap-2 items-center">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => handleUpdateField('color', color.id)}
                    className={`w-6 h-6 rounded-full transition-all duration-300 ease-smooth border-2 ${selectedNote.color === color.id ? 'border-slate-800 dark:border-slate-200 scale-125' : 'border-transparent hover:scale-110'} ${color.className || 'bg-slate-200 dark:bg-slate-700'}`}
                    title={color.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-widest text-theme-muted">
                <span className={`transition-all duration-300 ${showSaved ? 'opacity-100 text-emerald-500' : 'opacity-0'}`}>
                  ✓ Saved
                </span>
                <span>Last edited: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-theme-tertiary opacity-60 animate-fade-in">
            <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500/10 blur-[40px] rounded-full" />
              <div className="absolute top-4 left-4 w-16 h-16 volumetric-surface rounded-2xl rotate-[-15deg] opacity-60 transition-transform duration-700 ease-smooth hover:rotate-[-5deg]" />
              <div className="absolute bottom-4 right-4 w-20 h-20 volumetric-surface rounded-[20px] rotate-[15deg] opacity-40 transition-transform duration-700 ease-smooth hover:rotate-[5deg]" />
              <div className="relative z-10 volumetric-surface w-28 h-28 rounded-[32px] flex items-center justify-center transform hover:scale-105 transition-transform duration-500 ease-smooth">
                <div className="volumetric-btn w-16 h-16 rounded-[20px] flex items-center justify-center bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <FileText className="w-8 h-8" />
                </div>
              </div>
            </div>
            <p className="font-medium text-sm text-theme-secondary">Select a note to view or edit.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
};