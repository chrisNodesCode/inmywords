// src/components/EntryEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [headerVisible, setHeaderVisible] = useState(true);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const quillRef = useRef(null);

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

  const hideTimeout = useRef();

  const showHeader = () => {
    setHeaderVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setHeaderVisible(false), 2000);
  };

  // manage header visibility in fullscreen mode
  useEffect(() => {
    if (type !== 'entry') return;
    document.addEventListener('mousemove', showHeader);
    document.addEventListener('keydown', showHeader);
    return () => {
      document.removeEventListener('mousemove', showHeader);
      document.removeEventListener('keydown', showHeader);
      clearTimeout(hideTimeout.current);
    };
  }, [type]);

  // handle text selection to toggle quill toolbar
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const editorEl = quillRef.current?.editor?.root;
      if (!selection || !editorEl) {
        setToolbarVisible(false);
        return;
      }
      if (editorEl.contains(selection.anchorNode) && !selection.isCollapsed) {
        setToolbarVisible(true);
      } else {
        setToolbarVisible(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, []);

  return (
    <div className={overlayClass} onClick={handleOverlayClick}>
      <div className={contentClass}>
        <div
          className={`editor-header-wrapper ${type === 'entry' ? 'fullscreen' : ''}`}
          onMouseEnter={showHeader}
        >
          <div className={`editor-modal-header ${headerVisible ? '' : 'hidden'}`}>
            <h2 className="editor-modal-title">
            {type === 'entry' && (mode === 'edit' ? 'Edit Entry' : 'New Entry')}
            {type === 'group' && (mode === 'edit' ? 'Edit Group' : 'New Group')}
            {type === 'subgroup' &&
              (mode === 'edit' ? 'Edit Subgroup' : 'New Subgroup')}
            {type === 'notebook' &&
              (mode === 'edit' ? 'Edit Notebook' : 'New Notebook')}
            {type === 'tag' && (mode === 'edit' ? 'Edit Tag' : 'New Tag')}
            </h2>
            {type === 'entry' && (
              <input
                className="editor-input-title"
                type="text"
                placeholder="Entry Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
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
        </div>
        <div className="editor-modal-body">
          {type === 'entry' && (
            <>
              {parent?.entryId ? (
                <ReactQuill
                  ref={quillRef}
                  className={`editor-quill ${toolbarVisible ? '' : 'toolbar-hidden'}`}
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  formats={quillFormats}
                />
              ) : (
                <ReactQuill
                  ref={quillRef}
                  className={`editor-quill ${toolbarVisible ? '' : 'toolbar-hidden'}`}
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