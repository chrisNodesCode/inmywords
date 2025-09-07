// src/components/Editor/FullScreenCanvas.jsx
import React from 'react';
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
      {drawerProps && <Drawer {...drawerProps} />}
    </div>
  );
}

