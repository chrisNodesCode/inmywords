// src/components/EntryEditor.jsx
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

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
  onDelete = null,
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

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'bullet' }],
    ],
  };

  const quillFormats = ['header', 'bold', 'italic', 'underline', 'list', 'bullet'];

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
        id: safeData.id,
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
      id: safeData.id,
    });
  };

  // Close on background click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const overlayClass = `editor-modal-overlay ${type === 'entry' ? 'fullscreen' : type === 'notebook' ? 'notebook' : 'popup'
    }`;
  const contentClass = `editor-modal-content ${type === 'entry' ? 'fullscreen' : type === 'notebook' ? 'notebook' : 'popup'
    } slide-up`;

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onCancel();
  };

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
          <div className="editor-modal-buttons-container">
            <button className="editor-button" onClick={handleSave}>
              Save
            </button>
            {mode === 'edit' && onDelete && (
              <button className="editor-button danger" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button className="editor-button secondary" onClick={onCancel}>
              Cancel
            </button>
            {/* <button className="editor-modal-close" onClick={onCancel}>
            ×
          </button> */}
          </div>
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
              {parent?.entryId ? (
                <ReactQuill
                  className="editor-quill"
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  formats={quillFormats}
                />
              ) : (
                // <textarea
                //   className="editor-textarea-content"
                //   placeholder="Write your entry..."
                //   value={content}
                //   onChange={(e) => setContent(e.target.value)}
                // />
                <ReactQuill
                  className="editor-quill"
                  placeholder="Write your entry..."
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  formats={quillFormats}
                />
              )}
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

        </div>
      </div>
    </div>
  );
}