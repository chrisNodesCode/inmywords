// UserEntry.jsx
import React from 'react';

export default function UserEntry({ entry, onEdit }) {
  // Prepare content preview: take first line or truncated to 200 chars
  let preview = entry.content || '';
  const newlineIndex = preview.indexOf('\n');
  if (newlineIndex !== -1) {
    preview = preview.substring(0, newlineIndex);
  }
  if (preview.length > 200) {
    preview = preview.substring(0, 200) + '...';
  }

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <h3 className="entry-card-title">{entry.title}</h3>
        <button
          className="entry-card-edit-button"
          onClick={() => onEdit(entry)}
        >
          Edit
        </button>
      </div>
      <div className="entry-card-content">{preview}</div>
      {entry.tags && entry.tags.length > 0 && (
        <div className="entry-card-tags">
          {entry.tags.map(tag => (
            <span key={tag.id} className="entry-card-tag">
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}