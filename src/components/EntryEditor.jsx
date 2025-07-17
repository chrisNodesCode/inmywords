// src/components/EntryEditor.jsx
import React, { useState, useEffect } from 'react';

export default function EntryEditor({ entry, onSave, onCancel }) {
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');

  // Synchronize local state when entry changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
    }
  }, [entry]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content cannot be empty.');
      return;
    }
    onSave({ ...entry, title: title.trim(), content: content.trim() });
  };

  // Close on background click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="editor-modal-overlay" onClick={handleOverlayClick}>
      <div className="editor-modal-content slide-up">
        <div className="editor-modal-header">
          <h2 className="editor-modal-title">
            {entry.id ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button className="editor-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="editor-modal-body">
          <input
            className="editor-input-title"
            type="text"
            placeholder="Entry Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="editor-textarea-content"
            placeholder="Write your entry..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="editor-modal-footer">
          <button className="editor-button" onClick={handleSave}>
            Save
          </button>
          <button className="editor-button secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}