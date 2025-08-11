import React, { forwardRef } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import styles from './Tree.module.css';

const GroupCard = forwardRef(({ title, isOpen, onToggle, children }, ref) => (
  <div ref={ref} style={{ marginBottom: '1rem' }}>
    <div
      className={styles.groupTitle}
      style={{ cursor: 'pointer' }}
      onClick={onToggle}
    >
      {title}
    </div>
    <AnimatePresence initial={false}>
      {isOpen && (
        <Motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'hidden', marginLeft: '1rem' }}
        >
          {children}
        </Motion.div>
      )}
    </AnimatePresence>
  </div>
));

export default GroupCard;

