// src/components/EntryEditor.jsx
import React, { useState, useEffect } from 'react';

/**
 * Reusable modal editor for creating new entities in the notebook tree.
 * `type` determines which fields are shown and how the save payload is shaped.
 * parent information (such as subgroupId) is passed through `parent`.
 */
export default function EntryEditor({
  type,
  parent,
  onSave,
  onCancel,
  initialData = {},
  mode = 'create',
}) {
  // `initialData` may explicitly be passed as `null` when creating a new item.
  // Normalize it to an empty object so property accesses do not fail.
  const safeData = initialData || {};

  const [title, setTitle] = useState(safeData.title || ''); // for entries
  const [content, setContent] = useState(safeData.content || '');
  const [name, setName] = useState(safeData.name || ''); // for groups, subgroups, tags
  const [description, setDescription] = useState(safeData.description || '');

  // Update state when the modal is opened for a different item
  useEffect(() => {
    const data = initialData || {};
    setTitle(data.title || '');
    setContent(data.content || '');
    setName(data.name || '');
    setDescription(data.description || '');
  }, [initialData]);

  const handleSave = () => {
    if (type === 'entry') {
      if (!title.trim() || !content.trim()) {
        alert('Title and content cannot be empty.');
        return;
      }
      onSave({
        title: title.trim(),
        content: content.trim(),
        parent,
        mode,
        id: initialData.id,
      });
      return;
    }

    if (!name.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      parent,
      mode,
      id: initialData.id,
    });
  };

  // Close on background click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const overlayClass = `editor-modal-overlay ${
    type === 'entry' ? 'fullscreen' : type === 'notebook' ? 'notebook' : 'popup'
  }`;
  const contentClass = `editor-modal-content ${
    type === 'entry' ? 'fullscreen' : type === 'notebook' ? 'notebook' : 'popup'
  } slide-up`;

  return (
    <div className={overlayClass} onClick={handleOverlayClick}>
      <div className={contentClass}>
        <div className="editor-modal-header">
          <h2 className="editor-modal-title">
            {type === 'entry' && (mode === 'edit' ? 'Edit Entry' : 'New Entry')}
            {type === 'group' && (mode === 'edit' ? 'Edit Group' : 'New Group')}
            {type === 'subgroup' &&
              (mode === 'edit' ? 'Edit Subgroup' : 'New Subgroup')}
            {type === 'notebook' &&
              (mode === 'edit' ? 'Edit Notebook' : 'New Notebook')}
            {type === 'tag' && (mode === 'edit' ? 'Edit Tag' : 'New Tag')}
          </h2>
          <button className="editor-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="editor-modal-body">
          {type === 'entry' && (
            <>
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
            </>
          )}
          {type !== 'entry' && (
            <>
              {parent?.label && (
                <div style={{ marginBottom: '0.5rem' }}>{parent.label}</div>
              )}
              <input
                className="editor-input-title"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {(type === 'group' || type === 'subgroup' || type === 'notebook') && (
                <textarea
                  className="editor-textarea-content"
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </>
          )}
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