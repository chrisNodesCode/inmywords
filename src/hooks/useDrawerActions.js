import { useDrawer, useDrawerByType } from '@/components/Drawer/DrawerManager';

export default function useDrawerActions({
  setAddDrawerFields,
  setTitle,
  setContent,
  setIsEditingTitle,
  setTitleInput,
  setLastSaved,
  setEditorState,
  setEditorPinned,
  setControllerPinned,
  openEditorDrawer,
}) {
  const openDrawerByType = useDrawerByType();
  const { closeDrawer: closeControllerDrawer } = useDrawer('controller');

  const resetAddFields = () => {
    if (setAddDrawerFields) {
      setAddDrawerFields({ name: '', description: '' });
    }
  };

  const openAddGroup = (notebookId) => {
    if (!notebookId) return;
    resetAddFields();
    setControllerPinned && setControllerPinned(false);
    closeControllerDrawer();
    openDrawerByType('addGroup', { parentId: notebookId });
  };

  const openAddSubgroup = (groupId) => {
    resetAddFields();
    setControllerPinned && setControllerPinned(false);
    closeControllerDrawer();
    openDrawerByType('addSubgroup', { parentId: groupId });
  };

  const openAddEntry = (groupId, subgroupId) => {
    setTitle && setTitle('');
    setContent && setContent('');
    setIsEditingTitle && setIsEditingTitle(true);
    setTitleInput && setTitleInput('');
    setLastSaved && setLastSaved(null);
    closeControllerDrawer();
    setControllerPinned && setControllerPinned(false);
    openEditorDrawer && openEditorDrawer();
    setEditorPinned && setEditorPinned(true);
    setEditorState &&
      setEditorState({
        isOpen: true,
        type: 'entry',
        parent: { groupId, subgroupId },
        item: null,
        mode: 'create',
      });
  };

  return { openAddGroup, openAddSubgroup, openAddEntry };
}

