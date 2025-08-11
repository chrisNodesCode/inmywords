import React, { forwardRef } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import styles from './Tree.module.css';

const EntryCard = forwardRef(
  ({ title, snippet, isOpen, onToggle }, ref) => (
    <div ref={ref} style={{ marginBottom: '0.5rem' }}>
      <div
        className={styles.entryTitle}
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      >
        {title}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && snippet && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginLeft: '1rem' }}
          >
            <p className={styles.entrySnippet}>{snippet}</p>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
);

export default EntryCard;

