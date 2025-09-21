/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import {
  Button,
  Switch,
  InputNumber,
  Select,
  Input,
  Avatar,
} from 'antd';
import { signOut } from 'next-auth/react';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { ThemeContext } from '../ThemeProvider';
import HighlightColorPicker from '../HighlightColorPicker';
import Drawer from './Drawer';
import { useDrawer } from './DrawerManager';
import styles from './Drawer.module.css';

/**
 * Template factory functions for Drawer.
 * Each function receives props and returns an object with
 * header, body and optional footer elements.
 */
export function editor({
  pomodoroEnabled,
  onPomodoroToggle,
  fullFocus,
  onFullFocusToggle,
  maxWidth,
  onMaxWidthChange,
  type,
  mode,
  aliases,
  groups = [],
  selectedSubgroupId,
  onChangeSubgroup,
  onSave,
  onSaveAndClose,
  onDelete,
  onArchive,
  onCancel,
  saving = false,
  open,
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
        <span>Full Focus Mode</span>
        <Switch checked={fullFocus} onChange={onFullFocusToggle} size="small" />
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
      <Button
        className="drawer-btn drawer-btn-save"
        onClick={onSave}
        disabled={saving}
      >
        Save
      </Button>
      <Button
        className="drawer-btn drawer-btn-save"
        onClick={onSaveAndClose}
        disabled={saving}
      >
        Save and Close
      </Button>
      {mode === 'edit' && onDelete && open && (
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
        Close without Saving
      </Button>
    </div>
  );

  return { header, body };
}

function NotebookControllerContent({
  onSelect,
  showEdits,
  onToggleEdits,
  reorderMode,
  onToggleReorder,
  fullFocus,
  onFullFocusToggle,
  showArchived,
  onToggleArchived,
  onAddNotebookDrawerChange,
  disabledControls,
  autoSelectOnLoad = true,
}) {
  const [notebooks, setNotebooks] = useState([]);
  const [selected, setSelected] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGroupAlias, setNewGroupAlias] = useState('');
  const [newSubgroupAlias, setNewSubgroupAlias] = useState('');
  const [newEntryAlias, setNewEntryAlias] = useState('');
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const {
    open: drawerOpen,
    openDrawer: openNotebookDrawer,
    closeDrawer: closeNotebookDrawer,
  } = useDrawer('new-notebook');

  const isControlDisabled = (key) => {
    if (disabledControls === true) return true;
    if (disabledControls && typeof disabledControls === 'object') {
      return Boolean(disabledControls[key] || disabledControls.all);
    }
    return false;
  };

  useEffect(() => {
    async function fetchNotebooks() {
      try {
        const res = await fetch('/api/notebooks');
        if (!res.ok) throw new Error('Failed to fetch notebooks');
        const data = await res.json();
        setNotebooks(data);

        let restoredId = '';
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('lastNotebookId');
          if (stored && data.some((nb) => nb.id === stored)) {
            restoredId = stored;
          } else if (stored) {
            localStorage.removeItem('lastNotebookId');
          }
        }

        if (autoSelectOnLoad && restoredId) {
          setSelected(restoredId);
          onSelect(restoredId);
        } else {
          setSelected('');
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchNotebooks();
  }, [onSelect, autoSelectOnLoad]);

  const handleChange = (e) => {
    const id = e.target.value;
    setSelected(id);
    onSelect(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('lastNotebookId', id);
      } else {
        localStorage.removeItem('lastNotebookId');
      }
    }
  };

  const handleCreate = async ({
    name,
    description,
    user_notebook_tree,
    precursorId,
  }) => {
    try {
      const body = { title: name, description };
      if (precursorId) {
        body.precursorId = precursorId;
      } else {
        body.user_notebook_tree = user_notebook_tree;
      }
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create notebook');
      const newNb = await res.json();
      setNotebooks((prev) => [...prev, newNb]);
      setSelected(newNb.id);
      closeNotebookDrawer();
      onSelect(newNb.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastNotebookId', newNb.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearSelection = () => {
    setSelected('');
    onSelect(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastNotebookId');
    }
  };

  const handleCreateDrawer = async () => {
    await handleCreate({
      name: newTitle,
      description: newDescription,
      user_notebook_tree: [newGroupAlias, newSubgroupAlias, newEntryAlias],
    });
    setNewTitle('');
    setNewDescription('');
    setNewGroupAlias('');
    setNewSubgroupAlias('');
    setNewEntryAlias('');
  };

  useEffect(() => {
    onAddNotebookDrawerChange?.(drawerOpen);
  }, [drawerOpen, onAddNotebookDrawerChange]);

  return (
    <>
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
      >
        <Link
          href="/account"
          className={`${styles.hamburgerBtn} ${styles.drawerAvatarLink}`}
        >
          <Avatar size={28} icon={<UserOutlined />} />
        </Link>
        <select
          value={selected}
          onChange={handleChange}
          style={{ width: '100%' }}
        >
          {notebooks.map((nb) => (
            <option key={nb.id} value={nb.id}>
              {nb.title}
            </option>
          ))}
        </select>
        <Button
          onClick={handleClearSelection}
          style={{ width: '100%' }}
          disabled={!selected}
        >
          Clear Selection
        </Button>
        <Button onClick={openNotebookDrawer} style={{ width: '100%' }}>
          Add New
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Switch
            checkedChildren={
              <EditOutlined style={{ color: darkMode ? '#000' : '#fff' }} />
            }
            unCheckedChildren={
              <EditOutlined style={{ color: darkMode ? '#fff' : '#000' }} />
            }
            checked={showEdits}
            onChange={onToggleEdits}
            size="small"
            disabled={isControlDisabled('manage')}
          />
          <span>Manage</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Switch
            checked={reorderMode}
            onChange={onToggleReorder}
            size="small"
            disabled={isControlDisabled('reorder')}
          />
          <span>Re-order</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Switch
            checked={fullFocus}
            onChange={onFullFocusToggle}
            size="small"
            disabled={isControlDisabled('fullFocus')}
          />
          <span>Full Focus Mode</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Switch
            checked={showArchived}
            onChange={onToggleArchived}
            size="small"
            disabled={isControlDisabled('showArchived')}
          />
          <span>Show Archived</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Dark Mode</span>
          <Switch checked={darkMode} onChange={toggleTheme} size="small" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Highlight</span>
          <HighlightColorPicker />
        </div>
        <Button onClick={() => signOut({ redirect: false })}>Logout</Button>
      </div>
      {typeof document !== 'undefined' &&
        createPortal(
          <Drawer
            open={drawerOpen}
            header={<h2 style={{ marginTop: 0 }}>New Notebook</h2>}
            body={
              <>
                <Input
                  placeholder="Name"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <Input.TextArea
                  placeholder="Description (optional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <Input
                  placeholder="Group Alias"
                  value={newGroupAlias}
                  onChange={(e) => setNewGroupAlias(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <Input
                  placeholder="Subgroup Alias"
                  value={newSubgroupAlias}
                  onChange={(e) => setNewSubgroupAlias(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <Input
                  placeholder="Entry Alias"
                  value={newEntryAlias}
                  onChange={(e) => setNewEntryAlias(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
              </>
            }
            footer={
              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
              >
                <Button onClick={closeNotebookDrawer}>Cancel</Button>
                <Button type="primary" onClick={handleCreateDrawer}>
                  Create
                </Button>
              </div>
            }
          />,
          document.body
        )}
    </>
  );
}

export function controller(props) {
  return { body: <NotebookControllerContent {...props} /> };
}

export default {
  editor,
  controller,
};
