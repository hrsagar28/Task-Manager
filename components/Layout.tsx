import React from 'react';
import { ViewState, Task } from '../types';
import { LayoutDashboard, Calendar, FileText, ListTodo, Plus, HelpCircle, ChevronLeft, ChevronRight, Search, MoreHorizontal, Sun, Moon } from './Icons';
import { MobileDrawer } from './MobileDrawer';
import { NotificationPanel } from './NotificationPanel';
import { getModifierKey, getAltKey } from '../utils/osUtils';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  onAddNew: () => void;
  onOpenHelp: () => void;
  onOpenCommandPalette: () => void;
  isMobileDrawerOpen?: boolean;
  onOpenDrawer?: () => void;
  onCloseDrawer?: () => void;
  onToggleFocusMode?: () => void;
  isFocusMode?: boolean;
  badgeCounts?: { dashboard: number; tasks: number };
  isDark?: boolean;
  onToggleTheme?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  // Notification Panel props
  tasks?: Task[];
  onEditTask?: (task: Task) => void;
  onNavigateToTasks?: () => void;
  // Data management
  // Archive retention
  archiveRetentionDays?: number;
  onSetArchiveRetention?: (days: number) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  setCurrentView,
  onAddNew,
  onOpenHelp,
  onOpenCommandPalette,
  isMobileDrawerOpen = false,
  onOpenDrawer,
  onCloseDrawer,
  onToggleFocusMode,
  isFocusMode = false,
  badgeCounts,
  isDark = false,
  onToggleTheme,
  isSidebarCollapsed = false,
  onToggleSidebar,
  tasks,
  onEditTask,
  onNavigateToTasks,
  archiveRetentionDays,
  onSetArchiveRetention
}) => {
  const prevScrollY = React.useRef(0);

  const modKey = getModifierKey();
  const altKey = getAltKey();

  return (
    <div className="relative h-full w-full flex flex-col md:flex-row overflow-hidden transition-all duration-700">
      {/* Skip to main content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-6 focus:py-3 focus:rounded-2xl focus:volumetric-surface glass-noise focus:text-theme-primary focus:text-sm focus:font-semibold focus:shadow-lg focus:animate-fade-in"
      >
        Skip to main content
      </a>
      {/* Ambient light washes — extremely subtle, large scale */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000 ${isDark ? 'opacity-40' : 'opacity-100'} ${isFocusMode ? (isDark ? 'opacity-20' : 'opacity-20') : ''}`}>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[60%] rounded-full blur-[120px]" style={{ background: `radial-gradient(ellipse, var(--ambient-cool) 0%, transparent 70%)` }} />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[50%] rounded-full blur-[120px]" style={{ background: `radial-gradient(ellipse, var(--ambient-warm) 0%, transparent 70%)` }} />
      </div>

      {/* Sidebar Navigation (Desktop) */}
      <aside className={`hidden md:flex relative z-20 flex-col volumetric-surface glass-noise liquid-glass-sidebar rounded-[28px] m-4 mr-0 h-[calc(100dvh-2rem)] transition-all duration-500 ease-smooth ${isSidebarCollapsed ? 'w-[96px] py-6 px-3 items-center' : 'w-80 p-6'
        } ${isFocusMode ? 'opacity-30 blur-[2px] hover:opacity-100 hover:blur-none grayscale' : 'opacity-100'}`}
        style={isDark ? { '--glass-surface-from': 'rgba(255, 255, 255, 0.03)', '--glass-surface-mid': 'rgba(255, 255, 255, 0.03)', '--glass-surface-to': 'rgba(255, 255, 255, 0.01)' } as React.CSSProperties : undefined}
      >

        <div className={`flex items-center gap-4 mb-12 w-full ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2'}`}>
          <div className="relative shrink-0">
            {/* Subtle glow behind icon */}
            <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full" />
            <div className="relative volumetric-btn w-12 h-12 rounded-[16px] flex items-center justify-center">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-b from-slate-700 to-slate-500 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">A</span>
            </div>
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 overflow-hidden opacity-100 transition-opacity duration-300 animate-fade-in">
              <h1 className="text-lg font-semibold tracking-tight text-theme-primary truncate">AuraDesk</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-theme-tertiary truncate">CA Workspace</p>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className={`overflow-hidden transition-all duration-300 ease-smooth ${isSidebarCollapsed ? 'opacity-0 max-h-0 pointer-events-none' : 'opacity-100 max-h-[500px]'}`}>
          <button
            onClick={onOpenCommandPalette}
            className="w-full mb-6 flex items-center gap-3 px-4 py-3 rounded-[20px] volumetric-input hover-surface transition-all duration-300 group cursor-pointer"
          >
            <Search className="w-4 h-4 text-theme-tertiary group-hover:text-theme-secondary transition-colors" />
            <span className="text-sm font-medium text-theme-tertiary group-hover:text-theme-secondary transition-colors flex-1 text-left">Search...</span>
            <span className="text-[10px] font-mono font-medium text-theme-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{modKey}K</span>
          </button>
        </div>
        {isSidebarCollapsed && (
          <button
            onClick={onOpenCommandPalette}
            className="w-14 h-14 mx-auto mb-6 rounded-[20px] volumetric-input hover-surface flex items-center justify-center text-theme-tertiary hover:text-theme-secondary transition-colors"
            title={`Search (${modKey}K)`}
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        <nav className="flex-1 space-y-3 w-full relative">
          {/* Glass Pill Indicator (Desktop) */}
          <div
            className="absolute left-0 right-0 z-0 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
            style={{
              top: `${['DASHBOARD', 'CALENDAR', 'TASKS', 'NOTES'].indexOf(currentView) * (isSidebarCollapsed ? 68 : 64)}px`,
              height: isSidebarCollapsed ? '56px' : '52px',
              width: isSidebarCollapsed ? '56px' : '100%',
              margin: isSidebarCollapsed ? '0 auto' : '0',
              borderRadius: isSidebarCollapsed ? '20px' : '20px',
              background: 'linear-gradient(180deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))',
              border: '0.5px solid rgba(16,185,129,0.3)',
              boxShadow: '0 2px 8px -2px rgba(16, 185, 129, 0.2), inset 0 0.5px 0 0 rgba(180, 230, 190, 0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          />
          <SidebarButton
            active={currentView === 'DASHBOARD'}
            onClick={() => setCurrentView('DASHBOARD')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            shortcut="Ctrl+1"
            badge={currentView !== 'DASHBOARD' ? badgeCounts?.dashboard : 0}
            collapsed={isSidebarCollapsed}
          />
          <SidebarButton
            active={currentView === 'CALENDAR'}
            onClick={() => setCurrentView('CALENDAR')}
            icon={<Calendar className="w-5 h-5" />}
            label="Calendar"
            shortcut="Ctrl+2"
            collapsed={isSidebarCollapsed}
          />
          <SidebarButton
            active={currentView === 'TASKS'}
            onClick={() => setCurrentView('TASKS')}
            icon={<ListTodo className="w-5 h-5" />}
            label="Tasks"
            shortcut="Ctrl+3"
            collapsed={isSidebarCollapsed}
          />
          <SidebarButton
            active={currentView === 'NOTES'}
            onClick={() => setCurrentView('NOTES')}
            icon={<FileText className="w-5 h-5" />}
            label="Notes"
            shortcut="Ctrl+4"
            collapsed={isSidebarCollapsed}
          />
        </nav>

        <div className="mt-auto w-full pt-4 space-y-4" style={{ borderTop: '1px solid var(--divider)' }}>
          {isSidebarCollapsed && (
            <div className="flex flex-col items-center gap-3 w-full">
              <button onClick={onAddNew} className="group relative volumetric-btn volumetric-btn-primary w-14 h-14 rounded-[20px] flex items-center justify-center text-theme-primary" title="New Task">
                <Plus className="w-6 h-6" />
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-gray-900 text-white dark:bg-white dark:text-gray-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 hidden lg:block">New Task</span>
              </button>
              {onToggleTheme && (
                <button onClick={onToggleTheme} className="group relative volumetric-btn w-12 h-12 rounded-[16px] flex items-center justify-center text-theme-tertiary transition-colors hover:text-theme-primary" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-gray-900 text-white dark:bg-white dark:text-gray-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 hidden lg:block">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              )}
              {tasks && onEditTask && onNavigateToTasks && (
                <NotificationPanel
                  tasks={tasks}
                  onEditTask={onEditTask}
                  onNavigateToTasks={onNavigateToTasks}
                />
              )}
              <button onClick={onOpenHelp} className="group relative volumetric-btn w-12 h-12 rounded-[16px] flex items-center justify-center text-theme-tertiary transition-colors hover:text-theme-primary" title="Keyboard Shortcuts">
                <HelpCircle className="w-5 h-5" />
                <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-gray-900 text-white dark:bg-white dark:text-gray-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 hidden lg:block">Keyboard Shortcuts</span>
              </button>
              {onToggleSidebar && (
                <button onClick={onToggleSidebar} className="group relative volumetric-input w-12 h-12 rounded-[16px] flex items-center justify-center text-theme-tertiary transition-colors hover:text-theme-primary mt-2" title="Expand Sidebar">
                  <ChevronRight className="w-5 h-5" />
                  <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-gray-900 text-white dark:bg-white dark:text-gray-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 hidden lg:block">Expand Sidebar</span>
                </button>
              )}
            </div>
          )}
          <div className={`overflow-hidden transition-all duration-300 ease-smooth ${isSidebarCollapsed ? 'opacity-0 max-h-0 pointer-events-none' : 'opacity-100 max-h-[500px]'}`}>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={onAddNew}
                className="volumetric-btn volumetric-btn-primary w-full py-4 px-6 rounded-[24px] font-semibold tracking-wide flex items-center justify-center gap-3"
                style={{ color: 'var(--text-primary)' }}
              >
                <Plus className="w-5 h-5" />
                <span>New Task</span>
                <span className="ml-auto text-[10px] tracking-widest opacity-60 font-medium">{altKey}N</span>
              </button>
              {tasks && onEditTask && onNavigateToTasks && (
                <NotificationPanel
                  tasks={tasks}
                  onEditTask={onEditTask}
                  onNavigateToTasks={onNavigateToTasks}
                  expanded
                />
              )}
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-theme-secondary transition-all duration-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.98]"
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                  <span className="font-semibold text-sm tracking-tight">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              )}
              <button
                onClick={onOpenHelp}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-theme-secondary transition-all duration-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.98]"
                title="Keyboard Shortcuts"
              >
                <HelpCircle className="w-5 h-5 shrink-0" />
                <span className="font-semibold text-sm tracking-tight">Keyboard Shortcuts</span>
              </button>
            </div>
            {onToggleSidebar && (
              <button onClick={onToggleSidebar} className="volumetric-input w-full py-2.5 mt-4 rounded-xl text-[11px] font-semibold uppercase tracking-wider text-theme-tertiary flex items-center justify-center gap-2 hover:text-theme-primary transition-colors">
                <ChevronLeft className="w-4 h-4" /> Collapse Sidebar
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div
        className="md:hidden z-30 shrink-0 flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-3">
          <div className="volumetric-btn w-9 h-9 rounded-[12px] flex items-center justify-center">
            <span className="font-bold text-sm bg-gradient-to-b from-slate-700 to-slate-500 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">A</span>
          </div>
          <h1 className="text-base font-semibold text-theme-primary">AuraDesk</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Search button — opens command palette */}
          <button
            onClick={onOpenCommandPalette}
            className="volumetric-btn w-10 h-10 rounded-[14px] flex items-center justify-center text-theme-tertiary hover:text-theme-secondary transition-colors"
            aria-label="Search"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          {/* Notification Bell (mobile) */}
          {tasks && onEditTask && onNavigateToTasks && (
            <NotificationPanel
              tasks={tasks}
              onEditTask={onEditTask}
              onNavigateToTasks={onNavigateToTasks}
            />
          )}

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="volumetric-btn w-10 h-10 rounded-[14px] flex items-center justify-center text-theme-tertiary hover:text-theme-secondary transition-colors"
              aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
          )}

          {/* More / Drawer button */}
          {onOpenDrawer && (
            <button
              onClick={onOpenDrawer}
              className="volumetric-btn w-10 h-10 rounded-[14px] flex items-center justify-center text-theme-tertiary hover:text-theme-secondary transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </div>

      <main id="main-content" className="relative z-10 flex-1 overflow-y-auto pb-24 md:pb-0 h-full no-scrollbar">
        <div className="max-w-[1200px] mx-auto p-4 md:p-8 min-h-full flex flex-col pt-2 md:pt-8">
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile) - iOS 26 Liquid Glass Tab Bar */}
      <nav
        className={`md:hidden ios26-tab-bar ${isFocusMode ? 'opacity-40 blur-sm hover:opacity-100 hover:blur-none grayscale' : 'opacity-100'
          }`}
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-center relative h-[56px]">
          {/* Active Tab Indicator — slides to current view */}
          {(() => {
            const tabPositionMap: Record<string, number> = {
              DASHBOARD: 0,
              CALENDAR: 1,
              TASKS: 3,
              NOTES: 4,
            };
            const idx = tabPositionMap[currentView];
            return idx !== undefined ? (
              <div
                className="tab-active-indicator"
                style={{ left: `calc(${idx * 20 + 10}% - 28px)` }}
                aria-hidden="true"
              />
            ) : null;
          })()}

          {/* Tab: Dashboard */}
          <button
            role="tab"
            aria-selected={currentView === 'DASHBOARD'}
            onClick={() => setCurrentView('DASHBOARD')}
            className={`ios26-tab-btn ${currentView === 'DASHBOARD' ? 'is-active' : 'is-inactive'}`}
          >
            <div className="relative">
              <LayoutDashboard />
              {currentView !== 'DASHBOARD' && badgeCounts?.dashboard && badgeCounts.dashboard > 0 && (
                <span className="ios26-tab-badge">
                  {badgeCounts.dashboard > 99 ? '99+' : badgeCounts.dashboard}
                </span>
              )}
            </div>
            <span className="ios26-tab-label">Home</span>
          </button>

          {/* Tab: Calendar */}
          <button
            role="tab"
            aria-selected={currentView === 'CALENDAR'}
            onClick={() => setCurrentView('CALENDAR')}
            className={`ios26-tab-btn ${currentView === 'CALENDAR' ? 'is-active' : 'is-inactive'}`}
          >
            <Calendar />
            <span className="ios26-tab-label">Calendar</span>
          </button>

          {/* Tab: New (replaces old protruding FAB) */}
          <button
            role="tab"
            aria-selected={false}
            onClick={onAddNew}
            className="ios26-tab-btn is-inactive"
            aria-label="Create new item"
          >
            <Plus />
            <span className="ios26-tab-label">New</span>
          </button>

          {/* Tab: Tasks */}
          <button
            role="tab"
            aria-selected={currentView === 'TASKS'}
            onClick={() => setCurrentView('TASKS')}
            className={`ios26-tab-btn ${currentView === 'TASKS' ? 'is-active' : 'is-inactive'}`}
          >
            <ListTodo />
            <span className="ios26-tab-label">Tasks</span>
          </button>

          {/* Tab: Notes */}
          <button
            role="tab"
            aria-selected={currentView === 'NOTES'}
            onClick={() => setCurrentView('NOTES')}
            className={`ios26-tab-btn ${currentView === 'NOTES' ? 'is-active' : 'is-inactive'}`}
          >
            <FileText />
            <span className="ios26-tab-label">Notes</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Out Drawer */}
      {onCloseDrawer && onToggleTheme && onToggleFocusMode && (
        <MobileDrawer
          isOpen={isMobileDrawerOpen}
          onClose={onCloseDrawer}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenHelp={onOpenHelp}
          focusMode={isFocusMode}
          onToggleFocusMode={onToggleFocusMode}
          currentView={currentView}
          archiveRetentionDays={archiveRetentionDays}
          onSetArchiveRetention={onSetArchiveRetention}
        />
      )}
    </div>
  );
};



const SidebarButton = ({ active, onClick, icon, label, shortcut, badge, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, shortcut?: string, badge?: number, collapsed?: boolean }) => (
  <button
    onClick={onClick}
    title={collapsed ? `${label}${shortcut ? ` (${shortcut})` : ''}` : undefined}
    className={`group relative z-10 w-full flex items-center gap-4 transition-all duration-300 ${collapsed
      ? `justify-center w-14 h-14 mx-auto rounded-[20px] ${active ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-theme-tertiary hover:text-theme-secondary hover-surface'}`
      : `px-5 py-4 h-[52px] rounded-[20px] ${active ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-theme-tertiary hover:text-theme-secondary hover-surface'}`
      }`}
  >
    <div className="relative">
      {icon}
      {badge && badge > 0 ? (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
          {badge > 99 ? '99+' : badge}
        </div>
      ) : null}
    </div>
    <div className={`overflow-hidden transition-all duration-300 ease-smooth flex items-center gap-4 flex-1 min-w-0 ${collapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[300px]'}`}>
      <span className="text-sm tracking-tight flex-1 text-left whitespace-nowrap">{label}</span>
      {shortcut && <span className="text-[10px] font-mono font-medium text-theme-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md whitespace-nowrap">{shortcut}</span>}
    </div>
    {collapsed && (
      <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-gray-900 text-white dark:bg-white dark:text-gray-900 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 hidden lg:block">
        {label}
      </span>
    )}
  </button>
);