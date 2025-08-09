

import React from 'react';
import Link from 'next/link';
import styles from './Menu.module.css';
import NotebookController from '@/components/NotebookController';

/**
 * NotebookMenu
 * Real top bar menu for DeskSurface.
 * Props map directly to NotebookController plus optional center/right content.
 */
export default function NotebookMenu({
  // Controller props (lifted state handlers live in DeskSurface)
  onSelect,
  showEdits = false,
  onToggleEdits = () => { },
  showArchived = false,
  onToggleArchived = () => { },

  // Optional additional slots
  centerContent = null,
  rightContent = null,

  // Presentation
  className = '',
  style,
  linkHref = '/',
  linkText = 'Back to Notebook',
  ...rest
}) {
  return (
    <div className={`${styles.root} ${className}`} style={style} {...rest}>
      <div className={styles.left}>
        <NotebookController
          onSelect={onSelect}
          showEdits={showEdits}
          onToggleEdits={onToggleEdits}
          showArchived={showArchived}
          onToggleArchived={onToggleArchived}
        />
        <Link href={linkHref} style={{ marginLeft: '1rem' }}>
          {linkText}
        </Link>
      </div>

      <div className={styles.center}>{centerContent}</div>
      <div className={styles.right}>{rightContent}</div>
    </div>
  );
}