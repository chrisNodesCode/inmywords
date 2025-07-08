import React, { useState } from 'react';
import UserEntry from './UserEntry';

export default function SubcriteriaItem({ sub, criterion, allEntries, handleAddEntry, handleDeleteEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`collapsible ${open ? 'open' : ''}`}>
      <div
        className="collapsible-header"
        onClick={() => setOpen(prev => !prev)}
      >
        <span className="subcriteria-title">{sub.title}</span>
      </div>
      {open && (
        <div className="collapsible-content">
          <button className="add-entry-button" onClick={() => handleAddEntry(criterion.id, sub.id)}>
            Add Entry
          </button>
          <div className="entry-list">
            {
              allEntries
                .filter(entry => entry.criterionId === criterion.id && entry.subcriterionId === sub.id)
                .map(entry => (
                  <UserEntry
                    key={entry.id}
                    entry={entry}
                    handleDeleteEntry={handleDeleteEntry}
                  />
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}