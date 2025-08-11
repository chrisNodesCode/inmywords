import React, { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

export default function EntryCard({ entry, isOpen, onToggle }) {
  const ref = useRef(null);

  useEffect(() => {
    if (isOpen && ref.current?.scrollIntoView) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isOpen]);

  const handleToggle = () => {
    onToggle(entry.key);
  };

  return (
    <div ref={ref} style={{ marginTop: 8 }}>
      <div role="button" onClick={handleToggle} style={{ cursor: 'pointer' }}>
        {entry.title}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && entry.content && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginLeft: 16 }}
          >
            <div>{entry.content}</div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
