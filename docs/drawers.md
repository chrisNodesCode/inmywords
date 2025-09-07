# Drawer types

The `DrawerManager` exposes `openDrawerByType(type, extraProps)` for opening common drawers.
Each type maps to an internal drawer id and may supply default props or a template.

## editor
- **id**: `editor`
- **template**: `editor`
- **props**: expects editor configuration such as `pomodoroEnabled`, `onPomodoroToggle`,
  `fullFocus`, `onFullFocusToggle`, `maxWidth`, `onMaxWidthChange`, `type`, `mode`,
  `aliases`, `groups`, `selectedSubgroupId`, `onChangeSubgroup`, `onSave`,
  `onSaveAndClose`, `onDelete`, `onArchive`, `onCancel`, and `saving`.

## controller
- **id**: `controller`
- **template**: `controller`
- **props**: accepts controller options like `onSelect`, `showEdits`, `onToggleEdits`,
  `reorderMode`, `onToggleReorder`, `fullFocus`, `onFullFocusToggle`, `showArchived`,
  `onToggleArchived`, and `onAddNotebookDrawerChange`.

## addGroup
- **id**: `add-group`
- **props**: `parentId` (notebook id). The drawer collects a name and optional description
  for the new group.

## addSubgroup
- **id**: `add-group`
- **props**: `parentId` (group id). Collects name and description for the new subgroup.

## editGroup
- **id**: `entity-edit`
- **props**: `id`, `initialData`, `onSave`.

## editSubgroup
- **id**: `entity-edit`
- **props**: `id`, `initialData`, `onSave`.

## editEntry
- **id**: `entity-edit`
- **props**: `id`, `initialData`, `subgroupOptions`, `onSave`.

## editNotebook
- **id**: `entity-edit`
- **props**: `id`, `initialData`, `onSave`.

Use `extraProps` when calling `openDrawerByType` to supply the above parameters:

```js
const openDrawerByType = useDrawerByType();
openDrawerByType('editEntry', { id: 'e1', initialData: entry });
```
