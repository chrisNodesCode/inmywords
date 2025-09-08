import { useEffect, useRef, useContext } from 'react';
import { DrawerContext } from '@/components/Drawer/DrawerManager';

/**
 * Hook to handle hover-driven drawers with optional pinning and auto close.
 *
 * @param {Object} options
 * @param {string} options.id                 Unique drawer id used with DrawerContext
 * @param {boolean} options.open              Current open state of the drawer
 * @param {Function} options.openDrawer       Function that opens the drawer
 * @param {Function} options.closeDrawer      Function that closes the drawer
 * @param {boolean} [options.openOnHover]     Whether hovering should open the drawer
 * @param {boolean} [options.pin]             If true, the drawer remains open
 * @param {number} [options.autoCloseDelay]   Delay before auto closing after mouse leave
 * @returns {{onMouseEnter: Function, onMouseLeave: Function}}
 */
export default function useHoverDrawer({
  id,
  open,
  openDrawer,
  closeDrawer,
  openOnHover = false,
  pin = false,
  autoCloseDelay = 2000,
}) {
  const { activeId } = useContext(DrawerContext);
  const timeoutRef = useRef(null);

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (pin) return;
    clear();
    if (!openOnHover) return;
    if (activeId && activeId !== id) return;
    openDrawer();
  };

  const handleMouseLeave = () => {
    if (pin) return;
    clear();
    timeoutRef.current = setTimeout(() => {
      if (!pin) {
        closeDrawer();
      }
    }, autoCloseDelay);
  };

  useEffect(() => {
    if (pin && !open && (!activeId || activeId === id)) {
      clear();
      openDrawer();
    }
  }, [pin, open, openDrawer, activeId, id]);

  useEffect(() => {
    return () => clear();
  }, []);

  return { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave };
}
