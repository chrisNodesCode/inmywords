import React from 'react';
import { Button, Switch, InputNumber, Select } from 'antd';

/**
 * Template factory functions for Drawer.
 * Each function receives props and returns an object with
 * header, body and optional footer elements.
 */
export function editor({
  pomodoroEnabled,
  onPomodoroToggle,
  maxWidth,
  onMaxWidthChange,
  type,
  mode,
  aliases,
  groups = [],
  selectedSubgroupId,
  onChangeSubgroup,
  onSave,
  onDelete,
  onArchive,
  onCancel,
  showShortcutList,
  onToggleShortcutList,
  entryShortcuts = [],
}) {
  const subgroupOptions = groups.flatMap((g) =>
    g.subgroups.map((s) => ({ value: s.id, label: `${g.name} / ${s.name}` }))
  );

  const header = (
    <h2 style={{ marginTop: 0 }}>
      {mode === 'edit' ? `Edit ${aliases.entry}` : `New ${aliases.entry}`}
    </h2>
  );

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span>Pomodoro</span>
        <Switch checked={pomodoroEnabled} onChange={onPomodoroToggle} size="small" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <span>Max Width</span>
        <InputNumber
          min={25}
          max={95}
          step={1}
          value={maxWidth}
          onChange={onMaxWidthChange}
          size="small"
          formatter={(value) => `${value}%`}
          parser={(value) => value.replace('%', '')}
        />
      </div>
      {type === 'entry' && groups.length > 0 && (
        <Select
          value={selectedSubgroupId}
          onChange={onChangeSubgroup}
          options={subgroupOptions}
          size="small"
        />
      )}
      <Button className="drawer-btn drawer-btn-save" onClick={onSave}>
        Save
      </Button>
      {mode === 'edit' && onDelete && (
        <Button className="drawer-btn drawer-btn-delete" onClick={onDelete}>
          Delete
        </Button>
      )}
      {mode === 'edit' && onArchive && (
        <Button className="drawer-btn drawer-btn-archive" onClick={onArchive}>
          Archive/Restore
        </Button>
      )}
      <Button className="drawer-btn drawer-btn-cancel" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="link" onClick={onToggleShortcutList}>
        Keyboard Shortcuts
      </Button>
      {showShortcutList && (
        <ul style={{ paddingLeft: '1rem' }}>
          {entryShortcuts.map((s) => (
            <li key={s.action}>
              {s.action}: {s.keys}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return { header, body };
}

export default {
  editor,
};

