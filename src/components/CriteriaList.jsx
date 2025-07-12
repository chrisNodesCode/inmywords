// src/components/CriteriaList.jsx
import React from 'react';
import Criteria from './Criteria';

export default function CriteriaList({ tags = [], entries = [], handleEditEntry, handleDeleteEntry, handleAddEntry, expandedEntryId, setExpandedEntryId, openStates, toggleOpen }) {
  // Top-level criteria tags (no parent)
  const criteriaTags = Array.isArray(tags) ? tags.filter(tag => !tag.parentId) : [];

  return (
    <div className="criteria-list">
      {criteriaTags.map(criterion => {
        // Subcriteria: tags with this criterion as parent
        const subTags = Array.isArray(tags) ? tags.filter(tag => tag.parentId === criterion.id) : [];
        return (
          <Criteria
            key={criterion.id}
            criterionTag={criterion}
            subTags={subTags}
            entries={entries}
            handleEditEntry={handleEditEntry}
            handleDeleteEntry={handleDeleteEntry}
            handleAddEntry={handleAddEntry}
            expandedEntryId={expandedEntryId}
            setExpandedEntryId={setExpandedEntryId}
            openStates={openStates}
            toggleOpen={toggleOpen}
          />
        );
      })}
    </div>
  );
}
