import React, { useState } from 'react';
import GroupCard from './GroupCard';

/**
 * NotebookTree renders groups, subgroups and entries using custom card components.
 * Only one node may be open at each hierarchy level. Opening a new node closes the
 * previously opened one. Each newly opened card scrolls into view smoothly.
 */
export default function NotebookTree({ treeData = [] }) {
  const [openGroupId, setOpenGroupId] = useState(null);
  const [openSubgroupId, setOpenSubgroupId] = useState(null);
  const [openEntryId, setOpenEntryId] = useState(null);

  const handleGroupToggle = (id) => {
    setOpenGroupId((prev) => (prev === id ? null : id));
    setOpenSubgroupId(null);
    setOpenEntryId(null);
  };

  const handleSubgroupToggle = (id) => {
    setOpenSubgroupId((prev) => (prev === id ? null : id));
    setOpenEntryId(null);
  };

  const handleEntryToggle = (id) => {
    setOpenEntryId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      {treeData.map((group) => (
        <GroupCard
          key={group.key}
          group={group}
          isOpen={openGroupId === group.key}
          onToggle={handleGroupToggle}
          openSubgroupId={openSubgroupId}
          setOpenSubgroupId={handleSubgroupToggle}
          openEntryId={openEntryId}
          setOpenEntryId={handleEntryToggle}
        />
      ))}
    </div>
  );
}
