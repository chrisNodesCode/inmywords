// src/components/Editor/NotebookEditor.jsx
import React, { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ExportMenu from '../ExportMenu';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

/**
 * NotebookEditor (entry-only UI)
 * Pure editor overlay + body. Controlled by parent for title/content/state.
 */
export default function NotebookEditor({
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

  // actions provided by parent
  onCancel,           // () => void  (close without save)

  // presentation
  maxWidth = 50,
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
                Saved at: {lastSaved ? lastSaved.toLocaleString() : 'not yet saved'}
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
      </div>
    </div>
  );
}

