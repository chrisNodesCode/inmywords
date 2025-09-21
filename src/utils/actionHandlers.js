import { DEFAULT_ENTRY_STATUS } from '@/constants/entryStatus';

export const createAddGroupHandler = ({ notebookId, openDrawerByType, closeControllerDrawer, setControllerPinned, setAddDrawerFields }) => () => {
  if (!notebookId) return;
  setAddDrawerFields({ name: '', description: '' });
  setControllerPinned(false);
  closeControllerDrawer();
  openDrawerByType('addGroup', { parentId: notebookId });
};

export const createAddSubgroupHandler = ({ openDrawerByType, closeControllerDrawer, setControllerPinned, setAddDrawerFields }) => (groupId) => {
  setAddDrawerFields({ name: '', description: '' });
  setControllerPinned(false);
  closeControllerDrawer();
  openDrawerByType('addSubgroup', { parentId: groupId });
};

export const createAddEntryHandler = ({
  setTitle,
  setContent,
  setIsEditingTitle,
  setTitleInput,
  setLastSaved,
  closeControllerDrawer,
  setControllerPinned,
  openEditorDrawer,
  setEditorPinned,
  setEditorState,
}) => (groupId, subgroupId) => {
  setTitle('');
  setContent('');
  setIsEditingTitle(true);
  setTitleInput('');
  setLastSaved(null);
  closeControllerDrawer();
  setControllerPinned(false);
  openEditorDrawer();
  setEditorPinned(true);
  setEditorState({
    isOpen: true,
    type: 'entry',
    parent: { groupId, subgroupId },
    item: null,
    mode: 'create',
  });
};

export const createEditEntryHandler = (openEntry) => async (entry) => {
  const res = await fetch(`/api/entries/${entry.id}`);
  const item = res.ok
    ? await res.json()
    : { id: entry.id, title: entry.title, content: '', status: entry.status ?? DEFAULT_ENTRY_STATUS };
  openEntry(entry, item);
};

export const createEntryDeleteHandler = ({ setTreeData, setOpenEntryId }) => (entry) => {
  if (!setTreeData) return;
  setTreeData((groups) =>
    groups.map((g) => {
      if (g.key !== entry.groupId) return g;
      return {
        ...g,
        children: g.children?.map((s) => {
          if (s.key !== entry.subgroupId) return s;
          const newChildren = (s.children || []).filter(
            (e) => e.key !== entry.key && e.id !== entry.id
          );
          return {
            ...s,
            children: newChildren,
            entryCount:
              typeof s.entryCount === 'number'
                ? Math.max(0, s.entryCount - 1)
                : newChildren.filter((e) => !e.archived).length,
          };
        }),
      };
    })
  );
  if (setOpenEntryId) {
    setOpenEntryId((prev) => (prev === entry.id ? null : prev));
  }
};

