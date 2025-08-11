import React, { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import EntryCard from './EntryCard';

export default function SubgroupCard({
  subgroup,
  isOpen,
  onToggle,
  openEntryId,
  setOpenEntryId,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (isOpen && ref.current?.scrollIntoView) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isOpen]);

  const handleToggle = () => {
    onToggle(subgroup.key);
  };

  return (
    <div ref={ref} style={{ marginTop: 8 }}>
      <div role="button" onClick={handleToggle} style={{ cursor: 'pointer' }}>
        {subgroup.title}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginLeft: 16 }}
          >
            {subgroup.children?.map((entry) => (
              <EntryCard
                key={entry.key}
                entry={entry}
                isOpen={openEntryId === entry.key}
                onToggle={(id) => setOpenEntryId(id)}
              />
            ))}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
