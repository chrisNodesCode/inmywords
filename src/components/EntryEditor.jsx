// src/components/EntryEditor.jsx

import React from 'react';

const calmingColors = ['#FFFFFF', '#000000', '#F5F5DC', '#E0FFFF', '#FFF0F5'];

export default function EntryEditor({
  isEditing,
  editingTarget,
  editorContent,
  setEditorContent,
  editorBg,
  setEditorBg,
  editorWidthOption,
  setEditorWidthOption,
  handleSave,
  onCancel,
}) {
  if (!isEditing) return null;

  return (
    <div
      className={`editor-overlay ${editorBg === '#000000' ? 'dark-mode' : ''}`}
      style={{ backgroundColor: editorBg }}
    >
      <div className="editor-toolbar">
        <div className="color-picker">
          {calmingColors.map(color => (
            <div
              key={color}
              className="color-swatch"
              style={{ backgroundColor: color }}
              onClick={() => setEditorBg(color)}
            />
          ))}
        </div>
        <div className="width-controls">
          {['full', 'comfortable', 'concise'].map(opt => (
            <button
              key={opt}
              className={`width-button ${editorWidthOption === opt ? 'active' : ''}`}
              onClick={() => setEditorWidthOption(opt)}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
        <div>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave}>Save</button>
        </div>
      </div>
      <div className={`editor-content-container editor-width-${editorWidthOption}`}>
        <textarea
          id="user-input"
          className="editor-content"
          value={editorContent}
          onChange={e => setEditorContent(e.target.value)}
          autoFocus
        />
      </div>
    </div>
  );
}