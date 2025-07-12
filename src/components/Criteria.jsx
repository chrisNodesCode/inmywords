// src/components/Criteria.jsx
import React from 'react';
import UserEntry from './UserEntry';

export default function Criteria({ criterionTag, subTags, entries, handleEditEntry, handleDeleteEntry, handleAddEntry, expandedEntryId, setExpandedEntryId, openStates, toggleOpen }) {
  const criterionEntries = entries.filter(entry => {
    const hasCriterionTag = entry.tags.some(tag => String(tag.id) === String(criterionTag.id));

    let subcriteriaIds = [];

    if (criterionTag.code === 'C' || criterionTag.code === 'D') {
      const allSubcriteriaTags = entries
        .flatMap(e => e.tags)
        .filter(tag => tag.parentId && (tag.code && (tag.code.startsWith('A') || tag.code.startsWith('B'))));
      const uniqueIds = [...new Set(allSubcriteriaTags.map(tag => String(tag.id)))];
      subcriteriaIds = uniqueIds;
    } else {
      subcriteriaIds = subTags.map(tag => String(tag.id));
    }

    const hasSubcriteriaTag = entry.tags.some(tag => subcriteriaIds.includes(String(tag.id)));

    if (criterionTag.code === 'C' || criterionTag.code === 'D') {
      return hasCriterionTag && hasSubcriteriaTag;
    } else if (criterionTag.code === 'A' || criterionTag.code === 'B') {
      return false;
    } else if (criterionTag.code === 'E') {
      return hasCriterionTag;
    }
    return false;
  });

  const subEntries = {};
  subTags.forEach(sub => {
    subEntries[sub.id] = entries.filter(entry =>
      entry.tags.some(tag => tag.id === sub.id)
    );
  });

  // Determine if criterion has any entries
  const criterionHasEntries = criterionEntries.length > 0 || subTags.some(sub => subEntries[sub.id].length > 0);

  return (
    <div className={`collapsible ${openStates[criterionTag.id] ? 'open' : ''}`}>
      <div
        className="collapsible-header"
        onClick={() => toggleOpen(criterionTag.id)}
      >
        <div className='criteria-title'>
          <span className="">
            {criterionTag.name} {criterionHasEntries && openStates[criterionTag.id] ? '↑' : '↓'}
          </span>
        </div>
      </div>
      <div className="collapsible-content">
        {criterionTag.code === 'E' && (
          <button onClick={() => handleAddEntry('criteriaE')}>
            Add Entry to {criterionTag.name}
          </button>
        )}

        {(criterionTag.code === 'C' || criterionTag.code === 'D' || criterionTag.code === 'E') && (
          <div className="entry-list">
            {criterionEntries.map(entry => (
              <UserEntry
                key={entry.id}
                entry={entry}
                handleEditEntry={handleEditEntry}
                handleDeleteEntry={handleDeleteEntry}
                expandedEntryId={expandedEntryId}
                setExpandedEntryId={setExpandedEntryId}
              />
            ))}
          </div>
        )}

        {(criterionTag.code === 'A' || criterionTag.code === 'B') && subTags.map(sub => {
          const hasSubEntries = subEntries[sub.id].length > 0;
          return (
            <div key={sub.id} className='subcriteria-wrapper'>
              <div className='subcriteria-container'>
                <div className={`collapsible ${openStates[sub.id] ? 'open' : ''}`}>

                  <div className="collapsible-header" onClick={() => toggleOpen(sub.id)} style={{ cursor: 'pointer' }}>
                    <h4>
                      {sub.name} {hasSubEntries && openStates[sub.id] ? '↑' : '↓'}
                    </h4>
                  </div>
                  <div className="collapsible-content">
                    <button onClick={() => handleAddEntry('subcriteria', sub.id)}>
                      Add Entry to {sub.name}
                    </button>
                    <div className="entry-list">
                      {subEntries[sub.id].map(entry => (
                        <UserEntry
                          key={entry.id}
                          entry={entry}
                          tagCode={entry.code}
                          tag={entry.tags.find(tag => tag.code === sub.code)}
                          handleEditEntry={handleEditEntry}
                          handleDeleteEntry={handleDeleteEntry}
                          expandedEntryId={expandedEntryId}
                          setExpandedEntryId={setExpandedEntryId}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
}