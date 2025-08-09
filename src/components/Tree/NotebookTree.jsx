import React from 'react';
import { Tree } from 'antd';
import styles from './Tree.module.css';

/**
 * NotebookTree
 * Centralized styled Tree wrapper.
 * Props pass through to antd <Tree />. Style variants are toggled via props.
 */
export default function NotebookTree({
  className = '',
  pillSelected = false,
  dashedOpen = false,
  style,
  ...treeProps
}) {
  const wrapperClasses = [
    styles.root,
    pillSelected ? styles.pillSelected : '',
    dashedOpen ? styles.dashedOpen : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses} style={style}>
      <Tree {...treeProps} />
    </div>
  );
}
