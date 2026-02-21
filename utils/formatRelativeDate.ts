export function formatRelativeDate(dateStr: string): { label: string; urgent: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return { label: `${Math.abs(diffDays)} days overdue`, urgent: true };
  if (diffDays === -1) return { label: 'Yesterday', urgent: true };
  if (diffDays === 0) return { label: 'Today', urgent: true };
  if (diffDays === 1) return { label: 'Tomorrow', urgent: false };
  if (diffDays <= 7) return { label: `In ${diffDays} days`, urgent: false };
  // Beyond a week, show the calendar date
  return { 
    label: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
    urgent: false 
  };
}
