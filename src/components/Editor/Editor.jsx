// src/components/Editor/Editor.jsx
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ExportMenu from '../ExportMenu';
import 'react-quill/dist/quill.snow.css';
import EditorDrawer from '../Drawer/Drawer';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

/**
 * Editor (entry-only UI)
 * Pure editor overlay + body. Controlled by parent for title/content/state.
 * Drawer and pomodoro are intentionally excluded and will be composed by parent.
 */
export default function Editor({
  // controlled data
  title,
  setTitle,
  isEditingTitle,
  setIsEditingTitle,
  titleInput,
  setTitleInput,
  content,
  setContent,
  lastSaved,
  setLastSaved,

  // actions provided by parent
  onSaveEntry,        // () => void  (save with current state)
  onSaveAndClose,     // () => void  (save then close)
  onCancel,           // () => void  (close without save)

  // presentation
  maxWidth = 50,

  // drawer props (passed from parent)
  drawerOpen,
  drawerWidth = 300,
  onHamburgerClick,
  onDrawerMouseEnter,
  onDrawerMouseLeave,
  pomodoroEnabled,
  onPomodoroToggle,
  onMaxWidthChange,
  type,
  mode,
  aliases,
  groups,
  selectedSubgroupId,
  onChangeSubgroup,
  onDelete,
  onArchive,
  showShortcutList,
  onToggleShortcutList,
  entryShortcuts,
}) {
  const quillRef = useRef(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'code-block'],
      [{ list: 'bullet' }],
    ],
  };

  const quillFormats = [
    'header',
    'bold',
    'italic',
    'underline',
    'code-block',
    'list',
    'bullet',
  ];

  // toggle quill toolbar when user highlights text
  const handleSelectionChange = (range) => {
    if (range && range.length > 0) {
      setToolbarVisible(true);
    } else {
      const activeInToolbar =
        typeof document !== 'undefined' &&
        document.activeElement &&
        document.activeElement.closest('.ql-toolbar');
      if (!activeInToolbar) setToolbarVisible(false);
    }
  };

  // keyboard shortcuts (editor-specific only)
  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if (e.ctrlKey && !e.shiftKey && !e.altKey && key === 's') {
        e.preventDefault();
        onSaveEntry();
        setLastSaved?.(new Date());
      } else if (e.ctrlKey && e.shiftKey && !e.altKey && key === 's') {
        e.preventDefault();
        onSaveAndClose();
        setLastSaved?.(new Date());
      } else if (!e.ctrlKey && !e.altKey && e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.ctrlKey && !e.altKey && e.key === 'Enter') {
        e.preventDefault();
        quillRef.current?.getEditor?.().focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSaveEntry, onSaveAndClose, onCancel]);

  const overlayClass = 'editor-modal-overlay fullscreen';
  const contentClass = 'editor-modal-content fullscreen slide-up';

  return (
    <div className={overlayClass} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={contentClass}>
        <div className="editor-modal-body">
          <div className="entry-title-row" style={{ maxWidth: `${maxWidth}%` }}>
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
        </div>
        <div className="editor-modal-footer"></div>
        <EditorDrawer
          drawerOpen={drawerOpen}
          drawerWidth={drawerWidth}
          onHamburgerClick={onHamburgerClick}
          onMouseEnter={onDrawerMouseEnter}
          onMouseLeave={onDrawerMouseLeave}
          pomodoroEnabled={pomodoroEnabled}
          onPomodoroToggle={onPomodoroToggle}
          maxWidth={maxWidth}
          onMaxWidthChange={onMaxWidthChange}
          type={type}
          mode={mode}
          aliases={aliases}
          groups={groups}
          selectedSubgroupId={selectedSubgroupId}
          onChangeSubgroup={onChangeSubgroup}
          onSave={onSaveEntry}
          onDelete={onDelete}
          onArchive={onArchive}
          onCancel={onCancel}
          showShortcutList={showShortcutList}
          onToggleShortcutList={onToggleShortcutList}
          entryShortcuts={entryShortcuts}
        />
      </div>
    </div>
  );
}

