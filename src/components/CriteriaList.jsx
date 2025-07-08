// src/components/CriteriaList.jsx
import React, { useState, useEffect } from 'react';
import SubcriteriaItem from './SubcriteriaItem';

export default function CriteriaList({ onAddEntry, allEntries, handleDeleteEntry, handleAddEntry }) {
  const [criteria, setCriteria] = useState([]);
  const [openCrit, setOpenCrit] = useState({});

  useEffect(() => {
    fetch('/api/criteria')
      .then(res => res.json())
      .then(data => setCriteria(data))
      .catch(err => console.error('Failed to load criteria:', err));
  }, []);

  return (
    <div>
      {criteria.map(criterion => (
        <div
          key={criterion.id}
          className={`collapsible ${openCrit[criterion.id] ? 'open' : ''}`}
        >
          <div
            className="collapsible-header"
            onClick={() =>
              setOpenCrit(prev => ({
                ...prev,
                [criterion.id]: !prev[criterion.id],
              }))
            }
          >
            <span className="criteria-title">{criterion.title}</span>
          </div>
          <div className="collapsible-content">
            {criterion.subcriteria.map(sub => (
              <SubcriteriaItem
                allEntries={allEntries}
                handleAddEntry={handleAddEntry}
                key={sub.id}
                criterion={criterion}
                sub={sub}
                handleDeleteEntry={handleDeleteEntry}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}