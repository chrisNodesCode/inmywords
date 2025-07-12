// src/App.jsx

import React, { useState, useEffect } from 'react';
import CriteriaList from './components/CriteriaList';
import EntryEditor from './components/EntryEditor';
import LandingPage from './components/LandingPage';
import { CSSTransition } from 'react-transition-group';

export default function App() {
  const [tags, setTags] = useState([]);
  const [entries, setEntries] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [selectedSubcriteria, setSelectedSubcriteria] = useState('');
  const [selectedGroupTags, setSelectedGroupTags] = useState([]);
  const [editorMode, setEditorMode] = useState('subcriteria'); // 'subcriteria' or 'criteriaE'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('demo-user-1'); // Simulated logged-in user
  // Collapse state for criteria and subcriteria
  const [openStates, setOpenStates] = useState({});
  const toggleOpen = (id) => {
    setOpenStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/tags', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setTags(data || []))
        .catch(err => console.error('Error fetching tags:', err));

      fetch('/api/entries', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setEntries(data || []))
        .catch(err => console.error('Error fetching entries:', err));
    }
  }, [isLoggedIn, currentUserId]);

  const handleAddEntry = (mode = 'subcriteria', subcriteriaId = null) => {
    setEditingEntry(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorMode(mode);
    setSelectedSubcriteria(subcriteriaId || '');
    setSelectedGroupTags([]);
    setIsEditing(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEditorTitle(entry.title);
    setEditorContent(entry.content);
    const subTag = entry.tags.find(tag => tag.parentId && (tag.code.startsWith('A') || tag.code.startsWith('B')));
    setSelectedSubcriteria(subTag ? subTag.id : '');
    const groupTags = entry.tags.filter(tag => ['C', 'D'].includes(tag.code)).map(tag => tag.id);
    setSelectedGroupTags(groupTags);
    setEditorMode(subTag ? 'subcriteria' : 'criteriaE');
    setIsEditing(true);
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        console.error('Failed to delete entry', await response.text());
        return;
      }
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleSave = async () => {
    try {
      let finalTagIds = [];

      if (editorMode === 'subcriteria' && selectedSubcriteria) {
        finalTagIds.push(selectedSubcriteria);
        const parentTag = tags.find(tag => tag.id === selectedSubcriteria)?.parentId;
        if (parentTag) {
          finalTagIds.push(parentTag);
        }
        finalTagIds = finalTagIds.concat(selectedGroupTags);
      } else if (editorMode === 'criteriaE') {
        const criteriaETag = tags.find(tag => tag.code === 'E');
        if (criteriaETag) {
          finalTagIds.push(criteriaETag.id);
        }
      }

      const payload = {
        title: editorTitle || 'Untitled Entry',
        content: editorContent,
        tagIds: finalTagIds,
      };

      const response = await fetch(editingEntry ? `/api/entries/${editingEntry.id}` : '/api/entries', {
        method: editingEntry ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Failed to save entry', await response.text());
        return;
      }

      const savedEntry = await response.json();

      setEntries(prev => {
        if (editingEntry) {
          return prev.map(e => (e.id === savedEntry.id ? savedEntry : e));
        }
        return [...prev, savedEntry];
      });

      setIsEditing(false);
      setEditingEntry(null);
      setEditorTitle('');
      setEditorContent('');
      setSelectedSubcriteria('');
      setSelectedGroupTags([]);
      setExpandedEntryId(null);
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingEntry(null);
    setEditorTitle('');
    setEditorContent('');
    setSelectedSubcriteria('');
    setSelectedGroupTags([]);
    setExpandedEntryId(null); // Collapse any expanded entry
  };

  if (!isLoggedIn) {
    return <LandingPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <>
      <CSSTransition
        in={isEditing}
        timeout={300}
        classNames="slide"
        mountOnEnter
        unmountOnExit
      >
        <EntryEditor
          isEditing={isEditing}
          editingEntry={editingEntry}
          editorTitle={editorTitle}
          setEditorTitle={setEditorTitle}
          editorContent={editorContent}
          setEditorContent={setEditorContent}
          selectedSubcriteria={selectedSubcriteria}
          setSelectedSubcriteria={setSelectedSubcriteria}
          selectedGroupTags={selectedGroupTags}
          setSelectedGroupTags={setSelectedGroupTags}
          tags={tags}
          handleSave={handleSave}
          onCancel={handleCancel}
          mode={editorMode}
        />
      </CSSTransition>
      <div className="container">
        <div className="header">Autism Spectrum Disorder DSM-V-TR</div>
        <CriteriaList
          tags={tags}
          entries={entries}
          handleEditEntry={handleEditEntry}
          handleDeleteEntry={handleDeleteEntry}
          handleAddEntry={handleAddEntry}
          expandedEntryId={expandedEntryId}
          setExpandedEntryId={setExpandedEntryId}
          openStates={openStates}
          toggleOpen={toggleOpen}
        />
      </div>
    </>
  );
}
