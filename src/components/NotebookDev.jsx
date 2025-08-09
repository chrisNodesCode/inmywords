import React, { useState, useEffect } from 'react';
import { Tree, ConfigProvider } from 'antd';
import NotebookController from './NotebookController';
import EntryEditor from './EntryEditor';
import Link from 'next/link';

function updateTreeData(list, key, children) {
  return list.map((node) => {
    if (node.key === key) {
      return { ...node, children };
    }
    if (node.children) {
      return { ...node, children: updateTreeData(node.children, key, children) };
    }
    return node;
  });
}

export default function NotebookDev() {
  const [notebookId, setNotebookId] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [editorState, setEditorState] = useState({
    isOpen: false,
    type: null,
    parent: null,
    item: null,
    mode: 'create',
  });

  const fetchGroups = async () => {
    if (!notebookId) return;
    try {
      const res = await fetch(`/api/groups?notebookId=${notebookId}`);
      if (res.ok) {
        const groups = await res.json();
        setTreeData(
          groups.map((g) => ({ title: g.name, key: g.id, type: 'group' }))
        );
      }
    } catch (err) {
      console.error('Failed to load groups', err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [notebookId]);

  const loadData = (node) => {
    if (node.children) {
      return Promise.resolve();
    }
    if (node.type === 'group') {
      return fetch(`/api/subgroups?groupId=${node.key}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((subgroups) => {
          setTreeData((origin) =>
            updateTreeData(
              origin,
              node.key,
              subgroups.map((sg) => ({
                title: sg.name,
                key: sg.id,
                type: 'subgroup',
                groupId: node.key,
              }))
            )
          );
        })
        .catch((err) => console.error('Failed to load subgroups', err));
    }
    if (node.type === 'subgroup') {
      return fetch(`/api/entries?subgroupId=${node.key}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((entries) => {
          setTreeData((origin) =>
            updateTreeData(
              origin,
              node.key,
              entries.map((e) => ({
                title: e.title,
                key: e.id,
                isLeaf: true,
                type: 'entry',
                subgroupId: node.key,
                groupId: node.groupId,
              }))
            )
          );
        })
        .catch((err) => console.error('Failed to load entries', err));
    }
    return Promise.resolve();
  };

  const onDrop = (info) => {
    console.log('Dropped node', info);
  };

  const reloadSubgroups = (groupId) => {
    fetch(`/api/subgroups?groupId=${groupId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((subgroups) => {
        setTreeData((origin) =>
          updateTreeData(
            origin,
            groupId,
            subgroups.map((sg) => ({
              title: sg.name,
              key: sg.id,
              type: 'subgroup',
              groupId,
            }))
          )
        );
      })
      .catch((err) => console.error('Failed to reload subgroups', err));
  };

  const reloadEntries = (subgroupId, groupId) => {
    fetch(`/api/entries?subgroupId=${subgroupId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((entries) => {
        setTreeData((origin) =>
          updateTreeData(
            origin,
            subgroupId,
            entries.map((e) => ({
              title: e.title,
              key: e.id,
              isLeaf: true,
              type: 'entry',
              subgroupId,
              groupId,
            }))
          )
        );
      })
      .catch((err) => console.error('Failed to reload entries', err));
  };

  const handleCancel = () => {
    setEditorState({
      isOpen: false,
      type: null,
      parent: null,
      item: null,
      mode: 'create',
    });
  };

  const handleSave = async (data) => {
    try {
      if (editorState.type === 'group') {
        if (editorState.mode === 'edit') {
          await fetch(`/api/groups/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, description: data.description }),
          });
        } else {
          await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              notebookId,
            }),
          });
        }
        fetchGroups();
      } else if (editorState.type === 'subgroup') {
        if (editorState.mode === 'edit') {
          await fetch(`/api/subgroups/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.name, description: data.description }),
          });
        } else {
          await fetch('/api/subgroups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: data.name,
              description: data.description,
              groupId: editorState.parent.groupId,
            }),
          });
        }
        reloadSubgroups(editorState.parent.groupId);
      } else if (editorState.type === 'entry') {
        const subgroupId = data.subgroupId || editorState.parent.subgroupId;
        if (editorState.mode === 'edit') {
          await fetch(`/api/entries/${editorState.item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              content: data.content,
              subgroupId,
            }),
          });
        } else {
          await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              content: data.content,
              subgroupId,
            }),
          });
        }
        reloadEntries(subgroupId, editorState.parent.groupId);
        if (
          editorState.mode === 'edit' &&
          subgroupId !== editorState.parent.subgroupId
        ) {
          reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
        }
      }
    } catch (err) {
      console.error('Save failed', err);
    }
    handleCancel();
  };

  const handleDelete = async () => {
    try {
      if (editorState.type === 'group') {
        await fetch(`/api/groups/${editorState.item.id}`, { method: 'DELETE' });
        fetchGroups();
      } else if (editorState.type === 'subgroup') {
        await fetch(`/api/subgroups/${editorState.item.id}`, { method: 'DELETE' });
        reloadSubgroups(editorState.parent.groupId);
      } else if (editorState.type === 'entry') {
        await fetch(`/api/entries/${editorState.item.id}`, { method: 'DELETE' });
        reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
    handleCancel();
  };

  const handleArchive = async () => {
    if (editorState.type !== 'entry') return;
    try {
      await fetch(`/api/entries/${editorState.item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !editorState.item.archived }),
      });
      reloadEntries(editorState.parent.subgroupId, editorState.parent.groupId);
    } catch (err) {
      console.error('Archive failed', err);
    }
    handleCancel();
  };

  const handleNodeDoubleClick = async (event, node) => {
    if (node.type === 'group') {
      const res = await fetch(`/api/groups/${node.key}`);
      const item = res.ok ? await res.json() : { id: node.key, name: node.title };
      setEditorState({
        isOpen: true,
        type: 'group',
        parent: { notebookId },
        item,
        mode: 'edit',
      });
    } else if (node.type === 'subgroup') {
      const res = await fetch(`/api/subgroups/${node.key}`);
      const item = res.ok ? await res.json() : { id: node.key, name: node.title };
      setEditorState({
        isOpen: true,
        type: 'subgroup',
        parent: { groupId: node.groupId },
        item,
        mode: 'edit',
      });
    } else if (node.type === 'entry') {
      const res = await fetch(`/api/entries/${node.key}`);
      const item = res.ok
        ? await res.json()
        : { id: node.key, title: node.title, content: '' };
      setEditorState({
        isOpen: true,
        type: 'entry',
        parent: { subgroupId: node.subgroupId, groupId: node.groupId },
        item,
        mode: 'edit',
      });
    }
  };

  const editorGroups = treeData.map((g) => ({
    id: g.key,
    name: g.title,
    subgroups: (g.children || []).map((s) => ({ id: s.key, name: s.title })),
  }));

  const treeTokens = {
    colorBgContainer: '#ffffff',
    colorPrimary: '#1677ff',
    colorTextLightSolid: '#ffffff',
    nodeHoverBg: 'rgba(0, 0, 0, 0.04)',
    nodeSelectedBg: '#e6f4ff',
    directoryNodeSelectedBg: '#1677ff',
    directoryNodeSelectedColor: '#ffffff',
    titleHeight: 24,
  };

  // const treePropOptions = {
  //   checkable: [true, false],
  //   draggable: [true, false, { icon: <span /> }],
  //   showLine: [true, false, { showLeafIcon: true }],
  //   blockNode: [true, false],
  //   selectable: [true, false],
  //   multiple: [true, false],
  //   defaultExpandAll: [true, false],
  // };

  return (
    <div className="notebook-container">
      <div className="notebook-header">
        <NotebookController
          onSelect={setNotebookId}
          showEdits={false}
          onToggleEdits={() => {}}
          showArchived={false}
          onToggleArchived={() => {}}
        />
        <Link href="/" style={{ marginLeft: '1rem' }}>
          Back to Notebook
        </Link>
      </div>
      <ConfigProvider theme={{ components: { Tree: treeTokens } }}>
        <Tree
          className="dev-tree"
          showLine
          draggable
          loadData={loadData}
          treeData={treeData}
          onDrop={onDrop}
          onDoubleClick={handleNodeDoubleClick}
        />
      </ConfigProvider>
      {editorState.isOpen && (
        <EntryEditor
          type={editorState.type}
          parent={editorState.parent}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={editorState.mode === 'edit' ? handleDelete : null}
          onArchive={editorState.mode === 'edit' ? handleArchive : null}
          initialData={editorState.item}
          mode={editorState.mode}
          groups={editorGroups}
        />
      )}
      <style jsx>{`
        .dev-tree {
          padding: 1rem;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

