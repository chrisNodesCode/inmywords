import React from 'react';

export default function UserEntry({ entry, handleEditEntry, handleDeleteEntry, expandedEntryId, setExpandedEntryId }) {
  const isExpanded = expandedEntryId === entry.id;

  // Find first subcriteria tag (has a parentId)
  const subTag = entry.tags.find(t => t.parentId);

  return (
    <div
      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
      className={`user-entry ${isExpanded ? 'expanded' : ''}`}
      style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
    >
      <div className='user-entry-row-container'>
        <div className="entry-subcode-column">
          <span className="entry-subcode-label">{subTag ? subTag.code : ''}</span>
        </div>
        <div className='entry-content-column'>
          <div className="entry-header">
            <div className="entry-title"><strong>{entry.title.slice(0, 25)}...</strong></div>
            <div className="entry-actions" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleEditEntry(entry)}>Edit</button>
              <button onClick={() => handleDeleteEntry(entry.id)}>Delete</button>
            </div>
          </div>
          <div className="entry-content">
            {isExpanded ? entry.content : `${entry.content.slice(0, 75)}...`}
          </div>
        </div>
      </div>
    </div>
  );
}