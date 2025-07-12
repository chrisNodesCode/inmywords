// src/components/EntryEditor.jsx

import React, { useState } from 'react';

export default function EntryEditor({
  isEditing,
  editingEntry,
  editorTitle,
  setEditorTitle,
  editorContent,
  setEditorContent,
  selectedSubcriteria,
  setSelectedSubcriteria,
  selectedGroupTags,
  setSelectedGroupTags,
  tags,
  handleSave,
  onCancel,
  mode,
}) {
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');


  const subcriteriaTags = tags.filter(tag => tag.parentId && (tag.code.startsWith('A') || tag.code.startsWith('B')));
  const groupTags = tags.filter(tag => ['C', 'D'].includes(tag.code));

  const colors = [
    { bg: '#ffffff', text: '#000000' },
    { bg: '#f0f4ff', text: '#000000' },
    { bg: '#f5fff0', text: '#000000' },
    { bg: '#fff9f0', text: '#000000' },
    { bg: '#000000', text: '#ffffff' },
  ];

  const handleColorChange = (bg, text) => {
    setBackgroundColor(bg);
    setTextColor(text);
  };

  return (
    <div
      className="editor-overlay"
      style={{ backgroundColor: backgroundColor, color: textColor }}
    >
      <div className="toolbar-container">
        <div className="editor-toolbar">
          <div className="color-picker">
            {colors.map((c, idx) => (
              <div
                key={idx}
                className="color-swatch"
                style={{
                  backgroundColor: c.bg,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  margin: '0 4px',
                  cursor: 'pointer',
                  border: c.bg === backgroundColor ? '2px solid #666' : '1px solid #ccc'
                }}
                onClick={() => handleColorChange(c.bg, c.text)}
              ></div>
            ))}
          </div>



          <div className="buttons-container">
            <button onClick={onCancel}>Cancel</button>
            <button
              onClick={e => {
                e.preventDefault();
                handleSave();
              }}
            >
              Save
            </button>
          </div>

        </div>
      </div>
      <div className="editor-content-container">
        <input
          type="text"
          placeholder="Entry Title"
          value={editorTitle}
          onChange={e => setEditorTitle(e.target.value)}
          className="editor-title-input"
          style={{ color: textColor, borderBottom: `1px solid ${textColor}`, paddingBlockEnd: '0.5em' }}
        />
        {mode === 'subcriteria' && (
          <div className="selector-container">
            <div className="tag-selector">
              <select
                className='custom-select'
                value={selectedSubcriteria || ''}
                onChange={e => setSelectedSubcriteria(e.target.value)}
              >
                <option value={""}>Select subcriteria</option>
                {subcriteriaTags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="tag-selector">
              <select
                className='custom-select'
                value={selectedGroupTags || ""}
                onChange={e =>
                  setSelectedGroupTags(
                    Array.from(e.target.selectedOptions, option => option.value)
                  )
                }
              >
                <option value={""}>Select Group By</option>
                {groupTags.map(tag => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        )}
        <textarea
          className="editor-content"
          value={editorContent}
          onChange={e => setEditorContent(e.target.value)}
          placeholder="Write your reflections here..."
          style={{ color: textColor }}
        />
      </div>
    </div>
  );
}