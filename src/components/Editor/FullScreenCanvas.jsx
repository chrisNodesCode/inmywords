// src/components/Editor/FullScreenCanvas.jsx
import React, { useEffect, useRef, useState } from 'react';
import Drawer from '@/components/Drawer/Drawer';

/**
 * Generic full screen overlay component used for editor modals.
 * Renders children inside a full screen backdrop. Clicking the
 * backdrop (outside of the children) triggers `onClose`.
 */
export default function FullScreenCanvas({
  open = false,
  onClose,
  className = '',
  children,
  drawerProps,
}) {
  const [showDrawer, setShowDrawer] = useState(() => !!drawerProps);
  const hideTimeoutRef = useRef(null);
  const firstRunRef = useRef(true);
  const hasDrawer = !!drawerProps;
  const drawerOpen = drawerProps?.open;

  useEffect(() => {
    if (!hasDrawer) return;
    hideTimeoutRef.current = setTimeout(() => {
      setShowDrawer(false);
    }, 2000);
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [hasDrawer]);

  useEffect(() => {
    if (!hasDrawer) return;
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setShowDrawer(!!drawerOpen);
  }, [hasDrawer, drawerOpen]);

  if (!open) return null;

  const overlayClass = `editor-modal-overlay fullscreen ${className}`.trim();

  const handleClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className={overlayClass} onClick={handleClick}>
      {children}
      {drawerProps && <Drawer {...drawerProps} open={showDrawer} />}
    </div>
  );
}

