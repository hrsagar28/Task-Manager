import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Note, Task } from '../types';
import { GlassCard } from './GlassCard';
import { useRovingTabIndex } from '../hooks/useRovingTabIndex';
import { useDebounce } from '../hooks/useDebounce';
import { Plus, FileText, Pin, Trash, Search, BoldIcon, ItalicIcon, ListIcon, LinkIcon, X, ChevronLeft, Maximize, Minimize, UndoIcon, RedoIcon, UnderlineIcon, RemoveFormattingIcon } from './Icons';
import { NOTE_COLORS } from '../constants';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';

// Configure marked for safe legacy migration rendering
marked.setOptions({ breaks: true, gfm: true });

const isHtml = (str: string) => /<\/?[a-z][\s\S]*>/i.test(str);
const getInitialContent = (content: string) => {
    if (!content) return '';
    if (isHtml(content)) return content;
    try {
        return marked.parse(content) as string;
    } catch {
        return content;
    }
};

const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'a', 'hr', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    });
};

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
    const debouncedSearch = useDebounce(searchTerm, 200);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [linkSearch, setLinkSearch] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isNewNoteRef = useRef(false);
    const noteListRoving = useRovingTabIndex();

    const [showSaved, setShowSaved] = useState(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const deleteDisarmRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Warn before closing tab when editing
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (editor?.isFocused) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // Auto-disarm delete confirmation after 3 seconds
    useEffect(() => {
        if (deleteDisarmRef.current) clearTimeout(deleteDisarmRef.current);
        if (pendingDeleteId) {
            deleteDisarmRef.current = setTimeout(() => setPendingDeleteId(null), 3000);
        }
        return () => { if (deleteDisarmRef.current) clearTimeout(deleteDisarmRef.current); };
    }, [pendingDeleteId]);

    const selectedNoteId = activeNoteId;
    const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

    const filteredNotes = notes.filter(n =>
        n.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        n.content.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    const pinnedNotes = filteredNotes.filter(n => n.pinned);
    const otherNotes = filteredNotes.filter(n => !n.pinned);

    // Focus handling and view reset
    useEffect(() => {
        setIsLinking(false);
        setLinkSearch('');
        if (!selectedNoteId) setIsFullscreen(false);
    }, [selectedNoteId]);

    const handleEditorUpdate = useCallback((html: string) => {
        if (!selectedNote) return;
        const sanitizedHtml = sanitizeHtml(html);

        // Check if the actual content has changed from the initial migrated version
        const currentMigrated = getInitialContent(selectedNote.content);
        if (sanitizedHtml !== currentMigrated && sanitizedHtml !== selectedNote.content) {
            if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
            autoSaveTimeoutRef.current = setTimeout(() => {
                onUpdateNote({ ...selectedNote, content: sanitizedHtml, updatedAt: new Date().toISOString() });
                setShowSaved(true);
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                saveTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
            }, 500); // 500ms debounce
        }
    }, [selectedNote, onUpdateNote]);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TipTapLink.configure({
                openOnClick: true,
                autolink: true,
                HTMLAttributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    class: 'text-blue-500 hover:text-blue-600 underline transition-colors cursor-pointer',
                },
            }),
            Placeholder.configure({
                placeholder: 'Start typing your notes...',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: selectedNote ? getInitialContent(selectedNote.content) : '',
        onUpdate: ({ editor }) => {
            handleEditorUpdate(editor.getHTML());
        },
    });

    // Keep editor content in sync when switching notes
    useEffect(() => {
        if (editor && selectedNote) {
            const neededContent = getInitialContent(selectedNote.content);
            if (editor.getHTML() !== neededContent) {
                editor.commands.setContent(neededContent);
            }
            if (isNewNoteRef.current) {
                editor.commands.focus();
                isNewNoteRef.current = false;
            }
        }
    }, [selectedNote?.id, editor]);

    const handleAdd = () => {
        const newId = onAddNote();
        isNewNoteRef.current = true;
        onSelectNote(newId);
        setSearchTerm('');
        setIsFullscreen(false);
    };

    const handleDeleteClick = (id: string) => {
        if (pendingDeleteId === id) {
            onDeleteNote(id);
            setPendingDeleteId(null);
            if (selectedNoteId === id) {
                onSelectNote(null);
                setIsFullscreen(false);
            }
        } else {
            setPendingDeleteId(id);
        }
    };

    const handleUpdateField = (field: keyof Note, value: any) => {
        if (selectedNote) {
            onUpdateNote({ ...selectedNote, [field]: value, updatedAt: new Date().toISOString() });
            setShowSaved(true);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
        }
    };

    const getCleanTextForList = (htmlOrMarkdown: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = isHtml(htmlOrMarkdown) ? htmlOrMarkdown : DOMPurify.sanitize(marked.parse(htmlOrMarkdown) as string);
        return tempDiv.textContent || tempDiv.innerText || '';
    };

    const renderNoteList = (list: Note[], title?: string, staggerOffset: number = 0) => {
        if (list.length === 0) return null;
        return (
            <div className="mb-6">
                {title && <h3 className="text-[11px] font-medium uppercase tracking-wider text-theme-tertiary mb-3 pl-2 opacity-0 animate-fade-in" style={{ animationDelay: `${Math.min(staggerOffset, 200)}ms` }}>{title}</h3>}
                <div className="space-y-3">
                    {list.map((note, index) => {
                        const colorClass = NOTE_COLORS.find(c => c.id === note.color)?.className || '';
                        const previewText = getCleanTextForList(note.content);
                        return (
                            <button
                                key={note.id}
                                data-roving-item
                                tabIndex={index === 0 && staggerOffset === 150 ? 0 : -1}
                                onPointerDown={(e) => { if (e.pointerType === 'mouse') e.preventDefault() }}
                                onClick={() => {
                                    onSelectNote(note.id);
                                    if (window.innerWidth < 768) setIsFullscreen(false);
                                }}
                                style={{ animationDelay: `${Math.min(staggerOffset + index * 10, 200)}ms` }}
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
                                <p className="text-sm mt-2 line-clamp-2 font-medium text-theme-secondary">{previewText}</p>
                                <span className="text-[10px] font-medium uppercase tracking-widest text-theme-muted block mt-3">
                                    {new Date(note.updatedAt).toLocaleDateString()}
                                </span>
                                <div className="absolute bottom-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 group-hover/note:opacity-100 transition-opacity">
                                    {pendingDeleteId === note.id ? (
                                        <div className="flex items-center gap-1 animate-scale-in">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(note.id); }}
                                                className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-500 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/25 transition-colors"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPendingDeleteId(null); }}
                                                className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-theme-tertiary text-[10px] font-bold uppercase tracking-wider hover:text-theme-secondary transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPendingDeleteId(note.id); }}
                                            className="p-1.5 rounded-lg text-theme-tertiary hover:text-red-500 transition-colors"
                                            title="Delete note"
                                        >
                                            <Trash className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in flex flex-col md:flex-row gap-4 md:gap-6 h-[calc(100dvh-10rem)] md:h-[calc(100dvh-4rem)] relative overflow-hidden md:overflow-visible">

            {/* Sidebar List */}
            <GlassCard className={`flex flex-col w-full md:w-64 lg:w-80 h-full shrink-0 absolute inset-0 md:relative z-10 transition-all duration-500 ease-spring ${selectedNote ? '-translate-x-[110%] md:translate-x-0' : 'translate-x-0'
                } ${isFullscreen ? 'md:-translate-x-[110%] md:hidden md:opacity-0' : 'md:translate-x-0 md:opacity-100'}`}>
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

                <div ref={noteListRoving.containerProps.ref} onKeyDown={noteListRoving.containerProps.onKeyDown} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {renderNoteList(pinnedNotes, "Pinned", 150)}
                    {renderNoteList(otherNotes, pinnedNotes.length > 0 ? "Others" : undefined, 150 + (pinnedNotes.length * 10))}

                    {filteredNotes.length === 0 && (
                        <div className="text-center py-10 animate-fade-in">
                            <p className="text-sm font-medium text-theme-tertiary mb-4">
                                {searchTerm ? 'No notes match your search.' : 'No notes yet.'}
                            </p>
                            {!searchTerm && (
                                <button
                                    onClick={handleAdd}
                                    className="volumetric-btn volumetric-btn-primary px-6 py-2.5 rounded-2xl font-semibold text-xs text-theme-primary transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Create a Note
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* Main Editor Area */}
            <GlassCard className={`flex-1 flex-col h-full absolute inset-0 md:relative z-20 transition-all duration-500 ease-spring ${selectedNote ? 'translate-x-0' : 'translate-x-[110%] md:translate-x-0 md:opacity-100'
                } ${!selectedNote && notes.length > 0 ? 'md:flex' : 'flex'} ${selectedNote ? (NOTE_COLORS.find(c => c.id === selectedNote.color)?.className || '') : ''}`}>
                {selectedNote ? (
                    <div key={selectedNote.id} className="flex flex-col h-full animate-fade-in p-2 relative">
                        {/* Dynamic background inject for GlassCard */}
                        <div className={`absolute inset-0 pointer-events-none rounded-[inherit] -z-10 transition-colors duration-500 opacity-40 ${NOTE_COLORS.find(c => c.id === selectedNote.color)?.className || ''}`} />

                        {/* Mobile top row: back button + action buttons */}
                        <div className="md:hidden flex items-center justify-between mb-3">
                            <button
                                onClick={() => onSelectNote(null)}
                                className="flex items-center gap-2 text-sm font-semibold text-theme-secondary hover:text-theme-primary transition-colors py-1 pl-1 pr-3 -ml-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>All Notes</span>
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleUpdateField('pinned', !selectedNote.pinned)}
                                    className={`volumetric-btn w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${selectedNote.pinned ? 'text-blue-500 scale-110' : 'text-theme-tertiary hover:scale-105'}`}
                                    title={selectedNote.pinned ? 'Unpin Note' : 'Pin Note'}
                                >
                                    <Pin className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(selectedNote.id)}
                                    className={`transition-all duration-300 flex items-center justify-center ${pendingDeleteId === selectedNote.id
                                        ? 'volumetric-btn bg-red-500/20 !border-red-500/50 text-red-600 dark:text-red-400 px-3 h-9 rounded-xl gap-1.5 hover:bg-red-500/30'
                                        : 'volumetric-input w-9 h-9 rounded-full text-theme-tertiary hover:text-red-500'
                                        }`}
                                >
                                    <Trash className="w-4 h-4" />
                                    {pendingDeleteId === selectedNote.id && <span className="text-[10px] font-bold">Delete</span>}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 border-b border-theme-divider pb-4 relative gap-3">
                            <div className="flex-1 w-full relative">
                                <input
                                    type="text"
                                    maxLength={200}
                                    className="w-full text-3xl md:text-4xl font-semibold tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 text-theme-primary placeholder:text-theme-tertiary transition-colors pr-8"
                                    value={selectedNote.title}
                                    onChange={e => handleUpdateField('title', e.target.value)}
                                    placeholder="Note Title"
                                />
                                <span className={`absolute top-2 right-2 md:-right-4 transition-all duration-300 pointer-events-none ${showSaved ? 'opacity-100 scale-100 text-emerald-500' : 'opacity-0 scale-90 text-transparent'} text-xs font-bold flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full`}>
                                    ✓ Saved
                                </span>

                                <div className="mt-3 flex items-center gap-2 flex-wrap">
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
                                                <div className="absolute top-0 left-0 z-20 w-[280px] volumetric-surface glass-noise rounded-[16px] p-2 shadow-xl animate-scale-in origin-top-left">
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
                                                    <button onClick={() => setIsLinking(false)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full volumetric-surface glass-noise shadow-sm flex items-center justify-center text-theme-tertiary hover:text-theme-primary transition-transform hover:scale-110"><X className="w-3 h-3" /></button>
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

                            {/* Desktop-only action buttons */}
                            <div className="hidden md:flex flex-wrap items-center gap-2 ml-4 shrink-0 justify-end">
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className={`volumetric-input w-10 h-10 rounded-full flex items-center justify-center text-theme-tertiary hover:text-theme-primary transition-transform active:scale-95`}
                                    title={isFullscreen ? 'Exit Fullscreen' : 'Focus Mode'}
                                >
                                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                                </button>
                                <div className="w-px h-6 bg-theme-divider mx-1" />
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
                                        ? 'volumetric-btn bg-red-500/20 !border-red-500/50 text-red-600 dark:text-red-400 px-4 h-10 rounded-xl gap-2 hover:bg-red-500/30 ring-2 ring-red-500/20'
                                        : 'volumetric-input w-10 h-10 rounded-full text-theme-tertiary hover:text-red-500'
                                        }`}
                                    title={pendingDeleteId === selectedNote.id ? "Confirm Delete?" : "Delete Note"}
                                >
                                    <Trash className="w-4 h-4" />
                                    {pendingDeleteId === selectedNote.id && <span className="text-xs font-bold tracking-wide">Confirm?</span>}
                                </button>
                                {pendingDeleteId === selectedNote.id && (
                                    <button
                                        onClick={() => setPendingDeleteId(null)}
                                        className="volumetric-input w-10 h-10 rounded-full text-theme-tertiary hover:text-theme-secondary shrink-0"
                                        title="Cancel Delete"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Rich Text Toolbar */}
                        <div className="flex items-center gap-1.5 mb-4 pb-2 opacity-0 animate-slide-up flex-wrap" style={{ animationDelay: '100ms' }}>
                            <button
                                onClick={() => editor?.chain().focus().toggleBold().run()}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${editor?.isActive('bold') ? 'volumetric-btn text-theme-primary' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Bold"
                            >
                                <BoldIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => editor?.chain().focus().toggleItalic().run()}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${editor?.isActive('italic') ? 'volumetric-btn text-theme-primary' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Italic"
                            >
                                <ItalicIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${editor?.isActive('underline') ? 'volumetric-btn text-theme-primary' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Underline"
                            >
                                <UnderlineIcon className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-theme-divider mx-1" />
                            <button
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={`px-2 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all active:scale-95 ${editor?.isActive('heading', { level: 1 }) ? 'volumetric-btn text-theme-primary' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Heading 1"
                            >
                                H1
                            </button>
                            <button
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={`px-2 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all active:scale-95 ${editor?.isActive('heading', { level: 2 }) ? 'volumetric-btn text-theme-primary' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Heading 2"
                            >
                                H2
                            </button>
                            <div className="w-px h-6 bg-theme-divider mx-1" />
                            <button
                                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${editor?.isActive('bulletList') ? 'volumetric-btn text-theme-primary' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Bullet List"
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    const url = window.prompt('URL:');
                                    if (url !== null) {
                                        if (url === '') {
                                            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                                        } else {
                                            const formattedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                                            editor?.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
                                        }
                                    }
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 ${editor?.isActive('link') ? 'volumetric-btn text-blue-500' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-theme-secondary hover:text-theme-primary'}`}
                                title="Insert Link"
                            >
                                <LinkIcon className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-theme-divider mx-1" />
                            <button
                                onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                                className="bg-transparent hover:bg-black/5 w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all active:scale-95 dark:hover:bg-white/5"
                                title="Clear Formatting"
                            >
                                <RemoveFormattingIcon className="w-4 h-4" />
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => editor?.chain().focus().undo().run()}
                                disabled={!editor?.can().undo()}
                                className="bg-transparent hover:bg-black/5 w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all active:scale-95 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Undo"
                            >
                                <UndoIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => editor?.chain().focus().redo().run()}
                                disabled={!editor?.can().redo()}
                                className="bg-transparent hover:bg-black/5 w-8 h-8 rounded-lg flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all active:scale-95 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Redo"
                            >
                                <RedoIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* WYSIWYG Editor Area */}
                        <div className="flex-1 w-full overflow-y-auto custom-scrollbar px-2 pb-16 animate-fade-in relative">
                            <EditorContent
                                editor={editor}
                                className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-500 focus:outline-none min-h-full"
                            />
                        </div>

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
                                <span>Last edited: {new Date(selectedNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in pb-10 hidden md:flex">
                        <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-emerald-500/8 blur-[40px] rounded-full" />
                            <div className="absolute top-3 left-3 w-14 h-14 rounded-2xl rotate-[-12deg] opacity-40 bg-white/[0.07] dark:bg-white/[0.02] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.15),0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.05),0_2px_8px_-2px_rgba(0,0,0,0.2)]" />
                            <div className="absolute bottom-3 right-3 w-16 h-16 rounded-[18px] rotate-[12deg] opacity-30 bg-white/[0.07] dark:bg-white/[0.02] shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.15),0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.05),0_2px_8px_-2px_rgba(0,0,0,0.2)]" />
                            <div className="relative z-10 volumetric-surface glass-noise w-24 h-24 rounded-[28px] flex items-center justify-center">
                                <div className="volumetric-btn w-14 h-14 rounded-[18px] flex items-center justify-center text-emerald-500/60">
                                    <FileText className="w-7 h-7" />
                                </div>
                            </div>
                        </div>
                        {notes.length === 0 ? (
                            <>
                                <p className="text-sm font-semibold text-theme-secondary">No notes yet</p>
                                <p className="text-xs font-medium text-theme-tertiary mt-2">Create a note to capture your thoughts</p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-theme-secondary">No note selected</p>
                                <p className="text-xs font-medium text-theme-tertiary mt-2">Select a note to view or edit</p>
                            </>
                        )}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};
