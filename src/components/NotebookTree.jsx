import React, { useState } from 'react';

export default function NotebookTree({ notebook,
  onEditGroup, onDeleteGroup,
  onEditSubgroup, onDeleteSubgroup,
  onEditEntry, onDeleteEntry }) {

  const [openGroups, setOpenGroups] = useState(new Set());
  const [openSubs, setOpenSubs] = useState(new Set());

  const toggle = (set, id) => set(s => new Set(s.has(id) ? [...s].filter(x => x !== id)
    : [...s, id]));

  return (
    <div className="notebook-container">
      <h2 className="notebook-title">{notebook.title}</h2>

      <ul className="group-list">
        {notebook.groups.map(g => (
          <li key={g.id} className="group-node">
            <button className="group-toggle-button"
              onClick={() => toggle(setOpenGroups, g.id)}>
              {openGroups.has(g.id) ? '▾' : '▸'}
            </button>
            <span className="group-name"
              onClick={() => toggle(setOpenGroups, g.id)}>{g.name}</span>
            <NodeActions onEdit={() => onEditGroup(g)}
              onDelete={() => onDeleteGroup(g.id)} />
            {openGroups.has(g.id) && (
              <ul className="subgroup-list">
                {g.subgroups.map(sg => (
                  <li key={sg.id} className="subgroup-node">
                    <button className="subgroup-toggle-button"
                      onClick={() => toggle(setOpenSubs, sg.id)}>
                      {openSubs.has(sg.id) ? '▾' : '▸'}
                    </button>
                    <span className="subgroup-name"
                      onClick={() => toggle(setOpenSubs, sg.id)}>{sg.name}</span>
                    <NodeActions onEdit={() => onEditSubgroup(g.id, sg)}
                      onDelete={() => onDeleteSubgroup(g.id, sg.id)} />
                    {openSubs.has(sg.id) && (
                      <ul className="entry-list">
                        {sg.entries.map(e => (
                          <li key={e.id} className="entry-node">
                            <span className="entry-title">{e.title}</span>
                            <NodeActions tiny
                              onEdit={() => onEditEntry(sg.id, e)}
                              onDelete={() => onDeleteEntry(sg.id, e.id)} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NodeActions({ onEdit, onDelete, tiny = false }) {
  return (
    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
      <button className="icon-btn" onClick={onEdit}>{tiny ? '✎' : 'Edit'}</button>
      <button className="icon-btn" onClick={onDelete}>{tiny ? '🗑' : 'Delete'}</button>
    </span>
  );
}