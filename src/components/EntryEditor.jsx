// src/components/EntryEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { listPrecursors } from '../api/precursors';
import { Switch } from 'antd';
import PomodoroWidget from './PomodoroWidget';

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
  onArchive = null,
  initialData = {},
  mode = 'create',
  aliases = { group: 'Group', subgroup: 'Subgroup', entry: 'Entry' },
}) {
  // `initialData` may explicitly be passed as `null` when creating a new item.
  // Normalize it to an empty object so property accesses do not fail.
  const safeData = initialData || {};

  const [title, setTitle] = useState(safeData.title || ''); // for entries
  const [content, setContent] = useState(safeData.content || '');
  const [name, setName] = useState(safeData.name || ''); // for groups, subgroups, tags
  const [description, setDescription] = useState(safeData.description || '');
  const [groupAlias, setGroupAlias] = useState(
    (safeData.user_notebook_tree && safeData.user_notebook_tree[0]) || ''
  );
  const [subgroupAlias, setSubgroupAlias] = useState(
    (safeData.user_notebook_tree && safeData.user_notebook_tree[1]) || ''
  );
  const [entryAlias, setEntryAlias] = useState(
    (safeData.user_notebook_tree && safeData.user_notebook_tree[2]) || ''
  );
  const [precursors, setPrecursors] = useState([]);
  const [selectedPrecursor, setSelectedPrecursor] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const quillRef = useRef(null);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('pomodoro-state')) {
      setPomodoroEnabled(true);
    }
  }, []);

  const handlePomodoroToggle = (checked) => {
    setPomodoroEnabled(checked);
    if (!checked) {
      localStorage.removeItem('pomodoro-state');
    }
  };

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
    setTitleInput(data.title || '');
    setGroupAlias((data.user_notebook_tree && data.user_notebook_tree[0]) || '');
    setSubgroupAlias((data.user_notebook_tree && data.user_notebook_tree[1]) || '');
    setEntryAlias((data.user_notebook_tree && data.user_notebook_tree[2]) || '');
    setSelectedPrecursor('');
  }, [initialData?.id]);

  useEffect(() => {
    if (type === 'notebook' && mode === 'create') {
      listPrecursors()
        .then((data) => setPrecursors(data))
        .catch((err) => console.error(err));
    }
  }, [type, mode]);

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
      setLastSaved(new Date());
      return;
    }

    if (!name.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      parent,
      mode,
      id: safeData.id,
    };
    if (type === 'notebook') {
      if (selectedPrecursor) {
        payload.precursorId = selectedPrecursor;
      } else {
        payload.user_notebook_tree = [
          (groupAlias || 'Group').trim(),
          (subgroupAlias || 'Subgroup').trim(),
          (entryAlias || 'Entry').trim(),
        ];
      }
    }
    onSave(payload);
    setLastSaved(new Date());
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
  const firstInteraction = useRef(false);

  const scheduleHide = () => {
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => setHeaderVisible(false), 1000);
  };

  // hide header after the first user interaction
  useEffect(() => {
    if (type !== 'entry') return;

    const handleFirst = () => {
      if (!firstInteraction.current) {
        firstInteraction.current = true;
        scheduleHide();
        document.removeEventListener('mousemove', handleFirst);
        document.removeEventListener('keydown', handleFirst);
      }
    };

    document.addEventListener('mousemove', handleFirst);
    document.addEventListener('keydown', handleFirst);

    return () => {
      document.removeEventListener('mousemove', handleFirst);
      document.removeEventListener('keydown', handleFirst);
      clearTimeout(hideTimeout.current);
    };
  }, [type]);

  const handleHeaderMouseEnter = () => {
    setHeaderVisible(true);
    clearTimeout(hideTimeout.current);
  };

  const handleHeaderMouseLeave = () => {
    if (firstInteraction.current) scheduleHide();
  };

  // toggle quill toolbar when user highlights text
  const handleSelectionChange = (range) => {
    if (range && range.length > 0) {
      setToolbarVisible(true);
    } else {
      const activeInToolbar =
        typeof document !== 'undefined' &&
        document.activeElement &&
        document.activeElement.closest('.ql-toolbar');
      if (!activeInToolbar) {
        setToolbarVisible(false);
      }
    }
  };

  // autosave every 5 minutes
  useEffect(() => {
    if (type !== 'entry' || mode === 'create') return;
    const interval = setInterval(() => {
      onSave({
        title: title.trim(),
        content: content.trim(),
        parent,
        mode,
        id: safeData.id,
        autoSave: true,
      });
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [type, title, content, parent, mode, safeData.id, onSave]);

  return (
    <>
      <div className={overlayClass} onClick={handleOverlayClick}>
        <div className={contentClass}>
        <div
          className={`editor-header-wrapper ${type === 'entry' ? 'fullscreen' : ''}`}
          onMouseEnter={handleHeaderMouseEnter}
          onMouseLeave={handleHeaderMouseLeave}
        >
          <div className={`editor-modal-header ${headerVisible ? '' : 'hidden'}`}>
            <h2 className="editor-modal-title">
              {type === 'entry' &&
                (mode === 'edit'
                  ? `Edit ${aliases.entry}`
                  : `New ${aliases.entry}`)}
              {type === 'group' &&
                (mode === 'edit'
                  ? `Edit ${aliases.group}`
                  : `New ${aliases.group}`)}
              {type === 'subgroup' &&
                (mode === 'edit'
                  ? `Edit ${aliases.subgroup}`
                  : `New ${aliases.subgroup}`)}
              {type === 'notebook' &&
                (mode === 'edit' ? 'Edit Notebook' : 'New Notebook')}
              {type === 'tag' && (mode === 'edit' ? 'Edit Tag' : 'New Tag')}
            </h2>
            <div className="editor-modal-buttons-container">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: '0.5rem',
                }}
              >
                <span style={{ marginRight: '0.25rem' }}>Pomodoro</span>
                <Switch
                  checked={pomodoroEnabled}
                  onChange={handlePomodoroToggle}
                  size="small"
                />
              </div>
              <button className="editor-button" onClick={handleSave}>
                Save
              </button>
              {mode === 'edit' && onDelete && (
                <button className="editor-button danger" onClick={handleDelete}>
                  Delete
                </button>
              )}
              {type === 'entry' && mode === 'edit' && onArchive && (
                <button className="editor-button" onClick={onArchive}>
                  {safeData.archived ? 'Restore' : 'Archive'}
                </button>
              )}
              <button className="editor-button secondary" onClick={onCancel}>
                Cancel
              </button>
              <button className="editor-modal-close" onClick={onCancel}>
                ×
              </button>
            </div>
          </div>
        </div>
        <div className="editor-modal-body">
          {type === 'entry' && (
            <>
              <div className="entry-title-container">
                {isEditingTitle ? (
                  <input
                    type="text"
                    className="entry-title-input"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onBlur={() => {
                      setTitle(titleInput);
                      setIsEditingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setTitle(titleInput);
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <p
                    className="entry-title-display"
                    onClick={() => {
                      setTitleInput(title);
                      setIsEditingTitle(true);
                    }}
                  >
                    <strong>Title:</strong> {title || 'Untitled'}
                  </p>
                )}
                <div className="last-saved">Last Autosave: {lastSaved ? lastSaved.toLocaleString() : "no autosaves yet..."}</div>

              </div>
              <ReactQuill
                ref={quillRef}
                className={`editor-quill ${toolbarVisible ? '' : 'toolbar-hidden'}`}
                theme="snow"
                placeholder="Start writing here..."
                value={content}
                onChange={setContent}
                onChangeSelection={handleSelectionChange}
                modules={quillModules}
                formats={quillFormats}
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
              {type === 'notebook' && mode === 'create' && (
                <select
                  className="editor-input-title"
                  value={selectedPrecursor}
                  onChange={(e) => setSelectedPrecursor(e.target.value)}
                >
                  <option value="">Custom Notebook</option>
                  {precursors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
              {type === 'notebook' && !selectedPrecursor && (
                <>
                  <input
                    className="editor-input-title"
                    type="text"
                    placeholder="Group alias"
                    value={groupAlias}
                    onChange={(e) => setGroupAlias(e.target.value)}
                  />
                  <input
                    className="editor-input-title"
                    type="text"
                    placeholder="Subgroup alias"
                    value={subgroupAlias}
                    onChange={(e) => setSubgroupAlias(e.target.value)}
                  />
                  <input
                    className="editor-input-title"
                    type="text"
                    placeholder="Entry alias"
                    value={entryAlias}
                    onChange={(e) => setEntryAlias(e.target.value)}
                  />
                </>
              )}
            </>
          )}
        </div>
        <div className="editor-modal-footer">

        </div>
        </div>
      </div>
      {pomodoroEnabled && <PomodoroWidget />}
    </>
  );
}
