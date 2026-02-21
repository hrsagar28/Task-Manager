import { useEffect, useRef } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const previouslyFocused = document.activeElement as HTMLElement;

    const getFocusables = () => {
      const elements = container.querySelectorAll(focusableSelector);
      // Filter out disabled and hidden elements
      return Array.from(elements).filter(
        el => !(el as HTMLElement).hasAttribute('disabled') && (el as HTMLElement).offsetParent !== null
      ) as HTMLElement[];
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = getFocusables();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    setTimeout(() => getFocusables()[0]?.focus(), 50);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isActive]);

  return containerRef;
}
