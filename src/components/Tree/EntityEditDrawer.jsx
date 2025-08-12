import React, { useEffect, useState } from 'react';
import { Drawer, Input, Button } from 'antd';

/**
 * Simple drawer for editing an entity (group, subgroup or entry).
 * Expects `type` ('group' | 'subgroup' | 'entry') and `id`.
 */
export default function EntityEditDrawer({ type, id, open, initialData, onClose }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');

  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title || '');
    setDescription(initialData?.description || '');
  }, [initialData, open]);

  useEffect(() => {
    if (!open || !type || !id || typeof fetch === 'undefined') return;
    let cancelled = false;
    fetch(`/api/${type}s/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [type, id, open]);

  const handleSave = async () => {
    await fetch(`/api/${type}s/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    onClose?.();
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Edit ${type}`} zIndex={1002}>
      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />
      <Input.TextArea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Drawer>
  );
}
