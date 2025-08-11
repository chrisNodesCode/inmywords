import React, { forwardRef } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import styles from './Tree.module.css';

const SubgroupCard = forwardRef(
  ({ title, isOpen, onToggle, children }, ref) => (
    <div ref={ref} style={{ marginBottom: '0.75rem' }}>
      <div
        className={styles.subgroupTitle}
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
  )
);

export default SubgroupCard;

