

import React from 'react';
import { Drawer as AntDrawer, Button, Switch, InputNumber, Select } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

/**
 * EditorDrawer
 * Drawer UI for entry editing controls. Pure presentational; all state/handlers
 * are passed from parent.
 */
export default function EditorDrawer({
  // visibility + layout
  drawerOpen,
  drawerWidth = 300,
  onHamburgerClick,
  onMouseEnter,
  onMouseLeave,

  // editor controls
  pomodoroEnabled,
  onPomodoroToggle,
  maxWidth,
  onMaxWidthChange,

  // entry context
  type,
  mode,
  aliases,
  groups = [],
  selectedSubgroupId,
  onChangeSubgroup, // (val) => void

  // actions
  onSave,
  onDelete,
  onArchive,
  onCancel,

  // keyboard help
  showShortcutList,
  onToggleShortcutList,
  entryShortcuts = [],
}) {
  const subgroupOptions = groups.flatMap((g) =>
    g.subgroups.map((s) => ({ value: s.id, label: `${g.name} / ${s.name}` }))
  );

  return (
    <>
      <Button
        type="text"
        icon={<MenuOutlined />}
        onClick={onHamburgerClick}
        style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1002 }}
      />
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="entry-editor-drawer-wrapper"
        style={{ width: drawerWidth }}
      >
        <AntDrawer
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
            {mode === 'edit' ? `Edit ${aliases.entry}` : `New ${aliases.entry}`}
          </h2>
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
            <Button className="drawer-btn drawer-btn-save" onClick={onSave}>Save</Button>
            {mode === 'edit' && onDelete && (
              <Button className="drawer-btn drawer-btn-delete" onClick={onDelete}>Delete</Button>
            )}
            {mode === 'edit' && onArchive && (
              <Button className="drawer-btn drawer-btn-archive" onClick={onArchive}>
                Archive/Restore
              </Button>
            )}
            <Button className="drawer-btn drawer-btn-cancel" onClick={onCancel}>Cancel</Button>
            <Button type="link" onClick={onToggleShortcutList}>Keyboard Shortcuts</Button>
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
        </AntDrawer>
      </div>
    </>
  );
}