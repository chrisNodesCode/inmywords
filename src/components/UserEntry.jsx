import React, { useEffect } from 'react';

export default function UserEntry({ entry, handleDeleteEntry }) {

  return (
    <div className="user-entry">
      <div className="entry-quote">“{entry.content}”</div>
      <button onClick={() => handleDeleteEntry(entry.id)}>Delete</button>
    </div>
  );
}