import React, { useEffect, useState } from 'react';
import Drawer from '@/components/Drawer/Drawer';
import { useDrawer } from '@/components/Drawer/DrawerManager';
import { Input, Button, Select, Tag } from 'antd';

/**
 * Drawer for editing a notebook tree entity.
 * Handles notebooks, groups, subgroups and entries with
 * type-specific fields.
 */
export default function EntityEditDrawer() {
  const { open, props = {}, closeDrawer } = useDrawer('entity-edit');
  const {
    type,
    id,
    initialData,
    onClose,
    onSave,
    subgroupOptions = [],
  } = props || {};
  const [title, setTitle] = useState(
    initialData?.title ?? initialData?.name ?? ''
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ''
  );

  // notebook aliases
  const [groupAlias, setGroupAlias] = useState(
    initialData?.user_notebook_tree?.[0] ?? ''
  );
  const [subgroupAlias, setSubgroupAlias] = useState(
    initialData?.user_notebook_tree?.[1] ?? ''
  );
  const [entryAlias, setEntryAlias] = useState(
    initialData?.user_notebook_tree?.[2] ?? ''
  );

  // entry specific state
  const [content, setContent] = useState(initialData?.content ?? '');
  const [tags, setTags] = useState(initialData?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [subgroupId, setSubgroupId] = useState(
    initialData?.subgroupId ?? initialData?.subgroup?.id ?? ''
  );
  const [notebookId, setNotebookId] = useState(
    initialData?.subgroup?.group?.notebookId ?? ''
  );

  // reset state when drawer opens with new data
  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title ?? initialData?.name ?? '');
    setDescription(initialData?.description ?? '');

    setGroupAlias(initialData?.user_notebook_tree?.[0] ?? '');
    setSubgroupAlias(initialData?.user_notebook_tree?.[1] ?? '');
    setEntryAlias(initialData?.user_notebook_tree?.[2] ?? '');

    setContent(initialData?.content ?? '');
    setTags(initialData?.tags ?? []);
    setSubgroupId(initialData?.subgroupId ?? initialData?.subgroup?.id ?? '');
    setNotebookId(
      initialData?.subgroup?.group?.notebookId ??
      initialData?.subgroup?.group?.notebook?.id ??
      ''
    );
  }, [initialData, open]);

  // fetch latest data when opening
  useEffect(() => {
    if (!open || !type || !id || typeof fetch === 'undefined') return;
    let cancelled = false;
    const endpoint = type === 'notebook'
      ? `/api/notebooks/${id}`
      : `/api/${type}s/${id}`;
    fetch(endpoint)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (type === 'notebook') {
          setTitle(data.title ?? '');
          setDescription(data.description ?? '');
          setGroupAlias(data.user_notebook_tree?.[0] ?? '');
          setSubgroupAlias(data.user_notebook_tree?.[1] ?? '');
          setEntryAlias(data.user_notebook_tree?.[2] ?? '');
        } else if (type === 'entry') {
          setTitle(data.title ?? '');
          setContent(data.content ?? '');
          setTags(data.tags ?? []);
          setSubgroupId(data.subgroupId ?? '');
          setNotebookId(
            data.subgroup?.group?.notebookId ??
            data.subgroup?.group?.notebook?.id ??
            ''
          );
        } else {
          setTitle(data.title ?? data.name ?? '');
          setDescription(data.description ?? '');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [type, id, open]);

  const handleAddTag = async () => {
    const name = newTag.trim();
    if (!name || !notebookId) return;
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notebookId }),
    });
    if (res.ok) {
      const tag = await res.json();
      setTags((prev) => [...prev, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagId) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const handleSave = async () => {
    let payload = {};
    let endpoint =
      type === 'notebook'
        ? `/api/notebooks/${id}`
        : `/api/${type}s/${id}`;

    if (type === 'entry') {
      payload = {
        title,
        content,
        subgroupId,
        tagIds: tags.map((t) => t.id),
      };
    } else if (type === 'notebook') {
      payload = {
        title,
        description,
        user_notebook_tree: [groupAlias, subgroupAlias, entryAlias],
      };
    } else {
      payload = { name: title, description };
    }

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      onSave?.(data);
    }
    handleClose();
  };

  const handleClose = () => {
    closeDrawer();
    onClose?.();
  };

  const header = <h2 style={{ marginTop: 0 }}>{`Edit ${type}`}</h2>;

  const body = (
    <>
      <Input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />

      {type !== 'entry' && type !== 'notebook' && (
        <Input.TextArea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginBottom: '0.5rem' }}
        />
      )}

      {type === 'notebook' && (
        <>
          <Input.TextArea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
          <Input
            placeholder="Groups Alias"
            value={groupAlias}
            onChange={(e) => setGroupAlias(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
          <Input
            placeholder="Subgroups Alias"
            value={subgroupAlias}
            onChange={(e) => setSubgroupAlias(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
          <Input
            placeholder="Entries Alias"
            value={entryAlias}
            onChange={(e) => setEntryAlias(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
        </>
      )}

      {type === 'entry' && (
        <>
          <Input.TextArea
            placeholder="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          />
          <div style={{ marginBottom: '0.5rem' }}>
            {tags.map((tag) => (
              <Tag
                key={tag.id}
                closable
                onClose={() => handleRemoveTag(tag.id)}
                style={{ marginBottom: '0.25rem' }}
              >
                {tag.name}
              </Tag>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Input
              placeholder="New tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
            <Button onClick={handleAddTag}>Add Tag</Button>
          </div>
          <Select
            value={subgroupId}
            onChange={setSubgroupId}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            {subgroupOptions.map((s) => (
              <Select.Option key={s.id} value={s.id}>
                {s.groupTitle ? `${s.groupTitle} / ${s.title}` : s.title}
              </Select.Option>
            ))}
          </Select>
        </>
      )}
    </>
  );

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
      <Button onClick={handleClose}>Cancel</Button>
      <Button type="primary" onClick={handleSave}>
        Save
      </Button>
    </div>
  );

  return <Drawer open={open} header={header} body={body} footer={footer} zIndex={1002} />;
}

