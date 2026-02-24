import { useCallback, useRef } from 'react';

/**
 * useRovingTabIndex — Enables arrow-key navigation within a list container.
 * 
 * Usage:
 *   const { containerProps, getItemProps } = useRovingTabIndex();
 *   <div {...containerProps}>
 *     {items.map((item, i) => <div {...getItemProps(i)}>{item}</div>)}
 *   </div>
 * 
 * Supports: ↑/↓ to move, Home/End to jump, wrapping at boundaries.
 */
export function useRovingTabIndex() {
    const containerRef = useRef<HTMLDivElement>(null);

    const getFocusableItems = useCallback(() => {
        if (!containerRef.current) return [];
        return Array.from(
            containerRef.current.querySelectorAll<HTMLElement>('[data-roving-item]')
        ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        const items = getFocusableItems();
        if (items.length === 0) return;

        const currentIndex = items.findIndex(el => el === document.activeElement || el.contains(document.activeElement as Node));

        let nextIndex: number | null = null;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = items.length - 1;
                break;
            default:
                return;
        }

        if (nextIndex !== null && items[nextIndex]) {
            items[nextIndex].focus();
        }
    }, [getFocusableItems]);

    const containerProps = {
        ref: containerRef,
        onKeyDown: handleKeyDown,
        role: 'list' as const,
    };

    const getItemProps = useCallback((index: number) => ({
        'data-roving-item': true,
        tabIndex: index === 0 ? 0 : -1,
        role: 'listitem' as const,
        onFocus: () => {
            // Update tabIndex so the focused item is tabbable when returning to the list
            const items = getFocusableItems();
            items.forEach((el, i) => {
                el.setAttribute('tabindex', i === index ? '0' : '-1');
            });
        },
    }), [getFocusableItems]);

    return { containerProps, getItemProps };
}
