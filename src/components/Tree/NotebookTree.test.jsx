import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotebookTree from './NotebookTree';

describe('NotebookTree', () => {
  it('calls onAddGroup when add group button is clicked', async () => {
    const user = userEvent.setup();
    const onAddGroup = jest.fn();
    const treeData = [
      { title: 'Add Group', key: 'add-group', kind: 'add', addType: 'group' },
    ];
    render(<NotebookTree treeData={treeData} onAddGroup={onAddGroup} />);
    const buttons = screen.getAllByRole('button', { name: /add group/i });
    await user.click(buttons[0]);
    expect(onAddGroup).toHaveBeenCalled();
  });
});
