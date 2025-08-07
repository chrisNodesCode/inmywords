// src/components/EntryEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { listPrecursors } from '../api/precursors';
import { Switch, InputNumber, Drawer, Button, Select } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import PomodoroWidget from './PomodoroWidget';
import ExportMenu from './ExportMenu';

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
  groups = [],
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
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const quillRef = useRef(null);
  const [pomodoroEnabled, setPomodoroEnabled] = useState(false);
  const [maxWidth, setMaxWidth] = useState(50);
  const drawerWidth = 300;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState(false);
  const drawerCloseTimeoutRef = useRef(null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState(
    parent?.subgroupId || ''
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedWidth = localStorage.getItem('editor-max-width');
      if (storedWidth) {
        setMaxWidth(Number(storedWidth));
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (drawerCloseTimeoutRef.current) {
        clearTimeout(drawerCloseTimeoutRef.current);
      }
    };
  }, []);

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

  const handleMaxWidthChange = (value) => {
    const val = value || 50;
    setMaxWidth(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('editor-max-width', String(val));
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
  }, [initialData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSelectedSubgroupId(parent?.subgroupId || '');
  }, [parent?.subgroupId]);

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
        subgroupId: selectedSubgroupId,
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

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onCancel();
  };

  const handleHamburgerClick = () => {
    setDrawerPinned((prev) => {
      const next = !prev;
      setDrawerOpen(next);
      if (next && drawerCloseTimeoutRef.current) {
        clearTimeout(drawerCloseTimeoutRef.current);
        drawerCloseTimeoutRef.current = null;
      }
      return next;
    });
  };

  const subgroupOptions = groups.flatMap((g) =>
    g.subgroups.map((s) => ({ value: s.id, label: `${g.name} / ${s.name}` }))
  );

  const handleDrawerMouseEnter = () => {
    if (drawerCloseTimeoutRef.current) {
      clearTimeout(drawerCloseTimeoutRef.current);
      drawerCloseTimeoutRef.current = null;
    }
    setDrawerOpen(true);
  };

  const handleDrawerMouseLeave = () => {
    if (!drawerPinned) {
      if (drawerCloseTimeoutRef.current) {
        clearTimeout(drawerCloseTimeoutRef.current);
      }
      drawerCloseTimeoutRef.current = setTimeout(() => {
        setDrawerOpen(false);
        drawerCloseTimeoutRef.current = null;
      }, 2000);
    }
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

  // autosave every 30 seconds
  useEffect(() => {
    if (type !== 'entry' || mode === 'create') return;
    const interval = setInterval(() => {
      onSave({
        title: title.trim(),
        content: content.trim(),
        parent,
        mode,
        id: safeData.id,
        subgroupId: selectedSubgroupId,
        autoSave: true,
      });
      setLastSaved(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [type, title, content, parent, mode, safeData.id, onSave, selectedSubgroupId]);
  const renderHeading = () => {
    if (mode === 'edit') {
      if (type === 'group') return `Edit ${aliases.group}`;
      if (type === 'subgroup') return `Edit ${aliases.subgroup}`;
      if (type === 'notebook') return 'Edit Notebook';
      if (type === 'tag') return 'Edit Tag';
    }
    if (type === 'group') return `New ${aliases.group}`;
    if (type === 'subgroup') return `New ${aliases.subgroup}`;
    if (type === 'notebook') return 'New Notebook';
    if (type === 'tag') return 'New Tag';
    return '';
  };

  if (type !== 'entry') {
    return (
      <Drawer
        placement="right"
        open
        onClose={onCancel}
        width={drawerWidth}
        title={renderHeading()}
        body={{ padding: '1rem' }}
      >
        <div className="editor-modal-body">
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <Button className="drawer-btn drawer-btn-save" onClick={handleSave}>
              Save
            </Button>
            {mode === 'edit' && onDelete && (
              <Button className="drawer-btn drawer-btn-delete" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button className="drawer-btn drawer-btn-cancel" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </Drawer>
    );
  }

  const overlayClass = `editor-modal-overlay ${type === 'entry' ? 'fullscreen' : ''}`;
  const contentClass = `editor-modal-content ${type === 'entry' ? 'fullscreen' : ''} slide-up`;

  return (
    <>
      <div className={overlayClass} onClick={handleOverlayClick}>
        <div className={contentClass}>
          <div className="editor-modal-body">
            <>
              <div
                className="entry-title-row"
                style={{ maxWidth: `${maxWidth}%` }}
              >
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
                  <div className="last-saved">
                    Last Autosave: {lastSaved ? lastSaved.toLocaleString() : 'no autosaves yet...'}
                  </div>
                </div>
                <ExportMenu quillRef={quillRef} content={content} />
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
                style={{ maxWidth: `${maxWidth}%` }}
              />
            </>
          </div>
          <div className="editor-modal-footer"></div>
        </div>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={handleHamburgerClick}
          style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1002 }}
        />
        <div
          onMouseEnter={handleDrawerMouseEnter}
          onMouseLeave={handleDrawerMouseLeave}
          className="entry-editor-drawer-wrapper"
          style={{ width: drawerWidth }}
        >
          <Drawer
            placement="right"
            open={drawerOpen}
            mask={false}
            closable={false}
            width={drawerWidth}
            getContainer={false}
            rootStyle={{ position: 'absolute' }}
            body={{ padding: '1rem' }}
          >
            <h2 style={{ marginTop: 0 }}>
              {mode === 'edit'
                ? `Edit ${aliases.entry}`
                : `New ${aliases.entry}`}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>Pomodoro</span>
                <Switch
                  checked={pomodoroEnabled}
                  onChange={handlePomodoroToggle}
                  size="small"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>Max Width</span>
                <InputNumber
                  min={25}
                  max={95}
                  step={1}
                  value={maxWidth}
                  onChange={handleMaxWidthChange}
                  size="small"
                  formatter={(value) => `${value}%`}
                  parser={(value) => value.replace('%', '')}
                />
              </div>
              {type === 'entry' && groups.length > 0 && (
                <Select
                  value={selectedSubgroupId}
                  onChange={(val) => {
                    setSelectedSubgroupId(val);
                    if (mode === 'edit') {
                      onSave({
                        title: title.trim(),
                        content: content.trim(),
                        parent,
                        mode,
                        id: safeData.id,
                        subgroupId: val,
                        autoSave: true,
                      });
                      setLastSaved(new Date());
                    }
                  }}
                  options={subgroupOptions}
                  size="small"
                />
              )}
              <Button className="drawer-btn drawer-btn-save" onClick={handleSave}>
                Save
              </Button>
              {mode === 'edit' && onDelete && (
                <Button className="drawer-btn drawer-btn-delete" onClick={handleDelete}>
                  Delete
                </Button>
              )}
              {mode === 'edit' && onArchive && (
                <Button className="drawer-btn drawer-btn-archive" onClick={onArchive}>
                  {safeData.archived ? 'Restore' : 'Archive'}
                </Button>
              )}
              <Button className="drawer-btn drawer-btn-cancel" onClick={onCancel}>Cancel</Button>
            </div>
          </Drawer>
        </div>
      </div>
      {pomodoroEnabled && <PomodoroWidget />}
    </>
  );
}
