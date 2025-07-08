// src/App.jsx

import React, { useState, useEffect } from 'react';
import CriteriaList from './components/CriteriaList';
import EntryEditor from './components/EntryEditor';
import LandingPage from './components/LandingPage';
export default function App() {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTarget, setEditingTarget] = useState({ criterionId: null, subId: null });
  const [editorContent, setEditorContent] = useState('');
  const [editorBg, setEditorBg] = useState('#FFFFFF');
  const [editorWidthOption, setEditorWidthOption] = useState('concise');
  const [editorTitle, setEditorTitle] = useState('');
  const [allEntries, setAllEntries] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Keep all hooks!
  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/entries')
        .then(res => res.json())
        .then(data => setAllEntries(data.entries || []))
        .catch(err => console.error('Error fetching entries:', err));
    }
  }, [allEntries.length, isLoggedIn]);

  const handleAddEntry = (criterionId, subId) => {
    setEditingTarget({ criterionId, subId });
    setEditorContent('');
    setEditorTitle('');
    setEditorBg('#FFFFFF');
    setIsEditing(true);
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const response = await fetch(`/api/entry/${entryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Failed to delete entry', await response.text());
        return;
      }
      setAllEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!editingTarget?.criterionId || !editingTarget?.subId) {
        console.error('Missing criterionId or subId');
        alert('Missing criterionId or subId. Please select a valid target.');
        return;
      }
      const timestamp = new Date().toISOString();
      const response = await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editorContent,
          title: editorTitle || 'Placeholder Title',
          criterionId: editingTarget.criterionId,
          subcriterionId: editingTarget.subId,
          userId: 'placeholder-user-id',
          createdAt: timestamp
        }),
      });
      if (!response.ok) {
        console.error('Failed to save entry', await response.text());
        return;
      }
      const newEntry = await response.json();
      setAllEntries(prev => [...prev, newEntry.entry]);
      setIsEditing(false);
      setEditingTarget(null);
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingTarget(null);
    setEditorContent('');
    setEditorTitle('');
  };

  if (!isLoggedIn) {
    return <LandingPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <>
      <EntryEditor
        isEditing={isEditing}
        editingTarget={editingTarget}
        editorTitle={editorTitle}
        setEditorTitle={setEditorTitle}
        editorContent={editorContent}
        setEditorContent={setEditorContent}
        editorBg={editorBg}
        setEditorBg={setEditorBg}
        editorWidthOption={editorWidthOption}
        setEditorWidthOption={setEditorWidthOption}
        handleSave={handleSave}
        onCancel={handleCancel}
      />
      <div className="container">
        <div className="header">Autism Spectrum Disorder DSM-V-TR</div>
        <CriteriaList
          handleDeleteEntry={handleDeleteEntry}
          allEntries={allEntries}
          handleAddEntry={handleAddEntry}
        />
      </div>
    </>
  );
}
