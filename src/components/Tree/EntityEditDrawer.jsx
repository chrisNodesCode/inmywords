import React, { useEffect, useState } from 'react';
import Drawer from '@/components/Drawer/Drawer';
import { useDrawer } from '@/components/Drawer/DrawerManager';
import { Input, Button, Select, Tag, Modal, message } from 'antd';
import { ENTRY_STATUS_VALUES, DEFAULT_ENTRY_STATUS } from '@/constants/entryStatus';

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
    groupOptions = [], // for editing a subgroup's parent group
    currentGroupId,
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
  const [status, setStatus] = useState(initialData?.status ?? DEFAULT_ENTRY_STATUS);
  // subgroup specific: parent group selection
  const [parentGroupId, setParentGroupId] = useState(currentGroupId || '');

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
    setParentGroupId(currentGroupId || '');
    setStatus(initialData?.status ?? DEFAULT_ENTRY_STATUS);
  }, [initialData, open, currentGroupId]);

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
          setStatus(data.status ?? DEFAULT_ENTRY_STATUS);
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
        status,
      };
    } else if (type === 'notebook') {
      payload = {
        title,
        description,
        user_notebook_tree: [groupAlias, subgroupAlias, entryAlias],
      };
    } else if (type === 'subgroup') {
      payload = { name: title, description, groupId: parentGroupId || undefined };
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
    // In manage mode, keep drawer open to allow chained edits
    if (!props.manageMode && !props.stayOpenOnSave) {
      handleClose();
    }
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

      {type === 'subgroup' && (
        <Select
          value={parentGroupId}
          onChange={setParentGroupId}
          style={{ width: '100%', marginBottom: '0.5rem' }}
          placeholder="Select parent group"
        >
          {groupOptions.map((g) => (
            <Select.Option key={g.id} value={g.id}>
              {g.title}
            </Select.Option>
          ))}
        </Select>
      )}

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
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            {ENTRY_STATUS_VALUES.map((value) => (
              <Select.Option key={value} value={value}>
                {value
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (char) => char.toUpperCase())}
              </Select.Option>
            ))}
          </Select>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
      <div>
        {open && type !== 'notebook' && id && (
          <Button
            danger
            onClick={() => {
              const isCascade = type === 'group' || type === 'subgroup';
              const titleTxt = `Delete ${type}?`;
              const contentTxt = isCascade
                ? `This will permanently delete this ${type} and everything inside it. If you want to keep any items, click Cancel and move them to another location first.`
                : `This will permanently delete this ${type}.`;

              Modal.confirm({
                title: titleTxt,
                content: contentTxt,
                okText: 'Delete',
                okButtonProps: { danger: true },
                cancelText: 'Cancel',
                maskClosable: false,
                onOk: async () => {
                  try {
                    const res = await fetch(`/api/${type}s/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Delete failed');
                    props.onDelete?.(type, id);
                    handleClose();
                  } catch (err) {
                    console.error('Failed to delete entity', err);
                    message.error('Failed to delete. Please try again.');
                  }
                },
              });
            }}
          >
            Delete
          </Button>
        )}
      </div>
      <div>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );

  return <Drawer open={open} header={header} body={body} footer={footer} zIndex={1002} />;
}
