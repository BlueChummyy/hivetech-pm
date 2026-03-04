import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  portal?: boolean;
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'right', className, portal }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        (!menuRef.current || !menuRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Compute fixed position when portal mode is on
  useEffect(() => {
    if (!open || !portal || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const menuHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight
      ? rect.top - menuHeight
      : rect.bottom + 4;
    setMenuPos({
      top: Math.max(8, top),
      left: align === 'right' ? rect.right : rect.left,
    });
  }, [open, portal, align]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (!menuRef.current) return;
      const items = menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]');
      if (items.length === 0) return;

      const currentIndex = Array.from(items).findIndex(
        (item) => item === document.activeElement,
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev].focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus first menu item on open
  useEffect(() => {
    if (open && menuRef.current) {
      requestAnimationFrame(() => {
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (items && items.length > 0) {
          items[0].focus();
        }
      });
    }
  }, [open]);

  const handleTriggerClick = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const menuContent = open && (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'min-w-[180px] rounded-lg border border-surface-700 bg-surface-800 py-1 shadow-xl',
        portal ? 'fixed z-[9999]' : 'absolute z-50 mt-1',
        !portal && (align === 'right' ? 'right-0' : 'left-0'),
        className,
      )}
      style={portal && menuPos ? {
        top: menuPos.top,
        left: align === 'right' ? undefined : menuPos.left,
        right: align === 'right' ? (window.innerWidth - menuPos.left) : undefined,
      } : undefined}
      onClick={() => setOpen(false)}
    >
      {children}
    </div>
  );

  return (
    <div ref={ref} className={portal ? '' : 'relative'}>
      <div onClick={handleTriggerClick} aria-expanded={open} aria-haspopup="menu">
        {trigger}
      </div>
      {portal ? menuContent && createPortal(menuContent, document.body) : menuContent}
    </div>
  );
}

export function DropdownItem({ children, onClick, icon, destructive, className }: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
        destructive
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-surface-300 hover:bg-surface-700 hover:text-surface-100',
        className,
      )}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1 border-t border-surface-700" />;
}
