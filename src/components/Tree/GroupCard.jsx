import React, { useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import SubgroupCard from './SubgroupCard';

export default function GroupCard({
  group,
  isOpen,
  onToggle,
  openSubgroupId,
  setOpenSubgroupId,
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
    onToggle(group.key);
  };

  return (
    <div ref={ref}>
      <div role="button" onClick={handleToggle} style={{ cursor: 'pointer', fontWeight: 'bold' }}>
        {group.title}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginLeft: 16 }}
          >
            {group.children?.map((subgroup) => (
              <SubgroupCard
                key={subgroup.key}
                subgroup={subgroup}
                isOpen={openSubgroupId === subgroup.key}
                onToggle={(id) => {
                  setOpenSubgroupId(id);
                  setOpenEntryId(null);
                }}
                openEntryId={openEntryId}
                setOpenEntryId={setOpenEntryId}
              />
            ))}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
