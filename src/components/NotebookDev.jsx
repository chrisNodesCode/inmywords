import React, { useState, useEffect } from 'react';
import { Tree } from 'antd';
import NotebookController from './NotebookController';
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

  useEffect(() => {
    if (!notebookId) return;
    async function fetchGroups() {
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
    }
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
      <Tree
        showLine
        draggable
        loadData={loadData}
        treeData={treeData}
        onDrop={onDrop}
      />
    </div>
  );
}

